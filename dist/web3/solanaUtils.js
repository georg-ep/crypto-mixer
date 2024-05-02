"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTransaction = void 0;
const web3_js_1 = require("@solana/web3.js");
const sendTransaction = async (from, to, amount) => {
    const connection = new web3_js_1.Connection("https://api.devnet.solana.com", "confirmed");
    console.log(from.publicKey, to.publicKey, amount);
    (async () => {
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: from.publicKey.toString(),
            toPubkey: to.publicKey.toString(),
            lamports: amount,
            programId: web3_js_1.SystemProgram.programId,
        }));
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [
            from,
        ]);
        console.log("SIGNATURE", signature);
    })();
};
exports.sendTransaction = sendTransaction;
