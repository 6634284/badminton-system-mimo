import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVenueDto {
  @ApiProperty({ description: '场馆名称', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  name: string;

  @ApiPropertyOptional({ description: '城市' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  city?: string;

  @ApiPropertyOptional({ description: '区域' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  district?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '纬度' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: '合作伙伴ID' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  partnerId?: number;
}

export class UpdateVenueDto {
  @ApiPropertyOptional({ description: '场馆名称' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ description: '城市' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  city?: string;

  @ApiPropertyOptional({ description: '区域' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  district?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '纬度' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class VenueQueryDto {
  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsString()
  @IsOptional()
  keyword?: string;

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
