/* eslint-disable prettier/prettier */
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './users.repository';
import { WebsocketsModule } from '../websockets/websockets.module';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => WebsocketsModule),
  ],
  providers: [UsersService, UserRepository, AdminService],
  controllers: [UsersController],
  exports: [UsersService, UserRepository, AdminService],
})
export class UsersModule { }
