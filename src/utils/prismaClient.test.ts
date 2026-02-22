import prisma from "./prismaClient";
import { PrismaClient } from "@prisma/client";

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

describe("prismaClient", () => {
  it("should initialize PrismaClient", () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it("should mock PrismaClient methods", async () => {
    const mockPrismaClient = new PrismaClient();
    await mockPrismaClient.$connect();
    await mockPrismaClient.$disconnect();
    expect(mockPrismaClient.$connect).toHaveBeenCalled();
    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
  });
});