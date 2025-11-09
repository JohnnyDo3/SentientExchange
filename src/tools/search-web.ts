import Joi from 'joi';
import { BraveSearchClient } from '../search/BraveSearchClient.js';

export interface SearchWebArgs {
  query: string;
  count?: number;
  freshness?: string;
}

const schema = Joi.object({
  query: Joi.string().min(1).max(500).required().description('Search query'),
  count: Joi.number().integer().min(1).max(20).optional().description('Number of results (1-20)'),
  freshness: Joi.string().optional().description('Time filter: "24h", "week", "month", "year"')
});

/**
 * search_web - Search the web using Brave Search API
 *
 * ALWAYS performs health check before searching to ensure API is available.
 * Returns structured search results with titles, URLs, descriptions, and sources.
 *
 * @param searchClient - BraveSearchClient instance
 * @param args - Search parameters
 * @returns MCP tool response with search results
 */
export async function searchWeb(
  searchClient: BraveSearchClient,
  args: SearchWebArgs
) {
  try {
    // Validate input
    const { error, value } = schema.validate(args);
    if (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Invalid input: ${error.message}`,
            healthCheckPassed: false
          }, null, 2)
        }],
        isError: true
      };
    }

    const { query, count = 10, freshness } = value;

    // Execute search (includes mandatory health check)
    const result = await searchClient.search(query, {
      count,
      freshness
    });

    // Format response for AI
    const response = {
      query: result.query,
      healthCheckPassed: result.healthCheckPassed,
      totalResults: result.totalResults,
      apiCallCost: result.apiCallCost,
      results: result.results.map((r, index) => ({
        rank: index + 1,
        title: r.title,
        url: r.url,
        description: r.description,
        source: r.source,
        age: r.age
      }))
    };

    // If health check failed, return early with empty results
    if (!result.healthCheckPassed) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ...response,
            error: 'Brave Search API is currently unhealthy - returning cached/fallback results or gracefully degrading'
          }, null, 2)
        }],
        isError: false
      };
    }

    // Success - return search results
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          healthCheckPassed: false
        }, null, 2)
      }],
      isError: true
    };
  }
}
