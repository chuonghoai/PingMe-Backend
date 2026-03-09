import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Otp } from './entities/otp.entity';

@Injectable()
export class EmailRepository extends Repository<Otp> {
  constructor(private dataSource: DataSource) {
    // Gọi super() để kế thừa toàn bộ các hàm cơ bản của TypeORM (save, find, update...)
    super(Otp, dataSource.createEntityManager());
  }

  // 1. Hàm tạo và lưu OTP mới vào database
  async createAndSaveOtp(
    email: string,
    otpCode: string,
    expirationTime: Date,
  ): Promise<Otp> {
    const newOtp = this.create({
      email: email,
      otp: otpCode,
      expirationTime: expirationTime,
      isUsed: false,
    });
    return this.save(newOtp);
  }

  // 2. Hàm tìm mã OTP mới nhất của một email (sẽ dùng ở Auth Service lúc đăng ký)
  async findLatestOtpByEmail(email: string): Promise<Otp | null> {
    return this.findOne({
      where: { email: email },
      order: { createdAt: 'DESC' }, // Sắp xếp giảm dần để lấy mã xin gần nhất
    });
  }
}
