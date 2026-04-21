import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MeService } from './me.service';

@ApiTags('navigation')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('navigation')
export class NavigationController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getNavigation(@CurrentUser() user: JwtAccessPayload) {
    return this.meService.getNavigation(user.sub);
  }
}
