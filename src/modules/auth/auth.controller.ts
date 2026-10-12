import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AllowPasswordChange, AuthUser, CurrentUser, Public } from '../../common/decorators/index.js';
import { AuthService, TokenPair } from './auth.service.js';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto.js';

const COOKIE = 'sagi_rt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { tokens, user } = await this.auth.login(dto.username, dto.password, this.meta(req));
    return this.respond(res, tokens, user);
  }

  /** Renueva el access token usando la cookie httpOnly. Cada uso rota el refresh token. */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { tokens, user } = await this.auth.refresh(req.cookies?.[COOKIE], this.meta(req));
      return this.respond(res, tokens, user);
    } catch (e) {
      this.clearCookie(res);
      throw e;
    }
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    this.clearCookie(res);
  }

  @ApiBearerAuth()
  @AllowPasswordChange()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @ApiBearerAuth()
  @AllowPasswordChange()
  @HttpCode(200)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword, this.meta(req));
    return this.respond(res, r.tokens, r.user);
  }

  private respond(res: Response, t: TokenPair, user: AuthUser) {
    res.cookie(COOKIE, t.refreshToken, {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE'),
      sameSite: this.config.get('COOKIE_SAME_SITE'),
      path: '/api/v1/auth',
      maxAge: this.auth.refreshTtl * 1000,
    });
    return { accessToken: t.accessToken, expiresIn: t.expiresIn, user };
  }

  private clearCookie(res: Response) {
    res.clearCookie(COOKIE, {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE'),
      sameSite: this.config.get('COOKIE_SAME_SITE'),
      path: '/api/v1/auth',
    });
  }

  private meta(req: Request) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }
}
