# AI-Permit-Tampa 🏗️

**AI-powered HVAC permit automation for Tampa Bay contractors.**

Automates the entire HVAC permitting process using AI classification, real-time Accela integration, and x402 micropayments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

---

## 🎯 What It Does

AI-Permit-Tampa provides three tiers of HVAC permit automation:

### Phase 1: Permit Info API ($5/query)
- **Input**: Equipment specs (type, BTU, tonnage, location)
- **Output**: Complete permit requirements, fees, and timeline
- **Use Case**: Planning and estimation

### Phase 2: PDF Form Generator ($30/permit)
- **Input**: Full job details + contractor info + property details
- **Output**: Submission-ready PDF permit form
- **Use Case**: Contractors who want forms generated but will submit themselves

### Phase 3: Auto-Submit ($150/permit) - *Coming Soon*
- **Input**: Everything from Phase 2 + payment authorization
- **Output**: Permit submitted directly to county, tracking number returned
- **Use Case**: Fully hands-off permit submission

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Accela Developer Account ([Sign up](https://developer.accela.com/))
- Anthropic API key ([Get one](https://console.anthropic.com/))
- USDC on Base Sepolia (for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/agentmarket/ai-permit-tampa.git
cd ai-permit-tampa

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your credentials in .env
nano .env
```

### Configuration

Edit `.env` with your credentials:

```bash
# Required: Accela API credentials
ACCELA_CLIENT_ID=your-oauth-client-id
ACCELA_CLIENT_SECRET=your-oauth-client-secret
ACCELA_APP_ID=your-app-id
ACCELA_APP_SECRET=your-app-secret

# Required: Payment wallet
WALLET_ADDRESS=0xYourWalletAddress

# Optional: AI classification (falls back to rules if not provided)
ANTHROPIC_API_KEY=your-anthropic-key
```

### Running the Service

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start

# With Docker
docker-compose up -d
```

The service will be available at `http://localhost:3010`

---

## 📖 API Documentation

### Public Endpoints

#### GET `/health`
Health check endpoint

```bash
curl http://localhost:3010/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "ai-permit-tampa",
  "version": "1.0.0"
}
```

#### GET `/info`
Service information and pricing

```bash
curl http://localhost:3010/info
```

**Response:**
```json
{
  "name": "ai-permit-tampa",
  "description": "AI-powered HVAC permit automation",
  "pricing": [
    {
      "tier": "permit-info",
      "endpoint": "/api/v1/permit-info",
      "price": 5.00,
      "currency": "USDC"
    },
    ...
  ],
  "capabilities": [...]
}
```

---

### Protected Endpoints (x402 Payment Required)

All protected endpoints require x402 payment. First request returns 402 with payment details, second request with payment proof returns the result.

#### POST `/api/v1/permit-info`
Get permit requirements, fees, and timeline

**Payment Required:** $5 USDC

**Request:**
```json
{
  "equipmentType": "furnace",
  "jobType": "replacement",
  "btu": 80000,
  "tonnage": 3,
  "location": {
    "address": "123 Main St",
    "city": "Tampa",
    "county": "hillsborough",
    "zipCode": "33602"
  },
  "propertyType": "residential"
}
```

**Response (after payment):**
```json
{
  "success": true,
  "classification": {
    "permitType": "hvac-residential-replacement",
    "accelaCode": "BLD-HVAC-RES-REPL",
    "description": "Residential HVAC Equipment Replacement",
    "complexity": "simple",
    "reasoning": "Like-for-like equipment replacement"
  },
  "fees": {
    "baseFee": 75.00,
    "totalEstimated": 105.00,
    "currency": "USD"
  },
  "requirements": {
    "documents": [
      "Valid contractor license (HVAC/Mechanical)",
      "Equipment cut sheet/spec sheet",
      ...
    ]
  },
  "timeline": {
    "estimatedProcessingDays": 1,
    "expeditedAvailable": true
  }
}
```

#### POST `/api/v1/generate-form`
Generate submission-ready PDF permit form

**Payment Required:** $30 USDC

**Request:**
```json
{
  "permitInfo": {
    "equipmentType": "ac-unit",
    "jobType": "replacement",
    "tonnage": 3.5,
    "location": {
      "address": "456 Oak Ave",
      "city": "Tampa",
      "county": "hillsborough",
      "zipCode": "33606"
    }
  },
  "contractor": {
    "name": "HVAC Pros LLC",
    "phone": "(813) 555-1234",
    "email": "info@hvacpros.com",
    "licenseNumber": "CAC123456"
  },
  "property": {
    "ownerName": "John Doe",
    "ownerPhone": "(813) 555-5678"
  },
  "equipmentDetails": {
    "manufacturer": "Carrier",
    "model": "24ACC636A003"
  },
  "installation": {
    "estimatedStartDate": "2025-02-01",
    "estimatedCost": 5500,
    "description": "Replace existing 3-ton AC unit"
  }
}
```

**Response (after payment):**
```json
{
  "success": true,
  "form": {
    "pdf": "base64-encoded-pdf-string",
    "filename": "BLD-HVAC-RES-REPL_456_Oak_Ave_2025-01-30.pdf",
    "sizeBytes": 45678,
    "format": "application/pdf"
  },
  "permitInfo": {
    "permitType": "BLD-HVAC-RES-REPL",
    "estimatedFee": 105.00
  },
  "instructions": {
    "submissionMethod": "in-person or online",
    "requiredDocuments": [...]
  }
}
```

---

## 💳 x402 Payment Flow

This service uses the x402 payment protocol for micropayments:

### Step 1: Initial Request (Returns 402)
```bash
curl -X POST http://localhost:3010/api/v1/permit-info \
  -H "Content-Type: application/json" \
  -d '{"equipmentType": "furnace", ...}'
```

**Response (402 Payment Required):**
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "5000000",
    "payTo": "0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }]
}
```

### Step 2: Make Payment
Send 5 USDC to the wallet address on Base Sepolia

### Step 3: Retry with Payment Proof
```bash
curl -X POST http://localhost:3010/api/v1/permit-info \
  -H "Content-Type: application/json" \
  -H 'X-Payment: {"network":"base-sepolia","txHash":"0x...","from":"0x...","to":"0x...","amount":"5000000","asset":"0x..."}' \
  -d '{"equipmentType": "furnace", ...}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "classification": {...},
  "fees": {...}
}
```

---

## 🌐 Contractor Web Flow (Stripe Payments)

The service now supports a contractor-friendly web flow with conversational AI and Stripe payments. This is the recommended flow for contractors using a web interface.

### Workflow Overview

```
1. Chat with AI → 2. Complete Payment → 3. Generate PDFs → 4. Review & Approve → 5. Auto-Submit
   (Free)              (Stripe)             (Tier 1/2)          (Tier 2 only)      (Tier 2 only)
```

### Step 1: Conversational AI Chat (Free)

Start a chat session and provide permit information naturally:

```bash
# Create new chat session
curl -X POST http://localhost:3010/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a permit for 123 Main Street Tampa FL 33602. Replacing a 3-ton AC with a 3.5-ton Carrier unit. Contractor is Cool Air HVAC, license CAC123456, phone 813-555-1234."
  }'
```

**Response:**
```json
{
  "sessionId": "abc-123-def",
  "aiResponse": "I'll help you with that permit! I have your address and equipment details. Could you tell me about the property owner?",
  "extractedData": {
    "location": { "address": "123 Main Street", "city": "Tampa", ... },
    "contractor": { "name": "Cool Air HVAC", ... }
  },
  "isComplete": false,
  "missingFields": ["property.ownerName", "property.ownerPhone", ...]
}
```

Continue the conversation until `isComplete: true`:

```bash
# Continue conversation
curl -X POST http://localhost:3010/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def",
    "message": "Owner is John Smith, phone 813-555-5678. Property is 1500 sq ft, built in 2010. Estimated cost $8000."
  }'
```

### Step 2: Create Stripe Payment Intent

Once chat is complete, create a payment intent:

```bash
# Tier 1: $30 (PDF Download only)
curl -X POST http://localhost:3010/api/v1/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def",
    "tier": "tier1"
  }'
