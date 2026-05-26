import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNumber, IsDateString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActivityDto {
  @ApiProperty({ description: '场馆ID' })
  @Type(() => Number)
  @IsInt()
  venueId: number;

  @ApiProperty({ description: '活动类型', enum: ['open_session', 'private_court', 'coach_lesson', 'tournament'] })
  @IsString()
  type: string;

  @ApiProperty({ description: '活动标题', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  title: string;

  @ApiPropertyOptional({ description: '封面图URL' })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ description: '活动日期 YYYY-MM-DD' })
  @IsDateString()
  playDate: string;

  @ApiProperty({ description: '开始时间 ISO' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ description: '结束时间 ISO' })
  @IsDateString()
  endAt: string;

  @ApiProperty({ description: '容量(人数)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ description: '价格' })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ description: '会员价' })
  @IsNumber()
  @IsOptional()
  memberPrice?: number;

  @ApiPropertyOptional({ description: '取消政策' })
  @IsOptional()
  cancelPolicy?: Record<string, any>;

  @ApiPropertyOptional({ description: '报名开始时间' })
  @IsDateString()
  @IsOptional()
  registerOpenAt?: string;

  @ApiPropertyOptional({ description: '报名截止时间' })
  @IsDateString()
  @IsOptional()
  registerCloseAt?: string;

  @ApiPropertyOptional({ description: '场地排期IDs' })
  @Type(() => Number)
  @IsInt({ each: true })
  @IsOptional()
  scheduleIds?: number[];
}

export class UpdateActivityDto {
  @ApiPropertyOptional({ description: '活动标题' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  title?: string;

  @ApiPropertyOptional({ description: '封面图URL' })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '容量' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ description: '价格' })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: '会员价' })
  @IsNumber()
  @IsOptional()
  memberPrice?: number;

  @ApiPropertyOptional({ description: '取消政策' })
  @IsOptional()
  cancelPolicy?: Record<string, any>;
}

export class ActivityQueryDto {
  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '类型' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '日期筛选 YYYY-MM-DD' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: '关键词' })
  @IsString()
  @IsOptional()
  keyword?: string;

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
