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
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('GET / should return wallets', async () => {
        const mockWallets: Wallet[] = [{ id: 1, publicKey: 'test', privateKey: 'test', solBalance: 100 }];
        (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

        await router.stack[0].route.stack[0].handle(mockRequest, mockResponse);

        expect(prisma.wallet.findMany).toHaveBeenCalledTimes(1);
        expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
    });

    it('POST /create should create a wallet', async () => {
        mockRequest.body = { privateKey: 'private', publicKey: 'public' };
        (prisma.wallet.create as jest.Mock).mockResolvedValue({ privateKey: 'private', publicKey: 'public' });

        await router.stack[1].route.stack[0].handle(mockRequest, mockResponse);

        expect(prisma.wallet.create).toHaveBeenCalledWith({
            data: {
                privateKey: 'private',
                publicKey: 'public',
            },
        });
        expect(mockResponse.send).toHaveBeenCalledWith("success");
    });

    it('POST /create should return an error if private key is missing', async () => {
        mockRequest.body = { publicKey: 'public' };
        await router.stack[1].route.stack[0].handle(mockRequest, mockResponse);
        expect(mockResponse.send).toHaveBeenCalledWith("Private key required");
    });

    it('POST /create should return an error if public key is missing', async () => {
        mockRequest.body = { privateKey: 'private' };
        await router.stack[1].route.stack[0].handle(mockRequest, mockResponse);
        expect(mockResponse.send).toHaveBeenCalledWith("Public key required");
    });

    it('POST /transfer should transfer SOL', async () => {
        mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: 10 };
        const mockFromWallet: Wallet = { id: 1, publicKey: 'fromPublic', privateKey: 'fromPrivateKey', solBalance: 20 };
        const mockToWallet: Wallet = { id: 2, publicKey: 'toPublic', privateKey: 'toPrivateKey', solBalance: 0 };
        const mockSendTransactionResponse = { signature: 'signature', fromBal: 10, toBal: 10, data: 'data', url: 'url' };

        (validateFields as jest.Mock).mockReturnValue([]);
        (WalletController.getWalletByPublicKey as jest.Mock).mockImplementation((publicKey: string) => {
            if (publicKey === 'fromPublic') return Promise.resolve(mockFromWallet);
            if (publicKey === 'toPublic') return Promise.resolve(mockToWallet);
            return Promise.resolve(null);
        });
        (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
        (WalletController.updateWallet as jest.Mock).mockResolvedValue(true);

        await router.stack[2].route.stack[0].handle(mockRequest, mockResponse);

        expect(validateFields).toHaveBeenCalledWith(mockRequest.body);
        expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
        expect(sendTransaction).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), 10);
        expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
        expect(mockResponse.json).toHaveBeenCalledWith(mockSendTransactionResponse);
    });

    it('POST /transfer should return 400 if missing fields', async () => {
        mockRequest.body = { from: 'fromPublic' };
        (validateFields as jest.Mock).mockReturnValue(['to', 'amount']);

        await router.stack[2].route.stack[0].handle(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Missing required fields",
            missingFields: ['to', 'amount'],
        });
    });

    it('POST /transfer should handle errors from sendTransaction', async () => {
        mockRequest.body = { from: 'fromPublic', to: 'toPublic', amount: 10 };
        (validateFields as jest.Mock).mockReturnValue([]);
        (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValue({ id: 1, publicKey: 'fromPublic', privateKey: 'fromPrivateKey', solBalance: 20 });
        (sendTransaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

        await router.stack[2].route.stack[0].handle(mockRequest, mockResponse);

        expect(mockResponse.json).toHaveBeenCalledWith("err Error: Transaction failed");
    });
});