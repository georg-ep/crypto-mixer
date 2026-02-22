import router from "./wallets";
import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { sendTransaction } from "../utils/solana";
import { Wallet } from "@prisma/client";
import { Signer } from "@solana/web3.js";
import { validateFields } from "../utils/validation";

// Mock the modules and their methods
jest.mock("../utils/prismaClient", () => ({
  wallet: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../controllers/walletController", () => ({
  getWalletByPublicKey: jest.fn(),
  updateWallet: jest.fn(),
}));

jest.mock("../utils/solana", () => ({
  sendTransaction: jest.fn(),
}));

jest.mock("../utils/validation", () => ({
  validateFields: jest.fn(),
}));

describe("Wallet Routes", {
  beforeEach: () => {
    jest.clearAllMocks();
  },
}, () => {
  describe("GET /", () => {
    it("should return wallets", async () => {
      const mockWallets = [{ id: 1, publicKey: "test" }];
      (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);
      const mockReq = {} as Request;
      const mockRes = {
        send: jest.fn(),
      } as unknown as Response;

      await router.stack.find((layer) => layer.route?.path === "/" && layer.route?.methods.get)?.handle(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalledWith(mockWallets);
      expect(prisma.wallet.findMany).toHaveBeenCalled();
    });
  });

  describe("POST /create", () => {
    it("should create a wallet", async () => {
      const mockReq = {
        body: { privateKey: "private", publicKey: "public" },
      } as Request;
      const mockRes = {
        send: jest.fn(),
      } as unknown as Response;

      await router.stack.find((layer) => layer.route?.path === "/create" && layer.route?.methods.post)?.handle(mockReq, mockRes);
      expect(prisma.wallet.create).toHaveBeenCalledWith({
        data: { privateKey: "private", publicKey: "public" },
      });
      expect(mockRes.send).toHaveBeenCalledWith("success");
    });

    it("should return an error if private key is missing", async () => {
      const mockReq = {
        body: { publicKey: "public" },
      } as Request;
      const mockRes = {
        send: jest.fn(),
      } as unknown as Response;

       await router.stack.find((layer) => layer.route?.path === "/create" && layer.route?.methods.post)?.handle(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalledWith("Private key required");
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it("should return an error if public key is missing", async () => {
      const mockReq = {
        body: { privateKey: "private" },
      } as Request;
      const mockRes = {
        send: jest.fn(),
      } as unknown as Response;

       await router.stack.find((layer) => layer.route?.path === "/create" && layer.route?.methods.post)?.handle(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalledWith("Public key required");
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it("should handle errors during wallet creation", async () => {
      (prisma.wallet.create as jest.Mock).mockRejectedValue(new Error("Test error"));
      const mockReq = {
        body: { privateKey: "private", publicKey: "public" },
      } as Request;
      const mockRes = {
        send: jest.fn(),
      } as unknown as Response;

      await router.stack.find((layer) => layer.route?.path === "/create" && layer.route?.methods.post)?.handle(mockReq, mockRes);
      expect(mockRes.send).toHaveBeenCalledWith("err Error: Test error");
    });
  });

  describe("POST /transfer", () => {
    it("should transfer tokens successfully", async () => {
      const mockFromWallet: Wallet = { id: 1, privateKey: "fromPrivate", publicKey: "fromPublic", solBalance: 100 } as Wallet;
      const mockToWallet: Wallet = { id: 2, privateKey: "toPrivate", publicKey: "toPublic", solBalance: 50 } as Wallet;
      const mockSendTransactionResponse = {
        signature: "testSignature",
        fromBal: 90,
        toBal: 60,
        data: "testData",
        url: "testUrl",
      };

      (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
      (sendTransaction as jest.Mock).mockResolvedValue(mockSendTransactionResponse);
      (validateFields as jest.Mock).mockReturnValue([]);

      const mockReq = {
        body: { from: "fromPublic", to: "toPublic", amount: 10 },
      } as Request;
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await router.stack.find((layer) => layer.route?.path === "/transfer" && layer.route?.methods.post)?.handle(mockReq, mockRes);

      expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
      expect(sendTransaction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        10
      );
      expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith(mockSendTransactionResponse);
    });

    it("should return 400 if required fields are missing", async () => {
        (validateFields as jest.Mock).mockReturnValue(["from"]);

        const mockReq = {
            body: { from: "", to: "", amount: "" },
        } as Request;
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        await router.stack.find((layer) => layer.route?.path === "/transfer" && layer.route?.methods.post)?.handle(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Missing required fields",
            missingFields: ["from"],
        });
        expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
        expect(sendTransaction).not.toHaveBeenCalled();
    });

    it("should handle errors during token transfer", async () => {
      const mockFromWallet: Wallet = { id: 1, privateKey: "fromPrivate", publicKey: "fromPublic", solBalance: 100 } as Wallet;
      const mockToWallet: Wallet = { id: 2, privateKey: "toPrivate", publicKey: "toPublic", solBalance: 50 } as Wallet;

      (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(mockFromWallet).mockResolvedValueOnce(mockToWallet);
      (sendTransaction as jest.Mock).mockRejectedValue(new Error("Transfer failed"));
      (validateFields as jest.Mock).mockReturnValue([]);

      const mockReq = {
        body: { from: "fromPublic", to: "toPublic", amount: 10 },
      } as Request;
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

        await router.stack.find((layer) => layer.route?.path === "/transfer" && layer.route?.methods.post)?.handle(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith("err Error: Transfer failed");
    });
  });
});