import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ description: '场馆编码', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  code: string;

  @ApiProperty({ description: '场馆名称', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  name: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: '联系人', maxLength: 32 })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  contactName?: string;

  @ApiPropertyOptional({ description: '联系电话', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({ description: '营业执照号', maxLength: 64 })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  licenseNo?: string;
}
