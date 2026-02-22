import request from 'supertest';
import express, { Router } from 'express';
import { sendTransaction } from '../utils/solana';
import { Signer, PublicKey } from '@solana/web3.js';
import { SendTransactionResponse } from '../interfaces/solana';
import { Wallet } from '@prisma/client';
import prisma from '../utils/prismaClient';
import WalletController from '../controllers/walletController';
import { validateFields } from '../utils/validation';
import router from './wallets'; // Import the router directly

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

jest.mock('../utils/solana', () => ({
  sendTransaction: jest.fn(),
}));

jest.mock('../utils/validation', () => ({
    validateFields: jest.fn(),
  });

describe('Wallets API',  () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', router);
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return a list of wallets', async () => {
      const mockWallets: Wallet[] = [{ id: 1, privateKey: 'key1', publicKey: 'pub1', solBalance: 100 }];
      (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockWallets);
      expect(prisma.wallet.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /create', () => {
    it('should create a new wallet', async () => {
      const newWallet = { privateKey: 'key1', publicKey: 'pub1' };
      (prisma.wallet.create as jest.Mock).mockResolvedValue(newWallet);

      const response = await request(app).post('/create').send(newWallet);

      expect(response.status).toBe(200);
      expect(response.text).toBe('success');
      expect(prisma.wallet.create).toHaveBeenCalledTimes(1);
      expect(prisma.wallet.create).toHaveBeenCalledWith({
        data: newWallet,
      });
    });

    it('should return an error if private key is missing', async () => {
      const response = await request(app).post('/create').send({ publicKey: 'pub1' });
      expect(response.status).toBe(200);
      expect(response.text).toBe('Private key required');
    });

    it('should return an error if public key is missing', async () => {
        const response = await request(app).post('/create').send({ privateKey: 'key1' });
        expect(response.status).toBe(200);
        expect(response.text).toBe('Public key required');
      });

    it('should return an error if wallet creation fails', async () => {
      const newWallet = { privateKey: 'key1', publicKey: 'pub1' };
      (prisma.wallet.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/create').send(newWallet);

      expect(response.status).toBe(200);
      expect(response.text).toContain('err');
      expect(prisma.wallet.create).toHaveBeenCalledTimes(1);
      expect(prisma.wallet.create).toHaveBeenCalledWith({
        data: newWallet,
      });
    });
  });

  describe('POST /transfer', () => {
    it('should transfer SOL successfully', async () => {
      const from = 'fromPub';
      const to = 'toPub';
      const amount = 10;
      const mockFromWallet: Wallet = { id: 1, privateKey: 'fromKey', publicKey: from, solBalance: 100 };
      const mockToWallet: Wallet = { id: 2, privateKey: 'toKey', publicKey: to, solBalance: 50 };
      const mockSendTransactionResponse: SendTransactionResponse = {
        signature: 'signature',
        fromBal: 90,
        toBal: 60,
        data: 'data',
        url: 'url',
      };

      (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
      (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
      (WalletController.updateWallet as jest.Mock).mockResolvedValue({});
      (validateFields as jest.Mock).mockReturnValue([]);

      const response = await request(app).post('/transfer').send({ from, to, amount });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSendTransactionResponse);
      expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
      expect(WalletController.getWalletByPublicKey).toHaveBeenCalledWith(from);
      expect(WalletController.getWalletByPublicKey).toHaveBeenCalledWith(to);
      expect(sendTransaction).toHaveBeenCalledTimes(1);
      expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
      expect(WalletController.updateWallet).toHaveBeenCalledWith(from, { solBalance: 90 });
      expect(WalletController.updateWallet).toHaveBeenCalledWith(to, { solBalance: 60 });
      expect(validateFields).toHaveBeenCalledWith({ from, to, amount });
    });

    it('should return an error if required fields are missing', async () => {
      (validateFields as jest.Mock).mockReturnValue(['from']);
      const response = await request(app).post('/transfer').send({to: 'to', amount: 10});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.missingFields).toEqual(['from']);
      expect(validateFields).toHaveBeenCalledWith({ from: undefined, to: 'to', amount: 10 });
    });

    it('should handle errors during transfer', async () => {
        const from = 'fromPub';
        const to = 'toPub';
        const amount = 10;
        const mockFromWallet: Wallet = { id: 1, privateKey: 'fromKey', publicKey: from, solBalance: 100 };
        const mockToWallet: Wallet = { id: 2, privateKey: 'toKey', publicKey: to, solBalance: 50 };
        (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
        (sendTransaction as jest.Mock).mockRejectedValue(new Error('Transfer failed'));
        (validateFields as jest.Mock).mockReturnValue([]);

        const response = await request(app).post('/transfer').send({ from, to, amount });

        expect(response.status).toBe(200);
        expect(response.text).toContain('err');
        expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
        expect(sendTransaction).toHaveBeenCalledTimes(1);
        expect(WalletController.updateWallet).not.toHaveBeenCalled();
        expect(validateFields).toHaveBeenCalledWith({ from, to, amount });
      });
  });
});