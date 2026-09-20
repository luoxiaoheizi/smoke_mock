import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
export interface AuthRequest { headers: Record<string, unknown>; playerId: string }
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !/^Bearer [a-f0-9]{64}$/.test(header)) throw new UnauthorizedException('需要有效的登录凭证');
    request.playerId = await this.auth.identify(header.slice(7));
    return true;
  }
}

