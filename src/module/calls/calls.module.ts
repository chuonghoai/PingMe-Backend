import { Module } from '@nestjs/common';
import { CallsGateway } from './calls.gateway';
import { WebsocketsModule } from '../websockets/websockets.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    WebsocketsModule,
    UsersModule,
  ],
  providers: [CallsGateway],
})
export class CallsModule {}