```

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_yyy",
  "paymentIntentId": "pi_xxx",
  "amount": 3000,
  "tier": "tier1",
  "description": "Permit Package (PDF Download)"
}
```

**Available Tiers:**
- **Tier 1** ($30): PDF package download - contractor submits manually
- **Tier 2** ($150): PDF package + automatic Accela submission

### Step 3: Complete Payment

Use the `clientSecret` with Stripe Elements in your frontend:

```javascript
// Frontend JavaScript
const stripe = Stripe('pk_test_...');
const elements = stripe.elements({ clientSecret });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// When user submits:
const {error} = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://yoursite.com/success',
  },
});
```

After successful payment, Stripe webhook automatically:
1. Marks session as `paid`
2. Creates submission record in database

### Step 4: Generate PDF Package

After payment confirmation, generate the PDF package:

```bash
curl -X POST http://localhost:3010/api/v1/generate-package \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def"
  }'
```

**Tier 1 Response** (PDF Download):
```json
{
  "success": true,
  "submissionId": "sub-xyz",
  "tier": "tier1",
  "message": "Your permit package is ready for download",
  "pdfPackage": {
    "mainForm": {
      "name": "Mechanical Permit Application",
      "pdf": "base64-encoded-pdf...",
      "description": "Standard HVAC permit form"
    },
    "additionalDocuments": [
      {
        "name": "Owner Authorization Letter",
        "pdf": "base64-encoded-pdf...",
        "description": "Signed authorization from property owner"
      },
      {
        "name": "Equipment Specifications",
        "pdf": "base64-encoded-pdf..."
      }
    ]
  }
}
```

