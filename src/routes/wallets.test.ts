import router from "./wallets";
import { Request, Response } from "express";
import prisma from "../utils/prismaClient";
import * as solanaUtils from "../utils/solana";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";
import { Wallet } from "@prisma/client";
import { PublicKey, Signer } from "@solana/web3.js";

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

jest.mock("../utils/validation", () => ({
  validateFields: jest.fn(),
}));

describe("wallets route", () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /", () => {
    it("should return wallets", async () => {
      const mockWallets = [{ id: 1, publicKey: "test" }];
      (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

      await router.stack.find((layer: any) => layer.route?.path === "/" && layer.route.methods.get)(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.wallet.findMany).toHaveBeenCalled();
      expect(mockResponse.send).toHaveBeenCalledWith(mockWallets);
    });
  });

  describe("POST /create", () => {
    it("should create a wallet", async () => {
      mockRequest.body = { privateKey: "private", publicKey: "public" };
      (prisma.wallet.create as jest.Mock).mockResolvedValue({
        privateKey: "private",
        publicKey: "public",
      });

      await router.stack.find((layer: any) => layer.route?.path === "/create" && layer.route.methods.post)(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.wallet.create).toHaveBeenCalledWith({
        data: {
          privateKey: "private",
          publicKey: "public",
        },
      });
      expect(mockResponse.send).toHaveBeenCalledWith("success");
    });

    it("should return an error if private key is missing", async () => {
      mockRequest.body = { publicKey: "public" };

      await router.stack.find((layer: any) => layer.route?.path === "/create" && layer.route.methods.post)(
        mockRequest as Request,
        mockResponse as Response
      );
      expect(mockResponse.send).toHaveBeenCalledWith("Private key required");
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it("should return an error if public key is missing", async () => {
      mockRequest.body = { privateKey: "private" };

      await router.stack.find((layer: any) => layer.route?.path === "/create" && layer.route.methods.post)(
        mockRequest as Request,
        mockResponse as Response
      );
      expect(mockResponse.send).toHaveBeenCalledWith("Public key required");
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it("should return an error if wallet creation fails", async () => {
      mockRequest.body = { privateKey: "private", publicKey: "public" };
      const mockError = new Error("Failed to create wallet");
      (prisma.wallet.create as jest.Mock).mockRejectedValue(mockError);

      await router.stack.find((layer: any) => layer.route?.path === "/create" && layer.route.methods.post)(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(prisma.wallet.create).toHaveBeenCalled();
      expect(mockResponse.send).toHaveBeenCalledWith(`err ${mockError}`);
    });
  });

  describe("POST /transfer", () => {
    it("should transfer SOL successfully", async () => {
      mockRequest.body = {
        from: "fromPublicKey",
        to: "toPublicKey",
        amount: 10,
      };

      const mockFromWallet: Wallet = {
        id: 1,
        privateKey: "fromPrivateKey",
        publicKey: "fromPublicKey",
        solBalance: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockToWallet: Wallet = {
        id: 2,
        privateKey: "toPrivateKey",
        publicKey: "toPublicKey",
        solBalance: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (WalletController.getWalletByPublicKey as jest.Mock)
        .mockResolvedValueOnce(mockFromWallet)
        .mockResolvedValueOnce(mockToWallet);

      (solanaUtils.sendTransaction as jest.Mock).mockResolvedValue({
        signature: "signature",
        fromBal: 90,
        toBal: 60,
        data: "data",
        url: "url",
      });

      (validateFields as jest.Mock).mockReturnValue([]);

      await router.stack.find((layer: any) => layer.route?.path === "/transfer" && layer.route.methods.post)(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(validateFields).toHaveBeenCalledWith(mockRequest.body);
      expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
      expect(solanaUtils.sendTransaction).toHaveBeenCalled();
      expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        signature: "signature",
        toBal: 60,
        fromBal: 90,
        data: "data",
        url: "url",
      });
    });

    it("should return 400 if required fields are missing", async () => {
      mockRequest.body = { from: "", to: "", amount: "" };
      (validateFields as jest.Mock).mockReturnValue(["from", "to", "amount"]);

      await router.stack.find((layer: any) => layer.route?.path === "/transfer" && layer.route.methods.post)(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(validateFields).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Missing required fields",
        missingFields: ["from", "to", "amount"],
      });
      expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
      expect(solanaUtils.sendTransaction).not.toHaveBeenCalled();
      expect(WalletController.updateWallet).not.toHaveBeenCalled();
    });

    it("should handle errors during transfer", async () => {
      mockRequest.body = {
        from: "fromPublicKey",
        to: "toPublicKey",
        amount: 10,
      };

      (validateFields as jest.Mock).mockReturnValue([]);

      const mockError = new Error("Transfer failed");
      (WalletController.getWalletByPublicKey as jest.Mock).mockRejectedValue(mockError);

      await router.stack.find((layer: any) => layer.route?.path === "/transfer" && layer.route.methods.post)(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith(`err ${mockError}`);
      expect(solanaUtils.sendTransaction).not.toHaveBeenCalled();
    });
  });
});