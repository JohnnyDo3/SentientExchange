import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchResultCard from '@/components/chat/SearchResultCard';

describe('SearchResultCard', () => {
  const mockResults = [
    {
      title: 'Test Article 1',
      url: 'https://example.com/article1',
      snippet: 'This is a test snippet for article 1',
      source: 'Example News'
    },
    {
      title: 'Test Article 2',
      url: 'https://example.com/article2',
      snippet: 'This is a test snippet for article 2',
      source: 'Tech Blog'
    }
  ];

  it('should render search query', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={2}
        healthCheckPassed={true}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/test query/i)).toBeInTheDocument();
  });

  it('should render search results', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={2}
        healthCheckPassed={true}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    expect(screen.getByText('Test Article 2')).toBeInTheDocument();
  });

  it('should display total results count', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={100}
        healthCheckPassed={true}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('should display cost', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={2}
        healthCheckPassed={true}
        cost="$0.05"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/\$0\.05/)).toBeInTheDocument();
  });

  it('should show health check passed indicator', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={2}
        healthCheckPassed={true}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/health.*passed/i)).toBeInTheDocument();
  });

  it('should show health check failed indicator', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={2}
        healthCheckPassed={false}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/health.*failed/i)).toBeInTheDocument();
  });

  it('should display error message when provided', () => {
    render(
      <SearchResultCard
        query="test query"
        results={[]}
        totalResults={0}
        healthCheckPassed={false}
        cost="$0.00"
        timestamp={Date.now()}
        error="Search API unavailable"
      />
    );

    expect(screen.getByText(/Search API unavailable/i)).toBeInTheDocument();
  });

  it('should show no results message when results array is empty', () => {
    render(
      <SearchResultCard
        query="test query"
        results={[]}
        totalResults={0}
        healthCheckPassed={true}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/no.*results/i)).toBeInTheDocument();
  });

  it('should render result snippets', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={2}
        healthCheckPassed={true}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/test snippet for article 1/i)).toBeInTheDocument();
    expect(screen.getByText(/test snippet for article 2/i)).toBeInTheDocument();
  });

  it('should render result sources', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={2}
        healthCheckPassed={true}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/Example News/i)).toBeInTheDocument();
    expect(screen.getByText(/Tech Blog/i)).toBeInTheDocument();
  });

  it('should have working links to search results', () => {
    render(
      <SearchResultCard
        query="test query"
        results={mockResults}
        totalResults={2}
        healthCheckPassed={true}
        cost="$0.01"
        timestamp={Date.now()}
      />
    );

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', 'https://example.com/article1');
    expect(links[1]).toHaveAttribute('href', 'https://example.com/article2');
  });
});
