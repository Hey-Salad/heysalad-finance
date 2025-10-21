import { decryptFromString, encryptToString } from '../../utils/encryption';

describe('encryption utilities', () => {
  it('encrypts and decrypts text symmetrically', () => {
    const original = 'sensitive-token-123';
    const encrypted = encryptToString(original);
    expect(encrypted).not.toEqual(original);
    const decrypted = decryptFromString(encrypted);
    expect(decrypted).toEqual(original);
  });
});
