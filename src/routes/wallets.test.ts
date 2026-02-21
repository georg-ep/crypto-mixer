import request from 'supertest';
import { app } from '../app'; // Assuming your app is exported from app.ts
import { prismaMock } from '../utils/__mocks__/prismaClient'; // Mock Prisma
import { Wallet } from '@prisma/client';

jest.mock('../utils/prismaClient', () => ({
  prisma: {
    wallet: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('Wallets API', () => {
  it('GET /wallets should return an array of wallets', async () => {
    const wallets: Wallet[] = [
      { id: '1', publicKey: 'publicKey1', createdAt: new Date(), updatedAt: new Date() },
      { id: '2', publicKey: 'publicKey2', createdAt: new Date(), updatedAt: new Date() },
    ];
    (prismaMock.wallet.findMany as jest.Mock).mockResolvedValue(wallets);

    const res = await request(app).get('/wallets');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(wallets);
    expect(prismaMock.wallet.findMany).toHaveBeenCalledTimes(1);
  });

  it('GET /wallets/:id should return a wallet by id', async () => {
    const wallet: Wallet = { id: '1', publicKey: 'publicKey1', createdAt: new Date(), updatedAt: new Date() };
    (prismaMock.wallet.findUnique as jest.Mock).mockResolvedValue(wallet);

    const res = await request(app).get('/wallets/1');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(wallet);
    expect(prismaMock.wallet.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.wallet.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });

  it('POST /wallets should create a new wallet', async () => {
    const newWallet = { publicKey: 'newPublicKey' };
    const createdWallet: Wallet = { id: '3', publicKey: 'newPublicKey', createdAt: new Date(), updatedAt: new Date() };
    (prismaMock.wallet.create as jest.Mock).mockResolvedValue(createdWallet);

    const res = await request(app).post('/wallets').send(newWallet);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(createdWallet);
    expect(prismaMock.wallet.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.wallet.create).toHaveBeenCalledWith({
      data: newWallet,
    });
  });

  it('PUT /wallets/:id should update a wallet', async () => {
    const updatedWalletData = { publicKey: 'updatedPublicKey' };
    const updatedWallet: Wallet = { id: '1', publicKey: 'updatedPublicKey', createdAt: new Date(), updatedAt: new Date() };
    (prismaMock.wallet.update as jest.Mock).mockResolvedValue(updatedWallet);

    const res = await request(app).put('/wallets/1').send(updatedWalletData);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(updatedWallet);
    expect(prismaMock.wallet.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.wallet.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: updatedWalletData,
    });
  });

  it('DELETE /wallets/:id should delete a wallet', async () => {
    (prismaMock.wallet.delete as jest.Mock).mockResolvedValue({ id: '1', publicKey: 'publicKey1', createdAt: new Date(), updatedAt: new Date() });

    const res = await request(app).delete('/wallets/1');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ message: 'Wallet deleted' }); // Assuming your controller returns this
    expect(prismaMock.wallet.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.wallet.delete).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });

  it('GET /wallets/:id returns 404 if wallet not found', async () => {
    (prismaMock.wallet.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/wallets/nonexistent');

    expect(res.statusCode).toEqual(404);
  });

  it('POST /wallets returns 400 if validation fails', async () => {
      const res = await request(app).post('/wallets').send({ invalidField: 'invalidValue' });
      expect(res.statusCode).toBe(400); // Assuming you have validation
  });
});