import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export const CLIENT_STATUSES = ['active', 'inactive', 'blocked'] as const;
export const CLIENT_TAGS = ['vip'] as const;

export class CreateClientDto {
  @ApiProperty({ example: 'Иванов Иван Иванович' })
  @IsString()
  @MinLength(2)
  full_name!: string;

  @ApiPropertyOptional({ example: 'ivanov@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @ApiPropertyOptional({ example: 'Москва' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: CLIENT_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(CLIENT_STATUSES)
  status: (typeof CLIENT_STATUSES)[number] = 'active';

  @ApiPropertyOptional({ enum: CLIENT_TAGS, nullable: true })
  @IsOptional()
  @IsIn(CLIENT_TAGS)
  tag?: (typeof CLIENT_TAGS)[number];
}
