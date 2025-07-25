import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService
  ) {}

  async signup(data: {
    phone: string;
    email: string;
    username: string;
    inviteCode?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existing) {
      throw new BadRequestException("User already exists");
    }

    let referredById: number | undefined;

    // Check if invite code exists and find referrer
    if (data.inviteCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: data.inviteCode },
      });

      if (referrer) {
        referredById = referrer.id;
      }
    }

    const password = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: data.phone,
        email: data.email,
        username: data.username,
        password: hashedPassword,
        referredById,
        inviteCode: data.inviteCode,
        referralCode: randomBytes(8).toString("hex").toUpperCase().slice(0, 7), // Generate unique referral code
      },
    });

    await this.emailService.sendLoginCredentials(
      data.email,
      data.username,
      password
    );

    return {
      message:
        "User created successfully. Check your email for login credentials.",
    };
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = { sub: user.id, username: user.username, type: "user" };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        referralCode: user.referralCode,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security, don't reveal if email exists or not
      return {
        message:
          "If an account with that email exists, we've sent a password reset link.",
      };
    }

    // Invalidate any existing reset tokens for this user
    await this.prisma.passwordReset.updateMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        used: true,
      },
    });

    // Generate new reset token
    const resetToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message:
        "If an account with that email exists, we've sent a password reset link.",
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (
      !passwordReset ||
      passwordReset.used ||
      passwordReset.expiresAt < new Date()
    ) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: passwordReset.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { used: true },
      }),
    ]);

    return { message: "Password reset successfully." };
  }
}
