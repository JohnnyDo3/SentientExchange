# Multi-Chain Wallet Implementation

## Overview

AgentMarket now supports multi-chain payment addresses for service providers. This allows services to accept payments on multiple blockchain networks, giving buyers flexibility in choosing their preferred chain for transactions.

## Supported Chains

### EVM-Compatible Chains
- **Ethereum** (mainnet)
- **Base** (Coinbase L2)
- **Polygon** (formerly Matic)
- **Arbitrum** (L2 rollup)
- **Optimism** (L2 rollup)

### Non-EVM Chains
- **Solana**

## Architecture

### 1. Wallet Validation Utilities (`src/utils/wallet-validation.ts`)

Provides comprehensive address validation for all supported chains:

```typescript
// Validate EVM address (Ethereum, Base, Polygon, Arbitrum, Optimism)
isValidEVMAddress(address: string): boolean

// Validate Solana address
isValidSolanaAddress(address: string): boolean

// Validate address for specific chain
validateChainAddress(
  address: string,
  chain: 'ethereum' | 'base' | 'polygon' | 'arbitrum' | 'optimism' | 'solana' | 'evm'
): { valid: boolean; error?: string }

// Validate entire payment addresses object
validatePaymentAddresses(
  addresses: Record<string, string>
): { valid: boolean; errors: string[] }

// Normalize addresses (lowercase for EVM, preserve case for Solana)
normalizeAddress(address: string, chain: string): string

// Format for display (e.g., 0x742d...bEb5)
formatAddressDisplay(address: string, chars?: number): string
```

### 2. Data Model (`src/types/service.ts`)

Service type extended with multi-chain support:

```typescript
interface Service {
  // ... other fields
  metadata: {
    walletAddress?: string; // Primary EVM wallet (legacy support)
    paymentAddresses?: Record<string, string>; // Multi-chain addresses
    // Example:
    // {
    //   "ethereum": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
    //   "base": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
    //   "polygon": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
    //   "solana": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
    // }
    image?: string;
    color?: string;
  };
}
```

### 3. Validation Schema (`src/validation/schemas.ts`)

Zod schemas with multi-chain validation:

```typescript
const ServiceSchema = z.object({
  // ... other fields
  walletAddress: z.string()
    .refine(validateEVMAddress)
    .optional(),

  paymentAddresses: z.record(z.string())
    .refine((addresses) => validatePaymentAddresses(addresses).valid)
    .optional(),
})
.refine(
  (data) => data.walletAddress || (data.paymentAddresses && Object.keys(data.paymentAddresses).length > 0),
  'Either walletAddress or paymentAddresses must be provided'
);
```

**Validation Rules:**
- At least one address required (either `walletAddress` OR `paymentAddresses`)
- All provided addresses must be valid for their respective chains
- EVM addresses: Must match `^0x[a-fA-F0-9]{40}$`
- Solana addresses: Must be base58-encoded, 32-44 characters, excluding `0OIl`

### 4. API Server (`src/api/apiServer.ts`)

Service creation and update endpoints now handle `paymentAddresses`:

```typescript
// POST /api/services - Create service
const serviceInput = {
  // ... other fields
  metadata: {
    walletAddress: validatedData.walletAddress,
    paymentAddresses: validatedData.paymentAddresses, // ← Multi-chain support
    image: validatedData.image || '🔮',
    color: validatedData.color || '#a855f7',
  },
};

// PUT /api/services/:id - Update service
if (validatedData.paymentAddresses) {
  updates.metadata = {
    ...existing.metadata,
    paymentAddresses: validatedData.paymentAddresses, // ← Multi-chain support
  };
}
```

### 5. Frontend Registration Form (`web/components/providers/ServiceRegistrationForm.tsx`)

Interactive multi-chain wallet selection:

**Features:**
- Visual chain selection grid with icons
- Auto-fill EVM addresses from primary wallet
- Manual input for Solana addresses
- Real-time validation with visual feedback
- Warning about wallet compatibility