**Tier 2 Response** (Auto-Submission):
```json
{
  "success": true,
  "submissionId": "sub-xyz",
  "tier": "tier2",
  "approvalToken": "token-abc-123",
  "approvalExpiresAt": "2025-02-01T12:00:00Z",
  "previewUrl": "/preview/token-abc-123",
  "message": "Please review your package and approve for submission",
  "pdfPackage": { ... }
}
```

### Step 5: Review & Approve (Tier 2 Only)

For Tier 2, open the preview page to review documents and approve:

```
GET http://localhost:3010/preview/{approvalToken}
```

The preview page displays:
- All generated PDFs with download links
- Property and contractor details
- "Approve & Submit to Accela" button

When approved, the page calls:

```bash
curl -X POST http://localhost:3010/api/v1/submit-to-accela \
  -H "Content-Type: application/json" \
  -d '{
    "approvalToken": "token-abc-123",
    "confirmed": true
  }'
```

**Success Response:**
```json
{
  "success": true,
  "accelaRecordId": "MOCK-1738368000-12345678",
  "accelaUrl": "https://aca-test.accela.com/tampa/Cap/CapDetail.aspx?Module=Permits&capID=MOCK-...",
  "mockMode": true,
  "message": "Submitted in MOCK MODE (no real Accela submission)",
  "pdfPackage": { ... }
}
```

### Webhook Setup (Required for Production)

Set up Stripe webhooks to handle payment confirmations:

1. Install Stripe CLI:
   ```bash
   stripe login
   ```

2. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3010/api/v1/webhooks/stripe
   ```

3. Get webhook secret and add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. In production, configure webhook in Stripe Dashboard:
   ```
   URL: https://your-domain.com/api/v1/webhooks/stripe
   Events: payment_intent.succeeded, payment_intent.payment_failed
   ```

### Mock Mode (Accela Testing)

The service supports mock mode for Accela submissions when you don't have real credentials:

```bash
# In .env
ACCELA_MOCK_MODE=true
```

When enabled:
- ✓ Complete flow works end-to-end
- ✓ PDFs generated normally
- ✓ Submission logic validated
- ⚠️ No real Accela API calls made
- ⚠️ Returns fake record ID (e.g., `MOCK-1738368000-abcd1234`)

Perfect for development and testing before getting Accela credentials!

### Environment Variables for Web Flow

Add to your `.env`:

```bash
# Stripe Configuration (required for web flow)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Pricing (configurable)
TIER1_PRICE_CENTS=3000    # $30
TIER2_PRICE_CENTS=15000   # $150

