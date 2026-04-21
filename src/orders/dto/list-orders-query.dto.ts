import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const ORDER_STATUSES = ['new', 'in_progress', 'completed', 'cancelled'] as const;
const ORDER_SORT_FIELDS = ['created_at', 'client_name', 'status'] as const;

export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: (typeof ORDER_STATUSES)[number];

  @ApiPropertyOptional({ enum: ORDER_SORT_FIELDS, default: 'created_at' })
  @IsOptional()
  @IsIn(ORDER_SORT_FIELDS)
  declare sort: (typeof ORDER_SORT_FIELDS)[number];
}
