import { NextRequest, NextResponse } from 'next/server';
import { MarketplaceAPI } from '@/lib/marketplace-api';

// GET /api/marketplace/services - Fetch all services from AgentMarket MCP server
export async function GET(request: NextRequest) {
  try {
    // Check if the MCP server is available first
    const healthCheck = await MarketplaceAPI.checkHealth();
    if (!healthCheck) {
      return NextResponse.json({
        success: false,
        error: 'AgentMarket MCP server is not available',
        services: []
      }, { status: 503 });
    }

    // Fetch services from the MCP server
    const services = await MarketplaceAPI.getAllServices();

    return NextResponse.json({
      success: true,
      services: services,
      count: services.length
    });

  } catch (error) {
    console.error('Failed to fetch marketplace services:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch services',
      services: []
    }, { status: 500 });
  }
}

// POST /api/marketplace/services/search - Search services with filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, capabilities, minRating, maxPrice, limit, offset } = body;

    // Check if the MCP server is available first
    const healthCheck = await MarketplaceAPI.checkHealth();
    if (!healthCheck) {
      return NextResponse.json({
        success: false,
        error: 'AgentMarket MCP server is not available',
        services: []
      }, { status: 503 });
    }

    // Use the search API from MarketplaceAPI
    const services = await MarketplaceAPI.searchServices({
      query,
      capabilities,
      minRating,
      maxPrice,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      services: services,
      count: services.length
    });

  } catch (error) {
    console.error('Failed to search marketplace services:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search services',
      services: []
    }, { status: 500 });
  }
}