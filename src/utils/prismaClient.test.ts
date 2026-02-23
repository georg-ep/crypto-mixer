import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import prisma from "./prismaClient";
import { PrismaClient } from "@prisma/client";

// Mock the PrismaClient
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

describe('prismaClient', () => {
  let mockPrismaClient: any;

  beforeAll(() => {
    mockPrismaClient = new PrismaClient() as any;
  });

  afterAll(async () => {
    // Attempt to disconnect prisma to avoid resource leaks.
    if (mockPrismaClient && typeof mockPrismaClient.$disconnect === 'function') {
      await mockPrismaClient.$disconnect().catch(() => {}); // catch errors during disconnect
    }
    jest.resetAllMocks();
  });


  it('should initialize PrismaClient', () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });


  it('should have findUnique method', () => {
    expect(prisma.findUnique).toBeDefined();
  });

  it('should have findMany method', () => {
    expect(prisma.findMany).toBeDefined();
  });

  it('should have create method', () => {
    expect(prisma.create).toBeDefined();
  });

  it('should have update method', () => {
    expect(prisma.update).toBeDefined();
  });

  it('should have delete method', () => {
    expect(prisma.delete).toBeDefined();
  });

  it('should have count method', () => {
    expect(prisma.count).toBeDefined();
  });
});