import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ProductsService } from "./products.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { multerConfig } from "../upload/multer.config";

@Controller("products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor("image", multerConfig))
  async createProduct(
    @Body()
    createData: {
      name: string;
      price: number;
      negativeAmount: number;
      endDate: string;
    },
    @UploadedFile() file?: Express.Multer.File
  ) {
    let image: string | undefined;
    if (file) {
      image = `/uploads/${file.filename}`;
    }

    return this.productsService.createProduct({
      ...createData,
      image,
      price: parseFloat(createData.price.toString()),
      negativeAmount: parseFloat(createData.negativeAmount.toString()),
    });
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor("image", multerConfig))
  async updateProduct(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateData: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (file) {
      updateData.image = `/uploads/${file.filename}`;
    }

    return this.productsService.updateProduct(id, updateData);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getProducts() {
    return this.productsService.getProducts();
  }

  @Post("user-override")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async setUserTaskOverride(
    @Body() data: { userId: number; productId: number; negativeAmount: number }
  ) {
    return this.productsService.setUserTaskOverride(data);
  }

  @Get("active")
  @UseGuards(JwtAuthGuard)
  async getActiveProductsForUser(@Request() req) {
    return this.productsService.getActiveProductsForUser(req.user.userId);
  }
}
