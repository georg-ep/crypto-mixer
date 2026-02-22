import express from 'express';
import bodyParser from 'body-parser';
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

jest.mock('express', () => {
  const actualExpress = jest.requireActual('express');
  return {
    ...actualExpress,
    Router: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    })),
  };
});

jest.mock('./routes/wallets', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("./utils/prismaClient", () => ({
  $disconnect: jest.fn(),
}));

describe('app.ts', () => {
  let app: express.Express;
  let server: any;
  beforeAll(async () => {
    const { default: actualApp } = await import('./app');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
  });

  it('should call app.listen with the correct port', async () => {
    const listenMock = jest.fn();
    (express as any).mockImplementation(() => ({
      use: jest.fn(),
      listen: listenMock,
    }));
    await import('./app');
    expect(listenMock).toHaveBeenCalled();
  });

  it('should use bodyParser.urlencoded and bodyParser.json', async () => {
    const useMock = jest.fn();
    (express as any).mockImplementation(() => ({
      use: useMock,
      listen: jest.fn(),
    }));
    await import('./app');
    expect(useMock).toHaveBeenCalledWith(bodyParser.urlencoded({ extended: true }));
    expect(useMock).toHaveBeenCalledWith(bodyParser.json());
  });

  it('should use the walletRouter', async () => {
    const useMock = jest.fn();
    (express as any).mockImplementation(() => ({
      use: useMock,
      listen: jest.fn(),
    }));
    await import('./app');
    expect(useMock).toHaveBeenCalledWith('/wallets', walletRouter);
  });

  it('should disconnect from prisma on success', async () => {
    const disconnectMock = (prisma as any).$disconnect;
    (express as any).mockImplementation(() => ({
      use: jest.fn(),
      listen: jest.fn(),
    }));
    await import('./app');
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('should disconnect from prisma on error', async () => {
    const disconnectMock = (prisma as any).$disconnect;
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
    const processExitMock = jest.spyOn(process, 'exit').mockImplementation();

    (express as any).mockImplementation(() => ({
      use: jest.fn(),
      listen: jest.fn(),
    }));
    const originalEnv = process.env;
    process.env = { ...originalEnv, PORT: '3001' };

    try {
      await import('./app');
    } catch (e) {
      // expected error
    } finally {
      expect(disconnectMock).toHaveBeenCalled();
      expect(consoleErrorMock).toHaveBeenCalled();
      expect(processExitMock).toHaveBeenCalledWith(1);
      consoleErrorMock.mockRestore();
      processExitMock.mockRestore();
      process.env = originalEnv;
    }
  });

});