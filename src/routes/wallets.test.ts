import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import router from './wallets';
import prisma from "../utils/prismaClient";
import * as solanaUtils from "../utils/solana";
import WalletController from '../controllers/walletController';
import { Signer } from "@solana/web3.js";
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

  it('GET / should return wallets', async () => {
    const mockWallets = [{ id: 1, publicKey: 'test' }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    // @ts-ignore
    await router.stack.find(layer => layer.route?.path === "/").handle(mockRequest, mockResponse);

    expect(prisma.wallet.findMany).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
  });

  it('POST /create should create a wallet', async () => {
    mockRequest.body = { privateKey: 'private', publicKey: 'public' };
    (prisma.wallet.create as jest.Mock).mockResolvedValue({id:1, privateKey: 'private', publicKey: 'public'});

    // @ts-ignore
    await router.stack.find(layer => layer.route?.path === "/create").handle(mockRequest, mockResponse);

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

      // @ts-ignore
      await router.stack.find(layer => layer.route?.path === "/create").handle(mockRequest, mockResponse);

      expect(mockResponse.send).toHaveBeenCalledWith('Private key required');
      expect(prisma.wallet.create).not.toHaveBeenCalled();
  });

  it('POST /create should return an error if public key is missing', async () => {
      mockRequest.body = { privateKey: 'private' };

      // @ts-ignore
      await router.stack.find(layer => layer.route?.path === "/create").handle(mockRequest, mockResponse);

      expect(mockResponse.send).toHaveBeenCalledWith('Public key required');
      expect(prisma.wallet.create).not.toHaveBeenCalled();
  });

  it('POST /transfer should transfer SOL successfully', async () => {
      const mockFromWallet = { id: 1, privateKey: 'fromPrivateKey', publicKey: 'fromPublic', solBalance: 100 };
      const mockToWallet = { id: 2, privateKey: 'toPrivateKey', publicKey: 'toPublic', solBalance: 0 };
      const mockAmount = 10;
      const mockResponseData = {signature: 'sig', fromBal: 90, toBal: 10, data: 'data', url: 'url'};

      mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: mockAmount };

      (validateFields as jest.Mock).mockReturnValue([]);
      (WalletController.getWalletByPublicKey as jest.Mock).mockImplementation(async (publicKey:string) => {
        if(publicKey === 'fromPublic') return mockFromWallet;
        if(publicKey === 'toPublic') return mockToWallet;
        return null;
      });
      (solanaUtils.sendTransaction as jest.Mock).mockResolvedValue(mockResponseData);
      (WalletController.updateWallet as jest.Mock).mockResolvedValue({});

      // @ts-ignore
      await router.stack.find(layer => layer.route?.path === "/transfer").handle(mockRequest, mockResponse);

      expect(validateFields).toHaveBeenCalledWith({from: 'fromPublic', to: 'toPublic', amount: mockAmount});
      expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
      expect(solanaUtils.sendTransaction).toHaveBeenCalled();
      expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResponseData);
  });

  it('POST /transfer should return 400 if validation fails', async () => {
      const mockMissingFields = ['from', 'to'];
      mockRequest.body = { from: '', to: '', amount: 10 };

      (validateFields as jest.Mock).mockReturnValue(mockMissingFields);

      // @ts-ignore
      await router.stack.find(layer => layer.route?.path === "/transfer").handle(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
          error: "Missing required fields",
          missingFields: mockMissingFields,
      });

      expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
      expect(solanaUtils.sendTransaction).not.toHaveBeenCalled();
      expect(WalletController.updateWallet).not.toHaveBeenCalled();
  });

  it('POST /transfer should handle errors from sendTransaction', async () => {
      const mockFromWallet = { id: 1, privateKey: 'fromPrivateKey', publicKey: 'fromPublic', solBalance: 100 };
      const mockToWallet = { id: 2, privateKey: 'toPrivateKey', publicKey: 'toPublic', solBalance: 0 };
      const mockAmount = 10;
      const mockError = new Error('Transaction failed');

      mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: mockAmount };

      (validateFields as jest.Mock).mockReturnValue([]);
      (WalletController.getWalletByPublicKey as jest.Mock).mockImplementation(async (publicKey:string) => {
          if(publicKey === 'fromPublic') return mockFromWallet;
          if(publicKey === 'toPublic') return mockToWallet;
          return null;
      });
      (solanaUtils.sendTransaction as jest.Mock).mockRejectedValue(mockError);

      // @ts-ignore
      await router.stack.find(layer => layer.route?.path === "/transfer").handle(mockRequest, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(`err ${mockError}`);
      expect(WalletController.updateWallet).not.toHaveBeenCalled();
  });
});