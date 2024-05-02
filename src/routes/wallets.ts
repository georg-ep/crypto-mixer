import { Router } from "express";
import { sendTransaction } from "../utils/solana";
import { Signer, PublicKey } from "@solana/web3.js";
import { SendTransactionResponse } from "../interfaces/solana";
import { Wallet } from "@prisma/client";
import prisma from "../utils/prismaClient";
import WalletController from "../controllers/walletController";
import { validateFields } from "../utils/validation";
const router = Router();

router.get("/", async (req, res) => {
  const wallets = await prisma.wallet.findMany();
  // sendTransaction();
  res.send(wallets);
});

router.post("/create", async (req, res) => {
  const { privateKey, publicKey } = req.body;
  if (!privateKey) res.send("Private key required");
  if (!publicKey) res.send("Public key required");
  try {
    await prisma.wallet.create({
      data: {
        privateKey,
        publicKey,
      },
    });
    res.send("success");
  } catch (e) {
    res.send(`err ${e}`);
  }
});

// SEND : From account, Amount in wallet
// RECEIVE : To accounnt, Amount to account

router.post("/transfer", async (req, res) => {
  const { from, to, amount } = req.body;

  const fields = validateFields({ from, to, amount });
  if (fields.length > 0) {
    return res.status(400).json({
      error: "Missing required fields",
      missingFields: fields,
    });
  }

  const fromAccount: Wallet = await WalletController.getWalletByPublicKey(from);

  const toAccount: Wallet = await WalletController.getWalletByPublicKey(to);

  const fromSigner: Signer = {
    publicKey: new PublicKey(from.toString()),
    secretKey: new Uint8Array(fromAccount.privateKey),
  };
  const toSigner: Signer = {
    publicKey: new PublicKey(to.toString()),
    secretKey: new Uint8Array(toAccount.privateKey),
  };

  try {
    const response: SendTransactionResponse = await sendTransaction(
      fromSigner,
      toSigner,
      amount
    );

    const { signature, fromBal, toBal, data, url } = response;

    await WalletController.updateWallet(from, { solBalance: fromBal });
    await WalletController.updateWallet(to, { solBalance: toBal });

    res.json({ signature, toBal, fromBal, data, url });
  } catch (e) {
    res.json(`err ${e}`);
  }
});

export default router;
