import {
  Controller,
  Patch,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "./users.service";
import { multerConfig } from "../upload/multer.config";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Patch("profile")
  @UseInterceptors(FileInterceptor("profilePicture", multerConfig))
  async updateProfile(
    @Request() req,
    @Body() updateData: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    let profilePicture: string | undefined;

    if (file) {
      profilePicture = `/uploads/${file.filename}`;
    }

    return this.usersService.updateProfile(req.user.userId, {
      ...updateData,
      profilePicture,
    });
  }

  @Post("deposit")
  async createDeposit(
    @Request() req,
    @Body()
    depositData: {
      network: string;
      walletAddress: string;
      amount: number;
    }
  ) {
    if (depositData.amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }

    return this.usersService.createDeposit(req.user.userId, depositData);
  }

  @Post("withdrawal")
  async createWithdrawal(
    @Request() req,
    @Body()
    withdrawalData: {
      network: string;
      walletAddress: string;
      amount: number;
    }
  ) {
    if (withdrawalData.amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }

    return this.usersService.createWithdrawal(req.user.userId, withdrawalData);
  }

  @Get("profile")
  async getProfile(@Request() req) {
    return this.usersService.getUserDetails(req.user.userId);
  }
}
