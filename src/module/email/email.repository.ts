import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Otp } from './entities/otp.entity';

@Injectable()
export class EmailRepository extends Repository<Otp> {
  constructor(private dataSource: DataSource) {
    super(Otp, dataSource.createEntityManager());
  }

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

  async findLatestOtpByEmail(email: string): Promise<Otp | null> {
    return this.findOne({
      where: { email: email },
      order: { createdAt: 'DESC' },
    });
  }
}
