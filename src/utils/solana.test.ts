import {
  Connection,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Signer,
  PublicKey,
} from "@solana/web3.js";

import { SendTransactionResponse } from "../interfaces/solana";
import * as solana from "./solana";

jest.mock("@solana/web3.js");

describe("solana utils", {
  timeout: 30000
}, () => {
  const mockConnection = {
    getBalance: jest.fn(),
  } as unknown as Connection;

  const mockSigner = {
    publicKey: new PublicKey("H4xR117..."),
    secretKey: new Uint8Array(),
    signTransaction: jest.fn(),
  } as unknown as Signer;

  const mockToSigner = {
    publicKey: new PublicKey("ToPub..."),
    secretKey: new Uint8Array(),
    signTransaction: jest.fn(),
  } as unknown as Signer;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should get balance", async () => {
    const mockBalance = 1000;
    (mockConnection.getBalance as jest.Mock).mockResolvedValue(mockBalance);
    const result = await solana.getBalance(mockConnection, mockSigner.publicKey);
    expect(result).toBe(mockBalance);
    expect(mockConnection.getBalance).toHaveBeenCalledWith(mockSigner.publicKey);
  });

  it("should send transaction successfully", async () => {
    const mockSignature = "signature";
    const mockFromBal = 5000;
    const mockToBal = 2000;
    (sendAndConfirmTransaction as jest.Mock).mockResolvedValue(mockSignature);
    (mockConnection.getBalance as jest.Mock)
      .mockResolvedValueOnce(mockFromBal)
      .mockResolvedValueOnce(mockToBal);

    const result = await solana.sendTransaction(mockSigner, mockToSigner, 1000);
    expect(result.signature).toBe(mockSignature);
    expect(result.fromBal).toBe(mockFromBal);
    expect(result.toBal).toBe(mockToBal);
    expect(result.data).toBe("success");
    expect(sendAndConfirmTransaction).toHaveBeenCalled();
  });

  it("should handle transaction failure", async () => {
    (sendAndConfirmTransaction as jest.Mock).mockRejectedValue(new Error("Transaction failed"));

    const result = await solana.sendTransaction(mockSigner, mockToSigner, 1000);
    expect(result.signature).toBeNull();
    expect(result.data).toBe("error");
  });
});