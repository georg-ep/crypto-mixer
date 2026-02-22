import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import prisma from "./prismaClient";
import { PrismaClient } from "@prisma/client";

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    // Add mocks for your models here.  Example:
    // user: {
    //   findUnique: jest.fn(),
    //   create: jest.fn(),
    //   update: jest.fn(),
    //   delete: jest.fn(),
    //   findMany: jest.fn(),
    // },
  })),
}));

describe('prismaClient', () => {
  let mockPrismaClient: any;

  beforeEach(() => {
    mockPrismaClient = new PrismaClient() as any;
    (PrismaClient as jest.Mock).mockClear();
  });


  it('should initialize PrismaClient', () => {
    expect(prisma).toBeDefined();
    expect(PrismaClient).toHaveBeenCalledTimes(1);
  });

  it('should connect and disconnect (mocked)', async () => {
    // Access methods through the mocked instance
    await mockPrismaClient.$connect();
    await mockPrismaClient.$disconnect();

    expect(mockPrismaClient.$connect).toHaveBeenCalled();
    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
  });


  // Add more tests to verify any specific behavior or interactions
  // with the Prisma client, if applicable.
});