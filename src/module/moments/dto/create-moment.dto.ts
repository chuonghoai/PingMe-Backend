/* eslint-disable prettier/prettier */
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateMomentDto {
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}
