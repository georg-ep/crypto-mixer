import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import router from './wallets';
import prisma from '../utils/prismaClient';
import WalletController from '../controllers/walletController';
import { sendTransaction } from "../utils/solana";
import { Signer, PublicKey } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";

jest.mock('../utils/prismaClient', () => ({
  wallet: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../controllers/walletController', () => ({
  getWalletByPublicKey: jest.fn(),
  updateWallet: jest.fn()
}));

jest.mock('../utils/solana', () => ({
    sendTransaction: jest.fn()
}))


describe('wallets route', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      send: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnValue({ json: jest.fn() }),
    };
    jest.clearAllMocks();
  });

  it('GET / should return wallets', async () => {
    const mockWallets = [{ id: 1, publicKey: 'test' }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    await router.get('/', mockRequest as Request, mockResponse as Response);

    expect(prisma.wallet.findMany).toHaveBeenCalled();
    expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
  });

  it('POST /create should create a wallet', async () => {
    mockRequest.body = { privateKey: 'private', publicKey: 'public' };
    (prisma.wallet.create as jest.Mock).mockResolvedValue({id:1, privateKey: 'private', publicKey: 'public'});

    await router.post('/create', mockRequest as Request, mockResponse as Response);

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: { privateKey: 'private', publicKey: 'public' },
    });
    expect(mockResponse.send).toHaveBeenCalledWith('success');
  });

    it('POST /create should handle errors', async () => {
        mockRequest.body = { publicKey: 'public' };
        (prisma.wallet.create as jest.Mock).mockRejectedValue(new Error('Test error'));

        await router.post('/create', mockRequest as Request, mockResponse as Response);

        expect(prisma.wallet.create).toHaveBeenCalled();
        expect(mockResponse.send).toHaveBeenCalled();
        //Check for error in response
    });

  it('POST /transfer should transfer SOL', async () => {
    const from = 'fromPublicKey';
    const to = 'toPublicKey';
    const amount = 10;
    const fromAccount = { id: 1, privateKey: 'fromPrivateKey', publicKey: from, solBalance: 100 }
    const toAccount = { id: 2, privateKey: 'toPrivateKey', publicKey: to, solBalance: 50}
    const mockResponseData: SendTransactionResponse = {
        signature: "signature",
        fromBal: 90,
        toBal: 60,
        data: "data",
        url: "url"
    }

    mockRequest.body = { from, to, amount };

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(fromAccount).mockResolvedValueOnce(toAccount);
    (sendTransaction as jest.Mock).mockResolvedValue(mockResponseData);

    await router.post('/transfer', mockRequest as Request, mockResponse as Response);

    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ publicKey: new PublicKey(from) }),
        expect.objectContaining({ publicKey: new PublicKey(to) }),
        amount
    );
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(mockResponse.json).toHaveBeenCalledWith(mockResponseData);
  });

  it('POST /transfer should handle missing fields', async () => {
        mockRequest.body = { from: 'fromPublicKey', to: 'toPublicKey' };
        await router.post('/transfer', mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.status().json).toHaveBeenCalledWith({
            error: "Missing required fields",
            missingFields: ["amount"],
        });
    });

    it('POST /transfer should handle errors from sendTransaction', async () => {
        const from = 'fromPublicKey';
        const to = 'toPublicKey';
        const amount = 10;
        const fromAccount = { id: 1, privateKey: 'fromPrivateKey', publicKey: from, solBalance: 100 }
        const toAccount = { id: 2, privateKey: 'toPrivateKey', publicKey: to, solBalance: 50}


        mockRequest.body = { from, to, amount };

        (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(fromAccount).mockResolvedValueOnce(toAccount);
        (sendTransaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

        await router.post('/transfer', mockRequest as Request, mockResponse as Response);

        expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
        expect(sendTransaction).toHaveBeenCalled();
        expect(mockResponse.json).toHaveBeenCalled();
    });
});