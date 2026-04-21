import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import {
  addDays,
  formatDateInTimeZone,
  getCurrentMonthToDateRange,
  getPreviousAnalogRange,
  parseIsoDate,
} from '../common/utils/date-range.util';
import { ActivityQueryDto } from './dto/activity-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const timezone = await this.getUserTimezone(userId);
    const currentRange = getCurrentMonthToDateRange(timezone);
    const previousRange = getPreviousAnalogRange(currentRange.from, currentRange.days);

    const [
      requestsTotal,
      requestsTotalPrev,
      requestsCompleted,
      requestsCompletedPrev,
      requestsInProgress,
      requestsInProgressPrev,
      clientsActive,
      clientsActivePrev,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          createdAt: {
            gte: currentRange.from,
            lt: currentRange.toExclusive,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: {
            gte: previousRange.from,
            lt: previousRange.toExclusive,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: 'completed',
          completedAt: {
            gte: currentRange.from,
            lt: currentRange.toExclusive,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: 'completed',
          completedAt: {
            gte: previousRange.from,
            lt: previousRange.toExclusive,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: 'in_progress',
          createdAt: {
            gte: currentRange.from,
            lt: currentRange.toExclusive,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: 'in_progress',
          createdAt: {
            gte: previousRange.from,
            lt: previousRange.toExclusive,
          },
        },
      }),
      this.prisma.client.count({
        where: {
          status: 'active',
          createdAt: {
            lt: currentRange.toExclusive,
          },
        },
      }),
      this.prisma.client.count({
        where: {
          status: 'active',
          createdAt: {
            lt: previousRange.toExclusive,
          },
        },
      }),
    ]);

    return {
      totals: {
        requests_total: requestsTotal,
        clients_active: clientsActive,
        requests_completed: requestsCompleted,
        requests_in_progress: requestsInProgress,
      },
      delta: {
        requests_total_pct: this.calculatePercentDelta(
          requestsTotal,
          requestsTotalPrev,
        ),
        clients_active_pct: this.calculatePercentDelta(
          clientsActive,
          clientsActivePrev,
        ),
        requests_completed_pct: this.calculatePercentDelta(
          requestsCompleted,
          requestsCompletedPrev,
        ),
        requests_in_progress_pct: this.calculatePercentDelta(
          requestsInProgress,
          requestsInProgressPrev,
        ),
      },
      period: currentRange.period,
    };
  }

  async getRecentRequests(limit: number) {
    const items = await this.prisma.order.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        client: true,
      },
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        client_id: item.clientId,
        client_name: item.client.fullName,
        created_at: item.createdAt.toISOString(),
      })),
    };
  }

  async getActivity(userId: string, query: ActivityQueryDto) {
    const timezone = await this.getUserTimezone(userId);
    const from = parseIsoDate(query.from, timezone);
    const to = parseIsoDate(query.to, timezone);

    if (!from || !to) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Validation failed',
        { date: 'Invalid date range' },
      );
    }

    if (from > to) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Validation failed',
        { from: '`from` must be less than or equal to `to`' },
      );
    }

    const toExclusive = addDays(to, 1);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          {
            createdAt: {
              gte: from,
              lt: toExclusive,
            },
          },
          {
            completedAt: {
              gte: from,
              lt: toExclusive,
            },
          },
        ],
      },
      select: {
        createdAt: true,
        completedAt: true,
        status: true,
      },
    });

    const buckets = new Map<
      string,
      { date: string; requests_created: number; requests_completed: number }
    >();

    for (let cursor = from; cursor < toExclusive; cursor = addDays(cursor, 1)) {
      const key = formatDateInTimeZone(cursor, timezone);
      buckets.set(key, {
        date: key,
        requests_created: 0,
        requests_completed: 0,
      });
    }

    for (const order of orders) {
      const createdKey = formatDateInTimeZone(order.createdAt, timezone);
      const createdBucket = buckets.get(createdKey);
      if (createdBucket) {
        createdBucket.requests_created += 1;
      }

      if (order.status === 'completed' && order.completedAt) {
        const completedKey = formatDateInTimeZone(order.completedAt, timezone);
        const completedBucket = buckets.get(completedKey);
        if (completedBucket) {
          completedBucket.requests_completed += 1;
        }
      }
    }

    return {
      group: query.group,
      series: Array.from(buckets.values()),
    };
  }

  private async getUserTimezone(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { timezone: true },
    });

    return settings?.timezone ?? 'Europe/Tbilisi';
  }

  private calculatePercentDelta(current: number, previous: number) {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    return Math.round(((current - previous) / previous) * 100);
  }
}
