import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import router from "./wallets";
import prisma from "../utils/prismaClient";
import * as solanaUtils from "../utils/solana";
import WalletController from "../controllers/walletController";
import { Signer, PublicKey } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";

jest.mock("../utils/prismaClient", () => ({
    wallet: {
        findMany: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock("../utils/solana");
jest.mock("../controllers/walletController");

describe('wallets router', () => {
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            send: jest.fn(),
            json: jest.fn(),
            status: jest.fn(() => mockResponse),
        };
    });

    it('GET / should return wallets', async () => {
        const mockWallets = [{ id: 1, publicKey: 'key1', privateKey: 'key1' }];
        (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);
        mockRequest = {};
        await router.get("/", mockRequest as Request, mockResponse as Response);
        expect(prisma.wallet.findMany).toHaveBeenCalled();
        expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
    });

    it('POST /create should create a wallet', async () => {
        const mockWallet = { privateKey: 'privateKey', publicKey: 'publicKey' };
        mockRequest = { body: mockWallet };
        (prisma.wallet.create as jest.Mock).mockResolvedValue(mockWallet);
        await router.post("/create", mockRequest as Request, mockResponse as Response);
        expect(prisma.wallet.create).toHaveBeenCalledWith({ data: mockWallet });
        expect(mockResponse.send).toHaveBeenCalledWith("success");
    });

    it('POST /create should return an error if privateKey or publicKey is missing', async () => {
        mockRequest = { body: { publicKey: 'publicKey' } };
        await router.post("/create", mockRequest as Request, mockResponse as Response);
        expect(mockResponse.send).toHaveBeenCalledWith("Private key required");

        mockRequest = { body: { privateKey: 'privateKey' } };
        await router.post("/create", mockRequest as Request, mockResponse as Response);
        expect(mockResponse.send).toHaveBeenCalledWith("Public key required");

    });

    it('POST /transfer should transfer SOL and return transaction details on success', async () => {
        const fromPublicKey = 'fromPublicKey';
        const toPublicKey = 'toPublicKey';
        const amount = 10;
        const mockFromWallet = { id: 1, publicKey: fromPublicKey, privateKey: "fromPrivateKey", solBalance: 100 };
        const mockToWallet = { id: 2, publicKey: toPublicKey, privateKey: "toPrivateKey", solBalance: 50 };
        const mockSendTransactionResponse: SendTransactionResponse = {
            signature: 'signature',
            fromBal: 90,
            toBal: 60,
            data: 'data',
            url: 'url',
        };

        (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
        (solanaUtils.sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
        (WalletController.updateWallet as jest.Mock).mockResolvedValue(undefined);

        mockRequest = { body: { from: fromPublicKey, to: toPublicKey, amount } };

        await router.post("/transfer", mockRequest as Request, mockResponse as Response);

        expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
        expect(WalletController.getWalletByPublicKey).toHaveBeenNthCalledWith(1, fromPublicKey);
        expect(WalletController.getWalletByPublicKey).toHaveBeenNthCalledWith(2, toPublicKey);

        expect(solanaUtils.sendTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ publicKey: new PublicKey(fromPublicKey) }),
            expect.objectContaining({ publicKey: new PublicKey(toPublicKey) }),
            amount
        );
        expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
        expect(WalletController.updateWallet).toHaveBeenNthCalledWith(1, fromPublicKey, { solBalance: 90 });
        expect(WalletController.updateWallet).toHaveBeenNthCalledWith(2, toPublicKey, { solBalance: 60 });

        expect(mockResponse.json).toHaveBeenCalledWith(mockSendTransactionResponse);
    });

    it('POST /transfer should return an error if missing fields', async () => {
        mockRequest = { body: { from: 'from', to: 'to' } };
        await router.post("/transfer", mockRequest as Request, mockResponse as Response);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Missing required fields",
            missingFields: ["amount"],
        });
    });

    it('POST /transfer should handle errors from sendTransaction', async () => {
        const fromPublicKey = 'fromPublicKey';
        const toPublicKey = 'toPublicKey';
        const amount = 10;
        const mockFromWallet = { id: 1, publicKey: fromPublicKey, privateKey: "fromPrivateKey", solBalance: 100 };
        const mockToWallet = { id: 2, publicKey: toPublicKey, privateKey: "toPrivateKey", solBalance: 50 };
        const errorMessage = 'Transaction failed';

        (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
        (solanaUtils.sendTransaction as jest.Mock).mockRejectedValue(errorMessage);

        mockRequest = { body: { from: fromPublicKey, to: toPublicKey, amount } };

        await router.post("/transfer", mockRequest as Request, mockResponse as Response);
        expect(mockResponse.json).toHaveBeenCalledWith(`err ${errorMessage}`);
    });
});