import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourtDto {
  @ApiProperty({ description: '场地编号', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  code: string;

  @ApiProperty({ description: '场馆ID' })
  @Type(() => Number)
  @IsInt()
  venueId: number;

  @ApiPropertyOptional({ description: '场地类型', default: 'standard' })
  @IsString()
  @IsOptional()
  @MaxLength(16)
  type?: string;

  @ApiPropertyOptional({ description: '基础价格' })
  @IsNumber()
  @IsOptional()
  basePrice?: number;
}

export class UpdateCourtDto {
  @ApiPropertyOptional({ description: '场地编号' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ description: '场地类型' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '基础价格' })
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class CourtQueryDto {
  @ApiPropertyOptional({ description: '场馆ID' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  venueId?: number;

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

export class GenerateScheduleDto {
  @ApiProperty({ description: '场馆ID' })
  @Type(() => Number)
  @IsInt()
  venueId: number;

  @ApiPropertyOptional({ description: '天数', default: 14 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  days?: number;

  @ApiPropertyOptional({ description: '开始时间(HH:mm)', default: '08:00' })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间(HH:mm)', default: '22:00' })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: '每时段分钟数', default: 60 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  slotMinutes?: number;
}

export class ScheduleQueryDto {
  @ApiProperty({ description: '场馆ID' })
  @Type(() => Number)
  @IsInt()
  venueId: number;

  @ApiProperty({ description: '日期 YYYY-MM-DD' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ description: '场地ID' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  courtId?: number;
}
