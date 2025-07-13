// src/tasks/tasks.module.ts
import { Module } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { TasksController } from "./tasks.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminGuard } from "../auth/admin.guard";

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [TasksService, AdminGuard],
})
export class TasksModule {}
