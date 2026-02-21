import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import prisma from './prismaClient';

jest.mock('@prisma/client', () => ({
  PrismaClient: mockDeep(),
}));

describe('prismaClient', () => {
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock = mockDeep<PrismaClient>();
  });

  it('should initialize PrismaClient', () => {
    expect(prisma).toBeDefined();
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it('should have a $connect method', async () => {
    await prisma.$connect();
    expect(prisma.$connect).toHaveBeenCalled();
  });

  it('should have a $disconnect method', async () => {
    await prisma.$disconnect();
    expect(prisma.$disconnect).toHaveBeenCalled();
  });

  // Add more tests for the specific methods used in your application
  // For example, if you use prisma.wallet.findMany, add a test for it:
  // it('should call findMany on wallet', async () => {
  //   prismaMock.wallet.findMany.mockResolvedValue([]);
  //   const wallets = await prisma.wallet.findMany();
  //   expect(prismaMock.wallet.findMany).toHaveBeenCalled();
  //   expect(wallets).toEqual([]);
  // });

  afterEach(async () => {
    await prisma.$disconnect(); // Ensure disconnection after each test
  });
});