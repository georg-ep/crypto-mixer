import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Router, Request, Response } from "express";
import { sendTransaction } from "../utils/solana";
import { Signer, PublicKey } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";
import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";
import router from "./wallets";

jest.mock("../utils/solana", () => ({
  sendTransaction: jest.fn(),
}));

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

jest.mock("../utils/validation", () => ({
  validateFields: jest.fn(),
}));

describe("wallets route", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      send: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /", () => {
    it("should return wallets from the database", async () => {
      const mockWallets = [{ id: 1, publicKey: 'test', privateKey: 'test' }];
      (prisma.wallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

      // Create a dummy router and call the route handler directly.
      const app = Router();
      app.get("/", router.stack.find(layer => layer.route && layer.route.path === "/" )?.route.stack[0].handle);
      await app.handle(req, res);
      
      expect(prisma.wallet.findMany).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(mockWallets);
    });
  });

  describe("POST /create", () => {
    it("should create a new wallet", async () => {
      req.body = { privateKey: "testPrivateKey", publicKey: "testPublicKey" };
      (prisma.wallet.create as jest.Mock).mockResolvedValue({ id: 1, publicKey: 'testPublicKey', privateKey: 'testPrivateKey' });

      // Create a dummy router and call the route handler directly.
      const app = Router();
      app.post("/create", router.stack.find(layer => layer.route && layer.route.path === "/create" )?.route.stack[0].handle);
      await app.handle(req, res);


      expect(prisma.wallet.create).toHaveBeenCalledWith({
        data: {
          privateKey: "testPrivateKey",
          publicKey: "testPublicKey",
        },
      });
      expect(res.send).toHaveBeenCalledWith("success");
    });

    it("should return an error if private key is missing", async () => {
      req.body = { publicKey: "testPublicKey" };
       // Create a dummy router and call the route handler directly.
       const app = Router();
       app.post("/create", router.stack.find(layer => layer.route && layer.route.path === "/create" )?.route.stack[0].handle);
       await app.handle(req, res);

      expect(res.send).toHaveBeenCalledWith("Private key required");
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it("should return an error if public key is missing", async () => {
      req.body = { privateKey: "testPrivateKey" };
       // Create a dummy router and call the route handler directly.
       const app = Router();
       app.post("/create", router.stack.find(layer => layer.route && layer.route.path === "/create" )?.route.stack[0].handle);
       await app.handle(req, res);

      expect(res.send).toHaveBeenCalledWith("Public key required");
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it("should return an error if prisma create fails", async () => {
        req.body = { privateKey: "testPrivateKey", publicKey: "testPublicKey" };
        (prisma.wallet.create as jest.Mock).mockRejectedValue(new Error("Database error"));
  
        // Create a dummy router and call the route handler directly.
        const app = Router();
        app.post("/create", router.stack.find(layer => layer.route && layer.route.path === "/create" )?.route.stack[0].handle);
        await app.handle(req, res);
  
        expect(prisma.wallet.create).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith("err Error: Database error");
      });
  });

  describe("POST /transfer", () => {
    it("should transfer tokens between wallets", async () => {
      const fromWallet: any = { privateKey: "fromPrivateKey", publicKey: "fromPublicKey" , id: 1};
      const toWallet: any = { privateKey: "toPrivateKey", publicKey: "toPublicKey", id: 2 };
      const mockResponse: SendTransactionResponse = {
        signature: "testSignature",
        fromBal: 100,
        toBal: 50,
        data: {},
        url: "testUrl",
      };

      req.body = { from: "fromPublicKey", to: "toPublicKey", amount: 10 };
      (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(fromWallet);
      (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValueOnce(toWallet);
      (sendTransaction as jest.Mock).mockResolvedValue(mockResponse);

      // Create a dummy router and call the route handler directly.
      const app = Router();
      app.post("/transfer", router.stack.find(layer => layer.route && layer.route.path === "/transfer" )?.route.stack[0].handle);
      await app.handle(req, res);

      expect(validateFields).toHaveBeenCalledWith({ from: 'fromPublicKey', to: 'toPublicKey', amount: 10 });
      expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
      expect(sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ publicKey: new PublicKey("fromPublicKey") }),
        expect.objectContaining({ publicKey: new PublicKey("toPublicKey") }),
        10
      );
      expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(mockResponse);
    });

    it("should return 400 if validation fails", async () => {
      req.body = { from: "", to: "", amount: "" };
      (validateFields as jest.Mock).mockReturnValue(["from", "to", "amount"]);

        // Create a dummy router and call the route handler directly.
        const app = Router();
        app.post("/transfer", router.stack.find(layer => layer.route && layer.route.path === "/transfer" )?.route.stack[0].handle);
        await app.handle(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Missing required fields",
        missingFields: ["from", "to", "amount"],
      });
      expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
      expect(sendTransaction).not.toHaveBeenCalled();
      expect(WalletController.updateWallet).not.toHaveBeenCalled();
    });

    it("should handle errors from sendTransaction", async () => {
      req.body = { from: "fromPublicKey", to: "toPublicKey", amount: 10 };
      (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValue({privateKey: 'pk', publicKey: 'pk'});
      (sendTransaction as jest.Mock).mockRejectedValue(new Error("Transaction failed"));
      // Create a dummy router and call the route handler directly.
      const app = Router();
      app.post("/transfer", router.stack.find(layer => layer.route && layer.route.path === "/transfer" )?.route.stack[0].handle);
      await app.handle(req, res);


      expect(res.json).toHaveBeenCalledWith("err Error: Transaction failed");
      expect(WalletController.updateWallet).not.toHaveBeenCalled();
    });
  });
});