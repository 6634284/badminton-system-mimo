import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterActivityDto {
  @ApiProperty({ description: '活动ID' })
  @Type(() => Number)
  @IsInt()
  activityId: number;

  @ApiPropertyOptional({ description: '额外人数', default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  extraCount?: number;

  @ApiPropertyOptional({ description: '幂等键' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: '分享令牌' })
  @IsString()
  @IsOptional()
  shareToken?: string;

  @ApiPropertyOptional({ description: '参与者列表' })
  @IsOptional()
  participants?: {
    displayName?: string;
    phone?: string;
  }[];
}

export class CancelRegistrationDto {
  @ApiPropertyOptional({ description: '取消原因' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RegistrationQueryDto {
  @ApiPropertyOptional({ description: '活动ID' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  activityId?: number;

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
