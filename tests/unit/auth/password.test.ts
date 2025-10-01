import bcrypt from 'bcryptjs';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength
} from '@/lib/auth/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate valid bcrypt hashes', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      // Bcrypt hash format: $2a$12$... or $2b$12$...
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    });

    it('should handle empty string password', async () => {
      const password = '';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000);
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle unicode characters', async () => {
      const password = 'Пароль密码🔒';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should reject password with different case', async () => {
      const password = 'CaseSensitive123!';
      const wrongCase = 'casesensitive123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongCase, hash);

      expect(isValid).toBe(false);
    });

    it('should reject password with extra whitespace', async () => {
      const password = 'NoSpaces123!';
      const withSpace = 'NoSpaces123! ';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(withSpace, hash);

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format', async () => {
      const password = 'TestPassword123!';
      const invalidHash = 'not-a-valid-bcrypt-hash';

      await expect(verifyPassword(password, invalidHash)).rejects.toThrow();
    });

    it('should reject empty password against valid hash', async () => {
      const password = 'ActualPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    it('should handle empty string comparison', async () => {
      const password = '';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(true);
    });

    it('should work with bcrypt hashes from different libraries', async () => {
      // This is a known bcrypt hash for 'TestPassword123!'
      const knownHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY/njWkfEqKmyDC';
      const isValid = await verifyPassword('TestPassword123!', knownHash);

      expect(isValid).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123!@#');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Pass1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('weakpass123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('WEAKPASS123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('WeakPassword!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('WeakPassword123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return all applicable errors', () => {
      const result = validatePasswordStrength('weak');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should accept exactly 8 characters', () => {
      const result = validatePasswordStrength('Pass123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', ',', '.', '?', '"', ':', '{', '}', '|', '<', '>'];

      specialChars.forEach(char => {
        const password = `Password1${char}`;
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(true);
      });
    });

    it('should handle empty password', () => {
      const result = validatePasswordStrength('');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
    });

    it('should handle very long passwords', () => {
      const longPassword = 'A' + 'a'.repeat(100) + '1' + '!';
      const result = validatePasswordStrength(longPassword);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate passwords with unicode characters', () => {
      const result = validatePasswordStrength('Pass123!中文');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should hash and verify password end-to-end', async () => {
      const passwords = [
        'SimplePass123!',
        'Complex@Password#2024',
        '!@#$%^&*()_+-=[]{}|;\':",./<>?',
        'Unicode密码パスワード123!',
        'VeryLongPasswordThatExceedsNormalLengthButShouldStillWork123!@#'
      ];

      for (const password of passwords) {
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);

        // Verify wrong password fails
        const isInvalid = await verifyPassword(password + 'wrong', hash);
        expect(isInvalid).toBe(false);
      }
    });

    it('should validate and hash strong passwords', async () => {
      const strongPasswords = [
        'StrongPass123!',
        'Another$ecure1',
        'P@ssw0rd2024',
        'Secure&Safe999'
      ];

      for (const password of strongPasswords) {
        const validation = validatePasswordStrength(password);
        expect(validation.valid).toBe(true);

        const hash = await hashPassword(password);
        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    it('should reject weak passwords during validation', () => {
      const weakPasswords = [
        { password: 'weak', expectedErrors: 4 },
        { password: 'NoNumbers!', expectedErrors: 1 },
        { password: 'nonumbers', expectedErrors: 3 },
        { password: '12345678', expectedErrors: 3 },
        { password: 'ALLCAPS123!', expectedErrors: 1 }
      ];

      weakPasswords.forEach(({ password, expectedErrors }) => {
        const validation = validatePasswordStrength(password);
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBe(expectedErrors);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should hash password within reasonable time', async () => {
      const password = 'PerformanceTest123!';
      const startTime = Date.now();

      await hashPassword(password);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Hashing should take less than 500ms even with high salt rounds
      expect(duration).toBeLessThan(500);
    });

    it('should verify password quickly', async () => {
      const password = 'PerformanceTest123!';
      const hash = await hashPassword(password);
      const startTime = Date.now();

      await verifyPassword(password, hash);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verification should also be under 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should validate password strength instantly', () => {
      const password = 'InstantValidation123!';
      const startTime = Date.now();

      validatePasswordStrength(password);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Validation should be near-instant (under 10ms)
      expect(duration).toBeLessThan(10);
    });
  });
});