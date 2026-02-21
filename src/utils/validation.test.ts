import { validatePublicKey } from './validation';

describe('validation', () => {
  describe('validatePublicKey', () => {
    it('should return true for a valid public key', () => {
      const validKey = 'H97wL8D8L8B8B8B8B8B8B8B8B8B8B8B8B8B8B8B8';
      expect(validatePublicKey(validKey)).toBe(true);
    });

    it('should return false for an invalid public key (wrong length)', () => {
      const invalidKey = 'H97wL8D8L8B8B8B8B8B8B8B8B8B8B8B8B8B8B8';
      expect(validatePublicKey(invalidKey)).toBe(false);
    });

    it('should return false for an invalid public key (non-base58 characters)', () => {
      const invalidKey = 'H97wL8D8L8B8B8B8B8B8B8B8B8B8B8B8B8B8B0'; // '0' is not a valid base58 character
      expect(validatePublicKey(invalidKey)).toBe(false);
    });

    it('should return false for an empty public key', () => {
      const invalidKey = '';
      expect(validatePublicKey(invalidKey)).toBe(false);
    });
  });
});