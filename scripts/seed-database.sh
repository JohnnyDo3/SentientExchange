#!/bin/bash
# Seed database with example services

set -e

echo "🌱 Seeding database with example services..."

# Check if database exists
if [ ! -f data/agentmarket.db ]; then
    echo "Database not found. Creating new database..."
    mkdir -p data
fi

# Run the seed script
node -e "
const { Database } = require('./dist/registry/database');
const { ServiceRegistry } = require('./dist/registry/ServiceRegistry');

async function seed() {
    const db = new Database('./data/agentmarket.db');
    await db.initialize();

    const registry = new ServiceRegistry(db);
    await registry.initialize();

    // Check if already seeded
    const existing = await registry.searchServices({});
    if (existing.length > 0) {
        console.log('⚠️  Database already has', existing.length, 'services');
        console.log('Skipping seed. Delete data/agentmarket.db to reseed.');
        process.exit(0);
    }

    console.log('Adding example services...');

    // Image Analysis Service
    await registry.registerService({
        name: 'vision-pro',
        description: 'Professional image analysis with object detection and OCR',
        provider: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
        endpoint: 'http://localhost:3001/analyze',
        capabilities: ['image-analysis', 'ocr', 'object-detection'],
        pricing: {
            perRequest: '\$0.02',
            currency: 'USDC',
            network: 'base-sepolia'
        },
        reputation: {
            totalJobs: 1247,
            successRate: 99.2,
            avgResponseTime: '3.2s',
            rating: 4.8,
            reviews: 89
        },
        metadata: {
            apiVersion: 'v1',
            rateLimit: '100/min',
            maxPayload: '10MB'
        }
    });

    // Sentiment Analysis Service
    await registry.registerService({
        name: 'sentiment-analyzer',
        description: 'Advanced text sentiment analysis with emotion detection',
        provider: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        endpoint: 'http://localhost:3002/analyze',
        capabilities: ['sentiment-analysis', 'emotion-detection', 'text-analysis'],
        pricing: {
            perRequest: '\$0.01',
            currency: 'USDC',
            network: 'base-sepolia'
        },
        reputation: {
            totalJobs: 892,
            successRate: 98.5,
            avgResponseTime: '1.8s',
            rating: 4.7,
            reviews: 64
        },
        metadata: {
            apiVersion: 'v1',
            rateLimit: '150/min',
            maxPayload: '5MB'
        }
    });

    // Text Summarization Service
    await registry.registerService({
        name: 'text-summarizer',
        description: 'AI-powered text summarization for long documents',
        provider: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        endpoint: 'http://localhost:3003/summarize',
        capabilities: ['text-summarization', 'document-processing'],
        pricing: {
            perRequest: '\$0.015',
            currency: 'USDC',
            network: 'base-sepolia'
        },
        reputation: {
            totalJobs: 634,
            successRate: 99.8,
            avgResponseTime: '4.1s',
            rating: 4.9,
            reviews: 42
        },
        metadata: {
            apiVersion: 'v1',
            rateLimit: '50/min',
            maxPayload: '20MB'
        }
    });

    await db.close();
    console.log('✅ Successfully seeded 3 example services');
}

seed().catch(console.error);
"

echo ""
echo "✅ Database seeded successfully!"
echo ""
echo "You can now:"
echo "1. Start the MCP server: npm start"
echo "2. Test service discovery"
echo ""
