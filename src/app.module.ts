import { ConversationModule } from './module/conversations/conversations.module';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './module/users/users.module';
import { AuthModule } from './module/auth/auth.module';
import { CustomThrottlerGuard } from './core/security/throttler/custom-throttler.guard';
import { MediaModule } from './module/media/media.module';
import { EmailModule } from './module/email/email.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MessagesModule } from './module/messages/messages.module';
import { WebsocketsModule } from './module/websockets/websockets.module';
import { FriendsModule } from './module/friends/friends.module';
import { NotificationsModule } from './module/notifications/notifications.module';
import { CallsModule } from './module/calls/calls.module';
import { IntimacyModule } from './module/intimacy/intimacy.module';
import { ChallengesModule } from './module/challenges/challenges.module';
import { MomentsModule } from './module/moments/moments.module';
import { ExplorationModule } from './module/exploration/exploration.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    UsersModule,
    AuthModule,
    MediaModule,
    EmailModule,
    ConversationModule,
    MessagesModule,
    WebsocketsModule,
    FriendsModule,
    NotificationsModule,
    CallsModule,
    IntimacyModule,
    ChallengesModule,
    MomentsModule,
    ExplorationModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule { }
