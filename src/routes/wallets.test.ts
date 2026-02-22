import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import router from "./wallets";
import { Request, Response } from 'express';
import prisma from "../utils/prismaClient";
import * as solanaUtils from "../utils/solana";
import WalletController from "../controllers/walletController";
import { PublicKey, Signer } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";
import { Wallet } from "@prisma/client";
import { validateFields } from '../utils/validation';

jest.mock("../utils/prismaClient", () => ({
    wallet: {
        findMany: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock("../utils/solana");

jest.mock("../controllers/walletController");

jest.mock('../utils/validation');


describe("wallets router", () => {
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


    describe("GET /", () => {
        it("should return wallets from the database", async () => {
            const mockWallets = [{ id: "1", publicKey: "key1", privateKey: "key1" }, { id: "2", publicKey: "key2", privateKey: "key2" }];
            (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

            await router.get("/", mockRequest as Request, mockResponse as Response);

            expect(prisma.wallet.findMany).toHaveBeenCalled();
            expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
        });
    });

    describe("POST /create", () => {
        it("should create a new wallet and return success", async () => {
            mockRequest.body = { privateKey: "private", publicKey: "public" };
            (prisma.wallet.create as jest.Mock).mockResolvedValue({id: "1", privateKey: "private", publicKey: "public"});

            await router.post("/create", mockRequest as Request, mockResponse as Response);

            expect(prisma.wallet.create).toHaveBeenCalledWith({
                data: {
                    privateKey: "private",
                    publicKey: "public",
                },
            });
            expect(mockResponse.send).toHaveBeenCalledWith("success");
        });

        it("should return an error if creating wallet fails", async () => {
            mockRequest.body = { privateKey: "private", publicKey: "public" };
            const error = new Error("Failed to create wallet");
            (prisma.wallet.create as jest.Mock).mockRejectedValue(error);

            await router.post("/create", mockRequest as Request, mockResponse as Response);

            expect(prisma.wallet.create).toHaveBeenCalled();
            expect(mockResponse.send).toHaveBeenCalledWith(`err ${error}`);
        });

        it("should return an error if private key is missing", async () => {
            mockRequest.body = { publicKey: "public" };

            await router.post("/create", mockRequest as Request, mockResponse as Response);

            expect(prisma.wallet.create).not.toHaveBeenCalled();
            expect(mockResponse.send).toHaveBeenCalledWith("Private key required");
        });
                it("should return an error if public key is missing", async () => {
            mockRequest.body = { privateKey: "private" };

            await router.post("/create", mockRequest as Request, mockResponse as Response);

            expect(prisma.wallet.create).not.toHaveBeenCalled();
            expect(mockResponse.send).toHaveBeenCalledWith("Public key required");
        });
    });

    describe("POST /transfer", () => {
        it("should transfer SOL and return transaction details on success", async () => {
            const mockFrom = "fromPublic";
            const mockTo = "toPublic";
            const mockAmount = 10;
            mockRequest.body = { from: mockFrom, to: mockTo, amount: mockAmount };

            const mockFromAccount: Wallet = { id: "1", publicKey: mockFrom, privateKey: "privateFrom", solBalance: 100, createdAt: new Date(), updatedAt: new Date() };
            const mockToAccount: Wallet = { id: "2", publicKey: mockTo, privateKey: "privateTo", solBalance: 50, createdAt: new Date(), updatedAt: new Date() };
            const mockSendTransactionResponse: SendTransactionResponse = {
                signature: "signature",
                fromBal: 90,
                toBal: 60,
                data: {},
                url: "url",
            };

            (validateFields as jest.Mock).mockReturnValue([]);
            (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromAccount).mockResolvedValueOnce(mockToAccount);
            (solanaUtils.sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
            (WalletController.updateWallet as jest.Mock).mockResolvedValue(true);

            await router.post("/transfer", mockRequest as Request, mockResponse as Response);

            expect(validateFields).toHaveBeenCalledWith({ from: mockFrom, to: mockTo, amount: mockAmount });
            expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
            expect(solanaUtils.sendTransaction).toHaveBeenCalled();
            expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
            expect(mockResponse.json).toHaveBeenCalledWith(mockSendTransactionResponse);
        });

        it("should return an error if required fields are missing", async () => {
            const mockMissingFields = ["from", "to"];
            (validateFields as jest.Mock).mockReturnValue(mockMissingFields);

            await router.post("/transfer", mockRequest as Request, mockResponse as Response);

            expect(validateFields).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Missing required fields",
                missingFields: mockMissingFields,
            });
            expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
            expect(solanaUtils.sendTransaction).not.toHaveBeenCalled();
            expect(WalletController.updateWallet).not.toHaveBeenCalled();
        });


         it("should handle errors during transaction and return an error response", async () => {
            const mockFrom = "fromPublic";
            const mockTo = "toPublic";
            const mockAmount = 10;
            mockRequest.body = { from: mockFrom, to: mockTo, amount: mockAmount };

            const mockFromAccount: Wallet = { id: "1", publicKey: mockFrom, privateKey: "privateFrom", solBalance: 100, createdAt: new Date(), updatedAt: new Date() };
            const mockToAccount: Wallet = { id: "2", publicKey: mockTo, privateKey: "privateTo", solBalance: 50, createdAt: new Date(), updatedAt: new Date() };
            const error = new Error("Transaction failed");

            (validateFields as jest.Mock).mockReturnValue([]);
            (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromAccount).mockResolvedValueOnce(mockToAccount);
            (solanaUtils.sendTransaction as jest.Mock).mockRejectedValue(error);


            await router.post("/transfer", mockRequest as Request, mockResponse as Response);

            expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
            expect(solanaUtils.sendTransaction).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith(`err ${error}`);
            expect(WalletController.updateWallet).not.toHaveBeenCalled();
         });
    });
});