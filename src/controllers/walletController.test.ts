import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import WalletController from "./walletController";
import prisma from "../utils/prismaClient";
import { Wallet } from "@prisma/client";

jest.mock('../utils/prismaClient', () => ({
    // Mock prisma client methods used in the controller
    wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
}));


describe('WalletController', () => {
    const mockWallet: Wallet = {
        publicKey: "testPublicKey",
        id: "testId",
        createdAt: new Date(),
        updatedAt: new Date(),
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should get wallet by public key', async () => {
        (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

        const result = await WalletController.getWalletByPublicKey("testPublicKey");

        expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
            where: {
                publicKey: "testPublicKey",
            },
        });
        expect(result).toEqual(mockWallet);
    });

    it('should update wallet', async () => {
        const updateData = {
            someField: "newValue",
        };
        (prisma.wallet.update as jest.Mock).mockResolvedValue({ ...mockWallet, ...updateData });

        const result = await WalletController.updateWallet("testPublicKey", updateData);

        expect(prisma.wallet.update).toHaveBeenCalledWith({
            where: {
                publicKey: "testPublicKey",
            },
            data: updateData,
        });
        expect(result).toEqual({ ...mockWallet, ...updateData });
    });
});