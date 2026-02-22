import express from "express";
import bodyParser from "body-parser";
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";
import request from 'supertest';

jest.mock('./routes/wallets', () => ({
  default: {
    use: jest.fn(),
  },
}));

const mockListen = jest.fn();

jest.mock('express', () => {
  return jest.fn(() => ({
    use: jest.fn(),
    listen: mockListen,
  }));
});

describe('app', () => {
  let app: express.Express;

  beforeEach(async () => {
    jest.clearAllMocks();
    (express as jest.Mock).mockClear();
    (express as jest.Mock).mockImplementation(() => {
      return {
        use: jest.fn(),
        listen: mockListen,
      } as any;
    });

    // Re-import app.ts to ensure mocks are applied
    const { default: start } = await import('./app');

    // Simulate the start function
    await start();

    app = (express as jest.Mock).mock.results[0].value;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });


  it('should initialize express app and use middlewares and routers', async () => {
    expect(express).toHaveBeenCalled();
    expect(app.use).toHaveBeenCalledTimes(3);
    expect(app.use).toHaveBeenCalledWith(bodyParser.urlencoded({ extended: true }));
    expect(app.use).toHaveBeenCalledWith(bodyParser.json());
    expect(app.use).toHaveBeenCalledWith('/wallets', walletRouter);
  });

  it('should start the server and listen on the correct port', async () => {
    const port = process.env.PORT || 3000;
    expect(mockListen).toHaveBeenCalledWith(port, expect.any(Function));
  });


  it('should disconnect prisma after start resolves', async () => {
    await import('./app');
    expect(prisma.$disconnect).toHaveBeenCalled();
  });

  it('should disconnect prisma and exit on startup error', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();
    const originalProcessExit = process.exit;
    process.exit = jest.fn() as any;


    jest.mock('./app', () => {
      return {
        default: jest.fn().mockRejectedValue(new Error('Test error')),
      };
    }, { virtual: true });
    await import('./app');

    expect(console.error).toHaveBeenCalled();
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });
});