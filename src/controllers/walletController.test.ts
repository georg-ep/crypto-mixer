import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import WalletController from "./walletController";
import prisma from "../utils/prismaClient";

jest.mock('../utils/prismaClient', () => ({
    //@ts-ignore -  Avoid type errors when mocking
    findUnique: jest.fn(),
    //@ts-ignore -  Avoid type errors when mocking
    update: jest.fn(),
}));

describe('WalletController', () => {
    beforeEach(() => {
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
        const mockWallet = { publicKey: 'testPublicKey', balance: 100 };
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
});