import { render, screen } from '@testing-library/react';
import SearchResultCard from '@/components/chat/SearchResultCard';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

describe('SearchResultCard', () => {
  const mockResults = [
    {
      rank: 1,
      title: 'AI Breakthrough Announcement',
      url: 'https://example.com/ai-breakthrough',
      description: 'Major advancement in AI technology announced today',
      source: 'example.com',
      age: '2 hours ago'
    },
    {
      rank: 2,
      title: 'Machine Learning Tutorial',
      url: 'https://tutorial.com/ml-basics',
      description: 'Learn the fundamentals of machine learning',
      source: 'tutorial.com',
      age: '1 day ago'
    }
  ];

  describe('Rendering with Results', () => {
    it('should render search query and results', () => {
      render(
        <SearchResultCard
          query="AI news"
          results={mockResults}
          totalResults={2}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('"AI news"')).toBeInTheDocument();
      expect(screen.getByText('AI Breakthrough Announcement')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning Tutorial')).toBeInTheDocument();
      expect(screen.getByText('Found 2 results')).toBeInTheDocument();
    });

    it('should display result details correctly', () => {
      render(
        <SearchResultCard
          query="test query"
          results={[mockResults[0]]}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('AI Breakthrough Announcement')).toBeInTheDocument();
      expect(screen.getByText('Major advancement in AI technology announced today')).toBeInTheDocument();
      expect(screen.getByText('Source: example.com')).toBeInTheDocument();
      expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
    });

    it('should render rank numbers for each result', () => {
      render(
        <SearchResultCard
          query="test"
          results={mockResults}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('should render external links with correct attributes', () => {
      render(
        <SearchResultCard
          query="test"
          results={[mockResults[0]]}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      const link = screen.getByRole('link', { name: /example\.com\/ai-breakthrough/i });
      expect(link).toHaveAttribute('href', 'https://example.com/ai-breakthrough');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Health Check Display', () => {
    it('should show success icon when health check passes', () => {
      const { container } = render(
        <SearchResultCard
          query="test"
          results={mockResults}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      // CheckCircle icon should be present (lucide-react renders as svg)
      const healthIcon = container.querySelector('.text-green');
      expect(healthIcon).toBeInTheDocument();
    });

    it('should show alert icon when health check fails', () => {
      const { container } = render(
        <SearchResultCard
          query="test"
          results={mockResults}
          healthCheckPassed={false}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      // AlertCircle icon should be present with red color
      const healthIcon = container.querySelector('.text-red');
      expect(healthIcon).toBeInTheDocument();
    });
  });

  describe('Cost and Timestamp Display', () => {
    it('should display cost and timestamp', () => {
      render(
        <SearchResultCard
          query="test"
          results={mockResults}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('$0.005')).toBeInTheDocument();
      expect(screen.getByText('10:30 AM')).toBeInTheDocument();
    });

    it('should display free cost correctly', () => {
      render(
        <SearchResultCard
          query="test"
          results={mockResults}
          healthCheckPassed={true}
          cost="$0.00"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  describe('Empty Results State', () => {
    it('should show "No results found" when results array is empty', () => {
      render(
        <SearchResultCard
          query="nonexistent query"
          results={[]}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should not show "No results found" when there is an error', () => {
      render(
        <SearchResultCard
          query="test"
          results={[]}
          healthCheckPassed={false}
          cost="$0.00"
          timestamp="10:30 AM"
          error="API timeout"
        />
      );

      expect(screen.queryByText('No results found')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <SearchResultCard
          query="test"
          results={[]}
          healthCheckPassed={false}
          cost="$0.00"
          timestamp="10:30 AM"
          error="API connection failed"
        />
      );

      expect(screen.getByText('API connection failed')).toBeInTheDocument();
    });

    it('should render error with alert styling', () => {
      const { container } = render(
        <SearchResultCard
          query="test"
          results={[]}
          healthCheckPassed={false}
          cost="$0.00"
          timestamp="10:30 AM"
          error="Network error"
        />
      );

      const errorDiv = container.querySelector('.bg-red\\/10');
      expect(errorDiv).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should not show error section when error prop is undefined', () => {
      const { container } = render(
        <SearchResultCard
          query="test"
          results={mockResults}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      const errorDiv = container.querySelector('.bg-red\\/10');
      expect(errorDiv).not.toBeInTheDocument();
    });
  });

  describe('Optional Fields', () => {
    it('should handle results without source and age fields', () => {
      const resultsWithoutOptionalFields = [
        {
          rank: 1,
          title: 'Simple Result',
          url: 'https://example.com',
          description: 'Basic description'
        }
      ];

      render(
        <SearchResultCard
          query="test"
          results={resultsWithoutOptionalFields}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('Simple Result')).toBeInTheDocument();
      expect(screen.queryByText(/Source:/)).not.toBeInTheDocument();
    });

    it('should display default result count when totalResults is undefined', () => {
      render(
        <SearchResultCard
          query="test"
          results={mockResults}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('Found 2 results')).toBeInTheDocument();
    });
  });

  describe('URL Truncation', () => {
    it('should handle very long URLs', () => {
      const longUrlResult = {
        rank: 1,
        title: 'Test',
        url: 'https://example.com/very/long/path/that/should/be/truncated/in/the/ui/component/test',
        description: 'Test description'
      };

      render(
        <SearchResultCard
          query="test"
          results={[longUrlResult]}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('truncate');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <SearchResultCard
          query="test"
          results={mockResults}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('Web Search')).toBeInTheDocument();
      expect(screen.getByText('AI Breakthrough Announcement')).toBeInTheDocument();
    });

    it('should have accessible external links', () => {
      render(
        <SearchResultCard
          query="test"
          results={[mockResults[0]]}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('Multiple Results Rendering', () => {
    it('should render all results in correct order', () => {
      render(
        <SearchResultCard
          query="test"
          results={mockResults}
          totalResults={2}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      const titles = screen.getAllByRole('heading', { level: 4 });
      expect(titles[0]).toHaveTextContent('AI Breakthrough Announcement');
      expect(titles[1]).toHaveTextContent('Machine Learning Tutorial');
    });

    it('should handle large number of results', () => {
      const manyResults = Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        title: `Result ${i + 1}`,
        url: `https://example.com/result-${i + 1}`,
        description: `Description for result ${i + 1}`
      }));

      render(
        <SearchResultCard
          query="test"
          results={manyResults}
          totalResults={10}
          healthCheckPassed={true}
          cost="$0.005"
          timestamp="10:30 AM"
        />
      );

      expect(screen.getByText('Found 10 results')).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(10);
    });
  });
});
