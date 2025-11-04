# Sentiment Analyzer Service

AI-powered sentiment analysis service with x402 micropayment support using USDC on Base Sepolia.

## Features

### Multi-Dimensional Sentiment Analysis

- **Emotion Detection**: Identifies 6 core emotions (joy, sadness, anger, fear, surprise, disgust) with intensity levels
- **Polarity Scoring**: Continuous scale from -1 (very negative) to +1 (very positive)
- **Mixed Emotion Recognition**: Detects when text contains conflicting sentiments
- **Confidence Scoring**: Indicates reliability of the analysis (0-1 scale)
- **Intensity Measurement**: Quantifies how strong the sentiment is (0-1 scale)
- **Context Awareness**: Handles negations, intensifiers, and diminishers
- **Keyword Extraction**: Identifies positive, negative, and neutral keywords
- **Subjectivity Analysis**: Measures objective vs subjective content (0-1 scale)

### x402 Payment Protocol

- **Automatic Micropayments**: Pay-per-use with USDC stablecoin
- **Replay Attack Prevention**: Transaction hash tracking
- **Network**: Base Sepolia (testnet) / Base (mainnet)
- **Price**: $0.01 USDC per analysis (configurable)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
# Service Configuration
SERVICE_NAME=sentiment-analyzer
SERVICE_DESCRIPTION=AI-powered sentiment analysis service
PORT=3001

# Payment Configuration
WALLET_ADDRESS=0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123
PRICE_USDC=0.01
NETWORK=base-sepolia

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker-compose up -d
```

## API Endpoints

### GET /health

Health check endpoint (no payment required).

**Response:**
```json
{
  "status": "healthy",
  "service": "sentiment-analyzer",
  "version": "1.0.0",
  "timestamp": "2025-10-29T12:00:00.000Z"
}
```

### GET /info

Service information and pricing (no payment required).

**Response:**
```json
{
  "name": "sentiment-analyzer",
  "description": "AI-powered sentiment analysis service",
  "version": "1.0.0",
  "pricing": {
    "currency": "USDC",
    "amount": 0.01,
    "network": "base-sepolia"
  },
  "capabilities": [
    "Multi-dimensional emotion detection",
    "Polarity scoring (-1 to +1)",
    "Confidence and intensity measurement",
    "Mixed emotion recognition",
    "Context-aware keyword extraction",
    "Subjectivity analysis"
  ],
  "endpoints": {
    "analyze": "/analyze"
  },
  "paymentProtocol": "x402"
}
```

### POST /analyze

Analyze sentiment of a single text (x402 payment required).

**Request:**
```json
{
  "text": "I am absolutely thrilled about this amazing opportunity, but slightly worried about the timeline."
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "overall": {
      "polarity": 0.45,
      "category": "Mixed emotions",
      "confidence": 0.72
    },
    "emotions": [
      {
        "emotion": "joy",
        "score": 0.85,
        "intensity": "high"
      },
      {
        "emotion": "fear",
        "score": 0.35,
        "intensity": "low"
      }
    ],
    "intensity": 0.78,
    "mixed": true,
    "keywords": {
      "positive": ["thrilled", "amazing"],
      "negative": ["worried"],
      "neutral": []
    },
    "subjectivity": 0.82
  },
  "metadata": {
    "textLength": 95,
    "analysisTimeMs": 12,
    "timestamp": "2025-10-29T12:00:00.000Z"
  }
}
```

### POST /analyze/batch

Analyze multiple texts in a single request (x402 payment required, max 100 texts).

**Request:**
```json
{
  "texts": [
    "I love this product!",
    "Terrible experience.",
    "The service was okay."
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "index": 0,
      "success": true,
      "result": { /* sentiment analysis result */ }
    },
    {
      "index": 1,
      "success": true,
      "result": { /* sentiment analysis result */ }
    },
    {
      "index": 2,
      "success": true,
      "result": { /* sentiment analysis result */ }
    }
  ],
  "metadata": {
    "totalTexts": 3,
    "successCount": 3,
    "failureCount": 0,
    "analysisTimeMs": 28,
    "averageTimePerText": 9,
    "timestamp": "2025-10-29T12:00:00.000Z"
  }
}
```

## x402 Payment Flow

1. **Initial Request** (no payment header):
   ```bash
   curl -X POST http://localhost:3001/analyze \
     -H "Content-Type: application/json" \
     -d '{"text": "I am happy!"}'
   ```

2. **Receive 402 Payment Required**:
   ```json
   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "exact",
       "network": "base-sepolia",
       "maxAmountRequired": "10000",
       "resource": "/analyze",
       "description": "Sentiment analysis service",
       "mimeType": "application/json",
       "payTo": "0x6316859C0be28Bc67995F1EC6Add6cEC1bff8123",
       "maxTimeoutSeconds": 30,
       "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
     }]
   }
   ```

3. **Execute USDC Payment** on Base Sepolia blockchain

4. **Retry with Payment Proof**:
   ```bash
   curl -X POST http://localhost:3001/analyze \
     -H "Content-Type: application/json" \
     -H "X-Payment: {\"network\":\"base-sepolia\",\"txHash\":\"0x...\",\"from\":\"0x...\",\"to\":\"0x...\",\"amount\":\"10000\",\"asset\":\"0x036CbD...\"}" \
     -d '{"text": "I am happy!"}'
   ```

5. **Receive Analysis Result**

## Testing

### Run Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Expected Coverage

- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+
- **Statements**: 80%+

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Response**: 429 Too Many Requests when exceeded

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Replay Attack Prevention**: Transaction hash tracking
- **Input Validation**: Joi schema validation
- **Non-root User**: Docker container runs as non-root
- **Health Checks**: Automatic container health monitoring

## Monitoring

### Prometheus Metrics

Access metrics at `GET /metrics`:

- HTTP request duration
- Active requests
- Response status codes
- Node.js runtime metrics

## Logging

Logs are written to:
- **Console**: Colorized output for development
- **logs/error.log**: Error-level logs only
- **logs/combined.log**: All logs

Log levels: `error`, `warn`, `info`, `debug`

## Architecture

```
sentiment-analyzer/
├── src/
│   ├── index.ts                  # Entry point
│   ├── server.ts                 # Express server
│   ├── services/
│   │   └── sentimentAnalyzer.ts  # Core sentiment analysis logic
│   ├── middleware/
│   │   ├── x402.ts               # x402 payment middleware
│   │   └── logger.ts             # Winston logging
│   └── utils/
│       └── validation.ts         # Joi input validation
├── tests/
│   ├── sentimentAnalyzer.test.ts # Unit tests for analyzer
│   └── server.test.ts            # Integration tests for API
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Local development setup
└── README.md                     # This file
```

## Dependencies

- **express**: Web framework
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting
- **winston**: Logging
- **joi**: Input validation
- **prom-client**: Prometheus metrics
- **dotenv**: Environment configuration

## License

MIT

## Support

For issues or questions, please create an issue in the AgentMarket repository.
