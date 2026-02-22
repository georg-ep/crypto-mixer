import request from 'supertest';
import { Router } from 'express';
import { sendTransaction } from '../utils/solana';
import { Signer, PublicKey } from '@solana/web3.js';
import { SendTransactionResponse } from '../interfaces/solana';
import { Wallet } from '@prisma/client';
import prisma from '../utils/prismaClient';
import WalletController from '../controllers/walletController';
import { validateFields } from '../utils/validation';
import walletsRouter from './wallets';
import express from 'express';

jest.mock('../utils/solana');
jest.mock('../utils/prismaClient');
jest.mock('../controllers/walletController');
jest.mock('../utils/validation');

const app = express();
app.use(express.json());
app.use(walletsRouter);

describe('wallets routes', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('GET / should return wallets', async () => {
    const mockWallets: Wallet[] = [{ id: '1', publicKey: 'abc', privateKey: '123', solBalance: 100 }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    const res = await request(app).get('/');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockWallets);
    expect(prisma.wallet.findMany).toHaveBeenCalledTimes(1);
  });

  it('POST /create should create a wallet', async () => {
    const mockWallet = { publicKey: 'abc', privateKey: '123' };
    (prisma.wallet.create as jest.Mock).mockResolvedValue(mockWallet);

    const res = await request(app).post('/create').send(mockWallet);

    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('success');
    expect(prisma.wallet.create).toHaveBeenCalledTimes(1);
    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: mockWallet.privateKey,
        publicKey: mockWallet.publicKey,
      },
    });
  });

  it('POST /create should return error if privateKey is missing', async () => {
    const res = await request(app).post('/create').send({ publicKey: 'abc' });
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('Private key required');
  });

  it('POST /create should return error if publicKey is missing', async () => {
    const res = await request(app).post('/create').send({ privateKey: '123' });
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('Public key required');
  });


  it('POST /create should handle errors', async () => {
    (prisma.wallet.create as jest.Mock).mockRejectedValue(new Error('test error'));
    const mockWallet = { publicKey: 'abc', privateKey: '123' };
    const res = await request(app).post('/create').send(mockWallet);

    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('err Error: test error');
  });

  it('POST /transfer should transfer sol', async () => {
    const from = 'fromPublicKey';
    const to = 'toPublicKey';
    const amount = 10;
    const fromWallet: Wallet = { id: '1', publicKey: from, privateKey: 'fromPrivateKey', solBalance: 100 };
    const toWallet: Wallet = { id: '2', publicKey: to, privateKey: 'toPrivateKey', solBalance: 50 };
    const mockResponse: SendTransactionResponse = {
      signature: 'signature',
      fromBal: 90,
      toBal: 60,
      data: 'data',
      url: 'url',
    };

    (validateFields as jest.Mock).mockReturnValue([]);
    (WalletController.getWalletByPublicKey as jest.Mock)
      .mockResolvedValueOnce(fromWallet)
      .mockResolvedValueOnce(toWallet);
    (sendTransaction as jest.Mock).mockResolvedValue(mockResponse);
    (WalletController.updateWallet as jest.Mock).mockResolvedValue({});


    const res = await request(app).post('/transfer').send({ from, to, amount });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockResponse);
    expect(validateFields).toHaveBeenCalledWith({ from, to, amount });
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: new PublicKey(from) }),
      expect.objectContaining({ publicKey: new PublicKey(to) }),
      amount
    );
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(WalletController.updateWallet).toHaveBeenCalledWith(from, { solBalance: mockResponse.fromBal });
    expect(WalletController.updateWallet).toHaveBeenCalledWith(to, { solBalance: mockResponse.toBal });
  });

  it('POST /transfer should handle missing fields', async () => {
    (validateFields as jest.Mock).mockReturnValue(['from', 'to']);
    const res = await request(app).post('/transfer').send({ amount: 10 });
    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({
      error: 'Missing required fields',
      missingFields: ['from', 'to'],
    });
    expect(validateFields).toHaveBeenCalledWith({ from: undefined, to: undefined, amount: 10 });
  });

  it('POST /transfer should handle errors from sendTransaction', async () => {
      const from = 'fromPublicKey';
      const to = 'toPublicKey';
      const amount = 10;
      const fromWallet: Wallet = { id: '1', publicKey: from, privateKey: 'fromPrivateKey', solBalance: 100 };
      const toWallet: Wallet = { id: '2', publicKey: to, privateKey: 'toPrivateKey', solBalance: 50 };

      (validateFields as jest.Mock).mockReturnValue([]);
      (WalletController.getWalletByPublicKey as jest.Mock)
          .mockResolvedValueOnce(fromWallet)
          .mockResolvedValueOnce(toWallet);
      (sendTransaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

      const res = await request(app).post('/transfer').send({ from, to, amount });

      expect(res.statusCode).toEqual(200);
      expect(res.text).toEqual('err Error: Transaction failed');
  });

});