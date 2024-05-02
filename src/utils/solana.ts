import {
  Connection,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Signer,
  PublicKey,
} from "@solana/web3.js";

import { SendTransactionResponse } from "../interfaces/solana";
export const getBalance = async (
  connection: Connection,
  address: PublicKey
) => {
  return connection.getBalance(address);
};


export const sendTransaction = async (
  from: Signer,
  to: Signer,
  amount: number,
): Promise<SendTransactionResponse> => {
  const response = {
    signature: null,
    fromBal: null,
    toBal: null,
    data: null,
    url: null,
  };
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to.publicKey,
      lamports: amount,
      programId: SystemProgram.programId,
    })
  );
  // Sign transaction, broadcast, and confirm
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      from,
    ]);
    const fromBal = await getBalance(connection, from.publicKey);
    const toBal = await getBalance(connection, to.publicKey);
    return {
      signature,
      url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      fromBal,
      toBal,
      data: "success",
    };
  } catch (e) {
    return {
      ...response,
      data: "error",
    };
  }
};
