/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../core/security/jwt/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { ENV_VARS } from 'src/constants/env.constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserToken } from './entities/user-token.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserToken]), 
    EmailModule,
    NotificationsModule,
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(ENV_VARS.JWT_ACCESS_SECRET),
        signOptions: {
          expiresIn: (configService.get<string>(ENV_VARS.JWT_ACCESS_EXPIRES_IN) || '1h') as any,
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, AdminAuthService],
  controllers: [AuthController, AdminAuthController],
  exports: [AuthService, JwtModule, AdminAuthService],
})
export class AuthModule {}