# Accela Mock Mode (optional, for testing)
ACCELA_MOCK_MODE=true
```

---

## 🏗️ Architecture

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.0+
- **Framework**: Express.js
- **Payment Protocol**: x402
- **Blockchain**: Base Sepolia (testnet) / Base (mainnet)
- **Currency**: USDC
- **AI**: Claude 3.5 Sonnet (classification)
- **Integration**: Accela Civic Platform API
- **PDF Generation**: PDFKit
- **Validation**: Zod
- **Testing**: Jest + Supertest
- **Deployment**: Docker

### Project Structure

```
permit-service/
├── src/
│   ├── server.ts                 # Express server with 3 endpoints
│   ├── index.ts                  # Entry point
│   ├── config/
│   │   └── counties/
│   │       └── hillsborough.ts   # Tampa-specific rules
│   ├── services/
│   │   ├── permitInfo.ts         # Phase 1 logic
│   │   ├── permitClassifier.ts   # AI/rule-based classification
│   │   ├── formGenerator.ts      # Phase 2 PDF generation
│   │   └── autoSubmitter.ts      # Phase 3 (stub)
│   ├── integrations/
│   │   └── accela-client.ts      # Accela API wrapper
│   ├── middleware/
│   │   ├── x402.ts               # Multi-tier payment auth
│   │   └── logger.ts             # Winston logging
│   └── utils/
│       └── validation.ts         # Zod schemas
├── tests/
│   ├── unit/                     # Unit tests
│   └── integration/              # API tests
├── scripts/
│   ├── register-service.ts       # AgentMarket registration
│   └── test-service.sh           # Integration testing
├── Dockerfile                    # Production container
├── docker-compose.yml            # Local development
└── README.md                     # This file
```

### Security Features

1. **x402 Payment Verification**
   - Replay attack prevention (transaction hash tracking)
   - Network validation (base-sepolia/base)
   - Recipient address verification
   - Amount verification
   - Asset verification (USDC only)

2. **Input Validation**
   - Zod schema validation
   - SQL injection prevention
   - XSS prevention
   - File size limits
   - Type safety

3. **Infrastructure Security**
   - Helmet.js security headers
   - CORS configured
   - Rate limiting (100 req/15 min)
   - Non-root Docker user
   - Health checks
   - Graceful shutdown

---

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Integration tests
./scripts/test-service.sh
```

### Test Coverage

Current coverage: 70%+ (lines, branches, functions, statements)

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build image
docker build -t ai-permit-tampa .

# Run container
docker run -p 3010:3010 --env-file .env ai-permit-tampa

# Or use docker-compose
docker-compose up -d
```

### Production Checklist

- [ ] Configure production Accela credentials
- [ ] Set `NODE_ENV=production`
- [ ] Configure production wallet address
- [ ] Switch to Base mainnet (`NETWORK=base`)
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Set up backup/disaster recovery
- [ ] Security audit completed
- [ ] Load testing completed

---

## 🔗 AgentMarket Integration

Register your service with AgentMarket to make it discoverable by AI agents:

```bash
# Start AgentMarket MCP server first
cd ../
npm run dev

# Then register this service
cd permit-service
npx ts-node scripts/register-service.ts
```

---

## 📋 Supported Counties

Currently supported:
- ✅ **Hillsborough County** (Tampa) - Full support
- 🚧 **Pinellas County** (St. Petersburg) - Coming soon
- 🚧 **Pasco County** - Coming soon

---

## 🛠️ Development

### Prerequisites

```bash
node --version  # v20+
npm --version   # v9+
```

### Development Workflow

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

---

## 🐛 Troubleshooting

### Common Issues

**Error: "Accela authentication failed"**
- Check your `ACCELA_CLIENT_ID` and `ACCELA_CLIENT_SECRET`
- Ensure you've created OAuth credentials in Accela Developer Portal
- Verify your app is approved and active

**Error: "Invalid payment proof"**
- Ensure you're using the correct network (base-sepolia/base)
- Verify transaction was successful on blockchain
- Check wallet address matches service configuration

**Error: "Rate limit exceeded"**
- Default: 100 requests per 15 minutes per IP
- Configure `RATE_LIMIT_MAX_REQUESTS` in .env

**Phase 3 returns 503**
- Phase 3 (auto-submit) is not yet implemented
- Use Phase 2 to generate forms, then submit manually
- Phase 3 planned for Q2 2025

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

## 📞 Support

- **Email**: support@agentmarket.ai
- **Issues**: [GitHub Issues](https://github.com/agentmarket/ai-permit-tampa/issues)
- **Docs**: [Full Documentation](https://docs.agentmarket.ai/ai-permit-tampa)

---

## 🗺️ Roadmap

### Q1 2025
- [x] Phase 1: Permit Info API
- [x] Phase 2: PDF Form Generator
- [x] Hillsborough County support
- [ ] Comprehensive testing (80% coverage)

### Q2 2025
- [ ] Phase 3: Auto-Submit implementation
- [ ] Pinellas County support
- [ ] Pasco County support
- [ ] Mobile app integration

### Q3 2025
- [ ] Additional trade permits (plumbing, electrical)
- [ ] Multi-state expansion
- [ ] Advanced analytics dashboard

---

**Built with ❤️ for Tampa Bay contractors**

*Automating permits, one HVAC system at a time.*
