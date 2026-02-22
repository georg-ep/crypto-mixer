import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router, Request, Response } from 'express';
import router from './wallets';
import { sendTransaction } from "../utils/solana";
import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";
import { PublicKey, Signer } from '@solana/web3.js';
import { SendTransactionResponse } from '../interfaces/solana';

jest.mock('../utils/solana');
jest.mock('../utils/prismaClient');
jest.mock('../controllers/walletController');
jest.mock('../utils/validation');

describe('wallets router', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('GET / should return wallets', async () => {
        const mockWallets: Wallet[] = [{ id: 1, publicKey: 'pub', privateKey: 'priv', createdAt: new Date(), updatedAt: new Date(), solBalance: 100 }];
        (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

        await router.stack[0].route.get(mockRequest as Request, mockResponse as Response);

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

        (prisma.wallet.create as jest.Mock).mockResolvedValue({ privateKey: 'privateKey', publicKey: 'publicKey' });

        await router.stack[1].route.post(mockRequest as Request, mockResponse as Response);

        expect(prisma.wallet.create).toHaveBeenCalledWith({
            data: {
                privateKey: 'privateKey',
                publicKey: 'publicKey',
            },
        });
        expect(mockResponse.send).toHaveBeenCalledWith("success");
    });

    it('POST /create should handle errors', async () => {
        mockRequest = {
            body: {
                privateKey: 'privateKey',
                publicKey: 'publicKey',
            },
        };

        (prisma.wallet.create as jest.Mock).mockRejectedValue(new Error('Test error'));

        await router.stack[1].route.post(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.send).toHaveBeenCalledWith('err Error: Test error');
    });

    it('POST /create should require private key', async () => {
        mockRequest = {
            body: {
                publicKey: 'publicKey',
            },
        };

        await router.stack[1].route.post(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.send).toHaveBeenCalledWith('Private key required');
    });

    it('POST /create should require public key', async () => {
        mockRequest = {
            body: {
                privateKey: 'privateKey',
            },
        };

        await router.stack[1].route.post(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.send).toHaveBeenCalledWith('Public key required');
    });


    it('POST /transfer should transfer solana', async () => {
        const mockFromWallet: Wallet = { id: 1, publicKey: 'fromPub', privateKey: 'fromPriv', createdAt: new Date(), updatedAt: new Date(), solBalance: 100 } ;
        const mockToWallet: Wallet = { id: 2, publicKey: 'toPub', privateKey: 'toPriv', createdAt: new Date(), updatedAt: new Date(), solBalance: 50 } ;
        const mockAmount = 10;
        const mockSignature = 'signature';
        const mockFromBal = 90;
        const mockToBal = 60;
        const mockData = 'data';
        const mockUrl = 'url';
        const mockSendTransactionResponse: SendTransactionResponse = { signature: mockSignature, fromBal: mockFromBal, toBal: mockToBal, data: mockData, url: mockUrl };

        mockRequest = {
            body: {
                from: 'fromPub',
                to: 'toPub',
                amount: mockAmount,
            },
        };

        (validateFields as jest.Mock).mockReturnValue([]);
        (WalletController.getWalletByPublicKey as jest.Mock).mockImplementation(async (publicKey: string) => {
            if (publicKey === 'fromPub') return mockFromWallet;
            if (publicKey === 'toPub') return mockToWallet;
            return null;
        });
        (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
        (WalletController.updateWallet as jest.Mock).mockResolvedValue(null);

        await router.stack[2].route.post(mockRequest as Request, mockResponse as Response);

        expect(validateFields).toHaveBeenCalledWith({ from: 'fromPub', to: 'toPub', amount: mockAmount });
        expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
        expect(sendTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ publicKey: new PublicKey('fromPub') }),
            expect.objectContaining({ publicKey: new PublicKey('toPub') }),
            mockAmount
        );
        expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
        expect(mockResponse.json).toHaveBeenCalledWith({
            signature: mockSignature,
            toBal: mockToBal,
            fromBal: mockFromBal,
            data: mockData,
            url: mockUrl,
        });
    });

    it('POST /transfer should handle missing fields', async () => {
        mockRequest = {
            body: {
                from: '',
                to: '',
                amount: null,
            },
        };

        (validateFields as jest.Mock).mockReturnValue(['from', 'to', 'amount']);

        await router.stack[2].route.post(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Missing required fields',
            missingFields: ['from', 'to', 'amount'],
        });
    });

     it('POST /transfer should handle errors from sendTransaction', async () => {
        const mockFromWallet: Wallet = { id: 1, publicKey: 'fromPub', privateKey: 'fromPriv', createdAt: new Date(), updatedAt: new Date(), solBalance: 100 } ;
        const mockToWallet: Wallet = { id: 2, publicKey: 'toPub', privateKey: 'toPriv', createdAt: new Date(), updatedAt: new Date(), solBalance: 50 } ;
        const mockAmount = 10;

        mockRequest = {
            body: {
                from: 'fromPub',
                to: 'toPub',
                amount: mockAmount,
            },
        };

        (validateFields as jest.Mock).mockReturnValue([]);
        (WalletController.getWalletByPublicKey as jest.Mock).mockImplementation(async (publicKey: string) => {
            if (publicKey === 'fromPub') return mockFromWallet;
            if (publicKey === 'toPub') return mockToWallet;
            return null;
        });

        (sendTransaction as jest.Mock).mockRejectedValue(new Error('Send transaction error'));

        await router.stack[2].route.post(mockRequest as Request, mockResponse as Response);
        expect(mockResponse.json).toHaveBeenCalledWith('err Error: Send transaction error');

    });
});