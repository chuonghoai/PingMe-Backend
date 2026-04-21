/* eslint-disable prettier/prettier */
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './users.repository';
import { WebsocketsModule } from '../websockets/websockets.module';
import { FriendsModule } from '../friends/friends.module';
import { MomentsModule } from '../moments/moments.module';
import { Friend } from '../friends/entities/friend.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friend]),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => FriendsModule),
    forwardRef(() => MomentsModule),
  ],
  providers: [UsersService, UserRepository],
  controllers: [UsersController],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
