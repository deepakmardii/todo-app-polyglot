import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwtService = new JwtService({ secret: JWT_SECRET });

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('No auth header');
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Invalid auth header');
    try {
      const payload: Record<string, unknown> = this.jwtService.verify(token, {
        secret: JWT_SECRET,
      });
      (req as unknown as { user?: Record<string, unknown> }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
