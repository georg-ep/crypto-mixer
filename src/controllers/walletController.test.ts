import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import WalletController from "./walletController";
import prisma from "../utils/prismaClient";

jest.mock('../utils/prismaClient', () => ({
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

describe('WalletController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get a wallet by public key', async () => {
    const mockWallet = { publicKey: 'testPublicKey', balance: 100 } as any;
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
    const mockUpdatedWallet = { publicKey: 'testPublicKey', balance: 200 } as any;
    const updateData = { balance: 200 };
    (prisma.wallet.update as jest.Mock).mockResolvedValue(mockUpdatedWallet);

    const result = await WalletController.updateWallet('testPublicKey', updateData);

    expect(prisma.wallet.update).toHaveBeenCalledWith({
      where: {
        publicKey: 'testPublicKey',
      },
      data: updateData,
    });
    expect(result).toEqual(mockUpdatedWallet);
  });

  it('should handle null when getWalletByPublicKey does not find a wallet', async () => {
    (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await WalletController.getWalletByPublicKey('nonExistentPublicKey');

    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
      where: {
        publicKey: 'nonExistentPublicKey',
      },
    });
    expect(result).toBeNull();
  });
});