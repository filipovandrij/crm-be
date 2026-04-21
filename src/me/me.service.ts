import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AppException } from '../common/exceptions/app.exception';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersService.findProfileById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async getSettings(userId: string) {
    const settings = await this.ensureSettings(userId);
    return this.toSettingsResponse(settings);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    await this.ensureSettings(userId);

    const settings = await this.prisma.userSettings.update({
      where: { userId },
      data: {
        ...(dto.notifications?.email_enabled !== undefined
          ? { emailEnabled: dto.notifications.email_enabled }
          : {}),
        ...(dto.notifications?.push_enabled !== undefined
          ? { pushEnabled: dto.notifications.push_enabled }
          : {}),
        ...(dto.appearance?.theme !== undefined
          ? { theme: dto.appearance.theme }
          : {}),
        ...(dto.localization?.language !== undefined
          ? { language: dto.localization.language }
          : {}),
        ...(dto.localization?.timezone !== undefined
          ? { timezone: dto.localization.timezone }
          : {}),
      },
    });

    return this.toSettingsResponse(settings);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordIsValid = await bcrypt.compare(
      dto.current_password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'CURRENT_PASSWORD_INVALID',
        'Current password is invalid',
      );
    }

    if (dto.new_password.length < 8) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'WEAK_PASSWORD',
        'Password must be at least 8 characters long',
      );
    }

    const passwordHash = await bcrypt.hash(dto.new_password, 10);
    await this.usersService.updatePasswordHash(userId, passwordHash);

    return { ok: true };
  }

  async getNavigation(userId: string) {
    const user = await this.getProfile(userId);

    const items = [
      {
        key: 'dashboard',
        label: 'Дашборд',
        path: '/dashboard',
        icon: 'dashboard',
      },
      {
        key: 'requests',
        label: 'Заявки',
        path: '/requests',
        icon: 'orders',
      },
      {
        key: 'clients',
        label: 'Клиенты',
        path: '/clients',
        icon: 'users',
      },
      {
        key: 'settings',
        label: 'Настройки',
        path: '/settings',
        icon: 'settings',
      },
    ];

    return {
      items: user.role === 'admin' ? items : items.filter((item) => item.key !== 'settings'),
    };
  }

  private async ensureSettings(userId: string) {
    await this.getProfile(userId);

    return this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
      },
    });
  }

  private toSettingsResponse(settings: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    theme: string;
    language: string;
    timezone: string;
  }) {
    return {
      notifications: {
        email_enabled: settings.emailEnabled,
        push_enabled: settings.pushEnabled,
      },
      appearance: {
        theme: settings.theme,
      },
      localization: {
        language: settings.language,
        timezone: settings.timezone,
      },
    };
  }
}
