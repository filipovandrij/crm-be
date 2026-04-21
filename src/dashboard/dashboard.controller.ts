import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { RecentRequestsQueryDto } from './dto/recent-requests-query.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtAccessPayload) {
    return this.dashboardService.getSummary(user.sub);
  }

  @Get('recent-requests')
  recentRequests(@Query() query: RecentRequestsQueryDto) {
    return this.dashboardService.getRecentRequests(query.limit);
  }

  @Get('activity')
  activity(
    @CurrentUser() user: JwtAccessPayload,
    @Query() query: ActivityQueryDto,
  ) {
    return this.dashboardService.getActivity(user.sub, query);
  }
}
