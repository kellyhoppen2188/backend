import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async adminSignup(data: {
    email: string;
    username: string;
    password: string;
    name?: string;
  }) {
    const existing = await this.prisma.admin.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existing) {
      throw new BadRequestException("Admin already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const admin = await this.prisma.admin.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });

    return { message: "Admin created successfully", admin };
  }

  async adminLogin(username: string, password: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!admin.isActive) {
      throw new UnauthorizedException("Admin account is inactive");
    }

    const payload = { sub: admin.id, username: admin.username, type: "admin" };
    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
      },
    };
  }

  async updateUserBalance(userId: number, balance: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User not found");

    return this.prisma.user.update({
      where: { id: userId },
      data: { balance },
      select: {
        id: true,
        username: true,
        email: true,
        balance: true,
      },
    });
  }

  async getUserDetails(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        deposits: { orderBy: { createdAt: "desc" } },
        withdrawals: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async setUserNegativeOverride(data: {
    userId: number;
    productIds: number[];
    negativeAmount: number;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) throw new BadRequestException("User not found");

    // Remove existing overrides for this user and these products
    await this.prisma.userTaskOverride.deleteMany({
      where: {
        userId: data.userId,
        productId: { in: data.productIds },
      },
    });

    // Create new overrides
    const overrides = await this.prisma.userTaskOverride.createMany({
      data: data.productIds.map((productId) => ({
        userId: data.userId,
        productId,
        negativeAmount: data.negativeAmount,
      })),
    });

    return overrides;
  }

  async getDashboardStats() {
    const [
      totalUsers,
      totalOrders,
      todaysTransactions,
      pendingPayout,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.taskSubmission.count(),
      this.prisma.taskSubmission.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.withdrawal.aggregate({
        where: { status: "pending" },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      todaysTransactions,
      pendingPayout: pendingPayout._sum.amount || 0,
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        phone: true,
        balance: true,
        level: true,
        completedTasks: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUserDeposits(userId: number) {
    return this.prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveDeposit(depositId: number) {
    return this.prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.findUnique({ where: { id: depositId } });
      if (!deposit) throw new BadRequestException("Deposit not found");

      // Update deposit status
      const updatedDeposit = await tx.deposit.update({
        where: { id: depositId },
        data: { status: "completed" },
      });

      // Update user balance
      await tx.user.update({
        where: { id: deposit.userId },
        data: { balance: { increment: deposit.amount } },
      });

      return updatedDeposit;
    });
  }

  async rejectDeposit(depositId: number) {
    return this.prisma.deposit.update({
      where: { id: depositId },
      data: { status: "rejected" },
    });
  }

  async updateUserWallet(
    userId: number,
    data: { walletAddress: string; walletNetwork: string }
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: data.walletAddress,
        walletNetwork: data.walletNetwork,
      },
    });
  }
}
