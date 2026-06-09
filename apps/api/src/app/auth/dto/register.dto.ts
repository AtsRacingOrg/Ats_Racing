import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum AccountType {
  user = 'user',
  dealer = 'dealer',
}

export class RegisterDto {
  @ApiProperty({ example: 'ali@example.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta gir.' })
  email!: string;

  @ApiProperty({ example: 'gizliSifre123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalı.' })
  password!: string;

  @ApiProperty({ example: 'Ali Yıldız' })
  @IsString()
  @MinLength(2, { message: 'Ad Soyad en az 2 karakter olmalı.' })
  fullName!: string;

  @ApiPropertyOptional({ example: '+90 532 111 22 33' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: AccountType, example: AccountType.user })
  @IsEnum(AccountType, { message: 'Hesap tipi user veya dealer olmalı.' })
  accountType!: AccountType;

  @ApiPropertyOptional({
    example: 'TR',
    description: 'ISO-3166-1 alpha-2 ülke kodu. Boşsa TR varsayılır.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Ülke kodu 2 harf olmalı.' })
  @Matches(/^[A-Za-z]{2}$/, { message: 'Geçerli bir ülke kodu gir.' })
  country?: string;

  @ApiPropertyOptional({
    example: 'ATS Bayi İstanbul',
    description: 'Bayi kaydı için zorunlu.',
  })
  @ValidateIf((o: RegisterDto) => o.accountType === AccountType.dealer)
  @IsString()
  @MinLength(2, { message: 'Bayi adı en az 2 karakter olmalı.' })
  dealershipName?: string;
}
