import request from 'supertest';
import { Router } from "express";
import { sendTransaction } from "../utils/solana";
import { Signer, PublicKey } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";
import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";
import router from "./wallets";
import express from 'express';

jest.mock('../utils/solana', () => ({
  sendTransaction: jest.fn(),
}));

jest.mock('../utils/prismaClient', () => ({
  wallet: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../controllers/walletController', () => ({
  getWalletByPublicKey: jest.fn(),
  updateWallet: jest.fn(),
}));

jest.mock('../utils/validation', () => ({
  validateFields: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use("/", router);

describe('wallets router', {
    timeout: 10000,
  }, () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET / should return wallets', async () => {
    const mockWallets: Wallet[] = [{ id: 1, publicKey: 'test', privateKey: 'test', solBalance: 100, createdAt: new Date(), updatedAt: new Date() }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    const response = await request(app).get('/');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockWallets);
    expect(prisma.wallet.findMany).toHaveBeenCalledTimes(1);
  });

  it('POST /create should create a wallet', async () => {
    const mockWallet = { privateKey: 'privateKey', publicKey: 'publicKey' };
    (prisma.wallet.create as jest.Mock).mockResolvedValue(mockWallet);

    const response = await request(app).post('/create').send(mockWallet);

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('success');
    expect(prisma.wallet.create).toHaveBeenCalledTimes(1);
    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: mockWallet.privateKey,
        publicKey: mockWallet.publicKey,
      },
    });
  });

  it('POST /create should return an error if private key is missing', async () => {
    const response = await request(app).post('/create').send({ publicKey: 'publicKey' });
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Private key required');
  });

  it('POST /create should return an error if public key is missing', async () => {
    const response = await request(app).post('/create').send({ privateKey: 'privateKey' });
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Public key required');
  });

  it('POST /transfer should transfer SOL', async () => {
    const mockFromWallet: Wallet = { id: 1, publicKey: 'from', privateKey: 'fromPrivateKey', solBalance: 100, createdAt: new Date(), updatedAt: new Date() };
    const mockToWallet: Wallet = { id: 2, publicKey: 'to', privateKey: 'toPrivateKey', solBalance: 50, createdAt: new Date(), updatedAt: new Date() };
    const mockSendTransactionResponse: SendTransactionResponse = {
      signature: 'signature',
      fromBal: 50,
      toBal: 100,
      data: 'data',
      url: 'url',
    };

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
    (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
    (WalletController.updateWallet as jest.Mock).mockResolvedValue({});
    (validateFields as jest.Mock).mockReturnValue([]);

    const response = await request(app).post('/transfer').send({ from: 'from', to: 'to', amount: 10 });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockSendTransactionResponse);
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
  });

  it('POST /transfer should return 400 if validation fails', async () => {
    (validateFields as jest.Mock).mockReturnValue(['from', 'to']);
    const response = await request(app).post('/transfer').send({ from: 'from', to: 'to', amount: 10 });
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "Missing required fields",
      missingFields: ['from', 'to'],
    });
    expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(WalletController.updateWallet).not.toHaveBeenCalled();
  });

  it('POST /transfer should handle errors from sendTransaction', async () => {
    (validateFields as jest.Mock).mockReturnValue([]);
    const mockFromWallet: Wallet = { id: 1, publicKey: 'from', privateKey: 'fromPrivateKey', solBalance: 100, createdAt: new Date(), updatedAt: new Date() };
    const mockToWallet: Wallet = { id: 2, publicKey: 'to', privateKey: 'toPrivateKey', solBalance: 50, createdAt: new Date(), updatedAt: new Date() };
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);

    (sendTransaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));
    const response = await request(app).post('/transfer').send({ from: 'from', to: 'to', amount: 10 });

    expect(response.statusCode).toBe(200);
    expect(response.text).toEqual('err Error: Transaction failed');
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(WalletController.updateWallet).not.toHaveBeenCalled();
  });
});