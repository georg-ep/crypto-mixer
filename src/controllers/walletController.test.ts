import WalletController from "./walletController";
import prisma from "../utils/prismaClient";
import { Wallet } from "@prisma/client";

jest.mock("../utils/prismaClient", () => ({
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

describe("WalletController", {
  async getWalletByPublicKey(publicKey: string) {
    const account: Wallet = await prisma.wallet.findUnique({
      where: {
        publicKey,
      },
    });
    return account;
  },
  async updateWallet(publicKey: string, data: object) {
    const account = await prisma.wallet.update({
      where: {
        publicKey,
      },
      data,
    });
    return account;
  },
});

describe("WalletController", () => {
  const mockWallet: Wallet = {
    publicKey: "testPublicKey",
    createdAt: new Date(),
    updatedAt: new Date(),
    id: "someId",
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should get a wallet by public key", async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

    const result = await WalletController.getWalletByPublicKey("testPublicKey");

    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
      where: {
        publicKey: "testPublicKey",
      },
    });
    expect(result).toEqual(mockWallet);
  });

  it("should return null if wallet is not found", async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await WalletController.getWalletByPublicKey("nonExistentPublicKey");

    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
      where: {
        publicKey: "nonExistentPublicKey",
      },
    });
    expect(result).toBeNull();
  });

  it("should update a wallet", async () => {
    const updateData = {
      someField: "someValue",
    };
    (prisma.wallet.update as jest.Mock).mockResolvedValue({
      ...mockWallet,
      ...updateData,
    });

    const result = await WalletController.updateWallet("testPublicKey", updateData);

    expect(prisma.wallet.update).toHaveBeenCalledWith({
      where: {
        publicKey: "testPublicKey",
      },
      data: updateData,
    });
    expect(result).toEqual({ ...mockWallet, ...updateData });
  });

  it("should handle errors when updating wallet", async () => {
    const updateData = {
      someField: "someValue",
    };
    (prisma.wallet.update as jest.Mock).mockRejectedValue(new Error("Update failed"));

    await expect(WalletController.updateWallet("testPublicKey", updateData)).rejects.toThrow("Update failed");

    expect(prisma.wallet.update).toHaveBeenCalledWith({
      where: {
        publicKey: "testPublicKey",
      },
      data: updateData,
    });
  });
});