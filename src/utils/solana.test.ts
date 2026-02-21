import {
  isValidSolanaAddress,
  deriveAssociatedTokenAccount,
  getSolanaBalance,
} from './solana';
import { Connection, PublicKey } from '@solana/web3.js';

jest.mock('@solana/web3.js', () => ({
  ...jest.requireActual('@solana/web3.js'),
  Connection: jest.fn(),
  PublicKey: jest.fn(),
}));

describe('solana utils', {
  mocked: true,
}, () => {
  const mockAddress = 'B33gDkY7C6Xvj39aB69oX8r7w8Z9V4uX7y9zQe3q7w2';
  const mockInvalidAddress = 'invalid-address';
  const mockMint = 'So11111111111111111111111111111111111111112'; // Example SOL mint

  describe('isValidSolanaAddress', () => {
    it('should return true for a valid Solana address', () => {
      expect(isValidSolanaAddress(mockAddress)).toBe(true);
    });

    it('should return false for an invalid Solana address', () => {
      expect(isValidSolanaAddress(mockInvalidAddress)).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(isValidSolanaAddress('')).toBe(false);
    });
  });

  describe('deriveAssociatedTokenAccount', () => {
    it('should return a valid associated token account address', async () => {
      const ownerAddress = new PublicKey(mockAddress);
      const mintAddress = new PublicKey(mockMint);

      const ata = await deriveAssociatedTokenAccount(mintAddress, ownerAddress);
      expect(ata).toBeDefined();
      expect(typeof ata).toBe('string');
    });
  });

  describe('getSolanaBalance', () => {
    it('should return a number for a valid Solana address', async () => {
      const mockBalance = 1000000000; // Example balance in lamports
      const mockGetBalance = jest.fn().mockResolvedValue(mockBalance);
      (Connection as jest.MockedClass<typeof Connection>).mockImplementation(
        () =>
          ({
            getBalance: mockGetBalance,
          } as any),
      );
      const connection = new (Connection as any)('mock-cluster');
      const balance = await getSolanaBalance(mockAddress, connection);
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
      expect(mockGetBalance).toHaveBeenCalledWith(new PublicKey(mockAddress));
    });

    it('should handle errors and return 0 for an invalid Solana address', async () => {
      const mockGetBalance = jest.fn().mockRejectedValue(new Error('Simulated error'));
      (Connection as jest.MockedClass<typeof Connection>).mockImplementation(
        () =>
          ({
            getBalance: mockGetBalance,
          } as any),
      );
      const connection = new (Connection as any)('mock-cluster');
      const balance = await getSolanaBalance(mockInvalidAddress, connection);
      expect(balance).toBe(0);
    });
  });
});