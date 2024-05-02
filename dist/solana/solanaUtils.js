"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTransaction = exports.getBalance = void 0;
const web3_js_1 = require("@solana/web3.js");
const getBalance = async (connection, address) => {
    return connection.getBalance(address);
};
exports.getBalance = getBalance;
const sendTransaction = async (from, to, amount) => {
    const response = {
        signature: null,
        fromBal: null,
        toBal: null,
        data: null,
    };
    const connection = new web3_js_1.Connection("https://api.devnet.solana.com", "confirmed");
    const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to.publicKey,
        lamports: amount,
        programId: web3_js_1.SystemProgram.programId,
    }));
    try {
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [
            from,
        ]);
        const fromBal = await (0, exports.getBalance)(connection, from.publicKey);
        const toBal = await (0, exports.getBalance)(connection, to.publicKey);
        return {
            signature,
            fromBal,
            toBal,
            data: "success",
        };
    }
    catch (e) {
        return {
            ...response,
            data: "error",
        };
    }
};
exports.sendTransaction = sendTransaction;