**User Flow:**
1. Connect wallet (provides primary EVM address)
2. Select which chains to accept payments on
3. EVM chains auto-filled with connected wallet address
4. Manually enter Solana address if needed
5. See validation status (✓ Valid / ⚠️ Invalid) for each chain
6. Submit service registration

### 6. Wagmi Configuration (`web/lib/wagmi-config.ts`)

RainbowKit + Wagmi setup for multi-chain wallet connections:

```typescript
export const config = getDefaultConfig({
  appName: 'AgentMarket',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [
    base,
    baseSepolia,
    mainnet,
    polygon,
    arbitrum,
    optimism,
  ],
  ssr: true,
});
```

## Database Storage

Multi-chain addresses stored in `services.metadata` JSON field:

```sql
CREATE TABLE services (
  -- ... other columns
  metadata TEXT, -- JSON serialized
  -- Example:
  -- {
  --   "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
  --   "paymentAddresses": {
  --     "ethereum": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
  --     "base": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
  --     "solana": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
  --   }
  -- }
);
```

## Payment Flow with Multi-Chain Support

### Current Implementation (Single Chain)

```
1. Buyer discovers service
2. Service has single walletAddress
3. Payment executes on configured network (e.g., Base Sepolia)
4. Service verifies payment on that network
```

### Enhanced Multi-Chain Flow (Future)

```
1. Buyer discovers service with multiple payment options
2. Buyer selects preferred chain (e.g., Polygon for lower fees)
3. Payment request sent to service with selected chain
4. Service provides payment address for selected chain
5. Payment executes on buyer's chosen network
6. Service verifies payment on corresponding network
```

**Implementation Considerations:**
- X402Client needs chain selection parameter
- Payment verification must check correct chain
- Service must monitor multiple chains for incoming payments
- Transaction tracking should include chain information

## Security Considerations

### Address Validation
- ✅ Strict regex validation for EVM addresses
- ✅ Base58 validation for Solana addresses
- ✅ Server-side validation with Zod schemas
- ✅ Client-side validation with real-time feedback

### Wallet Ownership
- ⚠️ **Important:** Service providers must control ALL addresses they register
- ⚠️ Payments sent to incorrect addresses cannot be recovered
- ✅ UI warns users to verify wallet compatibility

### Payment Verification
- Each chain requires separate payment verification
- Must validate transaction on correct network
- Consider chain reorganizations and confirmation requirements

## Testing

### Unit Tests

Test wallet validation functions:

```typescript
import {
  isValidEVMAddress,
  isValidSolanaAddress,
  validatePaymentAddresses
} from '../utils/wallet-validation';

// Test EVM address validation
expect(isValidEVMAddress('0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5')).toBe(true);
expect(isValidEVMAddress('invalid')).toBe(false);

// Test Solana address validation
expect(isValidSolanaAddress('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK')).toBe(true);
expect(isValidSolanaAddress('0x742d35...')).toBe(false);

// Test multi-chain validation
const addresses = {
  ethereum: '0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5',
  solana: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK'
};
expect(validatePaymentAddresses(addresses).valid).toBe(true);
```

### Integration Tests

Test service registration with multi-chain addresses:

```bash
# Register service with multi-chain support
curl -X POST http://localhost:3333/api/services \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Multi-Chain Service",
    "description": "Accepts payments on multiple chains",
    "provider": "Test Provider",
    "endpoint": "https://api.example.com",
    "capabilities": ["test"],
    "pricing": { "perRequest": "$0.02" },
    "paymentAddresses": {
      "ethereum": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
      "base": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
      "polygon": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
      "solana": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK"
    }
  }'
```

### Manual Testing

1. **Connect Wallet:**
   - Visit `/providers/register`
   - Connect MetaMask or other wallet
   - Verify primary address auto-fills

