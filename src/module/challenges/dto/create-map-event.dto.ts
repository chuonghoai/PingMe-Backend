import { IsString, IsNumber, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';
import { EItemType } from '../entities/challenge-definition';

export class CreateMapEventDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    latitude: number;

    @IsNumber()
    longitude: number;

    @IsEnum(EItemType)
    rewardItem: EItemType;

    @IsNumber()
    rewardQuantity: number;

    @IsDateString()
    startTime: string;

    @IsDateString()
    endTime: string;
}