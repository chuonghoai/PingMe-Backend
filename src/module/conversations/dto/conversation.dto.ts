/* eslint-disable prettier/prettier */
import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { EConversationType } from '../enums/conversation.enum';

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 người để bắt đầu trò chuyện' })
  @IsString({ each: true })
  participantIds: string[];

  @IsEnum(EConversationType)
  @IsOptional()
  type?: EConversationType = EConversationType.ONE_TO_ONE;

  @IsString()
  @IsOptional()
  name?: string;
}