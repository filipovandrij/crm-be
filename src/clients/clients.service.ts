import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListClientsQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sort, query.order);

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toClientResponse(item)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async create(dto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: {
        fullName: dto.full_name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        city: dto.city ?? null,
        status: dto.status,
        tag: dto.tag ?? null,
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return this.toClientResponse(client);
  }

  async getById(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return this.toClientResponse(client);
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.getById(id);

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.full_name !== undefined ? { fullName: dto.full_name } : {}),
        ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone ?? null } : {}),
        ...(dto.city !== undefined ? { city: dto.city ?? null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.tag !== undefined ? { tag: dto.tag ?? null } : {}),
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return this.toClientResponse(client);
  }

  private buildWhere(query: ListClientsQueryDto): Prisma.ClientWhereInput {
    const search = query.search?.trim();
    const where: Prisma.ClientWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.tag) {
      where.tag = query.tag;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sort: ListClientsQueryDto['sort'],
    order: ListClientsQueryDto['order'],
  ): Prisma.ClientOrderByWithRelationInput {
    switch (sort) {
      case 'full_name':
        return { fullName: order };
      case 'orders_count':
        return { orders: { _count: order } };
      case 'created_at':
      default:
        return { createdAt: order };
    }
  }

  private toClientResponse(
    client: Prisma.ClientGetPayload<{
      include: { _count: { select: { orders: true } } };
    }>,
  ) {
    return {
      id: client.id,
      full_name: client.fullName,
      email: client.email,
      phone: client.phone,
      city: client.city,
      status: client.status,
      tag: client.tag,
      orders_count: client._count.orders,
      created_at: client.createdAt.toISOString(),
    };
  }
}
