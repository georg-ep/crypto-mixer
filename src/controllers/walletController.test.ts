import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import WalletController from "./walletController";
import prisma from "../utils/prismaClient";

jest.mock("../utils/prismaClient", () => ({
    wallet: {
        findUnique: jest.fn(),
        update: jest.fn()
    }
}));


describe('WalletController', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should get a wallet by public key', async () => {
        const mockWallet = { publicKey: 'testPublicKey', balance: 100 };
        (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

        const result = await WalletController.getWalletByPublicKey('testPublicKey');

        expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
            where: {
                publicKey: 'testPublicKey',
            },
        });
        expect(result).toEqual(mockWallet);
    });

    it('should update a wallet', async () => {
        const mockWallet = { publicKey: 'testPublicKey', balance: 200 };
        const updateData = { balance: 200 };
        (prisma.wallet.update as jest.Mock).mockResolvedValue(mockWallet);

        const result = await WalletController.updateWallet('testPublicKey', updateData);

        expect(prisma.wallet.update).toHaveBeenCalledWith({
            where: {
                publicKey: 'testPublicKey',
            },
            data: updateData,
        });
        expect(result).toEqual(mockWallet);
    });

    it('should handle findUnique returning null', async () => {
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await WalletController.getWalletByPublicKey('nonExistentKey');
      expect(result).toBeNull();
  });

  it('should handle update returning null', async () => {
      (prisma.wallet.update as jest.Mock).mockResolvedValue(null);
      const updateData = { balance: 200 };

      const result = await WalletController.updateWallet('nonExistentKey', updateData);
      expect(result).toBeNull();
  });
});