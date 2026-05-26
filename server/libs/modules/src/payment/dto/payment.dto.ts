import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({ description: '业务类型', enum: ['activity', 'recharge', 'mall'] })
  @IsString()
  bizType: string;

  @ApiProperty({ description: '业务订单号' })
  @IsString()
  bizOrderNo: string;

  @ApiProperty({ description: '支付金额' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: '支付渠道', default: 'wechat_jsapi' })
  @IsString()
  @IsOptional()
  payChannel?: string;
}

export class RefundDto {
  @ApiProperty({ description: '支付订单ID' })
  @Type(() => Number)
  @IsInt()
  paymentId: number;

  @ApiProperty({ description: '退款金额' })
  @IsNumber()
  refundAmount: number;

  @ApiPropertyOptional({ description: '退款原因' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ description: '业务类型' })
  @IsString()
  @IsOptional()
  bizType?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string;

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
