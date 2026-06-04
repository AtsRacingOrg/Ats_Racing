import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160)
  dealershipName?: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(72)
  newPassword!: string;
}

export class UpsertBillingDto {
  @ApiProperty({ enum: ['individual', 'corporate'] })
  @IsEnum({ individual: 'individual', corporate: 'corporate' })
  type!: 'individual' | 'corporate';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) tcNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) taxOffice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) taxNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) district?: string;
}
