import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminGuard } from "../auth/admin.guard";

@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post("submit")
  async submitTask(@Request() req, @Body() data: { productId: number }) {
    return this.tasksService.submitTask(req.user.userId, data.productId);
  }

  @Get("my-tasks")
  async getUserTasks(@Request() req) {
    return this.tasksService.getUserTasks(req.user.userId);
  }

  @Patch("reset/:userId")
  @UseGuards(AdminGuard)
  async resetUserTasks(@Param("userId", ParseIntPipe) userId: number) {
    return this.tasksService.resetUserTasks(userId);
  }
}
