/**
 * Type declarations for custom Jest matchers
 */
declare namespace jest {
  interface Matchers<R> {
    toBeValidTransaction(): R;
    toHaveValidSignature(type?: 'ethereum' | 'solana'): R;
    toMatchServiceSchema(): R;
  }
}
