import request from "supertest";
import { app } from "../app";
import prisma from "../utils/prismaClient";
import { Wallet } from "@prisma/client";
import { sendTransaction } from "../utils/solana";
import { PublicKey, Signer } from "@solana/web3.js";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";

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

const mockWallet: Wallet = {
  id: "someId",
  privateKey: "somePrivateKey",
  publicKey: "somePublicKey",
  solBalance: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Wallet routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("GET / should return wallets", async () => {
    (prisma.wallet.findMany as jest.Mock).mockResolvedValue([mockWallet]);

    const res = await request(app).get("/wallets");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([mockWallet]);
    expect(prisma.wallet.findMany).toHaveBeenCalledTimes(1);
  });

  it("POST /create should create a wallet", async () => {
    (prisma.wallet.create as jest.Mock).mockResolvedValue(mockWallet);

    const res = await request(app).post("/wallets/create").send({
      privateKey: "somePrivateKey",
      publicKey: "somePublicKey",
    });

    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual("success");
    expect(prisma.wallet.create).toHaveBeenCalledTimes(1);
    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: {
        privateKey: "somePrivateKey",
        publicKey: "somePublicKey",
      },
    });
  });

  it("POST /create should return an error if private key is missing", async () => {
    const res = await request(app).post("/wallets/create").send({
      publicKey: "somePublicKey",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual("Private key required");
  });

  it("POST /create should return an error if public key is missing", async () => {
    const res = await request(app).post("/wallets/create").send({
      privateKey: "somePrivateKey",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual("Public key required");
  });

  it("POST /transfer should transfer SOL", async () => {
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValue(mockWallet);
    (sendTransaction as jest.Mock).mockResolvedValue({
      signature: "someSignature",
      fromBal: 90,
      toBal: 110,
      data: "someData",
      url: "someUrl",
    });
    (WalletController.updateWallet as jest.Mock).mockResolvedValue(mockWallet);
    (validateFields as jest.Mock).mockReturnValue([]);

    const res = await request(app).post("/wallets/transfer").send({
      from: "fromPublicKey",
      to: "toPublicKey",
      amount: 10,
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      signature: "someSignature",
      toBal: 110,
      fromBal: 90,
      data: "someData",
      url: "someUrl",
    });
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(WalletController.updateWallet).toHaveBeenCalledTimes(2);
    expect(validateFields).toHaveBeenCalledTimes(1);
  });

  it("POST /transfer should return an error if validateFields returns errors", async () => {
    (validateFields as jest.Mock).mockReturnValue(["from", "to"]);
    const res = await request(app).post("/wallets/transfer").send({
      from: "fromPublicKey",
      to: "toPublicKey",
      amount: 10,
    });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({
      error: "Missing required fields",
      missingFields: ["from", "to"],
    });
    expect(WalletController.getWalletByPublicKey).not.toHaveBeenCalled();
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(WalletController.updateWallet).not.toHaveBeenCalled();
    expect(validateFields).toHaveBeenCalledTimes(1);
  });

  it("POST /transfer should handle errors from sendTransaction", async () => {
    (WalletController.getWalletByPublicKey as jest.Mock).mockResolvedValue(mockWallet);
    (sendTransaction as jest.Mock).mockRejectedValue(new Error("Transfer failed"));
    (validateFields as jest.Mock).mockReturnValue([]);

    const res = await request(app).post("/wallets/transfer").send({
      from: "fromPublicKey",
      to: "toPublicKey",
      amount: 10,
    });

    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('err Error: Transfer failed');
    expect(WalletController.getWalletByPublicKey).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(WalletController.updateWallet).not.toHaveBeenCalled();
    expect(validateFields).toHaveBeenCalledTimes(1);
  });
});