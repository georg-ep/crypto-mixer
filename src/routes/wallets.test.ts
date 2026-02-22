import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import router from "./wallets";
import prisma from "../utils/prismaClient";
import { sendTransaction } from "../utils/solana";
import WalletController from "../controllers/walletController";
import { Signer, PublicKey } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";
import { Wallet } from "@prisma/client";
import { validateFields } from "../utils/validation";

jest.mock('../utils/prismaClient', () => ({
  default: {
    wallet: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../utils/solana', () => ({
  sendTransaction: jest.fn(),
}));

jest.mock('../controllers/walletController', () => ({
  default: {
    getWalletByPublicKey: jest.fn(),
    updateWallet: jest.fn(),
  },
}));

jest.mock('../utils/validation', () => ({
  validateFields: jest.fn(),
}));

describe('Wallet Routes', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('GET / should return wallets', async () => {
    const mockWallets = [{ id: 1, publicKey: 'public1', privateKey: 'private1' }, { id: 2, publicKey: 'public2', privateKey: 'private2' }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    await router.get("/", mockRequest as Request, mockResponse as Response);

    expect(prisma.wallet.findMany).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
  });

  it('POST /create should create a wallet', async () => {
    mockRequest = {
      body: {
        privateKey: 'privateKey',
        publicKey: 'publicKey',
      },
    };
    (prisma.wallet.create as jest.Mock).mockResolvedValue({ id: 1, publicKey: 'publicKey', privateKey: 'privateKey' });

    await router.post("/create", mockRequest as Request, mockResponse as Response);

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: 'privateKey',
        publicKey: 'publicKey',
      },
    });
    expect(mockResponse.send).toHaveBeenCalledWith("success");
  });

  it('POST /create should return an error if private key is missing', async () => {
    mockRequest = {
      body: {
        publicKey: 'publicKey',
      },
    };

    await router.post("/create", mockRequest as Request, mockResponse as Response);

    expect(mockResponse.send).toHaveBeenCalledWith("Private key required");
  });

  it('POST /create should return an error if public key is missing', async () => {
    mockRequest = {
      body: {
        privateKey: 'privateKey',
      },
    };

    await router.post("/create", mockRequest as Request, mockResponse as Response);

    expect(mockResponse.send).toHaveBeenCalledWith("Public key required");
  });

  it('POST /transfer should transfer SOL', async () => {
    const fromPublicKey = 'fromPublicKey';
    const toPublicKey = 'toPublicKey';
    const amount = 10;
    const fromWallet: Wallet = { id: 1, publicKey: fromPublicKey, privateKey: 'fromPrivateKey', solBalance: 100, createdAt: new Date(), updatedAt: new Date() };
    const toWallet: Wallet = { id: 2, publicKey: toPublicKey, privateKey: 'toPrivateKey', solBalance: 50, createdAt: new Date(), updatedAt: new Date() };

    mockRequest = {
      body: {
        from: fromPublicKey,
        to: toPublicKey,
        amount,
      },
    };

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(fromWallet);
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(toWallet);
    const mockSendTransactionResponse: SendTransactionResponse = {
      signature: 'signature',
      fromBal: 90,
      toBal: 60,
      data: 'data',
      url: 'url',
    };
    (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
    (WalletController.updateWallet as jest.Mock).mockResolvedValue(null);
    (validateFields as jest.Mock).mockReturnValue([]);

    await router.post("/transfer", mockRequest as Request, mockResponse as Response);

    expect(validateFields).toHaveBeenCalledWith({ from: fromPublicKey, to: toPublicKey, amount });
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledWith(fromPublicKey);
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledWith(toPublicKey);
    expect(sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ publicKey: new PublicKey(fromPublicKey) }),
        expect.objectContaining({ publicKey: new PublicKey(toPublicKey) }),
      amount
    );
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(WalletController.updateWallet).toHaveBeenCalledWith(fromPublicKey, { solBalance: 90 });
    expect(WalletController.updateWallet).toHaveBeenCalledWith(toPublicKey, { solBalance: 60 });
    expect(mockResponse.json).toHaveBeenCalledWith({
      signature: 'signature',
      toBal: 60,
      fromBal: 90,
      data: 'data',
      url: 'url',
    });
  });

  it('POST /transfer should return 400 if fields are missing', async () => {
    mockRequest = {
      body: {
        from: 'from',
        to: 'to',
      },
    };

    (validateFields as jest.Mock).mockReturnValue(['amount']);

    await router.post("/transfer", mockRequest as Request, mockResponse as Response);

    expect(validateFields).toHaveBeenCalledWith({ from: 'from', to: 'to', amount: undefined });
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Missing required fields",
      missingFields: ['amount'],
    });
  });

  it('POST /transfer should handle errors from sendTransaction', async () => {
    const fromPublicKey = 'fromPublicKey';
    const toPublicKey = 'toPublicKey';
    const amount = 10;
    const fromWallet: Wallet = { id: 1, publicKey: fromPublicKey, privateKey: 'fromPrivateKey', solBalance: 100, createdAt: new Date(), updatedAt: new Date() };
    const toWallet: Wallet = { id: 2, publicKey: toPublicKey, privateKey: 'toPrivateKey', solBalance: 50, createdAt: new Date(), updatedAt: new Date() };

    mockRequest = {
      body: {
        from: fromPublicKey,
        to: toPublicKey,
        amount,
      },
    };

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(fromWallet);
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(toWallet);
    (sendTransaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));
    (validateFields as jest.Mock).mockReturnValue([]);

    await router.post("/transfer", mockRequest as Request, mockResponse as Response);

    expect(sendTransaction).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith('err Error: Transaction failed');
  });
});