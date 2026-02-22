import express from 'express';
import bodyParser from 'body-parser';
import walletRouter from './routes/wallets';
import prisma from './utils/prismaClient';

jest.mock('./utils/prismaClient', () => ({
  $disconnect: jest.fn(),
}));

jest.mock('express', () => {
  const actual = jest.requireActual('express');
  return {
    ...actual,
    Router: jest.fn(() => ({})),
  };
});

describe('app', () => {
  let app: express.Express;
  let server: any;
  const port = process.env.PORT || 3000;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use('/wallets', walletRouter);
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
  });

  it('should start the server and listen on the correct port', async () => {
    const listenMock = jest.fn((port: number, callback: () => void) => {
      callback();
      return { close: jest.fn() };
    });
    app.listen = listenMock;

    await jest.isolateModules(async () => {
      require('./app');
    });

    expect(listenMock).toHaveBeenCalledWith(port, expect.any(Function));
  });

  it('should use body-parser middleware', () => {
    const useMock = jest.fn();
    app.use = useMock;
    jest.isolateModules(() => {
        require('./app');
    });

    expect(useMock).toHaveBeenCalledWith(bodyParser.urlencoded({ extended: true }));
    expect(useMock).toHaveBeenCalledWith(bodyParser.json());
  });

  it('should use the wallet router', () => {
    const useMock = jest.fn();
    app.use = useMock;

    jest.isolateModules(() => {
        require('./app');
    });
    expect(useMock).toHaveBeenCalledWith('/wallets', walletRouter);
  });

  it('should disconnect from the database after start and on error', async () => {
    const start = require('./app').start;
    await start();
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
  });
});