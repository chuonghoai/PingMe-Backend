/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { UserRepository } from './users.repository';
import { CustomException } from 'src/core/exceptions/custom.exception';
import { NearbyUserResponseDto, UpdateUserRequest } from './dto/user-request.dto';
import { WebsocketsService } from '../websockets/websockets.service';
import { In, IsNull, Not } from 'typeorm';
import { calculateDistance } from 'src/utils/calculate.util';
import { dateTimestampProvider } from 'rxjs/internal/scheduler/dateTimestampProvider';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    @Inject(forwardRef(() => WebsocketsService))
    private readonly websocketsService: WebsocketsService
  ) {}

  // Get user by id
  async getUserBy(userId: string): Promise<ApiResponse<any>> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'USER_NOT_FOUND',
        'Không tìm thấy thông tin người dùng',
      );
    }

    return new ApiResponse(true, 'Lấy thông tin hồ sơ thành công', user);
  }

  // Update user
  async updateUser(userId: string, updateUseRequest: UpdateUserRequest): Promise<ApiResponse<any>> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
    }

    user.fullname = updateUseRequest.fullname;
    user.phone = updateUseRequest.phone;
    user.gender = updateUseRequest.gender;
    user.dob = new Date(updateUseRequest.dob);

    await this.userRepository.save(user);

    return new ApiResponse(
      true,
      'Cập nhật thông tin thành công',
      null
    )
  }

  // Get user nearby raduis 
  async getNearbyUsers(
    userId: string, 
    lat: number, lng: number, 
    radius: number
  ): Promise<ApiResponse<NearbyUserResponseDto[]>> {
    await this.userRepository.update(userId, { lat, lng, locationUpdatedAt: new Date() });

    // Get user online
    const onlineUsers = await this.websocketsService.getOnlineUsers() || [];
    const otherOnlineUsers = onlineUsers.filter(id => id !== userId);
    if (otherOnlineUsers.length === 0) {
      return new ApiResponse(true, 'Không có ai đang online ở gần', []);
    }

    // Get user have coordinates
    const users = await this.userRepository.find({
      where: {
        id: In(otherOnlineUsers),
        lat: Not(IsNull()),
        lng: Not(IsNull()),
      },
    });

    // Compute distance
    const nearbyUsers: NearbyUserResponseDto[] = [];
    for (const user of users) {
      const distance = calculateDistance(lat, lng, user.lat, user.lng);
      
      if (distance <= radius) {
        nearbyUsers.push({
          userId: user.id,
          fullName: user.fullname,
          avatarUrl: user.avatarUrl || '',
          distance: `${distance}m`,
        });
      }
    }

    nearbyUsers.sort((a, b) => parseInt(a.distance) - parseInt(b.distance));
    return new ApiResponse(true, 'Nearby users fetched', nearbyUsers);
  }

  // Update location in DB
  async updateLocation(actorId: string, lat: number, lng: number): Promise<void> {
    const user = await this.userRepository.findById(actorId);
    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
    }

    user.lat = lat;
    user.lng = lng;
    user.locationUpdatedAt = new Date();
    await this.userRepository.save(user);
  }
}
