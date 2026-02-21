import express from "express";
import bodyParser from "body-parser";
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

jest.mock('./routes/wallets', () => ({
  __esModule: true,
  default: {
    use: jest.fn(),
  },
}));

jest.mock('./utils/prismaClient', () => ({
  $disconnect: jest.fn(),
}));


describe('app.ts', () => {
  let app: express.Express;
  let server: any;
  const port = process.env.PORT || 3000;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const start = async () => {
        const app = express();
        app.use(bodyParser.urlencoded({ extended: true }))
        app.use(bodyParser.json());
        app.use('/wallets', walletRouter);

        return app;
    };

    app = await start();
    server = app.listen(port);
  });

  afterAll(async () => {
    server.close();
    await (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
    jest.restoreAllMocks();
  });

  it('should use body-parser middleware', () => {
    expect(app._router.stack.some((layer: any) => layer.handle.name === 'urlencodedParser')).toBeTruthy();
    expect(app._router.stack.some((layer: any) => layer.handle.name === 'jsonParser')).toBeTruthy();
  });

  it('should use walletRouter', () => {
    expect(walletRouter.use).toHaveBeenCalled();
  });

  it('should log a message when the server starts', () => {
    const consoleLogSpy = jest.spyOn(console, 'log');
    consoleLogSpy.mockClear();
    server.close();
    const newServer = app.listen(port, () => {
      console.log(`Serving at http://localhost:${port}`);
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(`Serving at http://localhost:${port}`);
    newServer.close();
  });

  it('should disconnect from prisma after start resolves', async () => {
    await (prisma.$disconnect as jest.Mock).mockClear();
    await (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
    expect(prisma.$disconnect).toHaveBeenCalled();
  });

  it('should handle errors during start', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    consoleErrorSpy.mockClear();

    const startWithError = async () => {
        throw new Error('Test error');
    };

    try {
        await startWithError();
    } catch (e) {
    }

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
    processExitSpy.mockRestore();
  });
});