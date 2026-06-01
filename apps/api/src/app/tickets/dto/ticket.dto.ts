import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Konu en az 2 karakter olmalı.' })
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Mesaj boş olamaz.' })
  message!: string;

  @ApiPropertyOptional({ description: 'İlişkili sipariş (boş ise özel talep).' })
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class ReplyTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Mesaj boş olamaz.' })
  body!: string;
}

export class TicketStatusDto {
  @ApiProperty({ enum: ['open', 'pending', 'resolved'] })
  @IsEnum({ open: 'open', pending: 'pending', resolved: 'resolved' })
  status!: 'open' | 'pending' | 'resolved';
}
