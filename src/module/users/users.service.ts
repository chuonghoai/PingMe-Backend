/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { UserRepository } from './users.repository';
import { CustomException } from 'src/core/exceptions/custom.exception';
import { UpdateUserRequest } from './dto/user-request.dto';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  // Get me
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
}
