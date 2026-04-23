/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MomentsService } from './moments.service';
import { CreateMomentDto } from './dto/create-moment.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('moments')
@UseGuards(JwtAuthGuard)
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  // POST /moments – Create a new moment
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMoment(@Req() req: any, @Body() dto: CreateMomentDto) {
    const userId = req.user.userId;
    return this.momentsService.createMoment(userId, dto);
  }

  // DELETE /moments/:id – Delete own moment
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMoment(@Req() req: any, @Param('id') momentId: string) {
    const userId = req.user.userId;
    return this.momentsService.deleteMoment(userId, momentId);
  }

  // GET /moments/global-feed?page=1&limit=20
  @Get('global-feed')
  @HttpCode(HttpStatus.OK)
  async getGlobalFeed(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const userId = req.user.userId;
    return this.momentsService.getGlobalFeed(userId, parseInt(page) || 1, parseInt(limit) || 20);
  }

  // GET /moments/local-feed?lat=...&lng=...&page=1&limit=20
  @Get('local-feed')
  @HttpCode(HttpStatus.OK)
  async getLocalFeed(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.momentsService.getLocalFeed(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(page) || 1,
      parseInt(limit) || 20,
    );
  }

  // GET /moments/map-clusters
  @Get('map-clusters')
  @HttpCode(HttpStatus.OK)
  async getMapClusters(@Req() req: any) {
    const userId = req.user.userId;
    return this.momentsService.getMapClusters(userId);
  }

  // POST /moments/:id/report
  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  async reportMoment(@Req() req: any, @Param('id') momentId: string, @Body() dto: CreateReportDto) {
    const userId = req.user.userId;
    return this.momentsService.reportMoment(userId, momentId, dto);
  }
}
