import {
  Connection,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Signer,
  PublicKey,
} from "@solana/web3.js";
import { jest } from '@jest/globals';
import { getBalance, sendTransaction } from "./solana";
import { SendTransactionResponse } from "../interfaces/solana";

jest.mock("@solana/web3.js", () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn(),
  })),
  Transaction: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
  })),
  SystemProgram: {
    transfer: jest.fn(),
    programId: new PublicKey("11111111111111111111111111111111"),
  },
  sendAndConfirmTransaction: jest.fn(),
  Signer: jest.fn(),
  PublicKey: jest.fn(),
}));

describe("solana utils", () => {
  const mockConnection = new Connection("https://api.devnet.solana.com", "confirmed");
  const mockPublicKey = new PublicKey("12345678901234567890123456789012");
  const mockSigner = {
    publicKey: new PublicKey("98765432109876543210987654321098"),
    secretKey: new Uint8Array(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getBalance", () => {
    it("should return balance from connection", async () => {
      const mockBalance = 1000;
      (mockConnection.getBalance as jest.Mock).mockResolvedValue(mockBalance);

      const balance = await getBalance(mockConnection, mockPublicKey);

      expect(balance).toBe(mockBalance);
      expect(mockConnection.getBalance).toHaveBeenCalledWith(mockPublicKey);
    });
  });

  describe("sendTransaction", () => {
    it("should send transaction successfully and return transaction details", async () => {
      const mockSignature = "signature";
      const mockFromBal = 1000;
      const mockToBal = 2000;
      (sendAndConfirmTransaction as jest.Mock).mockResolvedValue(mockSignature);
      (mockConnection.getBalance as jest.Mock)
        .mockResolvedValueOnce(mockFromBal)
        .mockResolvedValueOnce(mockToBal);
      (SystemProgram.transfer as jest.Mock).mockReturnValue({});

      const result: SendTransactionResponse = await sendTransaction(mockSigner as Signer, mockSigner as Signer, 100);

      expect(sendAndConfirmTransaction).toHaveBeenCalled();
      expect(mockConnection.getBalance).toHaveBeenCalledTimes(2);
      expect(result.signature).toBe(mockSignature);
      expect(result.fromBal).toBe(mockFromBal);
      expect(result.toBal).toBe(mockToBal);
      expect(result.data).toBe("success");
      expect(result.url).toContain(mockSignature);
    });

    it("should handle transaction failure", async () => {
      (sendAndConfirmTransaction as jest.Mock).mockRejectedValue(new Error("Transaction failed"));
      (SystemProgram.transfer as jest.Mock).mockReturnValue({});
      const result: SendTransactionResponse = await sendTransaction(mockSigner as Signer, mockSigner as Signer, 100);
      expect(result.data).toBe("error");
      expect(result.signature).toBeNull();
    });
  });
});