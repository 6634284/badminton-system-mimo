import { EncryptionService } from '../crypto/encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt correctly', () => {
      const plaintext = '13800138000';
      const encrypted = service.encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same input', () => {
      const plaintext = 'test-data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle Chinese characters', () => {
      const plaintext = '张三';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number correctly', () => {
      expect(service.maskPhone('13800138000')).toBe('138****8000');
    });

    it('should return short phone as-is', () => {
      expect(service.maskPhone('123')).toBe('123');
    });

    it('should handle empty string', () => {
      expect(service.maskPhone('')).toBe('');
    });
  });

  describe('maskIdCard', () => {
    it('should mask ID card correctly', () => {
      expect(service.maskIdCard('110101199001011234')).toBe('110***********1234');
    });

    it('should return short ID as-is', () => {
      expect(service.maskIdCard('12345')).toBe('12345');
    });
  });

  describe('maskName', () => {
    it('should mask 2-char name', () => {
      expect(service.maskName('张三')).toBe('张*');
    });

    it('should mask 3-char name', () => {
      expect(service.maskName('张三丰')).toBe('张*丰');
    });

    it('should mask 4-char name', () => {
      expect(service.maskName('欧阳锋')).toBe('欧*锋');
    });

    it('should return single char as-is', () => {
      expect(service.maskName('张')).toBe('张');
    });
  });
});
