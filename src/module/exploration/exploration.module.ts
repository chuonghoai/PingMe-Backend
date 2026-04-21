import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExploredArea } from './entities/explored-area.entity';
import { RouteTimeline } from './entities/route-timeline.entity';
import { ExplorationService } from './exploration.service';
import { ExplorationController } from './exploration.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExploredArea, RouteTimeline])],
  controllers: [ExplorationController],
  providers: [ExplorationService],
  exports: [ExplorationService]
})
export class ExplorationModule {}
