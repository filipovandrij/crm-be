import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const THEMES = ['light', 'dark'] as const;
const LANGUAGES = ['ru', 'en'] as const;

class NotificationsSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  email_enabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  push_enabled?: boolean;
}

class AppearanceSettingsDto {
  @ApiPropertyOptional({ enum: THEMES })
  @IsOptional()
  @IsIn(THEMES)
  theme?: (typeof THEMES)[number];
}

class LocalizationSettingsDto {
  @ApiPropertyOptional({ enum: LANGUAGES })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: (typeof LANGUAGES)[number];

  @ApiPropertyOptional({ example: 'Europe/Tbilisi' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: NotificationsSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsSettingsDto)
  notifications?: NotificationsSettingsDto;

  @ApiPropertyOptional({ type: AppearanceSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppearanceSettingsDto)
  appearance?: AppearanceSettingsDto;

  @ApiPropertyOptional({ type: LocalizationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizationSettingsDto)
  localization?: LocalizationSettingsDto;
}
