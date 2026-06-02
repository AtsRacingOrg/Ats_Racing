import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderStage {
  stage1 = 'stage1',
  stage2 = 'stage2',
  stage3 = 'stage3',
}

export class PcodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Araçlar ekranından gelen sipariş yükü. Fiyatlar BURADA gelmez — server
 * tarafında `create_order` fonksiyonu tuning_prices / service_catalog'tan hesaplar.
 */
export class CreateOrderDto {
  @ApiProperty({ enum: OrderStage })
  @IsEnum(OrderStage)
  stage!: OrderStage;

  @ApiPropertyOptional() @IsOptional() @IsString() engineId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() make?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() year?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() engineLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fuel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transmission?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() km?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() plate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ecu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() readingTool?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() virtualFile?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dyno?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() ecuHw?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ecuPart?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ecuSw?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  serviceCodes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  modifiedParts?: string[];

  @ApiPropertyOptional({ type: [PcodeDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PcodeDto)
  pcodes?: PcodeDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['pending', 'processing', 'completed', 'cancelled'] })
  @IsEnum({ pending: 'pending', processing: 'processing', completed: 'completed', cancelled: 'cancelled' })
  status!: 'pending' | 'processing' | 'completed' | 'cancelled';

  @ApiPropertyOptional({ description: 'İptal sebebi (yalnızca cancelled durumunda).' })
  @IsOptional() @IsString() @MaxLength(1000)
  reason?: string;
}
