import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimezonesQueryDto } from './dto/timezones-query.dto';

const LANGUAGE_ITEMS = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

const FALLBACK_TIMEZONES = ['Europe/Tbilisi', 'Europe/Moscow', 'UTC'];

@ApiTags('meta')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('meta')
export class MetaController {
  @Get('languages')
  languages() {
    return { items: LANGUAGE_ITEMS };
  }

  @Get('timezones')
  timezones(@Query() query: TimezonesQueryDto) {
    const search = query.search?.trim().toLowerCase();
    const intlWithSupportedValues = Intl as typeof Intl & {
      supportedValuesOf?: (key: 'timeZone') => string[];
    };

    const timezones =
      intlWithSupportedValues.supportedValuesOf?.('timeZone') ??
      FALLBACK_TIMEZONES;
    const items = search
      ? timezones.filter((timezone) => timezone.toLowerCase().includes(search))
      : timezones;

    return { items: items.slice(0, 100) };
  }
}
