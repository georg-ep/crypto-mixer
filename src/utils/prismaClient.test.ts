import prisma from "./prismaClient";
import { PrismaClient } from "@prisma/client";

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

describe("prismaClient", {
  describe: "Prisma Client Initialization",
    it('should initialize PrismaClient', () => {
      expect(prisma).toBeDefined();
      expect(prisma).toBeInstanceOf(PrismaClient);
    });

    it('should connect and disconnect without errors', async () => {
      const mockClient = new PrismaClient() as jest.Mocked<PrismaClient>;
      await mockClient.$connect();
      await mockClient.$disconnect();
      expect(mockClient.$connect).toHaveBeenCalled();
      expect(mockClient.$disconnect).toHaveBeenCalled();
    });
});