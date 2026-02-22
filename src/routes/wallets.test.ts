import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import router from "./wallets";
import prisma from "../utils/prismaClient";
import * as solanaUtils from "../utils/solana";
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

jest.mock("../utils/solana");
jest.mock("../controllers/walletController");
jest.mock("../utils/validation");


describe('wallets router', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      send: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('GET / should return wallets', async () => {
    const mockWallets = [{ id: 1, publicKey: 'test' }, { id: 2, publicKey: 'test2' }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    await router.get("/", mockRequest as Request, mockResponse as Response);

    expect(prisma.wallet.findMany).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
  });

  it('POST /create should create a wallet', async () => {
    mockRequest = {
      body: {
        privateKey: 'private',
        publicKey: 'public',
      },
    };
    (prisma.wallet.create as jest.Mock).mockResolvedValue({ privateKey: 'private', publicKey: 'public' });

    await router.post("/create", mockRequest as Request, mockResponse as Response);

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: 'private',
        publicKey: 'public',
      },
    });
    expect(mockResponse.send).toHaveBeenCalledWith("success");
  });

  it('POST /create should handle errors', async () => {
    mockRequest = {
      body: {
        privateKey: 'private',
        publicKey: 'public',
      },
    };
    const mockError = new Error('Test error');
    (prisma.wallet.create as jest.Mock).mockRejectedValue(mockError);

    await router.post("/create", mockRequest as Request, mockResponse as Response);

    expect(prisma.wallet.create).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(`err ${mockError}`);
  });

  it('POST /transfer should transfer SOL successfully', async () => {
    const mockFrom = 'fromPublicKey';
    const mockTo = 'toPublicKey';
    const mockAmount = 10;
    const mockFromAccount: Wallet = { id: 1, publicKey: mockFrom, privateKey: 'fromPrivateKey', createdAt: new Date(), updatedAt: new Date(), solBalance: 100 };
    const mockToAccount: Wallet = { id: 2, publicKey: mockTo, privateKey: 'toPrivateKey', createdAt: new Date(), updatedAt: new Date(), solBalance: 50 };
    const mockResponseData: SendTransactionResponse = {
      signature: 'signature',
      fromBal: 90,
      toBal: 60,
      data: 'data',
      url: 'url',
    };

    mockRequest = {
      body: {
        from: mockFrom,
        to: mockTo,
        amount: mockAmount,
      },
    };
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromAccount).mockResolvedValueOnce(mockToAccount);
    (solanaUtils.sendTransaction as jest.Mock).mockResolvedValue(mockResponseData);
    (WalletController.updateWallet as jest.Mock).mockResolvedValue(null);

    await router.post("/transfer", mockRequest as Request, mockResponse as Response);

    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(solanaUtils.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: new PublicKey(mockFrom) }),
      expect.objectContaining({ publicKey: new PublicKey(mockTo) }),
      mockAmount,
    );
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(WalletController.updateWallet).toHaveBeenCalledWith(mockFrom, { solBalance: 90 });
    expect(WalletController.updateWallet).toHaveBeenCalledWith(mockTo, { solBalance: 60 });
    expect(mockResponse.json).toHaveBeenCalledWith(mockResponseData);
  });

  it('POST /transfer should handle validation errors', async () => {
    mockRequest = {
      body: {
        from: undefined,
        to: 'toPublicKey',
        amount: 10,
      },
    };
    (validateFields as jest.Mock).mockReturnValue(['from']);

    await router.post("/transfer", mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing required fields',
      missingFields: ['from'],
    });
    expect(solanaUtils.sendTransaction).not.toHaveBeenCalled();
  });

  it('POST /transfer should handle errors from sendTransaction', async () => {
    const mockFrom = 'fromPublicKey';
    const mockTo = 'toPublicKey';
    const mockAmount = 10;
    const mockFromAccount: Wallet = { id: 1, publicKey: mockFrom, privateKey: 'fromPrivateKey', createdAt: new Date(), updatedAt: new Date(), solBalance: 100 };
    const mockToAccount: Wallet = { id: 2, publicKey: mockTo, privateKey: 'toPrivateKey', createdAt: new Date(), updatedAt: new Date(), solBalance: 50 };

    mockRequest = {
      body: {
        from: mockFrom,
        to: mockTo,
        amount: mockAmount,
      },
    };
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromAccount).mockResolvedValueOnce(mockToAccount);
    const mockError = new Error('Test error');
    (solanaUtils.sendTransaction as jest.Mock).mockRejectedValue(mockError);

    await router.post("/transfer", mockRequest as Request, mockResponse as Response);

    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(solanaUtils.sendTransaction).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(`err ${mockError}`);
  });
});