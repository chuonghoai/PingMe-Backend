/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { ENV_VARS } from '../../constants/env.constants';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Otp } from './entities/otp.entity';
import { EmailRepository } from './email.repository';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Otp]),
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
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [EmailService, EmailRepository],
  controllers: [EmailController],
  exports: [EmailService, EmailRepository],
})
export class EmailModule {}
