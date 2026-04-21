import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const ORDER_STATUSES = ['new', 'in_progress', 'completed', 'cancelled'] as const;

export class CreateOrderDto {
  @ApiProperty({ example: 'Заявка ORD-00030' })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional({ example: 'Жалоба на качество обслуживания' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @ApiProperty({ example: 'cmabc123clientid' })
  @IsString()
  @MinLength(1)
  client_id!: string;

  @ApiPropertyOptional({ enum: ORDER_STATUSES, default: 'new' })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status: (typeof ORDER_STATUSES)[number] = 'new';
}
