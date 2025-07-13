import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminGuard } from "../auth/admin.guard";

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, AdminGuard],
})
export class ProductsModule {}
