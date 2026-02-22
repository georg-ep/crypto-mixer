import express from 'express';
import bodyParser from 'body-parser';
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

jest.mock('./utils/prismaClient', () => ({
  $disconnect: jest.fn(),
}));

describe('App', () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use('/wallets', walletRouter);

    server = app.listen(3000, () => {
      console.log(`Serving at http://localhost:3000`);
    });
  });

  afterAll(async () => {
    await (prisma as any).$disconnect.mockResolvedValueOnce(undefined);
    server.close();
    jest.restoreAllMocks();
  });

  it('should start the server and listen on the correct port', (done) => {
    expect(server.listening).toBe(true);
    done();
  });

  it('should use body-parser middleware', () => {
    expect(app._router.stack.some((layer: any) => layer.handle.name === 'urlencodedParser')).toBe(true);
    expect(app._router.stack.some((layer: any) => layer.handle.name === 'jsonParser')).toBe(true);
  });

  it('should use the wallet router', () => {
    expect(app._router.stack.some((layer: any) => layer.regexp.source === '\\/wallets\\b')).toBe(true);
  });

  it('should handle errors during startup', async () => {
    const originalExit = process.exit;
    (process as any).exit = jest.fn();
    const mockError = new Error('Test error');
    const start = async () => {
      throw mockError;
    };

    jest.spyOn(console, 'error').mockImplementation(() => {});

    await start().catch(async (e) => {
      console.error(e);
      await (prisma as any).$disconnect();
      process.exit(1);
    });

    expect(console.error).toHaveBeenCalledWith(mockError);
    expect((process as any).exit).toHaveBeenCalledWith(1);
    (process as any).exit = originalExit;
  });

  it('should disconnect from the database on server close', async () => {
    server.close();
    await (prisma as any).$disconnect();
    expect((prisma as any).$disconnect).toHaveBeenCalled();
  });
});

jest.isolateModules(() => { require("./app"); });