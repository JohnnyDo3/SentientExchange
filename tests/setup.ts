import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file for tests
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Set test-specific defaults if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'error'; // Quiet logs during tests
}

console.log('Test environment configured:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- SOLANA_PRIVATE_KEY:', process.env.SOLANA_PRIVATE_KEY ? '✓ Set' : '✗ Missing');
console.log('- CDP_API_KEY_NAME:', process.env.CDP_API_KEY_NAME ? '✓ Set' : '✗ Missing');
