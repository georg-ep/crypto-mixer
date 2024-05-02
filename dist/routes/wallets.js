"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const solana_1 = require("../utils/solana");
const web3_js_1 = require("@solana/web3.js");
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const walletController_1 = __importDefault(require("../controllers/walletController"));
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.get("/", async (req, res) => {
    const wallets = await prismaClient_1.default.wallet.findMany();
    res.send(wallets);
});
router.post("/create", async (req, res) => {
    const { privateKey, publicKey } = req.body;
    if (!privateKey)
        res.send("Private key required");
    if (!publicKey)
        res.send("Public key required");
    try {
        await prismaClient_1.default.wallet.create({
            data: {
                privateKey,
                publicKey,
            },
        });
        res.send("success");
    }
    catch (e) {
        res.send(`err ${e}`);
    }
});
router.post("/transfer", async (req, res) => {
    const { from, to, amount } = req.body;
    const fields = (0, validation_1.validateFields)({ from, to, amount });
    if (fields.length > 0) {
        return res.status(400).json({
            error: "Missing required fields",
            missingFields: fields,
        });
    }
    const fromAccount = await walletController_1.default.getWalletByPublicKey(from);
    const toAccount = await walletController_1.default.getWalletByPublicKey(to);
    const fromSigner = {
        publicKey: new web3_js_1.PublicKey(from.toString()),
        secretKey: new Uint8Array(fromAccount.privateKey),
    };
    const toSigner = {
        publicKey: new web3_js_1.PublicKey(to.toString()),
        secretKey: new Uint8Array(toAccount.privateKey),
    };
    try {
        const response = await (0, solana_1.sendTransaction)(fromSigner, toSigner, amount);
        const { signature, fromBal, toBal, data, url } = response;
        await walletController_1.default.updateWallet(from, { solBalance: fromBal });
        await walletController_1.default.updateWallet(to, { solBalance: toBal });
        res.json({ signature, toBal, fromBal, data, url });
    }
    catch (e) {
        res.json(`err ${e}`);
    }
});
exports.default = router;
