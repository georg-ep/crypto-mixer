import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Router, Request, Response } from 'express';
import router from './wallets';
import { sendTransaction } from "../utils/solana";
import { Signer, PublicKey } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";
import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";

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

describe('wallets route', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
    } as any;
    mockResponse = {
      send: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;
    jest.clearAllMocks();
  });

  it('GET / should return wallets', async () => {
    const mockWallets = [{ id: 1, publicKey: 'test' }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    await router.stack[0].handle(mockRequest, mockResponse);

    expect(prisma.wallet.findMany).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
  });

  it('POST /create should create a wallet', async () => {
    mockRequest.body = { privateKey: 'private', publicKey: 'public' };
    (prisma.wallet.create as jest.Mock).mockResolvedValue({id:1, privateKey: 'private', publicKey: 'public'});

    await router.stack[1].handle(mockRequest, mockResponse);

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: 'private',
        publicKey: 'public',
      },
    });
    expect(mockResponse.send).toHaveBeenCalledWith('success');
  });

  it('POST /create should return an error if private key is missing', async () => {
    mockRequest.body = { publicKey: 'public' };

    await router.stack[1].handle(mockRequest, mockResponse);

    expect(mockResponse.send).toHaveBeenCalledWith('Private key required');
    expect(prisma.wallet.create).not.toHaveBeenCalled();
  });

  it('POST /create should return an error if public key is missing', async () => {
    mockRequest.body = { privateKey: 'private' };

    await router.stack[1].handle(mockRequest, mockResponse);

    expect(mockResponse.send).toHaveBeenCalledWith('Public key required');
    expect(prisma.wallet.create).not.toHaveBeenCalled();
  });


  it('POST /transfer should transfer SOL successfully', async () => {
    const mockFromWallet: any = { id: 1, privateKey: 'fromPrivate', publicKey: 'fromPublic', solBalance: 100 };
    const mockToWallet: any = { id: 2, privateKey: 'toPrivate', publicKey: 'toPublic', solBalance: 50 };
    const mockSendTransactionResponse: SendTransactionResponse = {
      signature: 'signature',
      fromBal: 90,
      toBal: 60,
      data: 'data',
      url: 'url',
    };

    mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: 10 };
    (validateFields as jest.Mock).mockReturnValue([]);
    (WalletController.getWalletByPublicKey as jest.Mock).mockImplementation(
      (publicKey: string) => {
        if (publicKey === 'fromPublic') return Promise.resolve(mockFromWallet);
        if (publicKey === 'toPublic') return Promise.resolve(mockToWallet);
        return Promise.reject(new Error('Wallet not found'));
      }
    );
    (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
    (WalletController.updateWallet as jest.Mock).mockResolvedValue(undefined);


    await router.stack[2].handle(mockRequest, mockResponse);

    expect(validateFields).toHaveBeenCalledWith({ from: 'fromPublic', to: 'toPublic', amount: 10 });
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledWith('fromPublic');
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledWith('toPublic');
    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: new PublicKey('fromPublic') }),
      expect.objectContaining({ publicKey: new PublicKey('toPublic') }),
      10
    );
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(WalletController.updateWallet).toHaveBeenCalledWith('fromPublic', { solBalance: 90 });
    expect(WalletController.updateWallet).toHaveBeenCalledWith('toPublic', { solBalance: 60 });
    expect(mockResponse.json).toHaveBeenCalledWith({
      signature: 'signature',
      toBal: 60,
      fromBal: 90,
      data: 'data',
      url: 'url',
    });
  });

  it('POST /transfer should return an error if missing fields', async () => {
    mockRequest.body = { from: 'fromPublic' };
    (validateFields as jest.Mock).mockReturnValue(['to', 'amount']);

    await router.stack[2].handle(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields',
      missingFields: ['to', 'amount'],
    });
    expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(WalletController.updateWallet).not.toHaveBeenCalled();
  });

  it('POST /transfer should handle errors from sendTransaction', async () => {
    mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: 10 };
    (validateFields as jest.Mock).mockReturnValue([]);
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValue({ privateKey: 'key', publicKey: 'fromPublic' });
    (sendTransaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

    await router.stack[2].handle(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith('err Error: Transaction failed');
    expect(WalletController.updateWallet).not.toHaveBeenCalled();
  });
});