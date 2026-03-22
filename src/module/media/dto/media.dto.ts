import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MediaRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'public_id không được để trống' })
  public_id: string;

  @IsString()
  @IsNotEmpty({ message: 'secure_url không được để trống' })
  secure_url: string;

  @IsString()
  @IsNotEmpty({ message: 'resource_type không được để trống' })
  resource_type: string;

  @IsString()
  @IsOptional()
  format?: string;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  bytes?: number;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsBoolean()
  @IsOptional()
  is_audio?: boolean;
}
