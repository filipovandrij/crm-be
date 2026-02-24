import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get accessSecret() {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private get refreshSecret() {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private get accessTtl() {
    return (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as
      | StringValue
      | number;
  }

  private get refreshTtl() {
    return (this.config.get<string>('JWT_REFRESH_TTL') ?? '7d') as
      | StringValue
      | number;
  }

  private async issueTokens(user: { id: string; email: string }) {
    const payload = { sub: user.id, email: user.email };
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.accessSecret,
        expiresIn: this.accessTtl,
        jwtid: accessJti,
      }),
      this.jwt.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
        jwtid: refreshJti,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async register(email: string, password: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.users.create(email, passwordHash);

    const tokens = await this.issueTokens(user);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.users.setRefreshTokenHash(user.id, refreshTokenHash);

    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens({ id: user.id, email: user.email });
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.users.setRefreshTokenHash(user.id, refreshTokenHash);

    return { user: { id: user.id, email: user.email }, ...tokens };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.issueTokens({ id: user.id, email: user.email });
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.users.setRefreshTokenHash(user.id, refreshTokenHash);

    return tokens;
  }

  async logout(userId: string) {
    await this.users.setRefreshTokenHash(userId, null);
    return { success: true };
  }
}
