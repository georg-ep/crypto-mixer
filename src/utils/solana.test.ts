import {
  Connection,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Signer,
  PublicKey,
} from "@solana/web3.js";
import * as solana from "./solana";
import { SendTransactionResponse } from "../interfaces/solana";

jest.mock("@solana/web3.js", () => ({
  ...jest.requireActual("@solana/web3.js"),
  sendAndConfirmTransaction: jest.fn(),
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn(),
  })),
}));

describe("solana", () => {
  const mockFrom = {
    publicKey: new PublicKey("H9v63zN11s4Xz9rDqjK6M7gT5P3e5u1Z9W8o7GjY2y3"),
    secretKey: new Uint8Array(64),
    sign: jest.fn(),
  };
  const mockTo = {
    publicKey: new PublicKey("DqjK6M7gT5P3e5u1Z9W8o7GjY2y3H9v63zN11s4Xz9r"),
    secretKey: new Uint8Array(64),
    sign: jest.fn(),
  };
  const mockAmount = 1000;
  const mockSignature = "signature";

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getBalance", () => {
    it("should return the balance for a given address", async () => {
      const mockBalance = 1000000;
      const mockConnection = new Connection("https://api.devnet.solana.com", "confirmed");
      (mockConnection.getBalance as jest.Mock).mockResolvedValue(mockBalance);

      const balance = await solana.getBalance(mockConnection, mockFrom.publicKey);

      expect(balance).toBe(mockBalance);
      expect(mockConnection.getBalance).toHaveBeenCalledWith(mockFrom.publicKey);
    });
  });

  describe("sendTransaction", () => {
    it("should send a transaction and return the signature and balances on success", async () => {
      (sendAndConfirmTransaction as jest.Mock).mockResolvedValue(mockSignature);
      const mockConnection = new Connection("https://api.devnet.solana.com", "confirmed");
      (mockConnection.getBalance as jest.Mock).mockResolvedValue(2000);

      const result: SendTransactionResponse = await solana.sendTransaction(mockFrom, mockTo, mockAmount);

      expect(sendAndConfirmTransaction).toHaveBeenCalled();
      expect(result.signature).toBe(mockSignature);
      expect(result.data).toBe("success");
      expect(result.url).toContain("https://explorer.solana.com/tx/");
      expect(result.fromBal).toBe(2000);
      expect(result.toBal).toBe(2000);
    });

    it("should return an error if sendAndConfirmTransaction fails", async () => {
      (sendAndConfirmTransaction as jest.Mock).mockRejectedValue(new Error("Transaction failed"));
      const mockConnection = new Connection("https://api.devnet.solana.com", "confirmed");

      const result: SendTransactionResponse = await solana.sendTransaction(mockFrom, mockTo, mockAmount);

      expect(result.data).toBe("error");
      expect(result.signature).toBeNull();
    });
  });
});