2. **Select Chains:**
   - Click chain icons to toggle selection
   - Verify EVM chains auto-fill with connected address
   - Manually enter Solana address

3. **Validation:**
   - Test invalid addresses (should show error)
   - Test valid addresses (should show ✓)
   - Try submitting with no addresses (should block)

4. **Submit Service:**
   - Fill all required fields
   - Submit form
   - Verify service created with multi-chain addresses
   - Check database for correct metadata

## Migration Guide

### For Existing Services

Old format (single wallet):
```json
{
  "metadata": {
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5"
  }
}
```

New format (multi-chain):
```json
{
  "metadata": {
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
    "paymentAddresses": {
      "ethereum": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5",
      "base": "0x742d35Cc6634C0532925a3b844Bc9e7595bEb5e5"
    }
  }
}
```

**Backwards Compatibility:**
- ✅ Existing services with only `walletAddress` continue to work
- ✅ New services can use `paymentAddresses` exclusively
- ✅ Services can have both for gradual migration

### Migration Script

```typescript
// Update existing services to multi-chain format
async function migrateToMultiChain() {
  const services = await registry.getAllServices();

  for (const service of services) {
    if (service.metadata?.walletAddress && !service.metadata?.paymentAddresses) {
      // Convert single wallet to multi-chain format
      const evmAddress = service.metadata.walletAddress;

      await registry.updateService(service.id, {
        metadata: {
          ...service.metadata,
          paymentAddresses: {
            ethereum: evmAddress,
            base: evmAddress,
            polygon: evmAddress,
            arbitrum: evmAddress,
            optimism: evmAddress,
          }
        }
      });
    }
  }
}
```

## Future Enhancements

### 1. Chain-Specific Pricing
Allow different prices per chain (e.g., higher fees on Ethereum, lower on Polygon):

```typescript
pricing: {
  default: "$0.02",
  perChain: {
    ethereum: "$0.03",
    polygon: "$0.01",
    solana: "$0.005"
  }
}
```

### 2. Dynamic Chain Selection
Let buyers choose payment chain at purchase time:

```typescript
// Purchase with chain preference
await MarketplaceAPI.purchaseService(serviceId, {
  requestData: {...},
  preferredChain: 'polygon', // Buyer's choice
});
```

### 3. Cross-Chain Payment Routing
Automatically route payments through bridges if buyer doesn't have funds on service's chains:

```typescript
// Bridge from Ethereum to Polygon if needed
await PaymentRouter.routePayment({
  from: { chain: 'ethereum', amount: '0.02 ETH' },
  to: { chain: 'polygon', service: serviceId }
});
```

### 4. Multi-Chain Balance Tracking
Show provider's total earnings across all chains:

```typescript
const balances = await wallet.getMultiChainBalances({
  chains: ['ethereum', 'base', 'polygon', 'solana']
});
// Returns: { ethereum: 10.5, base: 5.2, polygon: 25.3, solana: 0 }
```

### 5. Gas Optimization Suggestions
Recommend cheapest chain for current transaction:

```typescript
const recommendation = await GasOptimizer.suggestChain({
  amount: '0.02',
  urgency: 'normal'
});
// Returns: { chain: 'polygon', estimatedGas: '$0.001', savingsVsEthereum: '92%' }
```

## Conclusion

The multi-chain implementation provides:
- ✅ **Flexibility:** Service providers accept payments on multiple chains
- ✅ **Security:** Comprehensive validation of all addresses
- ✅ **UX:** Seamless wallet integration with auto-fill
- ✅ **Compatibility:** Backwards compatible with single-wallet services
- ✅ **Scalability:** Easy to add new chains in the future

**Current Status:** ✅ **Implementation Complete**
- Backend validation and storage
- API endpoints updated
- Frontend registration form
- Type-safe interfaces throughout

**Next Steps:**
- Add chain selection in payment flow
- Implement multi-chain payment verification
- Add chain-specific pricing
- Create migration script for existing services
