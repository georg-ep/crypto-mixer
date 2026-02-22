import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router, Request, Response } from 'express';
import router from './wallets';
import { sendTransaction } from "../utils/solana";
import { Signer, PublicKey } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";
import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";

jest.mock('../utils/prismaClient', () => ({
  wallet: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../utils/solana', () => ({
  sendTransaction: jest.fn(),
}));

jest.mock('../controllers/walletController', () => ({
  getWalletByPublicKey: jest.fn(),
  updateWallet: jest.fn(),
}));

describe('wallets router', () => {
  let routerInstance: Router;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    routerInstance = router;
    mockRequest = {
      body: {},
    };
    mockResponse = {
      send: jest.fn(),
      json: jest.fn(),
      status: jest.fn(() => mockResponse),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should get wallets on GET /', async () => {
    const mockWallets = [{ id: '1', publicKey: 'abc' }, { id: '2', publicKey: 'def' }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    await (routerInstance as any).stack.find((layer: any) => layer.route && layer.route.path === '/').route.stack[0].handle(mockRequest, mockResponse);

    expect(prisma.wallet.findMany).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
  });

  it('should create a wallet on POST /create', async () => {
    mockRequest.body = { privateKey: 'private', publicKey: 'public' };
    (prisma.wallet.create as jest.Mock).mockResolvedValue({ id: '1', publicKey: 'public' });

    await (routerInstance as any).stack.find((layer: any) => layer.route && layer.route.path === '/create').route.stack[0].handle(mockRequest, mockResponse);

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: 'private',
        publicKey: 'public',
      },
    });
    expect(mockResponse.send).toHaveBeenCalledWith('success');
  });

  it('should return error if private key is missing on POST /create', async () => {
    mockRequest.body = { publicKey: 'public' };
    await (routerInstance as any).stack.find((layer: any) => layer.route && layer.route.path === '/create').route.stack[0].handle(mockRequest, mockResponse);

    expect(prisma.wallet.create).not.toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith('Private key required');
  });

  it('should return error if public key is missing on POST /create', async () => {
    mockRequest.body = { privateKey: 'private' };

    await (routerInstance as any).stack.find((layer: any) => layer.route && layer.route.path === '/create').route.stack[0].handle(mockRequest, mockResponse);

    expect(prisma.wallet.create).not.toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith('Public key required');
  });

  it('should handle errors on POST /create', async () => {
      mockRequest.body = { privateKey: 'private', publicKey: 'public' };
      (prisma.wallet.create as jest.Mock).mockRejectedValue(new Error('test error'));

      await (routerInstance as any).stack.find((layer: any) => layer.route && layer.route.path === '/create').route.stack[0].handle(mockRequest, mockResponse);

      expect(prisma.wallet.create).toHaveBeenCalled();
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('err'));
  });

  it('should transfer SOL on POST /transfer with valid fields', async () => {
    const from = 'fromPublicKey';
    const to = 'toPublicKey';
    const amount = 10;

    mockRequest.body = { from, to, amount };

    const mockFromAccount: Wallet = { id: '1', privateKey: 'fromPrivateKey', publicKey: from, solBalance: 100 } as any;
    const mockToAccount: Wallet = { id: '2', privateKey: 'toPrivateKey', publicKey: to, solBalance: 50 } as any;

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromAccount);
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockToAccount);

    const mockSendTransactionResponse: SendTransactionResponse = {
      signature: 'signature',
      fromBal: 90,
      toBal: 60,
      data: 'data',
      url: 'url',
    };
    (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
    (WalletController.updateWallet as jest.Mock).mockResolvedValue(null);

    await (routerInstance as any).stack.find((layer: any) => layer.route && layer.route.path === '/transfer').route.stack[0].handle(mockRequest, mockResponse);

    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledWith(from);
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledWith(to);
    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: new PublicKey(from) }),
      expect.objectContaining({ publicKey: new PublicKey(to) }),
      amount
    );
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(WalletController.updateWallet).toHaveBeenCalledWith(from, { solBalance: 90 });
    expect(WalletController.updateWallet).toHaveBeenCalledWith(to, { solBalance: 60 });
    expect(mockResponse.json).toHaveBeenCalledWith(mockSendTransactionResponse);
  });

  it('should return 400 if missing required fields on POST /transfer', async () => {
    mockRequest.body = { from: 'fromPublicKey', to: 'toPublicKey' };
    await (routerInstance as any).stack.find((layer: any) => layer.route && layer.route.path === '/transfer').route.stack[0].handle(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields',
      missingFields: ['amount'],
    });
    expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(WalletController.updateWallet).not.toHaveBeenCalled();
  });

  it('should handle errors on POST /transfer', async () => {
    const from = 'fromPublicKey';
    const to = 'toPublicKey';
    const amount = 10;
    mockRequest.body = { from, to, amount };
    const mockFromAccount: Wallet = { id: '1', privateKey: 'fromPrivateKey', publicKey: from, solBalance: 100 } as any;
    const mockToAccount: Wallet = { id: '2', privateKey: 'toPrivateKey', publicKey: to, solBalance: 50 } as any;
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromAccount);
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockToAccount);

    (sendTransaction as jest.Mock).mockRejectedValue(new Error('test error'));

    await (routerInstance as any).stack.find((layer: any) => layer.route && layer.route.path === '/transfer').route.stack[0].handle(mockRequest, mockResponse);

    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(expect.stringContaining('err'));
  });
});