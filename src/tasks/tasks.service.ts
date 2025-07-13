import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async submitTask(userId: number, productId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userTaskOverrides: true,
        taskSubmissions: { where: { productId } },
      },
    });

    if (!user) throw new BadRequestException("User not found");
    if (user.balance < 0)
      throw new BadRequestException("Cannot submit task with negative balance");

    // Check if user already submitted this product
    if (user.taskSubmissions.length > 0) {
      throw new BadRequestException("Product task already completed");
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new BadRequestException("Product not found");
    if (!product.isActive || new Date() > product.endDate) {
      throw new BadRequestException("Product is not available");
    }

    // Check level requirements
    const maxTasks = user.level === 1 ? 33 : 38;
    const profitRate = user.level === 1 ? 0.75 : 1;

    // Minimum balance check only for first task
    if (user.completedTasks === 0 && user.balance < 50) {
      throw new BadRequestException(
        "Minimum balance of $50 required for first task"
      );
    }

    if (user.completedTasks >= maxTasks) {
      if (user.level === 1 && user.completedTasks === 33) {
        throw new BadRequestException(
          "Upgrade to premium to continue or withdraw first"
        );
      }
      throw new BadRequestException(
        "Maximum tasks reached. Please withdraw first"
      );
    }

    // Get negative amount (check for user override)
    const userOverride = user.userTaskOverrides.find(
      (o) => o.productId === productId
    );
    const negativeAmount =
      userOverride?.negativeAmount || product.negativeAmount;

    if (user.balance < negativeAmount) {
      throw new BadRequestException("Insufficient balance for this task");
    }

    // Calculate profit as percentage of current balance
    const profitEarned = user.balance * (profitRate / 100);
    let newBalance = user.balance + profitEarned - negativeAmount;

    // Execute transaction
    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.taskSubmission.create({
        data: {
          userId,
          productId,
          profitEarned,
          amountDebited: negativeAmount,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: newBalance,
          completedTasks: user.completedTasks + 1,
        },
      });

      // Handle referral bonus - when referrer completes task, referred users get 25% of profit
      const referredUsers = await tx.user.findMany({
        where: { referredById: userId },
      });

      if (referredUsers.length > 0) {
        const bonusAmount = profitEarned * 0.25; // 25% of profit

        for (const referredUser of referredUsers) {
          await tx.referralBonus.create({
            data: {
              referrerId: userId, // The person who referred (task completer)
              referredUserId: referredUser.id, // The person who was referred
              taskSubmissionId: submission.id,
              bonusAmount,
            },
          });

          // Add bonus to referred user's balance (not deducted from referrer)
          await tx.user.update({
            where: { id: referredUser.id },
            data: {
              balance: { increment: bonusAmount },
            },
          });
        }
      }

      return submission;
    });
  }

  async getUserTasks(userId: number) {
    return this.prisma.taskSubmission.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async resetUserTasks(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { completedTasks: 0 },
    });
  }
}
