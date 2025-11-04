import { checkWalletBalance } from '../../../src/tools/balance';
import { WalletManager } from '../../../src/payment/WalletManager';

// Mock WalletManager
jest.mock('../../../src/payment/WalletManager');

describe('checkWalletBalance', () => {
  let mockWalletManager: jest.Mocked<WalletManager>;

  beforeEach(() => {
    mockWalletManager = {
      isReady: jest.fn(),
      initialize: jest.fn(),
      getAddress: jest.fn(),
      getBalance: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should return wallet balance when wallet is already initialized', async () => {
      // Arrange
      mockWalletManager.isReady.mockReturnValue(true);
      mockWalletManager.getAddress.mockResolvedValue('0x1234567890abcdef');
      mockWalletManager.getBalance.mockResolvedValue('100.50');
      process.env.NETWORK = 'base-sepolia';

      // Act
      const result = await checkWalletBalance(mockWalletManager);

      // Assert
      expect(mockWalletManager.isReady).toHaveBeenCalled();
      expect(mockWalletManager.initialize).not.toHaveBeenCalled();
      expect(mockWalletManager.getAddress).toHaveBeenCalled();
      expect(mockWalletManager.getBalance).toHaveBeenCalledWith('usdc');

      const response = JSON.parse(result.content[0].text);
      expect(response.address).toBe('0x1234567890abcdef');
      expect(response.balance).toBe('100.50');
      expect(response.currency).toBe('USDC');
      expect(response.network).toBe('base-sepolia');
    });

    it('should initialize wallet if not ready', async () => {
      // Arrange
      mockWalletManager.isReady.mockReturnValue(false);
      mockWalletManager.initialize.mockResolvedValue(undefined);
      mockWalletManager.getAddress.mockResolvedValue('0xabcdef1234567890');
      mockWalletManager.getBalance.mockResolvedValue('50.25');
      process.env.NETWORK = 'base';

      // Act
      const result = await checkWalletBalance(mockWalletManager);

      // Assert
      expect(mockWalletManager.isReady).toHaveBeenCalled();
      expect(mockWalletManager.initialize).toHaveBeenCalled();
      expect(mockWalletManager.getAddress).toHaveBeenCalled();
      expect(mockWalletManager.getBalance).toHaveBeenCalledWith('usdc');

      const response = JSON.parse(result.content[0].text);
      expect(response.balance).toBe('50.25');
      expect(response.network).toBe('base');
    });

    it('should use default network when NETWORK env var is not set', async () => {
      // Arrange
      delete process.env.NETWORK;
      mockWalletManager.isReady.mockReturnValue(true);
      mockWalletManager.getAddress.mockResolvedValue('0x1234');
      mockWalletManager.getBalance.mockResolvedValue('0');

      // Act
      const result = await checkWalletBalance(mockWalletManager);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.network).toBe('base-sepolia'); // Default network
    });

    it('should handle zero balance', async () => {
      // Arrange
      mockWalletManager.isReady.mockReturnValue(true);
      mockWalletManager.getAddress.mockResolvedValue('0xnewwallet');
      mockWalletManager.getBalance.mockResolvedValue('0.00');

      // Act
      const result = await checkWalletBalance(mockWalletManager);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.balance).toBe('0.00');
    });
  });

  describe('Error Cases', () => {
    it('should return error when wallet initialization fails', async () => {
      // Arrange
      mockWalletManager.isReady.mockReturnValue(false);
      mockWalletManager.initialize.mockRejectedValue(new Error('Failed to initialize wallet'));

      // Act
      const result = await checkWalletBalance(mockWalletManager);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Failed to initialize wallet');
    });

    it('should return error when getAddress fails', async () => {
      // Arrange
      mockWalletManager.isReady.mockReturnValue(true);
      mockWalletManager.getAddress.mockRejectedValue(new Error('Cannot retrieve address'));

      // Act
      const result = await checkWalletBalance(mockWalletManager);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('Cannot retrieve address');
    });

    it('should return error when getBalance fails', async () => {
      // Arrange
      mockWalletManager.isReady.mockReturnValue(true);
      mockWalletManager.getAddress.mockResolvedValue('0x1234');
      mockWalletManager.getBalance.mockRejectedValue(new Error('RPC connection failed'));

      // Act
      const result = await checkWalletBalance(mockWalletManager);

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toBe('RPC connection failed');
    });
  });
});
