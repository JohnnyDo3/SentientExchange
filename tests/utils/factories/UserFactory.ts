/**
 * Factory for creating test user/wallet fixtures
 */
export class UserFactory {
  /**
   * Create a test wallet address
   */
  static createWalletAddress(index: number = 0): string {
    const paddedIndex = index.toString(16).padStart(40, '0');
    return `0x${paddedIndex}`;
  }

  /**
   * Create multiple wallet addresses
   */
  static createWalletAddresses(count: number): string[] {
    return Array.from({ length: count }, (_, i) => UserFactory.createWalletAddress(i));
  }

  /**
   * Create a realistic-looking Ethereum address
   */
  static createRealisticAddress(): string {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  /**
   * Create a Solana public key (base58 encoded, 32-44 characters)
   */
  static createSolanaAddress(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    const length = 32 + Math.floor(Math.random() * 13); // 32-44 characters
    for (let i = 0; i < length; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  /**
   * Create a test user object
   */
  static createUser(overrides: {
    address?: string;
    chainId?: number;
    name?: string;
  } = {}) {
    return {
      address: overrides.address || UserFactory.createWalletAddress(0),
      chainId: overrides.chainId || 1,
      name: overrides.name || 'Test User',
    };
  }

  /**
   * Create multiple test users
   */
  static createUsers(count: number) {
    return Array.from({ length: count }, (_, i) =>
      UserFactory.createUser({
        address: UserFactory.createWalletAddress(i),
        name: `Test User ${i + 1}`,
      })
    );
  }

  /**
   * Create a buyer wallet
   */
  static createBuyer(index: number = 1): string {
    return UserFactory.createWalletAddress(1000 + index);
  }

  /**
   * Create a seller/provider wallet
   */
  static createProvider(index: number = 1): string {
    return UserFactory.createWalletAddress(2000 + index);
  }

  /**
   * Well-known test addresses
   */
  static readonly ALICE = '0x' + '1'.repeat(40);
  static readonly BOB = '0x' + '2'.repeat(40);
  static readonly CHARLIE = '0x' + '3'.repeat(40);
  static readonly PROVIDER_1 = '0x' + 'a'.repeat(40);
  static readonly PROVIDER_2 = '0x' + 'b'.repeat(40);
  static readonly ZERO_ADDRESS = '0x' + '0'.repeat(40);
}
