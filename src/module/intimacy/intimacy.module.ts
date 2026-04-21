/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntimacyRelationship } from './entities/intimacy-relationship.entity';
import { IntimacyEvent } from './entities/intimacy-event.entity';
import { DailyIntimacyStat } from './entities/daily-intimacy-stat.entity';
import { IntimacyService } from './intimacy.service';
import { IntimacyController } from './intimacy.controller';
import { WebsocketsModule } from '../websockets/websockets.module';
import { UsersModule } from '../users/users.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntimacyRelationship,
      IntimacyEvent,
      DailyIntimacyStat
    ]),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ChallengesModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [IntimacyController],
  providers: [IntimacyService],
  exports: [TypeOrmModule, IntimacyService]
})
export class IntimacyModule {}
