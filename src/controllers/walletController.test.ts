import { Wallet } from "@prisma/client";
import WalletController from "./walletController";
import prisma from "../utils/prismaClient";

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

  describe("getWalletByPublicKey", () => {
    it("should return a wallet if found", async () => {
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);
      const result = await WalletController.getWalletByPublicKey(
        "testPublicKey"
      );
      expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
        where: {
          publicKey: "testPublicKey",
        },
      });
      expect(result).toEqual(mockWallet);
    });

    it("should return null if wallet is not found", async () => {
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await WalletController.getWalletByPublicKey(
        "nonExistentPublicKey"
      );
      expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
        where: {
          publicKey: "nonExistentPublicKey",
        },
      });
      expect(result).toBeNull();
    });
  });

  describe("updateWallet", () => {
    it("should update a wallet and return the updated wallet", async () => {
      const updateData = {
        publicKey: "updatedPublicKey",
      };
      const updatedWallet: Wallet = {
        ...mockWallet,
        ...updateData,
      };

      (prisma.wallet.update as jest.Mock).mockResolvedValue(updatedWallet);
      const result = await WalletController.updateWallet(
        "testPublicKey",
        updateData
      );

      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: {
          publicKey: "testPublicKey",
        },
        data: updateData,
      });
      expect(result).toEqual(updatedWallet);
    });

    it("should handle update failure", async () => {
      const updateData = {
        publicKey: "updatedPublicKey",
      };
      (prisma.wallet.update as jest.Mock).mockRejectedValue(
        new Error("Update failed")
      );

      try {
        await WalletController.updateWallet("testPublicKey", updateData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(prisma.wallet.update).toHaveBeenCalledWith({
          where: {
            publicKey: "testPublicKey",
          },
          data: updateData,
        });
      }
    });
  });
});