import {
  Connection,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Signer,
  PublicKey,
} from "@solana/web3.js";
import { getBalance, sendTransaction } from "./solana";
import { SendTransactionResponse } from "../interfaces/solana";

jest.mock("@solana/web3.js", () => ({
  ...jest.requireActual("@solana/web3.js"),
  sendAndConfirmTransaction: jest.fn(),
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn(),
  })),
}));

describe("solana", () => {
  const mockFromSigner = {
    publicKey: new PublicKey("H9v5ZqP8M7F2rB3bS4yJ8aQxR3eC1w2vL4uK5zT7a"),
    secretKey: new Uint8Array(64),
  } as Signer;
  const mockToSigner = {
    publicKey: new PublicKey("B4qV3wXyZ1aY8qK6hF5jP9gT2eC7dD0fL9rA3xS2y"),
    secretKey: new Uint8Array(64),
  } as Signer;
  const mockAmount = 1000;
  const mockSignature = "signature";

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getBalance", () => {
    it("should return the balance for a given address", async () => {
      const mockConnection = new Connection("https://api.devnet.solana.com");
      const mockBalance = 1000000;
      (mockConnection.getBalance as jest.Mock).mockResolvedValue(mockBalance);

      const balance = await getBalance(mockConnection, mockFromSigner.publicKey);

      expect(balance).toEqual(mockBalance);
      expect(mockConnection.getBalance).toHaveBeenCalledWith(mockFromSigner.publicKey);
    });
  });

  describe("sendTransaction", () => {
    it("should send a transaction successfully and return transaction details", async () => {
      (sendAndConfirmTransaction as jest.Mock).mockResolvedValue(mockSignature);
      const mockConnection = new Connection("https://api.devnet.solana.com");
      (mockConnection.getBalance as jest.Mock)
        .mockResolvedValueOnce(2000)
        .mockResolvedValueOnce(3000);

      const expectedResponse: SendTransactionResponse = {
        signature: mockSignature,
        url: `https://explorer.solana.com/tx/${mockSignature}?cluster=devnet`,
        fromBal: 2000,
        toBal: 3000,
        data: "success",
      };

      const result = await sendTransaction(mockFromSigner, mockToSigner, mockAmount);

      expect(sendAndConfirmTransaction).toHaveBeenCalledWith(
        expect.any(Connection),
        expect.any(Transaction),
        [mockFromSigner]
      );
      expect(result).toEqual(expectedResponse);
    });

    it("should handle transaction failure and return an error", async () => {
      (sendAndConfirmTransaction as jest.Mock).mockRejectedValue(new Error("Transaction failed"));
      const mockConnection = new Connection("https://api.devnet.solana.com");

      const expectedResponse: SendTransactionResponse = {
        signature: null,
        fromBal: null,
        toBal: null,
        data: "error",
        url: null,
      };

      const result = await sendTransaction(mockFromSigner, mockToSigner, mockAmount);

      expect(sendAndConfirmTransaction).toHaveBeenCalledWith(
        expect.any(Connection),
        expect.any(Transaction),
        [mockFromSigner]
      );
      expect(result).toEqual(expectedResponse);
    });
  });
});