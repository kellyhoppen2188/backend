import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(
    userId: number,
    data: {
      name?: string;
      walletAddress?: string;
      phone?: string;
      walletNetwork?: string;
      email?: string;
      country?: string;
      profilePicture?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new BadRequestException("User not found");

    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.walletAddress) updateData.walletAddress = data.walletAddress;
    if (data.phone) updateData.phone = data.phone;
    if (data.walletNetwork) updateData.walletNetwork = data.walletNetwork;
    if (data.email) updateData.email = data.email;
    if (data.country) updateData.country = data.country;
    if (data.profilePicture) updateData.profilePicture = data.profilePicture;

    // Handle password update
    if (data.currentPassword && data.newPassword) {
      const isValidPassword = await bcrypt.compare(
        data.currentPassword,
        user.password
      );
      if (!isValidPassword)
        throw new BadRequestException("Current password is incorrect");

      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        walletAddress: true,
        phone: true,
        walletNetwork: true,
        country: true,
        profilePicture: true,
        balance: true,
      },
    });
  }

  async createDeposit(
    userId: number,
    data: {
      network: string;
      walletAddress: string;
      amount: number;
    }
  ) {
    return this.prisma.deposit.create({
      data: {
        userId,
        network: data.network,
        walletAddress: data.walletAddress,
        amount: data.amount,
      },
    });
  }

  async createWithdrawal(
    userId: number,
    data: {
      network: string;
      walletAddress: string;
      amount: number;
    }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new BadRequestException("User not found");
    if (user.balance < data.amount)
      throw new BadRequestException("Insufficient balance");

    return this.prisma.withdrawal.create({
      data: {
        userId,
        network: data.network,
        walletAddress: data.walletAddress,
        amount: data.amount,
      },
    });
  }
  private getMaxTasksForLevel(level: number): number {
    return level === 1 ? 33 : 38;
  }

  async getUserDetails(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        referredBy: {
          select: {
            id: true,
            username: true,
            referralCode: true,
          },
        },
        referrals: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
        taskSubmissions: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        deposits: {
          orderBy: {
            createdAt: "desc",
          },
        },
        withdrawals: {
          orderBy: {
            createdAt: "desc",
          },
        },
        referralBonuses: {
          include: {
            referrer: {
              select: {
                username: true,
              },
            },
            taskSubmission: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    return {
      ...user,
      maxTasks: this.getMaxTasksForLevel(user.level),
    };
  }
}
