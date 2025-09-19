import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(data: {
    name: string;
    image?: string;
    price: number;
    negativeAmount: number;
    endDate: string;
  }) {
    return this.prisma.product.create({
      data: {
        ...data,
        endDate: new Date(data.endDate),
      },
    });
  }

  async updateProduct(
    id: number,
    data: {
      name?: string;
      image?: string;
      price?: string;
      negativeAmount?: string;
      endDate?: string;
      isActive?: string;
    }
  ) {
    const updateData: any = {
      ...data,
      price: parseFloat(data.price),
      negativeAmount: parseFloat(data.negativeAmount),
      isActive: data.isActive === "true" ? true : false,
    };
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  async getProducts() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getActiveProducts() {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        endDate: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getActiveProductsForUser(userId: number) {
    const submittedProductIds = await this.prisma.taskSubmission.findMany({
      where: { userId },
      select: { productId: true },
    });

    const submittedIds = submittedProductIds.map((task) => task.productId);

    const [products, userOverrides] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          endDate: { gt: new Date() },
          id: { notIn: submittedIds },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.userTaskOverride.findMany({
        where: { userId },
        select: { productId: true, negativeAmount: true },
      }),
    ]);

    // Create a map for quick override lookups
    const overrideMap = new Map(
      userOverrides.map((override) => [
        override.productId,
        override.negativeAmount,
      ])
    );

    // Apply overrides to products
    return products.map((product) => ({
      ...product,
      negativeAmount: overrideMap.get(product.id) ?? product.negativeAmount,
    }));
  }

  async setUserTaskOverride(data: {
    userId: number;
    productId: number;
    negativeAmount: number;
  }) {
    return this.prisma.userTaskOverride.upsert({
      where: {
        userId_productId: {
          userId: data.userId,
          productId: data.productId,
        },
      },
      update: {
        negativeAmount: data.negativeAmount,
      },
      create: data,
    });
  }
}
