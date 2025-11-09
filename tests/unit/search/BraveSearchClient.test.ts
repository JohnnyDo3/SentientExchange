import { BraveSearchClient } from '../../../src/search/BraveSearchClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BraveSearchClient', () => {
  let client: BraveSearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock axios.create to return mocked axios instance
    mockedAxios.create = jest.fn().mockReturnValue({
      get: mockedAxios.get,
      defaults: { baseURL: 'https://api.search.brave.com/res/v1' }
    } as any);

    client = new BraveSearchClient('test-api-key');
  });

  describe('Constructor', () => {
    it('should initialize with API key', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.search.brave.com/res/v1',
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': 'test-api-key'
        },
        timeout: 10000
      });
    });

    it('should warn when API key is missing', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      new BraveSearchClient('');

      // Logger uses console.error for all levels, check for [WARN] prefix and API key message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.any(String), // timestamp
        expect.stringContaining('BRAVE_API_KEY not configured')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('checkHealth', () => {
    it('should return true when API is healthy', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });

      const result = await client.checkHealth();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith('/web/search', {
        params: { q: 'test', count: 1 }
      });
    });

    it('should return false when API returns non-200', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 500 });

      const result = await client.checkHealth();

      expect(result).toBe(false);
    });

    it('should return false when API request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.checkHealth();

      expect(result).toBe(false);
    });

    it('should cache health check results for 1 minute', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200 });

      // First call
      await client.checkHealth();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second call within 1 minute - should use cache
      await client.checkHealth();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // No additional call

      // Verify cached result is still true
      const result = await client.checkHealth();
      expect(result).toBe(true);
    });

    it('should not cache failed health checks', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await client.checkHealth();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second call should retry since it failed
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });
      const result = await client.checkHealth();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });
  });

  describe('search', () => {
    const mockSearchResponse = {
      status: 200,
      data: {
        web: {
          results: [
            {
              title: 'Test Result 1',
              url: 'https://example.com/1',
              description: 'Description 1',
              age: '2 hours ago',
              meta_url: { hostname: 'example.com' }
            },
            {
              title: 'Test Result 2',
              url: 'https://example.com/2',
              description: 'Description 2',
              age: '1 day ago',
              meta_url: { hostname: 'example.com' }
            }
          ]
        }
      }
    };

    it('should perform health check before searching', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 }) // health check
        .mockResolvedValueOnce(mockSearchResponse); // search

      const result = await client.search('test query');

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result.healthCheckPassed).toBe(true);
    });

    it('should return empty results when health check fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API down'));

      const result = await client.search('test query');

      expect(result.healthCheckPassed).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.apiCallCost).toBe('$0.00');
    });

    it('should parse search results correctly', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce(mockSearchResponse);

      const result = await client.search('test query');

      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        title: 'Test Result 1',
        url: 'https://example.com/1',
        description: 'Description 1',
        age: '2 hours ago',
        source: 'example.com'
      });
      expect(result.totalResults).toBe(2);
      expect(result.apiCallCost).toBe('$0.005');
    });

    it('should handle search with custom count parameter', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce(mockSearchResponse);

      await client.search('test', { count: 5 });

      expect(mockedAxios.get).toHaveBeenCalledWith('/web/search', {
        params: {
          q: 'test',
          count: 5,
          safesearch: 'moderate',
          freshness: undefined
        }
      });
    });

    it('should handle search with freshness filter', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce(mockSearchResponse);

      await client.search('test', { freshness: '24h' });

      expect(mockedAxios.get).toHaveBeenCalledWith('/web/search', expect.objectContaining({
        params: expect.objectContaining({
          freshness: '24h'
        })
      }));
    });

    it('should return empty results on malformed response', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 200, data: {} }); // Missing web.results

      const result = await client.search('test');

      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
    });

    it('should handle search API errors gracefully', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockRejectedValueOnce(new Error('Search failed'));

      const result = await client.search('test');

      expect(result.results).toEqual([]);
      expect(result.healthCheckPassed).toBe(true); // Health check passed
      expect(result.apiCallCost).toBe('$0.00');
    });

    it('should calculate API cost correctly', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce(mockSearchResponse);

      const result = await client.search('test');

      // With API key, cost is $0.005 per query
      expect(result.apiCallCost).toBe('$0.005');
    });

    it('should return $0.00 cost when no API key provided', async () => {
      const freeClient = new BraveSearchClient('');

      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce(mockSearchResponse);

      const result = await freeClient.search('test');

      expect(result.apiCallCost).toBe('$0.00');
    });
  });

  describe('fetchPage', () => {
    it('should fetch page content successfully', async () => {
      const mockHtml = '<html><body>Test content</body></html>';
      mockedAxios.get = jest.fn().mockResolvedValueOnce({
        status: 200,
        data: mockHtml
      });

      const result = await client.fetchPage('https://example.com');

      expect(result.success).toBe(true);
      expect(result.content).toBe(mockHtml);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', {
        timeout: 10000,
        headers: {
          'User-Agent': 'AgentMarket/1.0 (AI Agent)'
        }
      });
    });

    it('should return failure on non-200 status', async () => {
      mockedAxios.get = jest.fn().mockResolvedValueOnce({ status: 404 });

      const result = await client.fetchPage('https://example.com');

      expect(result.success).toBe(false);
      expect(result.content).toBe('');
    });

    it('should handle fetch errors gracefully', async () => {
      mockedAxios.get = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await client.fetchPage('https://example.com');

      expect(result.success).toBe(false);
      expect(result.content).toBe('');
    });

    it('should handle timeout errors', async () => {
      mockedAxios.get = jest.fn().mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      });

      const result = await client.fetchPage('https://example.com');

      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 200, data: { web: { results: [] } } });

      const result = await client.search('');

      expect(result.results).toEqual([]);
    });

    it('should handle very long search queries', async () => {
      const longQuery = 'a'.repeat(1000);
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 200, data: { web: { results: [] } } });

      const result = await client.search(longQuery);

      expect(result.query).toBe(longQuery);
    });

    it('should handle search results with missing fields', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            web: {
              results: [
                { title: 'Test', url: 'https://example.com' }
                // Missing description, age, meta_url
              ]
            }
          }
        });

      const result = await client.search('test');

      expect(result.results[0]).toEqual({
        title: 'Test',
        url: 'https://example.com',
        description: undefined,
        age: undefined,
        source: undefined
      });
    });
  });
});
