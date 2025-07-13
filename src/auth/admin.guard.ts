import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    console.log("user", user);

    // Check if token is for admin
    if (user.type === "admin") {
      const admin = await this.prisma.admin.findUnique({
        where: { id: user.userId },
        select: { id: true, isActive: true },
      });

      if (!admin || !admin.isActive) {
        throw new ForbiddenException("Admin access denied");
      }

      return true;
    }

    throw new ForbiddenException("Admin access required");
  }
}
