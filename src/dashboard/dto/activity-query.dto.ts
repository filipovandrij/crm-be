import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';

export class ActivityQueryDto {
  @ApiProperty({ example: '2026-02-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({ example: '2026-02-25' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @ApiProperty({ example: 'day', enum: ['day'] })
  @IsIn(['day'])
  group!: 'day';
}
