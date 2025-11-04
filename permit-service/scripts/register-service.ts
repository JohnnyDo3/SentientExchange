/**
 * AgentMarket Service Registration Script
 *
 * Registers AI-Permit-Tampa service with the AgentMarket MCP server.
 * This makes the service discoverable by AI agents through the marketplace.
 *
 * Usage:
 *   npx ts-node scripts/register-service.ts
 *
 * Environment requirements:
 *   - AgentMarket MCP server must be running
 *   - SERVICE_URL must point to this service
 *   - WALLET_ADDRESS must be configured
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AGENTMARKET_API = process.env.AGENTMARKET_API || 'http://localhost:3000';
const SERVICE_URL = process.env.SERVICE_URL || 'http://localhost:3010';
const SERVICE_NAME = process.env.SERVICE_NAME || 'ai-permit-tampa';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123';

interface ServiceRegistration {
  serviceId: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  endpoint: string;
  capabilities: string[];
  pricing: {
    tiers: Array<{
      name: string;
      description: string;
      priceUSDC: number;
      endpoint: string;
    }>;
    currency: string;
    network: string;
    walletAddress: string;
  };
  paymentProtocol: string;
  jurisdiction: {
    country: string;
    state: string;
    counties: string[];
  };
  metadata: {
    version: string;
    status: string;
    documentation: string;
    supportEmail: string;
  };
}

async function registerService(): Promise<void> {
  console.log('🚀 Registering AI-Permit-Tampa with AgentMarket...\n');

  const registration: ServiceRegistration = {
    serviceId: 'ai-permit-tampa-hvac',
    name: 'AI-Permit-Tampa',
    description:
      'AI-powered HVAC permit automation for Tampa Bay. Provides permit requirements, generates submission-ready forms, and (soon) handles automated submissions.',
    category: 'legal-compliance',
    provider: 'AgentMarket',
    endpoint: SERVICE_URL,
    capabilities: [
      'Intelligent HVAC permit classification using Claude AI',
      'Accurate fee calculation based on Tampa Bay county rules',
      'Comprehensive requirements lookup for Hillsborough, Pinellas, Pasco',
      'PDF form generation matching county format',
      'Support for residential and commercial HVAC permits',
      'Real-time Accela Civic Platform integration',
      'Multi-tier pricing (info, forms, auto-submit)',
    ],
    pricing: {
      tiers: [
        {
          name: 'Permit Info',
          description:
            'Get permit requirements, fees, and timeline for your HVAC job',
          priceUSDC: parseFloat(process.env.PRICE_PERMIT_INFO || '5.00'),
          endpoint: `${SERVICE_URL}/api/v1/permit-info`,
        },
        {
          name: 'Form Generator',
          description: 'Generate submission-ready PDF permit forms',
          priceUSDC: parseFloat(process.env.PRICE_FORM_GENERATOR || '30.00'),
          endpoint: `${SERVICE_URL}/api/v1/generate-form`,
        },
        {
          name: 'Auto-Submit',
          description: 'Fully automated permit submission (Coming Soon)',
          priceUSDC: parseFloat(process.env.PRICE_AUTO_SUBMIT || '150.00'),
          endpoint: `${SERVICE_URL}/api/v1/submit-permit`,
        },
      ],
      currency: 'USDC',
      network: process.env.NETWORK || 'base-sepolia',
      walletAddress: WALLET_ADDRESS,
    },
    paymentProtocol: 'x402',
    jurisdiction: {
      country: 'United States',
      state: 'Florida',
      counties: ['Hillsborough', 'Pinellas', 'Pasco'],
    },
    metadata: {
      version: '1.0.0',
      status: 'active',
      documentation: 'https://github.com/agentmarket/ai-permit-tampa',
      supportEmail: 'support@agentmarket.ai',
    },
  };

  try {
    console.log('📋 Service Details:');
    console.log(`   Name: ${registration.name}`);
    console.log(`   Category: ${registration.category}`);
    console.log(`   Endpoint: ${registration.endpoint}`);
    console.log(`   Wallet: ${registration.pricing.walletAddress}`);
    console.log(`   Network: ${registration.pricing.network}`);
    console.log(`\n💰 Pricing Tiers:`);
    registration.pricing.tiers.forEach((tier) => {
      console.log(`   ${tier.name}: $${tier.priceUSDC} USDC`);
      console.log(`      ${tier.description}`);
    });

    console.log(`\n📡 Sending registration to AgentMarket...`);

    // Register with AgentMarket
    const response = await axios.post(
      `${AGENTMARKET_API}/api/services/register`,
      registration,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ Registration successful!');
    console.log(`   Service ID: ${response.data.serviceId}`);
    console.log(`   Status: ${response.data.status}`);

    if (response.data.registeredAt) {
      console.log(`   Registered At: ${response.data.registeredAt}`);
    }

    console.log('\n🎉 AI-Permit-Tampa is now discoverable on AgentMarket!');
    console.log(
      `   AI agents can now find and use this service for HVAC permit automation.\n`
    );
  } catch (error: any) {
    console.error('\n❌ Registration failed!');

    if (error.code === 'ECONNREFUSED') {
      console.error(
        `   Could not connect to AgentMarket at ${AGENTMARKET_API}`
      );
      console.error('   Make sure the AgentMarket MCP server is running.');
    } else if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${error.response.data.error || 'Unknown error'}`);
      console.error(
        `   Details: ${error.response.data.details || 'No details available'}`
      );
    } else {
      console.error(`   Error: ${error.message}`);
    }

    console.error('\n📋 Troubleshooting:');
    console.error('   1. Ensure AgentMarket MCP server is running');
    console.error(
      '   2. Check AGENTMARKET_API environment variable is correct'
    );
    console.error('   3. Verify network connectivity');
    console.error('   4. Check service logs for errors\n');

    process.exit(1);
  }
}

// Run registration
registerService().catch((error) => {
  console.error('Unexpected error during registration:', error);
  process.exit(1);
});
