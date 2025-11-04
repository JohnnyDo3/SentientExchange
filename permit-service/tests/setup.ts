/**
 * Jest test setup
 * Runs before all tests
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output

// Mock environment variables if not set
if (!process.env.WALLET_ADDRESS) {
  process.env.WALLET_ADDRESS = '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123';
}

if (!process.env.USDC_CONTRACT) {
  process.env.USDC_CONTRACT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
}

if (!process.env.NETWORK) {
  process.env.NETWORK = 'base-sepolia';
}

// Increase test timeout for integration tests
jest.setTimeout(30000);
