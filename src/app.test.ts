import express from 'express';
import bodyParser from 'body-parser';
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";
import { start } from './app';

jest.mock('./routes/wallets', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn(),
  },
}));

jest.mock('./utils/prismaClient', () => ({
  $disconnect: jest.fn(),
}));

describe('App', () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    // Mock the console.log and console.error calls
    console.log = jest.fn();
    console.error = jest.fn();

    // Call start and save the express app instance
    await start();

    // Use a simple server for testing, since app.listen is already called in start()
    const appInstance = express();
    appInstance.use(bodyParser.urlencoded({ extended: true }));
    appInstance.use(bodyParser.json());
    appInstance.use('/wallets', walletRouter);
    server = appInstance.listen(process.env.PORT || 3000);
    app = appInstance;
  });

  afterAll(async () => {
    // Close the server and disconnect Prisma
    server.close();
    await (prisma.$disconnect as jest.Mock).mockClear();
    jest.clearAllMocks();
  });


  it('should use body-parser middleware', async () => {
    expect(app._router.stack.some((layer: any) => layer.handle.name === 'urlencodedParser')).toBe(true);
    expect(app._router.stack.some((layer: any) => layer.handle.name === 'jsonParser')).toBe(true);
  });

  it('should use the wallet router', async () => {
    expect(app._router.stack.some((layer: any) => layer.route && layer.route.path === '/wallets')).toBe(true);
  });

  it('should log a message when the server starts', () => {
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Serving at http://localhost:'));
  });

  it('should disconnect from prisma on success', async () => {
    await start().then(async () => {
      await (prisma.$disconnect as jest.Mock).mockClear();
    });
    expect(prisma.$disconnect).toHaveBeenCalled();
  });

  it('should disconnect from prisma and exit on error', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      // Simulate an error during start
      const startWithError = async () => {
        throw new Error('Simulated error');
      };

      await startWithError().catch(async (e: any) => {
        await (prisma.$disconnect as jest.Mock).mockClear();
        expect(console.error).toHaveBeenCalled();
        expect(prisma.$disconnect).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
      console.error = originalConsoleError;
      mockExit.mockRestore();
  });

});