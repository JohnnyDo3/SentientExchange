import supertest, { Test } from 'supertest';
import { Express } from 'express';
import { AuthHelpers } from './authHelpers';

/**
 * Helper class for making API requests in tests
 */
export class ApiHelpers {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Create a supertest instance
   */
  private request() {
    return supertest(this.app);
  }

  /**
   * Make an authenticated GET request
   */
  get(url: string, address?: string, chainId?: number): Test {
    return this.request()
      .get(url)
      .set('Authorization', AuthHelpers.getAuthHeader(address, chainId));
  }

  /**
   * Make an unauthenticated GET request
   */
  getUnauthenticated(url: string): Test {
    return this.request().get(url);
  }

  /**
   * Make an authenticated POST request
   */
  post(url: string, body: Record<string, unknown>, address?: string, chainId?: number): Test {
    return this.request()
      .post(url)
      .set('Authorization', AuthHelpers.getAuthHeader(address, chainId))
      .send(body);
  }

  /**
   * Make an unauthenticated POST request
   */
  postUnauthenticated(url: string, body: Record<string, unknown>): Test {
    return this.request().post(url).send(body);
  }

  /**
   * Make an authenticated PUT request
   */
  put(url: string, body: Record<string, unknown>, address?: string, chainId?: number): Test {
    return this.request()
      .put(url)
      .set('Authorization', AuthHelpers.getAuthHeader(address, chainId))
      .send(body);
  }

  /**
   * Make an authenticated DELETE request
   */
  delete(url: string, address?: string, chainId?: number): Test {
    return this.request()
      .delete(url)
      .set('Authorization', AuthHelpers.getAuthHeader(address, chainId));
  }

  /**
   * Make an authenticated PATCH request
   */
  patch(url: string, body: Record<string, unknown>, address?: string, chainId?: number): Test {
    return this.request()
      .patch(url)
      .set('Authorization', AuthHelpers.getAuthHeader(address, chainId))
      .send(body);
  }

  /**
   * Service API helpers
   */
  services = {
    getAll: () => this.getUnauthenticated('/api/services'),
    getById: (id: string) => this.getUnauthenticated(`/api/services/${id}`),
    create: (service: Record<string, unknown>, address?: string) =>
      this.post('/api/services', service, address),
    update: (id: string, updates: Record<string, unknown>, address?: string) =>
      this.put(`/api/services/${id}`, updates, address),
    delete: (id: string, address?: string) => this.delete(`/api/services/${id}`, address),
  };

  /**
   * Payment API helpers
   */
  payments = {
    create: (payment: Record<string, unknown>, address?: string) =>
      this.post('/api/payments', payment, address),
    getById: (id: string, address?: string) => this.get(`/api/payments/${id}`, address),
    execute: (id: string, proof: Record<string, unknown>, address?: string) =>
      this.post(`/api/payments/${id}/execute`, proof, address),
    verify: (verification: Record<string, unknown>, address?: string) =>
      this.post('/api/payments/verify', verification, address),
  };

  /**
   * Transaction API helpers
   */
  transactions = {
    getAll: (address?: string) => this.get('/api/transactions', address),
    getById: (id: string, address?: string) => this.get(`/api/transactions/${id}`, address),
  };

  /**
   * Auth API helpers
   */
  auth = {
    connect: (data: Record<string, unknown>) => this.postUnauthenticated('/api/auth/connect', data),
    verify: (data: Record<string, unknown>) => this.postUnauthenticated('/api/auth/verify', data),
    logout: (address?: string) => this.post('/api/auth/logout', {}, address),
  };

  /**
   * Wallet API helpers
   */
  wallets = {
    getBalance: (address?: string) => this.get('/api/wallets/balance', address),
    setLimits: (limits: Record<string, unknown>, address?: string) =>
      this.post('/api/wallets/limits', limits, address),
  };

  /**
   * Discovery API helpers
   */
  discovery = {
    discover: (query: Record<string, unknown>) => this.postUnauthenticated('/api/discover', query),
    prepare: (data: Record<string, unknown>, address?: string) =>
      this.post('/api/prepare', data, address),
    execute: (data: Record<string, unknown>, address?: string) =>
      this.post('/api/execute', data, address),
  };

  /**
   * Health check helpers
   */
  health = {
    check: () => this.getUnauthenticated('/health'),
    status: () => this.getUnauthenticated('/api/status'),
  };

  /**
   * Make a request with custom headers
   */
  withHeaders(method: string, url: string, headers: Record<string, string>, body?: Record<string, unknown>): Test {
    const req = this.request()[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](url);
    Object.entries(headers).forEach(([key, value]) => {
      req.set(key, value);
    });
    if (body) {
      req.send(body);
    }
    return req;
  }

  /**
   * Expect a successful response (2xx)
   */
  static expectSuccess(response: supertest.Response): void {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  }

  /**
   * Expect an error response with specific status
   */
  static expectError(response: supertest.Response, expectedStatus: number): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.error).toBeDefined();
  }

  /**
   * Expect a 401 Unauthorized response
   */
  static expectUnauthorized(response: supertest.Response): void {
    ApiHelpers.expectError(response, 401);
  }

  /**
   * Expect a 403 Forbidden response
   */
  static expectForbidden(response: supertest.Response): void {
    ApiHelpers.expectError(response, 403);
  }

  /**
   * Expect a 404 Not Found response
   */
  static expectNotFound(response: supertest.Response): void {
    ApiHelpers.expectError(response, 404);
  }

  /**
   * Expect a 400 Bad Request response
   */
  static expectBadRequest(response: supertest.Response): void {
    ApiHelpers.expectError(response, 400);
  }

  /**
   * Expect a 402 Payment Required response
   */
  static expectPaymentRequired(response: supertest.Response): void {
    expect(response.status).toBe(402);
    expect(response.body.payment).toBeDefined();
  }

  /**
   * Expect response body to match a schema
   */
  static expectBodyToMatch<T>(response: supertest.Response, matcher: Partial<T>): void {
    expect(response.body).toMatchObject(matcher);
  }
}
