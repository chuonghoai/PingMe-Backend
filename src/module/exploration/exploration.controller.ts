import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ExplorationService } from './exploration.service';
import { JwtAuthGuard } from 'src/core/security/jwt/jwt-auth.guard';

@Controller('exploration')
@UseGuards(JwtAuthGuard)
export class ExplorationController {
  constructor(private readonly explorationService: ExplorationService) { }

  @Post('sync')
  async syncExploration(
    @Req() req: any,
    @Body('points') points: { lat: number; lng: number }[]
  ) {
    const userId = req.user.userId;
    return this.explorationService.syncPoints(userId, points);
  }

  @Get('my-map')
  async getMyMap(@Req() req: any) {
    const userId = req.user.userId;
    return this.explorationService.getMyExplorationData(userId);
  }
}
