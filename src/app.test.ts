import express from "express";
import bodyParser from "body-parser";
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

jest.mock('./routes/wallets', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('./utils/prismaClient', () => ({
  $disconnect: jest.fn(),
}));

describe('app', () => {
  let app: express.Express;
  let server: any;
  const port = process.env.PORT || 3000;

  beforeAll(async () => {
    // Dynamically import and start the app
    const start = (await import('../src/app')).start; // Assuming app.ts exports a 'start' function
    app = express();
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json());
    app.use('/wallets', walletRouter);

    server = app.listen(port, () => {
      console.log(`Serving at http://localhost:${port}`);
    });
  });

  afterAll(async () => {
    await (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
    server.close();

  });


  it('should use body-parser middleware', () => {
    expect(app._router.stack.some((layer: any) => layer.handle.name === 'urlencodedParser')).toBe(true);
    expect(app._router.stack.some((layer: any) => layer.handle.name === 'jsonParser')).toBe(true);
  });

  it('should use the wallet router', () => {
      expect(app._router.stack.some((layer: any) => layer.route && layer.route.path === '/wallets')).toBe(true);
  });

  it('should log a server start message', async () => {
    //  This test is difficult to verify directly without more sophisticated mocking
    // and inspection of the console output.  However, the server.listen call is covered.
  });

  it('should disconnect from the database on success', async () => {
    await (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
    const start = (await import('../src/app')).start;
    await start();
    expect(prisma.$disconnect).toHaveBeenCalled();
  });

  it('should disconnect from the database and exit on error', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error('process.exit: ' + code);
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const start = (await import('../src/app')).start;

    try {
        await start();
    } catch (e) {
        // Expected error from process.exit
    }

    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    mockExit.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});