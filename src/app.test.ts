import express from "express";
import bodyParser from "body-parser";
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

jest.mock('./routes/wallets', () => ({
  default: {
    // Mock the router's behavior as needed for your tests
    // For now, return a mock router
    use: jest.fn(),
  }
}));

const mockListen = jest.fn();
jest.mock('express', () => {
  const original = jest.requireActual('express');
  return {
    ...original,
    default: () => ({
      ...original(),
      use: jest.fn(),
      listen: mockListen,
    }),
  };
});


describe('app', () => {
  let app: express.Application;
  let server: any; // Use 'any' to avoid type issues with mocked 'listen'

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    const { default: appModule } = await import ('../src/app'); // Import app after mocking
  });

  afterEach(async () => {
    await prisma.$disconnect();
    if (server && server.close) {
      server.close();
    }
  });


  it('should start the server and listen on the correct port', async () => {
    process.env.PORT = '4000';
    const { default: appModule } = await import ('../src/app');
    expect(mockListen).toHaveBeenCalledWith(4000, expect.any(Function));
  });

  it('should use body-parser middleware', async () => {
    const { default: appModule } = await import ('../src/app');
    const expressMock = jest.requireMock('express');
    expect(expressMock.default().use).toHaveBeenCalledWith(bodyParser.urlencoded({ extended: true }));
    expect(expressMock.default().use).toHaveBeenCalledWith(bodyParser.json());
  });

  it('should use the wallet router', async () => {
    const { default: appModule } = await import ('../src/app');
    const expressMock = jest.requireMock('express');
    expect(expressMock.default().use).toHaveBeenCalledWith('/wallets', walletRouter);
  });

  it('should disconnect from the database on success', async () => {
      const { default: appModule } = await import ('../src/app');
      expect(prisma.$disconnect).toHaveBeenCalled();
  });


  it('should disconnect from the database and exit on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
      const mockPrismaDisconnect = jest.fn();
      jest.mock('./utils/prismaClient', () => ({
          default: {
              $disconnect: mockPrismaDisconnect,
          },
      }));
      const { default: appModule } = await import ('../src/app');
      // Simulate an error
      await (async () => {
        try {
          throw new Error('Test error');
        } catch (e) {
            console.error(e);
            await prisma.$disconnect();
            process.exit(1);
        }
      })();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(mockPrismaDisconnect).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();

  });
});