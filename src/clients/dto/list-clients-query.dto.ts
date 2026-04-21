import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CLIENT_STATUSES, CLIENT_TAGS } from './create-client.dto';

const CLIENT_SORT_FIELDS = ['created_at', 'full_name', 'orders_count'] as const;

export class ListClientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CLIENT_STATUSES })
  @IsOptional()
  @IsIn(CLIENT_STATUSES)
  status?: (typeof CLIENT_STATUSES)[number];

  @ApiPropertyOptional({ enum: CLIENT_TAGS })
  @IsOptional()
  @IsIn(CLIENT_TAGS)
  tag?: (typeof CLIENT_TAGS)[number];

  @ApiPropertyOptional({ enum: CLIENT_SORT_FIELDS, default: 'created_at' })
  @IsOptional()
  @IsIn(CLIENT_SORT_FIELDS)
  declare sort: (typeof CLIENT_SORT_FIELDS)[number];
}
