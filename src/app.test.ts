import express from 'express';
import bodyParser from 'body-parser';
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

jest.mock('express', () => {
  const originalModule = jest.requireActual('express');
  return {
    ...originalModule,
    listen: jest.fn().mockImplementation((port: any, callback: any) => {
      callback();
    }),
  };
});

jest.mock('./routes/wallets', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn()
  }
}));

jest.mock('./utils/prismaClient', () => ({
  $disconnect: jest.fn(),
}));

describe('app', () => {
  let app: express.Express;
  let server: any;
  beforeEach(async () => {
    jest.clearAllMocks();
    app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use('/wallets', walletRouter);
    server = {
      listen: (port: number, callback: () => void) => {
          callback();
      }
    }
    jest.spyOn(server, 'listen');
  });

  afterEach(async () => {
    (prisma.$disconnect as jest.Mock).mockClear();
  });


  it('should start the server and listen on the correct port', async () => {
    process.env.PORT = '3001';
    const start = async () => {
        const app = express();
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(bodyParser.json());
        app.use('/wallets', walletRouter);

        app.listen(process.env.PORT, () => {
            console.log(`Serving at http://localhost:${process.env.PORT}`);
        });
    };

    await start();

    expect(express.listen).toHaveBeenCalledWith(process.env.PORT, expect.any(Function));
  });

  it('should use body parser', () => {
    expect(app.use).toHaveBeenCalledWith(bodyParser.urlencoded({ extended: true }));
    expect(app.use).toHaveBeenCalledWith(bodyParser.json());
  });

  it('should use the wallet router', () => {
    expect(app.use).toHaveBeenCalledWith('/wallets', walletRouter);
  });

  it('should disconnect from prisma on success', async () => {
    const start = async () => {
        const app = express();
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(bodyParser.json());
        app.use('/wallets', walletRouter);

        app.listen(process.env.PORT, () => {
            console.log(`Serving at http://localhost:${process.env.PORT}`);
        });
    };
    await start();
    await prisma.$disconnect();
    expect(prisma.$disconnect).toHaveBeenCalled();
  });

  it('should disconnect from prisma on error', async () => {
    const start = async () => {
        const app = express();
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(bodyParser.json());
        app.use('/wallets', walletRouter);
        app.listen(process.env.PORT, () => {
            console.log(`Serving at http://localhost:${process.env.PORT}`);
        });
    };

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error('process.exit ' + code);
    });

    try {
      await start().catch(e => { throw e });
    } catch (e) {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(prisma.$disconnect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    }
    consoleErrorSpy.mockRestore();
    mockExit.mockRestore();

  });
});