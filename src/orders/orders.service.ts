import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListOrdersQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sort, query.order);

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toListItem(item)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async create(dto: CreateOrderDto) {
    await this.ensureClientExists(dto.client_id);

    const order = await this.prisma.order.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status,
        clientId: dto.client_id,
        completedAt: this.resolveCompletedAt(dto.status, undefined),
      },
      include: {
        client: true,
      },
    });

    return this.toDetailResponse(order);
  }

  async getById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.toDetailResponse(order);
  }

  async update(id: string, dto: UpdateOrderDto) {
    const existingOrder = await this.getOrderEntityById(id);

    if (dto.client_id) {
      await this.ensureClientExists(dto.client_id);
    }

    const nextStatus = dto.status ?? existingOrder.status;

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        ...(dto.client_id !== undefined ? { clientId: dto.client_id } : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              completedAt: this.resolveCompletedAt(dto.status, existingOrder.completedAt),
            }
          : nextStatus === 'completed' && existingOrder.completedAt === null
            ? { completedAt: new Date() }
            : {}),
      },
      include: {
        client: true,
      },
    });

    return this.toDetailResponse(order);
  }

  async remove(id: string) {
    await this.getOrderEntityById(id);

    await this.prisma.order.delete({
      where: { id },
    });

    return { ok: true };
  }

  private buildWhere(query: ListOrdersQueryDto): Prisma.OrderWhereInput {
    const search = query.search?.trim();
    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          client: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          client: {
            phone: { contains: search, mode: 'insensitive' },
          },
        },
        {
          client: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sort: ListOrdersQueryDto['sort'],
    order: ListOrdersQueryDto['order'],
  ): Prisma.OrderOrderByWithRelationInput {
    switch (sort) {
      case 'client_name':
        return { client: { fullName: order } };
      case 'status':
        return { status: order };
      case 'created_at':
      default:
        return { createdAt: order };
    }
  }

  private toListItem(
    order: Prisma.OrderGetPayload<{
      include: { client: true };
    }>,
  ) {
    return {
      id: order.id,
      code: toOrderCode(order.id),
      client_id: order.clientId,
      client_name: order.client.fullName,
      phone: order.client.phone,
      status: order.status,
      status_label: toOrderStatusLabel(order.status),
      created_at: order.createdAt.toISOString(),
      description: order.description ?? order.title,
      actions: {
        call_url: order.client.phone ? `tel:${order.client.phone}` : null,
      },
    };
  }

  private toDetailResponse(
    order: Prisma.OrderGetPayload<{
      include: { client: true };
    }>,
  ) {
    return {
      id: order.id,
      code: toOrderCode(order.id),
      title: order.title,
      description: order.description ?? order.title,
      status: order.status,
      status_label: toOrderStatusLabel(order.status),
      created_at: order.createdAt.toISOString(),
      updated_at: order.updatedAt.toISOString(),
      completed_at: order.completedAt?.toISOString() ?? null,
      client: {
        id: order.client.id,
        full_name: order.client.fullName,
        phone: order.client.phone,
        email: order.client.email,
      },
      actions: {
        call_url: order.client.phone ? `tel:${order.client.phone}` : null,
      },
      history: this.toHistory(order),
    };
  }

  private toHistory(
    order: Prisma.OrderGetPayload<{
      include: { client: true };
    }>,
  ) {
    const history = [
      {
        type: 'created',
        label: 'Заявка создана',
        created_at: order.createdAt.toISOString(),
      },
    ];

    if (order.status === 'completed' && order.completedAt) {
      history.push({
        type: 'completed',
        label: 'Заявка завершена',
        created_at: order.completedAt.toISOString(),
      });
    }

    if (order.status === 'cancelled') {
      history.push({
        type: 'cancelled',
        label: 'Заявка отменена',
        created_at: order.updatedAt.toISOString(),
      });
    }

    if (order.status === 'in_progress') {
      history.push({
        type: 'in_progress',
        label: 'Заявка в работе',
        created_at: order.updatedAt.toISOString(),
      });
    }

    return history;
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private async getOrderEntityById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private resolveCompletedAt(
    status: string,
    previousCompletedAt: Date | null | undefined,
  ) {
    if (status === 'completed') {
      return previousCompletedAt ?? new Date();
    }

    return null;
  }
}

function toOrderStatusLabel(status: string) {
  switch (status) {
    case 'new':
      return 'Новая';
    case 'in_progress':
      return 'В работе';
    case 'completed':
      return 'Завершена';
    case 'cancelled':
      return 'Отменена';
    default:
      return status;
  }
}

function toOrderCode(id: string) {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `ORD-${String(hash % 100000).padStart(5, '0')}`;
}
