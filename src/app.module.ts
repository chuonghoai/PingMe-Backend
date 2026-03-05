import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './module/users/users.module';
import { AuthModule } from './module/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CustomThrottlerGuard } from './core/security/throttler/custom-throttler.guard';
import { MediaModule } from './module/media/media.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 2000,
        limit: 5,
      },
    ]),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    UsersModule,
    AuthModule,
    MediaModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
