// Mock dependencies BEFORE imports
const mockCoinbase = {
  configure: jest.fn()
};

const mockWalletCreate = jest.fn();
const mockWalletImport = jest.fn();

jest.mock('@coinbase/coinbase-sdk', () => ({
  Coinbase: mockCoinbase,
  Wallet: {
    create: mockWalletCreate,
    import: mockWalletImport
  }
}));

const mockFsExistsSync = jest.fn();
const mockFsReadFileSync = jest.fn();
const mockFsWriteFileSync = jest.fn();
const mockFsMkdirSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: mockFsExistsSync,
  readFileSync: mockFsReadFileSync,
  writeFileSync: mockFsWriteFileSync,
  mkdirSync: mockFsMkdirSync
}));

const mockPathDirname = jest.fn();
const mockPathResolve = jest.fn();
jest.mock('path', () => ({
  dirname: mockPathDirname,
  resolve: mockPathResolve
}));

import { WalletManager } from '../../../src/payment/WalletManager';

describe('WalletManager', () => {
  let walletManager: WalletManager;
  let mockWallet: any;
  let mockAddress: any;

  const mockConfig = {
    networkId: 'base-sepolia',
    walletDataPath: './data/test-wallet.json'
  };

  const mockWalletData = {
    walletId: 'test-wallet-id',
    seed: 'test-seed-phrase'
  };

  const mockEnv = {
    CDP_API_KEY_NAME: 'test-key-name',
    CDP_API_KEY_PRIVATE_KEY: 'test-private-key'
  };

  beforeEach(() => {
    // Reset environment
    process.env = { ...mockEnv };

    // Setup mock address
    mockAddress = {
      getId: jest.fn().mockReturnValue('0xTestAddress123'),
      faucet: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue(undefined),
        getTransactionHash: jest.fn().mockReturnValue('0xFaucetTxHash')
      })
    };

    // Setup mock wallet
    mockWallet = {
      getId: jest.fn().mockReturnValue('test-wallet-id'),
      getDefaultAddress: jest.fn().mockResolvedValue(mockAddress),
      export: jest.fn().mockResolvedValue(mockWalletData),
      getBalance: jest.fn().mockResolvedValue({ toString: () => '1000000' }),
      createTransfer: jest.fn().mockResolvedValue({
        wait: jest.fn().mockResolvedValue(undefined),
        getTransactionHash: jest.fn().mockReturnValue('0xTransferTxHash')
      })
    };

    // Reset all mocks
    mockCoinbase.configure.mockReset();
    mockWalletImport.mockReset().mockResolvedValue(mockWallet);
    mockWalletCreate.mockReset().mockResolvedValue(mockWallet);
    mockFsExistsSync.mockReset().mockReturnValue(false);
    mockFsReadFileSync.mockReset().mockReturnValue(JSON.stringify(mockWalletData));
    mockFsWriteFileSync.mockReset();
    mockFsMkdirSync.mockReset();
    mockPathDirname.mockReset().mockReturnValue('./data');
    mockPathResolve.mockReset().mockImplementation((...args) => args.join('/'));

    // Create fresh instance
    walletManager = new WalletManager(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create WalletManager with correct configuration', () => {
      expect(walletManager).toBeDefined();
      expect(walletManager.isReady()).toBe(false);
    });

    it('should use provided wallet file path', () => {
      const customConfig = {
        networkId: 'base-sepolia',
        walletDataPath: './custom/wallet.json'
      };
      const customManager = new WalletManager(customConfig);
      expect(customManager).toBeDefined();
    });

    it('should use default wallet file path when not provided', () => {
      const minimalConfig = {
        networkId: 'base-sepolia'
      };
      const defaultManager = new WalletManager(minimalConfig);
      expect(defaultManager).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should configure Coinbase SDK with environment variables', async () => {
      await walletManager.initialize();

      expect(mockCoinbase.configure).toHaveBeenCalledWith({
        apiKeyName: mockEnv.CDP_API_KEY_NAME,
        privateKey: mockEnv.CDP_API_KEY_PRIVATE_KEY
      });
    });

    it('should load existing wallet from file', async () => {
      mockFsExistsSync.mockReturnValue(true);

      await walletManager.initialize();

      expect(mockFsExistsSync).toHaveBeenCalled();
      expect(mockFsReadFileSync).toHaveBeenCalled();
      expect(mockWalletImport).toHaveBeenCalledWith(mockWalletData);
      expect(walletManager.isReady()).toBe(true);
    });

    it('should create new wallet when file does not exist', async () => {
      mockFsExistsSync.mockReturnValue(false);

      await walletManager.initialize();

      expect(mockWalletCreate).toHaveBeenCalledWith({
        networkId: mockConfig.networkId
      });
      expect(walletManager.isReady()).toBe(true);
    });

    it('should save new wallet data to file', async () => {
      mockFsExistsSync.mockReturnValue(false);

      await walletManager.initialize();

      expect(mockWallet.export).toHaveBeenCalled();
      expect(mockFsMkdirSync).toHaveBeenCalled();
      expect(mockFsWriteFileSync).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(mockWalletData, null, 2)
      );
    });

    it('should handle wallet import errors', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockWalletImport.mockRejectedValue(new Error('Import failed'));

      await expect(walletManager.initialize()).rejects.toThrow();
      expect(walletManager.isReady()).toBe(false);
    });

    it('should handle wallet creation errors', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockWalletCreate.mockRejectedValue(new Error('Creation failed'));

      await expect(walletManager.initialize()).rejects.toThrow();
      expect(walletManager.isReady()).toBe(false);
    });

    it('should not reinitialize if already initialized', async () => {
      await walletManager.initialize();

      // Clear mock calls
      mockCoinbase.configure.mockClear();

      // Call initialize again
      await walletManager.initialize();

      // Should not configure again
      expect(mockCoinbase.configure).not.toHaveBeenCalled();
    });
  });

  describe('getAddress', () => {
    beforeEach(async () => {
      await walletManager.initialize();
    });

    it('should return wallet address when initialized', async () => {
      const address = await walletManager.getAddress();

      expect(address).toBe('0xTestAddress123');
      expect(mockWallet.getDefaultAddress).toHaveBeenCalled();
      expect(mockAddress.getId).toHaveBeenCalled();
    });

    it('should throw error if wallet not initialized', async () => {
      const uninitializedManager = new WalletManager(mockConfig);

      await expect(uninitializedManager.getAddress()).rejects.toThrow(
        'Wallet not initialized'
      );
    });
  });

  describe('getBalance', () => {
    beforeEach(async () => {
      await walletManager.initialize();
    });

    it('should return USDC balance as string', async () => {
      const balance = await walletManager.getBalance();

      expect(balance).toBe('1000000');
      expect(mockWallet.getBalance).toHaveBeenCalledWith('usdc');
    });

    it('should return "0" on error', async () => {
      mockWallet.getBalance.mockRejectedValue(new Error('Network error'));

      const balance = await walletManager.getBalance();

      expect(balance).toBe('0');
    });

    it('should throw if wallet not initialized', async () => {
      const uninitializedManager = new WalletManager(mockConfig);

      await expect(uninitializedManager.getBalance()).rejects.toThrow(
        'Wallet not initialized'
      );
    });
  });

  describe('requestFaucetFunds', () => {
    beforeEach(async () => {
      await walletManager.initialize();
    });

    it('should request faucet funds on base-sepolia', async () => {
      const txHash = await walletManager.requestFaucetFunds();

      expect(txHash).toBe('0xFaucetTxHash');
      expect(mockAddress.faucet).toHaveBeenCalled();
    });

    it('should throw error on mainnet', async () => {
      const mainnetManager = new WalletManager({
        networkId: 'base-mainnet'
      });
      await mainnetManager.initialize();

      await expect(mainnetManager.requestFaucetFunds()).rejects.toThrow(
        'Faucet only available on base-sepolia'
      );
    });

    it('should handle faucet request errors', async () => {
      mockAddress.faucet.mockRejectedValue(new Error('Faucet unavailable'));

      await expect(walletManager.requestFaucetFunds()).rejects.toThrow();
    });

    it('should throw if wallet not initialized', async () => {
      const uninitializedManager = new WalletManager(mockConfig);

      await expect(uninitializedManager.requestFaucetFunds()).rejects.toThrow(
        'Wallet not initialized'
      );
    });
  });

  describe('transferUsdc', () => {
    const recipientAddress = '0xRecipient123';
    const amount = '1.5';

    beforeEach(async () => {
      await walletManager.initialize();
    });

    it('should create and execute USDC transfer', async () => {
      const txHash = await walletManager.transferUsdc(recipientAddress, amount);

      expect(txHash).toBe('0xTransferTxHash');
      expect(mockWallet.createTransfer).toHaveBeenCalledWith({
        amount: parseFloat(amount),
        assetId: 'usdc',
        destination: recipientAddress,
        gasless: true
      });
    });

    it('should wait for transfer confirmation', async () => {
      const mockTransfer = {
        wait: jest.fn().mockResolvedValue(undefined),
        getTransactionHash: jest.fn().mockReturnValue('0xTransferTxHash')
      };
      mockWallet.createTransfer.mockResolvedValue(mockTransfer);

      await walletManager.transferUsdc(recipientAddress, amount);

      expect(mockTransfer.wait).toHaveBeenCalled();
    });

    it('should throw error if wallet not initialized', async () => {
      const uninitializedManager = new WalletManager(mockConfig);

      await expect(
        uninitializedManager.transferUsdc(recipientAddress, amount)
      ).rejects.toThrow('Wallet not initialized');
    });

    it('should handle transfer creation errors', async () => {
      mockWallet.createTransfer.mockRejectedValue(new Error('Insufficient funds'));

      await expect(
        walletManager.transferUsdc(recipientAddress, amount)
      ).rejects.toThrow();
    });

    it('should handle zero amount transfers', async () => {
      await walletManager.transferUsdc(recipientAddress, '0');

      expect(mockWallet.createTransfer).toHaveBeenCalledWith({
        amount: 0,
        assetId: 'usdc',
        destination: recipientAddress,
        gasless: true
      });
    });

    it('should handle large amount transfers', async () => {
      const largeAmount = '999999.999999';

      await walletManager.transferUsdc(recipientAddress, largeAmount);

      expect(mockWallet.createTransfer).toHaveBeenCalledWith({
        amount: parseFloat(largeAmount),
        assetId: 'usdc',
        destination: recipientAddress,
        gasless: true
      });
    });
  });

  describe('isReady', () => {
    it('should return false before initialization', () => {
      expect(walletManager.isReady()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      await walletManager.initialize();

      expect(walletManager.isReady()).toBe(true);
    });

    it('should return false after failed initialization', async () => {
      mockWalletCreate.mockRejectedValue(new Error('Init failed'));

      try {
        await walletManager.initialize();
      } catch (error) {
        // Expected
      }

      expect(walletManager.isReady()).toBe(false);
    });
  });

  describe('getWallet', () => {
    it('should return wallet instance when initialized', async () => {
      await walletManager.initialize();

      const wallet = walletManager.getWallet();

      expect(wallet).toBe(mockWallet);
    });

    it('should throw if wallet not initialized', () => {
      expect(() => walletManager.getWallet()).toThrow(
        'Wallet not initialized'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle file read errors gracefully', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      await expect(walletManager.initialize()).rejects.toThrow();
    });

    it('should handle file write errors gracefully', async () => {
      mockFsExistsSync.mockReturnValue(false);
      mockFsWriteFileSync.mockImplementation(() => {
        throw new Error('File write error');
      });

      await expect(walletManager.initialize()).rejects.toThrow();
    });

    it('should handle malformed wallet data in file', async () => {
      mockFsExistsSync.mockReturnValue(true);
      mockFsReadFileSync.mockReturnValue('invalid json');

      await expect(walletManager.initialize()).rejects.toThrow();
    });
  });
});
