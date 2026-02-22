import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import router from "./wallets";
import { Request, Response } from 'express';
import prisma from "../utils/prismaClient";
import * as solanaUtils from "../utils/solana";
import WalletController from "../controllers/walletController";
import { Wallet } from "@prisma/client";
import { Signer, PublicKey } from "@solana/web3.js";

jest.mock("../utils/prismaClient", () => ({
    wallet: {
        findMany: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock("../utils/solana", () => ({
  sendTransaction: jest.fn(),
}));

jest.mock("../controllers/walletController", () => ({
    getWalletByPublicKey: jest.fn(),
    updateWallet: jest.fn(),
}));

describe("wallets route", () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
    } as any;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("GET / should return wallets", async () => {
    const mockWallets = [{ id: 1, publicKey: "key1", privateKey: "key2" }];
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

    // Mock Express route handling
    const mockReq = { } as Request;
    const mockRes = { send: jest.fn() } as unknown as Response;

    await router.stack[0].handle(mockReq, mockRes);

    expect(prisma.wallet.findMany).toHaveBeenCalled();
    expect(mockRes.send).toHaveBeenCalledWith(mockWallets);
  });

  it("POST /create should create a wallet", async () => {
    const mockWallet = { publicKey: "public", privateKey: "private" };
    mockRequest.body = mockWallet;
    (prisma.wallet.create as jest.Mock).mockResolvedValue(mockWallet);

    const mockReq = { body: { privateKey: "private", publicKey: "public" } } as Request;
    const mockRes = { send: jest.fn() } as unknown as Response;

    await router.stack[1].handle(mockReq, mockRes);
    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: "private",
        publicKey: "public",
      },
    });
    expect(mockRes.send).toHaveBeenCalledWith("success");
  });

  it("POST /create should return an error if private key is missing", async () => {
    mockRequest.body = { publicKey: "public" };
    const mockRes = { send: jest.fn() } as unknown as Response;
    const mockReq = { body: { publicKey: "public" } } as Request;

      await router.stack[1].handle(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalledWith("Private key required");
  });

  it("POST /create should return an error if public key is missing", async () => {
    mockRequest.body = { privateKey: "private" };
    const mockRes = { send: jest.fn() } as unknown as Response;
    const mockReq = { body: { privateKey: "private" } } as Request;
      await router.stack[1].handle(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalledWith("Public key required");
  });

  it("POST /transfer should transfer SOL", async () => {
    const mockFromWallet: Wallet = { id: 1, publicKey: 'from', privateKey: 'fromPrivate', solBalance: 10, createdAt: new Date(), updatedAt: new Date() };
    const mockToWallet: Wallet = { id: 2, publicKey: 'to', privateKey: 'toPrivate', solBalance: 5, createdAt: new Date(), updatedAt: new Date() };
    const mockAmount = 5;
    const mockSignature = "signature";
    const mockTransactionResponse = {
      signature: mockSignature,
      fromBal: 5,
      toBal: 10,
      data: {},
      url: "url",
    };

    mockRequest.body = { from: 'from', to: 'to', amount: mockAmount };

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
    (solanaUtils.sendTransaction as jest.Mock).mockResolvedValue(mockTransactionResponse);
    (WalletController.updateWallet as jest.Mock).mockResolvedValue(true);

    const mockReq = { body: { from: 'from', to: 'to', amount: mockAmount } } as Request;
    const mockRes = { json: jest.fn() } as unknown as Response;

    await router.stack[2].handle(mockReq, mockRes);

    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(solanaUtils.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ publicKey: new PublicKey('from') }),
        expect.objectContaining({ publicKey: new PublicKey('to') }),
        mockAmount
    );
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(mockRes.json).toHaveBeenCalledWith(mockTransactionResponse);
  });

    it("POST /transfer should return an error if missing fields", async () => {
        mockRequest.body = { from: 'from', to: 'to' }; // Missing amount
        const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
        const mockReq = { body: { from: 'from', to: 'to' } } as Request;

        await router.stack[2].handle(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Missing required fields",
            missingFields: ["amount"],
        });
    });

  it("POST /transfer should handle errors from sendTransaction", async () => {
    const mockFromWallet: Wallet = { id: 1, publicKey: 'from', privateKey: 'fromPrivate', solBalance: 10, createdAt: new Date(), updatedAt: new Date() };
    const mockToWallet: Wallet = { id: 2, publicKey: 'to', privateKey: 'toPrivate', solBalance: 5, createdAt: new Date(), updatedAt: new Date() };
    const mockAmount = 5;
    const mockError = new Error("Transaction failed");

    mockRequest.body = { from: 'from', to: 'to', amount: mockAmount };

    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
    (solanaUtils.sendTransaction as jest.Mock).mockRejectedValue(mockError);

    const mockReq = { body: { from: 'from', to: 'to', amount: mockAmount } } as Request;
    const mockRes = { json: jest.fn() } as unknown as Response;

    await router.stack[2].handle(mockReq, mockRes);
    expect(mockRes.json).toHaveBeenCalledWith(`err ${mockError}`);
  });
});