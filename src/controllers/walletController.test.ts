import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";
import WalletController from "./walletController";

jest.mock("../utils/prismaClient", () => ({
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

describe("WalletController", () => {
  const mockWallet: Wallet = {
    id: "1",
    publicKey: "testPublicKey",
    createdAt: new Date(),
    updatedAt: new Date(),
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
      // Add some sample data to update,
      // Ensure the data matches Wallet interface to avoid typescript errors.
      // Adjust according to the Wallet interface if needed.
      updatedAt: new Date(),
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

    it("should handle update wallet with empty data", async () => {
        const updateData = {}; // Empty data object
        (prisma.wallet.update as jest.Mock).mockResolvedValue(mockWallet); // Simulate successful update

        const result = await WalletController.updateWallet("testPublicKey", updateData);

        expect(prisma.wallet.update).toHaveBeenCalledWith({
            where: {
                publicKey: "testPublicKey",
            },
            data: {},
        });
        expect(result).toEqual(mockWallet);
    });

  it("should throw an error when findUnique fails", async () => {
    (prisma.wallet.findUnique as jest.Mock).mockRejectedValue(new Error("Database error"));
    await expect(WalletController.getWalletByPublicKey("testPublicKey")).rejects.toThrow("Database error");
  });

  it("should throw an error when update fails", async () => {
    const updateData = {
      updatedAt: new Date(),
    };
    (prisma.wallet.update as jest.Mock).mockRejectedValue(new Error("Database error"));
    await expect(WalletController.updateWallet("testPublicKey", updateData)).rejects.toThrow("Database error");
  });
});