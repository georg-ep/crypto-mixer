import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";

const WalletController = {
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
};

export default WalletController;
