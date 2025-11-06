/**
 * Test to verify test infrastructure works correctly
 */
/// <reference path="../types.d.ts" />
import { ServiceFactory, TransactionFactory, UserFactory } from './factories';
import { AuthHelpers, PaymentHelpers } from './helpers';

describe('Test Infrastructure', () => {
  describe('Factories', () => {
    it('should create a valid service', () => {
      const service = ServiceFactory.create();
      expect(service).toMatchServiceSchema();
      expect(service.id).toBeDefined();
      expect(service.name).toBeDefined();
    });

    it('should create a valid transaction', () => {
      const transaction = TransactionFactory.create();
      expect(transaction).toBeValidTransaction();
      expect(transaction.id).toBeDefined();
      expect(transaction.status).toBeDefined();
    });

    it('should create a wallet address', () => {
      const address = UserFactory.createWalletAddress(1);
      expect(address).toMatch(/^0x[0-9a-f]{40}$/);
    });
  });

  describe('Helpers', () => {
    it('should generate a valid JWT token', () => {
      const token = AuthHelpers.generateTestToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should create a valid Solana signature', () => {
      const signature = PaymentHelpers.createMockSignature();
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });
  });

  describe('Custom Matchers', () => {
    it('should validate Ethereum signatures', () => {
      const validEthSig = '0x' + 'a'.repeat(130);
      expect(validEthSig).toHaveValidSignature('ethereum');
    });

    it('should validate service schema', () => {
      const service = ServiceFactory.create();
      expect(service).toMatchServiceSchema();
    });

    it('should validate transaction schema', () => {
      const transaction = TransactionFactory.create();
      expect(transaction).toBeValidTransaction();
    });
  });
});
