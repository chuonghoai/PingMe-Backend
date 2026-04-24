/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Moment } from './entities/moment.entity';
import { CreateMomentDto } from './dto/create-moment.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { FriendsService } from '../friends/friends.service';
import { WebsocketsService } from '../websockets/websockets.service';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MomentReport } from './entities/moment-report.entity';
import { CreateReportDto } from './dto/create-report.dto';

// ── Haversine distance in meters ──
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface MomentCluster {
  latitude: number;
  longitude: number;
  momentCount: number;
  avatars: { userId: string; avatarUrl: string; fullName: string }[];
  hasMore: boolean;
  momentIds: string[];
  latestImageUrl: string;
  imageUrls: string[];
}

@Injectable()
export class MomentsService {
  private readonly logger = new Logger(MomentsService.name);

  constructor(
    @InjectRepository(Moment)
    private readonly momentRepo: Repository<Moment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly friendsService: FriendsService,
    private readonly websocketsService: WebsocketsService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(MomentReport)
    private readonly reportRepo: Repository<MomentReport>
  ) { }

  // ── Count moments by user ──
  async countByUser(userId: string): Promise<number> {
    return this.momentRepo.count({ where: { userId } });
  }

  // ── Create Moment ──
  async createMoment(userId: string, dto: CreateMomentDto): Promise<ApiResponse<any>> {
    const momentEntity = this.momentRepo.create({
      userId,
      imageUrl: dto.imageUrl,
      caption: dto.caption || undefined,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
    const saved: Moment = await this.momentRepo.save(momentEntity);

    // Get user info for the broadcast
    const user = await this.userRepo.findOne({ where: { id: userId } });

    // Broadcast to friends via WebSocket
    const friendIds = await this.friendsService.getFriendIds(userId);
    if (friendIds.length > 0) {
      this.websocketsService.emitToUsers(friendIds, 'new_moment', {
        momentId: saved.id,
        userId,
        fullName: user?.fullname || '',
        avatarUrl: user?.avatarUrl || '',
        imageUrl: saved.imageUrl,
        caption: saved.caption,
        latitude: saved.latitude,
        longitude: saved.longitude,
        createdAt: saved.createdAt,
      });

      // Persistent Notification to DB
      this.notificationsService.createMomentNotification(
        userId,
        user?.fullname || '',
        user?.avatarUrl || '',
        friendIds,
        saved.id,
        saved.imageUrl
      ).catch(e => console.log('Moment notification error', e));
    }

    // Also emit to the creator themselves so their UI refreshes
    this.websocketsService.emitToUsers([userId], 'new_moment', {
      momentId: saved.id,
      userId,
      fullName: user?.fullname || '',
      avatarUrl: user?.avatarUrl || '',
      imageUrl: saved.imageUrl,
      caption: saved.caption,
      latitude: saved.latitude,
      longitude: saved.longitude,
      createdAt: saved.createdAt,
    });

    this.logger.log(`Moment created by ${userId} at (${dto.latitude}, ${dto.longitude})`);
    return new ApiResponse(true, 'Tạo khoảnh khắc thành công', saved);
  }

  // ── Delete Moment ──
  async deleteMoment(userId: string, momentId: string): Promise<ApiResponse<null>> {
    const moment = await this.momentRepo.findOne({ where: { id: momentId } });
    if (!moment) {
      throw new NotFoundException('Không tìm thấy khoảnh khắc');
    }
    if (moment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa khoảnh khắc này');
    }
    await this.momentRepo.remove(moment);

    // Notify friends so they can refresh clusters
    const friendIds = await this.friendsService.getFriendIds(userId);
    this.websocketsService.emitToUsers([...friendIds, userId], 'moment_deleted', { momentId });

    return new ApiResponse(true, 'Đã xóa khoảnh khắc', null);
  }

  // ── Global Feed (my moments + friends' moments) ──
  async getGlobalFeed(userId: string, page: number, limit: number): Promise<ApiResponse<any>> {
    const friendIds = await this.friendsService.getFriendIds(userId);
    const allUserIds = [userId, ...friendIds];

    const [moments, total] = await this.momentRepo.findAndCount({
      where: { userId: In(allUserIds) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = moments.map((m) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user?.fullname || '',
      avatarUrl: m.user?.avatarUrl || '',
      imageUrl: m.imageUrl,
      caption: m.caption,
      latitude: m.latitude,
      longitude: m.longitude,
      createdAt: m.createdAt,
      isMine: m.userId === userId,
    }));

    return new ApiResponse(true, 'Lấy global feed thành công', {
      moments: data,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  }

  // ── Local Feed (moments at specific coordinate within 10m) ──
  async getLocalFeed(lat: number, lng: number, page: number, limit: number): Promise<ApiResponse<any>> {
    // Fetch all moments, then filter by distance ≤10m
    // For production, use spatial queries (ST_Distance), but with synchronize:true this is simpler
    const allMoments = await this.momentRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const nearbyMoments = allMoments.filter((m) => {
      const dist = haversineMeters(lat, lng, m.latitude, m.longitude);
      return dist <= 10;
    });

    const total = nearbyMoments.length;
    const paged = nearbyMoments.slice((page - 1) * limit, page * limit);

    const data = paged.map((m) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user?.fullname || '',
      avatarUrl: m.user?.avatarUrl || '',
      imageUrl: m.imageUrl,
      caption: m.caption,
      latitude: m.latitude,
      longitude: m.longitude,
      createdAt: m.createdAt,
    }));

    return new ApiResponse(true, 'Lấy local feed thành công', {
      moments: data,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  }

  // ── Map Clusters (group moments within 10m radius) ──
  async getMapClusters(userId: string): Promise<ApiResponse<MomentCluster[]>> {
    const friendIds = await this.friendsService.getFriendIds(userId);
    const allUserIds = [userId, ...friendIds];

    const moments = await this.momentRepo.find({
      where: { userId: In(allUserIds) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    // Greedy clustering: iterate moments, assign each to existing cluster (≤10m) or create new one
    const clusters: {
      latSum: number;
      lngSum: number;
      count: number;
      avatarSet: Map<string, { userId: string; avatarUrl: string; fullName: string }>;
      momentIds: string[];
      latestImageUrl: string;
      imageUrls: string[];
    }[] = [];

    for (const m of moments) {
      let assigned = false;
      for (const cluster of clusters) {
        const centerLat = cluster.latSum / cluster.count;
        const centerLng = cluster.lngSum / cluster.count;
        const dist = haversineMeters(centerLat, centerLng, m.latitude, m.longitude);

        if (dist <= 10) {
          cluster.latSum += m.latitude;
          cluster.lngSum += m.longitude;
          cluster.count++;
          cluster.momentIds.push(m.id);
          cluster.imageUrls.push(m.imageUrl);
          if (!cluster.avatarSet.has(m.userId)) {
            cluster.avatarSet.set(m.userId, {
              userId: m.userId,
              avatarUrl: m.user?.avatarUrl || '',
              fullName: m.user?.fullname || '',
            });
          }
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        const avatarSet = new Map<string, { userId: string; avatarUrl: string; fullName: string }>();
        avatarSet.set(m.userId, {
          userId: m.userId,
          avatarUrl: m.user?.avatarUrl || '',
          fullName: m.user?.fullname || '',
        });
        clusters.push({
          latSum: m.latitude,
          lngSum: m.longitude,
          count: 1,
          avatarSet,
          momentIds: [m.id],
          latestImageUrl: m.imageUrl,
          imageUrls: [m.imageUrl],
        });
      }
    }

    // Transform to response
    const result: MomentCluster[] = clusters.map((c) => {
      const avatars = Array.from(c.avatarSet.values());
      return {
        latitude: c.latSum / c.count,
        longitude: c.lngSum / c.count,
        momentCount: c.count,
        avatars: avatars.slice(0, 3),
        hasMore: avatars.length > 3,
        momentIds: c.momentIds,
        latestImageUrl: c.latestImageUrl,
        imageUrls: c.imageUrls,
      };
    });

    return new ApiResponse(true, 'Lấy clusters thành công', result);
  }

  async reportMoment(userId: string, momentId: string, dto: CreateReportDto): Promise<ApiResponse<any>> {
    const moment = await this.momentRepo.findOne({ where: { id: momentId } });
    if (!moment) {
      throw new NotFoundException('Không tìm thấy khoảnh khắc');
    }

    const report = this.reportRepo.create({
      momentId,
      reporterId: userId,
      reason: dto.reason,
      description: dto.description,
    });

    await this.reportRepo.save(report);
    return new ApiResponse(true, 'Đã gửi báo cáo thành công', null);
  }
}
