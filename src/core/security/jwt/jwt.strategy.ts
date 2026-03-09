/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV_VARS } from 'src/constants/env.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(ENV_VARS.JWT_ACCESS_SECRET) as string,
      // Đã xóa passReqToCallback: true
    });
  }

  // Bỏ tham số req, chỉ nhận payload
  async validate(payload: any) {
    // Đã xóa đoạn check token trong Redis Blacklist
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  }
}
