import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExploredArea } from './entities/explored-area.entity';
import { RouteTimeline } from './entities/route-timeline.entity';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import * as h3 from 'h3-js';
import simplify from 'simplify-js';

@Injectable()
export class ExplorationService {
  private readonly logger = new Logger(ExplorationService.name);

  constructor(
    @InjectRepository(ExploredArea)
    private readonly exploredAreaRepo: Repository<ExploredArea>,
    @InjectRepository(RouteTimeline)
    private readonly routeTimelineRepo: Repository<RouteTimeline>,
  ) {}

  async syncPoints(userId: string, points: { lat: number; lng: number }[]) {
    if (!userId) {
      return new ApiResponse(false, 'User ID is required', null);
    }
    if (!points || points.length === 0) {
      return new ApiResponse(true, 'No points to sync', null);
    }

    try {
      const resolution = 10;
      const hexSet = new Set<string>();
      
      const validPoints = points.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');

      for (const p of validPoints) {
        if (p.lat && p.lng) {
          const hex = h3.latLngToCell(p.lat, p.lng, resolution);
          hexSet.add(hex);
        }
      }

      const hexArray = Array.from(hexSet);
      if (hexArray.length > 0) {
        const values = hexArray.map(hexId => ({ userId, hexId }));
        await this.exploredAreaRepo
          .createQueryBuilder()
          .insert()
          .into(ExploredArea)
          .values(values)
          .orIgnore()
          .execute();
      }

      const today = new Date().toISOString().split('T')[0];
      
      let route = await this.routeTimelineRepo.findOne({
        where: { userId, date: today }
      });

      let existingPath = [];
      if (route && route.path) {
        existingPath = typeof route.path === 'string' ? JSON.parse(route.path) : route.path;
        existingPath = existingPath.filter((p: any) => p && typeof p.lat === 'number' && typeof p.lng === 'number');
      }
      const combinedPath = [...existingPath, ...validPoints];

      const pointsXY = combinedPath.map(p => ({ x: p.lng, y: p.lat }));
      
      const simplifiedXY = simplify(pointsXY, 0.0001, true);
      
      const simplifiedPath = simplifiedXY.map(p => ({ lat: p.y, lng: p.x }));

      if (route) {
        route.path = simplifiedPath;
        await this.routeTimelineRepo.save(route);
      } else {
        route = this.routeTimelineRepo.create({
          userId,
          date: today,
          path: simplifiedPath
        });
        await this.routeTimelineRepo.save(route);
      }

      return new ApiResponse(true, 'Synced successfully', { 
        newHexesCount: hexArray.length, 
        totalPathPoints: simplifiedPath.length 
      });

    } catch (error) {
      this.logger.error('Error syncing points: ', error);
      return new ApiResponse(false, 'Failed to sync', null);
    }
  }

  async getMyExplorationData(userId: string) {
    const explored = await this.exploredAreaRepo.find({
      where: { userId },
      select: ['hexId']
    });

    const hexIds = explored.map(e => e.hexId);

    const today = new Date().toISOString().split('T')[0];
    const todaysRoute = await this.routeTimelineRepo.findOne({
      where: { userId, date: today },
      select: ['path']
    });

    let path = [];
    if (todaysRoute && todaysRoute.path) {
      path = typeof todaysRoute.path === 'string' ? JSON.parse(todaysRoute.path) : todaysRoute.path;
    }

    const totalVNHexes = 22011100;
    const progressPercent = ((hexIds.length / totalVNHexes) * 100).toFixed(6);

    const boundaries = hexIds.map(hexId => {
      const boundaryCoords = h3.cellToBoundary(hexId);
      return {
        id: hexId,
        coords: boundaryCoords.map(coord => ({
          latitude: coord[0],
          longitude: coord[1]
        }))
      };
    });

    return new ApiResponse(true, 'Exploration data fetched', {
      boundaries,
      todaysPath: path,
      progressPercent
    });
  }
}
