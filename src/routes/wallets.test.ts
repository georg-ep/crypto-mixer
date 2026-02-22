import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router, Request, Response } from 'express';
import router from "./wallets";
import { sendTransaction } from "../utils/solana";
import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";

jest.mock("../utils/solana");
jest.mock("../utils/prismaClient");
jest.mock("../controllers/walletController");
jest.mock("../utils/validation");

describe('wallets router', () => {
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('GET / should return wallets', async () => {
        const mockWallets: Wallet[] = [{ id: 1, publicKey: 'key', privateKey: 'key', solBalance: 100 } as Wallet];
        (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

        await router.stack[0].route.get(mockRequest, mockResponse);

        expect(prisma.wallet.findMany).toHaveBeenCalled();
        expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
    });

    it('POST /create should create a wallet', async () => {
        mockRequest.body = { privateKey: 'private', publicKey: 'public' };
        (prisma.wallet.create as jest.Mock).mockResolvedValue({ privateKey: 'private', publicKey: 'public' });

        await router.stack[1].route.post(mockRequest, mockResponse);

        expect(prisma.wallet.create).toHaveBeenCalledWith({
            data: {
                privateKey: 'private',
                publicKey: 'public',
            },
        });
        expect(mockResponse.send).toHaveBeenCalledWith('success');
    });

    it('POST /create should return error if private key is missing', async () => {
        mockRequest.body = { publicKey: 'public' };

        await router.stack[1].route.post(mockRequest, mockResponse);

        expect(prisma.wallet.create).not.toHaveBeenCalled();
        expect(mockResponse.send).toHaveBeenCalledWith('Private key required');
    });

    it('POST /create should return error if public key is missing', async () => {
        mockRequest.body = { privateKey: 'private' };

        await router.stack[1].route.post(mockRequest, mockResponse);

        expect(prisma.wallet.create).not.toHaveBeenCalled();
        expect(mockResponse.send).toHaveBeenCalledWith('Public key required');
    });

    it('POST /transfer should transfer sol', async () => {
        mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: 10 };
        const mockFromWallet: Wallet = { id: 1, publicKey: 'fromPublic', privateKey: 'fromPrivate', solBalance: 100 } as any;
        const mockToWallet: Wallet = { id: 2, publicKey: 'toPublic', privateKey: 'toPrivate', solBalance: 50 } as any;
        const mockSendTransactionResponse = { signature: 'sig', fromBal: 90, toBal: 60, data: {}, url: 'url' };

        (validateFields as jest.Mock).mockReturnValue([]);
        (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
        (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
        (WalletController.updateWallet as jest.Mock).mockResolvedValue({});

        await router.stack[2].route.post(mockRequest, mockResponse);

        expect(validateFields).toHaveBeenCalledWith(mockRequest.body);
        expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
        expect(sendTransaction).toHaveBeenCalled();
        expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
        expect(mockResponse.json).toHaveBeenCalledWith(mockSendTransactionResponse);
    });

    it('POST /transfer should return 400 if missing fields', async () => {
        mockRequest.body = { from: '', to: '', amount: '' };
        (validateFields as jest.Mock).mockReturnValue(['from', 'to', 'amount']);

        await router.stack[2].route.post(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Missing required fields",
            missingFields: ['from', 'to', 'amount']
        });
    });

    it('POST /transfer should handle errors from sendTransaction', async () => {
        mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: 10 };
        const mockFromWallet: Wallet = { id: 1, publicKey: 'fromPublic', privateKey: 'fromPrivate', solBalance: 100 } as any;
        const mockToWallet: Wallet = { id: 2, publicKey: 'toPublic', privateKey: 'toPrivate', solBalance: 50 } as any;
        const mockError = new Error('Transaction failed');

        (validateFields as jest.Mock).mockReturnValue([]);
        (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
        (sendTransaction as jest.Mock).mockRejectedValue(mockError);

        await router.stack[2].route.post(mockRequest, mockResponse);

        expect(mockResponse.json).toHaveBeenCalledWith(`err ${mockError}`);
    });

    it('POST /transfer should handle errors from getWalletByPublicKey', async () => {
        mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: 10 };

        (validateFields as jest.Mock).mockReturnValue([]);
        (WalletController.getWalletByPublicKey as jest.Mock).mockRejectedValue(new Error('Wallet not found'));

        await router.stack[2].route.post(mockRequest, mockResponse);

        expect(mockResponse.json).toHaveBeenCalledWith(`err Error: Wallet not found`);
    });
});