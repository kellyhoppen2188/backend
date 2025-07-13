import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
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
        referralCode: randomBytes(8).toString("hex").toUpperCase(), // Generate unique referral code
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

    // console.log("user", user);

    // console.log("comparison", await bcrypt.compare(password, user.password));

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

  async resendCredentials(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Generate new password
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Send email
    await this.emailService.sendLoginCredentials(
      user.email,
      user.username,
      newPassword
    );

    return { message: "New credentials sent to your email." };
  }
}
