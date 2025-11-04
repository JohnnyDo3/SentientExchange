# Copywriter Service (x402-enabled)

AI-powered Copywriter - LLM-based marketing copy generation using Claude for competitor analysis. Extracts structured data from websites including pricing, features, contact information, and metadata.

## Features

- **x402 Payment Protocol**: Accepts USDC payments via Solana blockchain
- **Smart Data Extraction**: Automatically extracts title, description, pricing, features, and metadata
- **Custom Selectors**: Supports custom CSS selectors for targeted extraction
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security**: Helmet.js, input validation, replay attack prevention
- **Production-Ready**: Docker support, health checks, structured logging

## Pricing

**\$1.50 USDC** per scrape request

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: WALLET_ADDRESS, PRICE_USDC, NETWORK
```

## Configuration

Create a `.env` file:

```bash
SERVICE_NAME=copywriter
SERVICE_DESCRIPTION=AI-powered Copywriter - LLM-based marketing copy generation using Claude
PORT=3015

# Payment Configuration
WALLET_ADDRESS=your_solana_wallet_address
PRICE_USDC=1.50
NETWORK=solana-devnet
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Solana RPC
SOLANA_RPC_URL=https://api.devnet.solana.com

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

### Docker

```bash
# Build image
docker build -f docker/Dockerfile -t copywriter:latest .

# Run container
docker run -p 3015:3015 --env-file .env copywriter:latest

# Or use docker-compose
docker-compose up
```

## API Endpoints

### Health Check (No Payment Required)

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "copywriter",
  "version": "1.0.0",
  "uptime": 12345.67,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Scrape Website (Requires x402 Payment)

```bash
POST /scrape
Content-Type: application/json
X-Payment: <payment_proof_json>

{
  "url": "https://example.com",
  "selectors": {
    "title": "h1.main-title",
    "pricing": ".price-box",
    "features": "ul.features li"
  },
  "timeout": 30000
}
```

## x402 Payment Flow

1. **Initial Request (No Payment)**

```bash
curl -X POST http://localhost:3015/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Response: `402 Payment Required`
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "solana-devnet",
    "maxAmountRequired": "1000000",
    "resource": "/scrape",
    "description": "Copywriter - LLM-based marketing copy generation using Claude",
    "payTo": "DeDDFd3Fr2fdsC4Wi2Hi7MxbyRHokst3jcQ9L2V1nje3",
    "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "maxTimeoutSeconds": 30
  }]
}
```

2. **Execute Payment**

Using Solana CLI or SDK, send 1 USDC to the specified wallet address.

3. **Retry Request with Payment Proof**

```bash
curl -X POST http://localhost:3015/scrape \
  -H "Content-Type: application/json" \
  -H "X-Payment: {\"network\":\"solana-devnet\",\"txHash\":\"5vFN...\",\"from\":\"C89x...\",\"to\":\"DeDDF...\",\"amount\":\"1000000\",\"asset\":\"4zMMC...\"}" \
  -d '{"url": "https://example.com"}'
```

Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Domain",
    "description": "Example website description",
    "pricing": ["$99/mo", "$199/mo", "$499/mo"],
    "features": ["Feature 1", "Feature 2", "Feature 3"],
    "contactEmail": "contact@example.com",
    "metadata": {
      "ogTitle": "Example Domain",
      "ogDescription": "...",
      "keywords": "example, domain"
    },
    "links": {
      "internal": ["https://example.com/about"],
      "external": ["https://partner.com"]
    },
    "scrapedAt": "2024-01-15T10:30:00.000Z"
  },
  "meta": {
    "processingTime": "1234ms",
    "cost": "\$1.50 USDC",
    "paymentTx": "5vFN5Hot3sbUGpD3W89up7qNKCKm977vyhjE6G3Zs5vUgd3JkvV1iivmsJ6Jvby4UKpPC3WeLDTVZr6vCqHNY96e"
  }
}
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Website URL to scrape (must be http/https) |
| `selectors` | object | No | Custom CSS selectors for targeted extraction |
| `selectors.title` | string | No | CSS selector for title |
| `selectors.description` | string | No | CSS selector for description |
| `selectors.pricing` | string | No | CSS selector for pricing |
| `selectors.features` | string | No | CSS selector for features |
| `selectors.contactEmail` | string | No | CSS selector for contact email |
| `timeout` | number | No | Request timeout in milliseconds (1000-60000) |

## Response Data

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Scraped URL |
| `title` | string | Page title |
| `description` | string | Page description |
| `pricing` | string[] | Extracted pricing information |
| `features` | string[] | Extracted product features |
| `contactEmail` | string? | Contact email if found |
| `metadata` | object | OpenGraph and meta tags |
| `links.internal` | string[] | Internal links |
| `links.external` | string[] | External links |
| `scrapedAt` | string | ISO timestamp |

## Error Handling

Common error codes:

- `400 Bad Request`: Invalid input or payment proof
- `402 Payment Required`: No payment header provided
- `404 Not Found`: Website not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Scraping failed

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

## Security

- **Non-root Docker user**: Runs as nodejs user (UID 1001)
- **Replay attack prevention**: Tracks used transaction hashes
- **Rate limiting**: 100 requests per 15 minutes
- **Input validation**: Joi schema validation
- **Helmet.js**: Security headers
- **Request timeouts**: Maximum 60 seconds per scrape

## Monitoring

- **Health endpoint**: `GET /health`
- **Metrics endpoint**: `GET /metrics` (Prometheus format)
- **Structured logging**: Winston with JSON format
- **Docker health checks**: Every 30 seconds

## License

MIT

## Support

For issues or questions, open an issue on GitHub.
