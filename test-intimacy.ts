import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { IntimacyService } from './src/module/intimacy/intimacy.service';
import { EIntimacyEventType } from './src/module/intimacy/entities/intimacy-event.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const intimacyService = app.get(IntimacyService);

  const u1 = '8331010c-1dd3-4f25-8163-bdfba5bed7b9';
  const u2 = 'b3131b90-d14d-46d3-9e87-2861afe31b19';

  console.log('Testing processInteraction...');
  try {
    await intimacyService.processInteraction(u1, u2, EIntimacyEventType.CHAT);
    console.log('processInteraction completed.');
    
    const info = await intimacyService.getIntimacyInfo(u1, u2);
    console.log('Intimacy Info:', info);
  } catch (error) {
    console.error('Error:', error);
  }

  await app.close();
}

bootstrap();
