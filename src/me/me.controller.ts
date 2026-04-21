import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  me(@CurrentUser() user: JwtAccessPayload) {
    return this.meService.getProfile(user.sub);
  }

  @Get('settings')
  settings(@CurrentUser() user: JwtAccessPayload) {
    return this.meService.getSettings(user.sub);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.meService.updateSettings(user.sub, dto);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.meService.changePassword(user.sub, dto);
  }
}
