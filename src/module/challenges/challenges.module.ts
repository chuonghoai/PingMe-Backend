/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserChallenge } from './entities/user-challenge.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { ActiveEffect } from './entities/active-effect.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { WebsocketsModule } from '../websockets/websockets.module';
import { IntimacyModule } from '../intimacy/intimacy.module';
import { MapEvent } from './entities/map-event.entity';
import { UserEventHistory } from './entities/user-event-history.entity';
import { MapEventsController } from './map-events.controller';
import { MapEventsService } from './map-events.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserChallenge, UserInventory, ActiveEffect, MapEvent, UserEventHistory]),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => IntimacyModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ChallengesController, MapEventsController],
  providers: [ChallengesService, MapEventsService],
  exports: [TypeOrmModule, ChallengesService],
})
export class ChallengesModule { }
