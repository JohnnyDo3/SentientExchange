/**
 * AgentMarket Public Key for JWT Verification
 *
 * This public key is used to verify JWT tokens signed by the AgentMarket backend.
 * The backend signs payment authorization tokens with its private key, and this
 * middleware verifies them using the public key.
 *
 * SECURITY: This is intentionally public and safe to include in the package.
 * Only the backend's private key (kept secret) can sign valid tokens.
 */
export const AGENTMARKET_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApVoNanyg2MwSYeI+SL8R
CIrkEIX+yuwOFucfoGbr4nUJHGAp4/HZBBU+5NE5hnyWFldeSopBpNH1S9rT/qbz
1Bqj6pBmkIkuNjc4R1Nya4dfErexcAg+tPGVGeoUB4oUxAK/eC3uym4TclBueV2Q
NJL6+koRoprIeXyhGCyT7nvmCsd8BffS5z6Xc63B/kEQUr6W+QG4DLBIFqFCATjb
wAsB12XzJfpsGoNbXutSZXcdELKN4SQlKZ7aLyH6YcChdDGLxjPw20mzvFp9PsEy
lj+2q8yPypvcWwSXL7SaHOfSu5kibZcYmugB8UmV1zkQXRmUqASmDyFHJikubCLV
awIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Expected JWT payload interface
 */
export interface AgentMarketPayload {
  serviceId: string;
  requestId: string;
  txSignature: string;
  walletAddress: string;
  price: string;
  timestamp: number;
  exp: number;
  iat?: number;
}
