import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { EItemType } from '../../challenges/entities/challenge-definition';

export enum EUpdateInventoryAction {
    ADD = 'ADD',
    SET = 'SET',
}

export class UpdateInventoryDto {
    @IsEnum(EItemType, { message: 'Loại vật phẩm không hợp lệ' })
    @IsNotEmpty()
    itemType: EItemType;

    @IsInt({ message: 'Số lượng phải là số nguyên' })
    @IsNotEmpty()
    amount: number;

    @IsEnum(EUpdateInventoryAction, { message: 'Hành động phải là ADD hoặc SET' })
    @IsNotEmpty()
    action: EUpdateInventoryAction;
}