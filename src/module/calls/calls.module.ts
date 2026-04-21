import { Module } from '@nestjs/common';
import { CallsGateway } from './calls.gateway';
import { WebsocketsModule } from '../websockets/websockets.module';
import { UsersModule } from '../users/users.module';
import { IntimacyModule } from '../intimacy/intimacy.module';

@Module({
  imports: [
    WebsocketsModule,
    UsersModule,
    IntimacyModule,
  ],
  providers: [CallsGateway],
})
export class CallsModule {}