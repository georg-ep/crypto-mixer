import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import prisma from "./prismaClient";
import { PrismaClient } from "@prisma/client";

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  })),
}));


describe('prisma', () => {
  it('should be an instance of PrismaClient', () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it('should have mocked methods', () => {
    expect(prisma.findUnique).toBeDefined();
    expect(prisma.findMany).toBeDefined();
    expect(prisma.create).toBeDefined();
    expect(prisma.update).toBeDefined();
    expect(prisma.delete).toBeDefined();
    expect(prisma.count).toBeDefined();
  });
});