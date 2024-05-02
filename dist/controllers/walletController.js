"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const WalletController = {
    async getWalletByPublicKey(publicKey) {
        const account = await prismaClient_1.default.wallet.findUnique({
            where: {
                publicKey,
            },
        });
        return account;
    },
    async updateWallet(publicKey, data) {
        const account = await prismaClient_1.default.wallet.update({
            where: {
                publicKey,
            },
            data,
        });
        return account;
    },
};
exports.default = WalletController;
