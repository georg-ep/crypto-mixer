import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router, Request, Response } from 'express';
import router from "./wallets";
import { sendTransaction } from "../utils/solana";
import prisma from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { Signer, PublicKey } from "@solana/web3.js";
import { Wallet } from "@prisma/client";
import { validateFields } from "../utils/validation";

jest.mock("../utils/solana");
jest.mock("../utils/prismaClient");
jest.mock("../controllers/walletController");
jest.mock("../utils/validation");

describe('wallets router', () => {
    let mockRequest: any;
    let mockResponse: any;
    const mockWallets: any[] = [{ id: 1, publicKey: 'key1', privateKey: 'privateKey1', solBalance: 100 }, { id: 2, publicKey: 'key2', privateKey: 'privateKey2', solBalance: 200 }];
    const mockWallet: any = { id: 1, publicKey: 'key1', privateKey: 'privateKey1', solBalance: 100 };
    const mockSigner: Signer = {
        publicKey: new PublicKey('11111111111111111111111111111111'),
        secretKey: new Uint8Array([1, 2, 3])
    }
    beforeEach(() => {
        mockRequest = {
            body: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
        (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);
        (prisma.wallet.create as jest.Mock).mockResolvedValue(mockWallet);
        (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValue(mockWallet);
        (WalletController.updateWallet as jest.Mock).mockResolvedValue(mockWallet);
        (sendTransaction as jest.Mock).mockResolvedValue({ signature: 'signature', fromBal: 90, toBal: 210, data: 'data', url: 'url' });
        (validateFields as jest.Mock).mockReturnValue([]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('GET / should return wallets', async () => {
        await router.get("/", mockRequest as Request, mockResponse as Response);
        expect(prisma.wallet.findMany).toHaveBeenCalled();
        expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
    });

    it('POST /create should create a wallet', async () => {
        mockRequest.body = { privateKey: 'privateKey', publicKey: 'publicKey' };
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
        mockRequest.body = { publicKey: 'publicKey' };
        await router.post("/create", mockRequest as Request, mockResponse as Response);
        expect(mockResponse.send).toHaveBeenCalledWith("Private key required");
        expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it('POST /create should return an error if public key is missing', async () => {
        mockRequest.body = { privateKey: 'privateKey' };
        await router.post("/create", mockRequest as Request, mockResponse as Response);
        expect(mockResponse.send).toHaveBeenCalledWith("Public key required");
        expect(prisma.wallet.create).not.toHaveBeenCalled();
    });


    it('POST /transfer should transfer sol', async () => {
        mockRequest.body = { from: 'from', to: 'to', amount: 10 };
        await router.post("/transfer", mockRequest as Request, mockResponse as Response);

        expect(validateFields).toHaveBeenCalledWith({ from: 'from', to: 'to', amount: 10 });
        expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
        expect(sendTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ publicKey: new PublicKey('from') }),
            expect.objectContaining({ publicKey: new PublicKey('to') }),
            10
        );
        expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ signature: 'signature', toBal: 210, fromBal: 90, data: 'data', url: 'url' }));
    });

    it('POST /transfer should return error if missing fields', async () => {
        (validateFields as jest.Mock).mockReturnValue(['from']);
        mockRequest.body = { from: 'from', to: 'to', amount: 10 };
        await router.post("/transfer", mockRequest as Request, mockResponse as Response);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Missing required fields', missingFields: ['from'] });
        expect(sendTransaction).not.toHaveBeenCalled();
    });

    it('POST /transfer should handle errors from sendTransaction', async () => {
        (sendTransaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));
        mockRequest.body = { from: 'from', to: 'to', amount: 10 };
        await router.post("/transfer", mockRequest as Request, mockResponse as Response);
        expect(mockResponse.json).toHaveBeenCalledWith('err Error: Transaction failed');
    });

});