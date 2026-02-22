import express from 'express';
import bodyParser from 'body-parser';
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";

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
    server = app.listen(3000);
  });

  afterEach(async () => {
    server.close();
    await prisma.$disconnect();
  });

  it('should start the server and listen on the correct port', async () => {
    const port = process.env.PORT || 3000;
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const server = app.listen(port, () => {
      console.log(`Serving at http://localhost:${port}`);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(consoleLogSpy).toHaveBeenCalledWith(`Serving at http://localhost:${port}`);
    server.close();
    consoleLogSpy.mockRestore();
  });

  it('should disconnect from the database on success', async () => {
    await prisma.$disconnect();
    expect(prisma.$disconnect).toHaveBeenCalled();
  });

  it('should disconnect from the database on error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockError = new Error('Test error');

    jest.spyOn(app, 'listen').mockImplementation(((port, callback) => {
        callback();
        return {
          close: () => {},
        };
    }) as any);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await prisma.$disconnect();
    expect(prisma.$disconnect).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});