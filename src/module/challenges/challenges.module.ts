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

@Module({
  imports: [
    TypeOrmModule.forFeature([UserChallenge, UserInventory, ActiveEffect]),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => IntimacyModule),
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [TypeOrmModule, ChallengesService],
})
export class ChallengesModule {}
