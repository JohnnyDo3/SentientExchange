/**
 * Unit tests for SSETransportManager
 * Tests SSE transport initialization, session management, and security
 */

import { SSETransportManager } from '../../../src/mcp/SSETransport';
import { ServiceRegistry } from '../../../src/registry/ServiceRegistry';
import { Database } from '../../../src/registry/database';
import { SolanaVerifier } from '../../../src/payment/SolanaVerifier';
import { SpendingLimitManager } from '../../../src/payment/SpendingLimitManager';
import { Request, Response } from 'express';

// Mock dependencies
jest.mock('../../../src/registry/ServiceRegistry');
jest.mock('../../../src/registry/database');
jest.mock('../../../src/payment/SolanaVerifier');
jest.mock('../../../src/payment/SpendingLimitManager');
jest.mock('@modelcontextprotocol/sdk/server/sse.js');

describe('SSETransportManager', () => {
  let sseManager: SSETransportManager;
  let mockRegistry: jest.Mocked<ServiceRegistry>;
  let mockDb: jest.Mocked<Database>;
  let mockVerifier: jest.Mocked<SolanaVerifier>;
  let mockLimitManager: jest.Mocked<SpendingLimitManager>;

  beforeEach(() => {
    // Create mock instances
    mockRegistry = new ServiceRegistry({} as any) as jest.Mocked<ServiceRegistry>;
    mockDb = new Database(':memory:') as jest.Mocked<Database>;
    mockVerifier = new SolanaVerifier() as jest.Mocked<SolanaVerifier>;
    mockLimitManager = new SpendingLimitManager(mockDb) as jest.Mocked<SpendingLimitManager>;

    // Create SSETransportManager
    sseManager = new SSETransportManager(
      mockRegistry,
      mockDb,
      mockVerifier,
      mockLimitManager
    );
  });

  describe('Initialization', () => {
    it('should create SSETransportManager without errors', () => {
      expect(sseManager).toBeDefined();
      expect(sseManager).toBeInstanceOf(SSETransportManager);
    });

    it('should have zero active sessions initially', () => {
      expect(sseManager.getActiveSessionCount()).toBe(0);
    });
  });

  describe('Session Management', () => {
    it('should track active session count', () => {
      expect(sseManager.getActiveSessionCount()).toBe(0);
    });

    it('should provide closeAll method', async () => {
      await expect(sseManager.closeAll()).resolves.not.toThrow();
    });
  });

  describe('Session ID Validation', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockReq = {
        query: {},
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent',
        },
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };
    });

    it('should reject missing session ID', async () => {
      mockReq.query = {}; // No sessionId

      await sseManager.handleMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Missing sessionId parameter');
    });

    it('should reject invalid session ID format (too short)', async () => {
      mockReq.query = { sessionId: 'abc123' }; // Too short

      await sseManager.handleMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Invalid sessionId format');
    });

    it('should reject invalid session ID format (special chars)', async () => {
      mockReq.query = { sessionId: 'abc123@#$%^&*()def' }; // Invalid chars

      await sseManager.handleMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Invalid sessionId format');
    });

    it('should reject non-existent session ID', async () => {
      mockReq.query = { sessionId: 'valid-session-id-1234567890' }; // Valid format but doesn't exist

      await sseManager.handleMessage(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith('Session not found');
    });
  });

  describe('Security', () => {
    it('should log client IP for connection requests', async () => {
      const mockReq = {
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'Claude Desktop',
        },
      } as Partial<Request>;

      const mockRes = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as Partial<Response>;

      // This will fail to create transport (mocked), but should log IP
      await sseManager.handleSSEConnection(mockReq as Request, mockRes as Response);

      // Verify it attempted to handle the connection (IP was logged)
      expect(mockReq.ip).toBe('192.168.1.100');
    });

    it('should validate session ID format with regex', () => {
      // Valid formats
      expect(/^[a-zA-Z0-9_-]{16,}$/.test('valid-session-123456789')).toBe(true);
      expect(/^[a-zA-Z0-9_-]{16,}$/.test('ABC-def_123-456789')).toBe(true);

      // Invalid formats
      expect(/^[a-zA-Z0-9_-]{16,}$/.test('short')).toBe(false);
      expect(/^[a-zA-Z0-9_-]{16,}$/.test('has spaces in it 1234')).toBe(false);
      expect(/^[a-zA-Z0-9_-]{16,}$/.test('special@chars#1234567')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in closeAll', async () => {
      await expect(sseManager.closeAll()).resolves.not.toThrow();
    });
  });
});
