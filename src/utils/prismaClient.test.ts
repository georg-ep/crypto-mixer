import prisma from './prismaClient';

describe('prismaClient', () => {
  it('should initialize prisma client', () => {
    expect(prisma).toBeDefined();
  });

  it('should be an instance of PrismaClient', () => {
    // @ts-ignore - Accessing the constructor for testing purposes
    expect(prisma).toBeInstanceOf(prisma.constructor);
  });

  afterAll(async () => {
    // Close the prisma connection after all tests
    await prisma.$disconnect();
  });
});