import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TimezonesQueryDto {
  @ApiPropertyOptional({ example: 'Europe' })
  @IsOptional()
  @IsString()
  search?: string;
}
