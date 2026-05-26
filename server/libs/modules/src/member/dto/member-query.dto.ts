import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class MemberQueryDto {
  @ApiPropertyOptional({ description: '关键词搜索(会员号/昵称/手机)' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '会员等级' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: '是否黑名单' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  blacklisted?: boolean;

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

export class UpdateMemberDto {
  @ApiPropertyOptional({ description: '会员等级' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: '是否拉黑' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  blacklisted?: boolean;
}

export class MemberImportRowDto {
  @ApiPropertyOptional({ description: '手机号' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: '昵称' })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiPropertyOptional({ description: '会员等级' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: '来源' })
  @IsString()
  @IsOptional()
  source?: string;
}
