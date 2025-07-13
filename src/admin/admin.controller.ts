import {
  Controller,
  Patch,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminGuard } from "../auth/admin.guard";

@Controller("admin")
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post("signup")
  async adminSignup(
    @Body()
    signupDto: {
      email: string;
      username: string;
      password: string;
      name?: string;
    }
  ) {
    return this.adminService.adminSignup(signupDto);
  }

  @Post("login")
  async adminLogin(@Body() loginDto: { username: string; password: string }) {
    return this.adminService.adminLogin(loginDto.username, loginDto.password);
  }

  @Patch("users/:id/balance")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUserBalance(
    @Param("id", ParseIntPipe) userId: number,
    @Body() data: { balance: number }
  ) {
    return this.adminService.updateUserBalance(userId, data.balance);
  }

  @Get("users/:id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserDetails(@Param("id", ParseIntPipe) userId: number) {
    return this.adminService.getUserDetails(userId);
  }

  @Post("user-negative-override")
  async setUserNegativeOverride(
    @Body()
    data: {
      userId: number;
      productIds: number[];
      negativeAmount: number;
    }
  ) {
    return this.adminService.setUserNegativeOverride(data);
  }

  @Get("dashboard/stats")
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get("users")
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get("users/:id/deposits")
  async getUserDeposits(@Param("id", ParseIntPipe) userId: number) {
    return this.adminService.getUserDeposits(userId);
  }

  @Patch("deposits/:id/approve")
  async approveDeposit(@Param("id", ParseIntPipe) depositId: number) {
    return this.adminService.approveDeposit(depositId);
  }

  @Patch("deposits/:id/reject")
  async rejectDeposit(@Param("id", ParseIntPipe) depositId: number) {
    return this.adminService.rejectDeposit(depositId);
  }

  @Patch("users/:id/wallet")
  async updateUserWallet(
    @Param("id", ParseIntPipe) userId: number,
    @Body() data: { walletAddress: string; walletNetwork: string }
  ) {
    return this.adminService.updateUserWallet(userId, data);
  }
}
