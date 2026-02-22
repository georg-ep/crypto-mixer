import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

jest.mock('./utils/prismaClient', () => ({
  $disconnect: jest.fn(),
}));

const mockListen = jest.fn();

jest.mock('express', () => {
  const original = jest.requireActual('express');
  return {
    ...original,
    default: () => {
      const app = original();
      app.listen = mockListen;
      return app;
    },
  };
});

describe('app.ts', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use('/wallets', walletRouter);
  });

  it('should start the server and listen on the correct port', async () => {
    process.env.PORT = '3001';
    await import('../src/app');
    expect(mockListen).toHaveBeenCalledWith(3001, expect.any(Function));
  });

  it('should use body parsers and wallet router', async () => {
    await import('../src/app');
    expect(app.use).toHaveBeenCalledTimes(3);
    expect(app.use).toHaveBeenCalledWith(bodyParser.urlencoded({ extended: true }));
    expect(app.use).toHaveBeenCalledWith(bodyParser.json());
    expect(app.use).toHaveBeenCalledWith('/wallets', walletRouter);
  });

  it('should disconnect prisma on success', async () => {
    await import('../src/app');
    expect(prisma.$disconnect).toHaveBeenCalled();
  });

  it('should disconnect prisma and exit on error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });

    try {
      await import('../src/app');
    } catch (error: any) {
        expect(error.message).toContain('process.exit(1)');
    }
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();

  });

  afterAll(async () => {
    await (prisma.$disconnect as jest.Mock).mockClear();
  });
});