import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router, Request, Response } from 'express';
import router from './wallets';
import { sendTransaction } from "../utils/solana";
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

describe('wallets router', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
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

  it('should get all wallets on GET /', async () => {
    const mockWallets = [{ id: '1', publicKey: 'abc', privateKey: '123' }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    await router.stack[0].handle(mockRequest, mockResponse); // Access the route handler directly, assuming the first route

    expect(prisma.wallet.findMany).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
  });

  it('should create a wallet on POST /create with valid data', async () => {
    mockRequest.body = { privateKey: '123', publicKey: 'abc' };
    (prisma.wallet.create as jest.Mock).mockResolvedValue({ id: '1', privateKey: '123', publicKey: 'abc' });

    await router.stack[1].handle(mockRequest, mockResponse); // Access the route handler directly

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: '123',
        publicKey: 'abc',
      },
    });
    expect(mockResponse.send).toHaveBeenCalledWith('success');
  });

  it('should return an error if private key is missing on POST /create', async () => {
    mockRequest.body = { publicKey: 'abc' };

    await router.stack[1].handle(mockRequest, mockResponse); // Access the route handler directly

    expect(prisma.wallet.create).not.toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith('Private key required');
  });

  it('should return an error if public key is missing on POST /create', async () => {
    mockRequest.body = { privateKey: '123' };

    await router.stack[1].handle(mockRequest, mockResponse); // Access the route handler directly

    expect(prisma.wallet.create).not.toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith('Public key required');
  });

  it('should handle errors during wallet creation on POST /create', async () => {
    mockRequest.body = { privateKey: '123', publicKey: 'abc' };
    const mockError = new Error('Database error');
    (prisma.wallet.create as jest.Mock).mockRejectedValue(mockError);

    await router.stack[1].handle(mockRequest, mockResponse);

    expect(prisma.wallet.create).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(`err ${mockError}`);
  });

  it('should transfer sol on POST /transfer with valid data', async () => {
    mockRequest.body = { from: 'fromPub', to: 'toPub', amount: 10 };

    const mockFromWallet: Wallet = { id: '1', publicKey: 'fromPub', privateKey: '123', createdAt: new Date(), updatedAt: new Date() };
    const mockToWallet: Wallet = { id: '2', publicKey: 'toPub', privateKey: '456', createdAt: new Date(), updatedAt: new Date() };
    const mockSendTransactionResponse = { signature: 'sig', fromBal: 90, toBal: 110, data: {}, url: 'url' };

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
    (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);

    await router.stack[2].handle(mockRequest, mockResponse);

    expect(validateFields).toHaveBeenCalledWith({ from: 'fromPub', to: 'toPub', amount: 10 });
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalled();
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(mockResponse.json).toHaveBeenCalledWith(mockSendTransactionResponse);
  });

    it('should return 400 if fields are missing on POST /transfer', async () => {
        mockRequest.body = { from: 'fromPub', to: 'toPub' };
        (validateFields as jest.Mock).mockReturnValue(['amount']);

        await router.stack[2].handle(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Missing required fields",
            missingFields: ['amount']
        });
        expect(sendTransaction).not.toHaveBeenCalled();
    });

  it('should handle errors during sol transfer on POST /transfer', async () => {
    mockRequest.body = { from: 'fromPub', to: 'toPub', amount: 10 };
    const mockFromWallet: Wallet = { id: '1', publicKey: 'fromPub', privateKey: '123', createdAt: new Date(), updatedAt: new Date() };
    const mockToWallet: Wallet = { id: '2', publicKey: 'toPub', privateKey: '456', createdAt: new Date(), updatedAt: new Date() };

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
    const mockError = new Error('Transaction failed');
    (sendTransaction as jest.Mock).mockRejectedValue(mockError);

    await router.stack[2].handle(mockRequest, mockResponse);

    expect(sendTransaction).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(`err ${mockError}`);
  });

});