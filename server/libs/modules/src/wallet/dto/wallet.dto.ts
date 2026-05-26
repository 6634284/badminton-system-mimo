import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class WalletQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ description: '方向: D/C' })
  @IsString()
  @IsOptional()
  direction?: string;

  @ApiPropertyOptional({ description: '业务类型' })
  @IsString()
  @IsOptional()
  bizType?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}

export class CreateRechargePackageDto {
  @ApiPropertyOptional({ description: '套餐名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '充值金额' })
  @IsNumber()
  chargeAmount: number;

  @ApiPropertyOptional({ description: '赠送金额' })
  @IsNumber()
  @IsOptional()
  giftAmount?: number;

  @ApiPropertyOptional({ description: '排序' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  sort?: number;
}
