/**
 * Input Validation Utilities
 *
 * Utilities for validating MCP tool inputs.
 * Will be expanded as needed.
 */

export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function isValidEthereumAddress(address: string): boolean {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

export function isValidPrice(price: string): boolean {
  const priceRegex = /^\$\d+(\.\d{1,2})?$/;
  return priceRegex.test(price);
}

export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}
