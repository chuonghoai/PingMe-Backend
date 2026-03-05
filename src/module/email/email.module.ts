import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { ENV_VARS } from '../../constants/env.constants';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>(ENV_VARS.MAIL_HOST),
          port: config.get<number>(ENV_VARS.MAIL_PORT),
          secure: false,
          auth: {
            user: config.get<string>(ENV_VARS.MAIL_USER),
            pass: config.get<string>(ENV_VARS.MAIL_PASS),
          },
        },
        defaults: {
          from: config.get<string>(ENV_VARS.MAIL_FROM),
        },
      }),
    }),
  ],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}
