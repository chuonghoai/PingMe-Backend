/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Put,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/core/security/jwt/jwt-auth.guard';
import { UpdateUserRequest } from './dto/user-request.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Request() req: any) {
    const userId = req.user.userId; 
    return this.usersService.getUserBy(userId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Request() req: any, @Body() updateUserRequest: UpdateUserRequest) {
    const userId = req.user.userId;
    return this.usersService.updateUser(userId, updateUserRequest);
  }
}
