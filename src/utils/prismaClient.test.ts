import prisma from "./prismaClient";
import { PrismaClient } from "@prisma/client";

describe("prismaClient", () => {
  it("should initialize PrismaClient", () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it("should have a $connect function", async () => {
    if (prisma && typeof prisma.$connect === 'function') {
      await expect(prisma.$connect()).resolves.toBe(undefined);
      await prisma.$disconnect();
    }
  });

  it("should have a $disconnect function", async () => {
    if (prisma && typeof prisma.$disconnect === 'function') {
        await prisma.$connect();
        await expect(prisma.$disconnect()).resolves.toBe(undefined);
    }
  });
});