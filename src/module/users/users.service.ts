/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { UserRepository } from './users.repository';
import { CustomException } from 'src/core/exceptions/custom.exception';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  async getMe(userId: string): Promise<ApiResponse<any>> {
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
}
