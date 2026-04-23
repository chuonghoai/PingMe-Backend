import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Otp } from './entities/otp.entity';
import { OtpPurpose } from './enums/otp-purpose.enum';

@Injectable()
export class EmailRepository extends Repository<Otp> {
  constructor(private dataSource: DataSource) {
    super(Otp, dataSource.createEntityManager());
  }

  async createAndSaveOtp(
    email: string,
    otpCode: string,
    expirationTime: Date,
    purpose?: OtpPurpose,
  ): Promise<Otp> {
    const newOtp = this.create({
      email,
      otp: otpCode,
      purpose,
      expirationTime,
      isUsed: false,
    });
    return this.save(newOtp);
  }

  async findLatestOtp(email: string, purpose?: OtpPurpose): Promise<Otp | null> {
    return this.findOne({
      where: { email, purpose },
      order: { createdAt: 'DESC' },
    });
  }
}
