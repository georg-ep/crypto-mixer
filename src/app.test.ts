import express from 'express';
import bodyParser from 'body-parser';
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

jest.mock('express', () => {
  const original = jest.requireActual('express');
  return {
    ...original,
    listen: jest.fn().mockImplementation((port: any, callback: any) => {
      callback();
    }),
  };
});

jest.mock('./routes/wallets', () => ({
  __esModule: true,
  default: {
    use: jest.fn()
  }
}));

describe('app', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call express listen with the correct port', async () => {
    process.env.PORT = '4000';
    const expressMock = express as jest.Mocked<typeof express>;
    const listenMock = expressMock().listen as jest.Mock;

    jest.isolateModules(async () => {
      require('./app');
    });

    expect(listenMock).toHaveBeenCalledWith(4000, expect.any(Function));
    delete process.env.PORT;
  });

  it('should use bodyParser.urlencoded and bodyParser.json', async () => {
    const expressMock = express as jest.Mocked<typeof express>;
    const appMock = {
        use: jest.fn()
    };
    expressMock.mockReturnValue(appMock as any);

    jest.isolateModules(async () => {
        require('./app');
    });

    expect(appMock.use).toHaveBeenCalledWith(bodyParser.urlencoded({ extended: true }));
    expect(appMock.use).toHaveBeenCalledWith(bodyParser.json());
  });

  it('should use the walletRouter', async () => {
    const expressMock = express as jest.Mocked<typeof express>;
    const appMock = {
      use: jest.fn()
    };
    expressMock.mockReturnValue(appMock as any);
    const walletRouterMock = jest.fn();
    jest.mock('./routes/wallets', () => ({
        __esModule: true,
        default: {
            use: walletRouterMock
        }
    }));

    jest.isolateModules(async () => {
        require('./app');
    });

    expect(appMock.use).toHaveBeenCalledWith('/wallets', expect.anything());
  });

  it('should disconnect prisma after start', async () => {
      const disconnectMock = jest.spyOn(prisma, '$disconnect').mockImplementation();
      jest.isolateModules(async () => {
          require('./app');
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(disconnectMock).toHaveBeenCalled();
      disconnectMock.mockRestore();
  });

  it('should handle prisma disconnect error', async () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
    const disconnectMock = jest.spyOn(prisma, '$disconnect').mockImplementation(() => {
      throw new Error("Prisma disconnect error");
    });
    const exitMock = jest.spyOn(process, 'exit').mockImplementation((code) => {
      // Simulate process exit without actually exiting
      throw new Error(`Process exited with code: ${code}`);
    });
    try {
        jest.isolateModules(async () => {
          require('./app');
        });
        await new Promise(resolve => setTimeout(resolve, 0));
    } catch (e: any) {
        expect(e.message).toContain("Process exited with code: 1");
    }
    expect(consoleErrorMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
    expect(exitMock).toHaveBeenCalledWith(1);
    consoleErrorMock.mockRestore();
    disconnectMock.mockRestore();
    exitMock.mockRestore();
  });
});