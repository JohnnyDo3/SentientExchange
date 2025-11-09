import { render, screen, fireEvent } from '@testing-library/react';
import PaymentRequestCard from '@/components/chat/PaymentRequestCard';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    )
  }
}));

describe('PaymentRequestCard', () => {
  const baseProps = {
    url: 'https://example.com/premium-content',
    timestamp: '10:30 AM'
  };

  describe('Status: checking_health', () => {
    it('should show checking health status', () => {
      const { container } = render(
        <PaymentRequestCard
          {...baseProps}
          status="checking_health"
        />
      );

      expect(screen.getByText('Checking if service is healthy...')).toBeInTheDocument();

      // Should have yellow pulsing clock icon
      const icon = container.querySelector('.text-yellow.animate-pulse');
      expect(icon).toBeInTheDocument();
    });

    it('should have correct border color for checking_health', () => {
      const { container } = render(
        <PaymentRequestCard
          {...baseProps}
          status="checking_health"
        />
      );

      const card = container.querySelector('.border-blue\\/30');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Status: pending_approval', () => {
    const approvalProps = {
      ...baseProps,
      status: 'pending_approval' as const,
      amount: '2.00',
      recipient: '0xRecipient123456789',
      onApprove: jest.fn(),
      onDecline: jest.fn()
    };

    it('should show approval status and payment details', () => {
      render(<PaymentRequestCard {...approvalProps} />);

      expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
      expect(screen.getByText('$2.00')).toBeInTheDocument();
      expect(screen.getByText('0xRecipient123456789')).toBeInTheDocument();
    });

    it('should render approve and decline buttons', () => {
      render(<PaymentRequestCard {...approvalProps} />);

      expect(screen.getByRole('button', { name: 'Approve $2.00' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
    });

    it('should call onApprove when approve button is clicked', () => {
      const onApprove = jest.fn();
      render(<PaymentRequestCard {...approvalProps} onApprove={onApprove} />);

      fireEvent.click(screen.getByRole('button', { name: 'Approve $2.00' }));
      expect(onApprove).toHaveBeenCalledTimes(1);
    });

    it('should call onDecline when decline button is clicked', () => {
      const onDecline = jest.fn();
      render(<PaymentRequestCard {...approvalProps} onDecline={onDecline} />);

      fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
      expect(onDecline).toHaveBeenCalledTimes(1);
    });

    it('should have yellow border for pending_approval', () => {
      const { container } = render(<PaymentRequestCard {...approvalProps} />);

      const card = container.querySelector('.border-yellow\\/30');
      expect(card).toBeInTheDocument();
    });

    it('should not show buttons if onApprove/onDecline are not provided', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="pending_approval"
          amount="2.00"
          recipient="0xRecipient"
        />
      );

      expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Decline/ })).not.toBeInTheDocument();
    });
  });

  describe('Status: processing', () => {
    it('should show processing status', () => {
      const { container } = render(
        <PaymentRequestCard
          {...baseProps}
          status="processing"
          amount="0.25"
          recipient="0xRecipient"
        />
      );

      expect(screen.getByText('Processing payment...')).toBeInTheDocument();

      // Should have blue pulsing clock icon
      const icon = container.querySelector('.text-blue.animate-pulse');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Status: completed', () => {
    const completedProps = {
      ...baseProps,
      status: 'completed' as const,
      amount: '0.25',
      recipient: '0xRecipient123456789',
      signature: 'tx-signature-abc123',
      healthCheckPassed: true
    };

    it('should show completed status', () => {
      render(<PaymentRequestCard {...completedProps} />);

      expect(screen.getByText('Payment completed')).toBeInTheDocument();
    });

    it('should render Solana explorer link for signature', () => {
      render(<PaymentRequestCard {...completedProps} />);

      const explorerLink = screen.getByRole('link', { name: /tx-signature-abc123/ });
      expect(explorerLink).toHaveAttribute(
        'href',
        'https://explorer.solana.com/tx/tx-signature-abc123?cluster=devnet'
      );
      expect(explorerLink).toHaveAttribute('target', '_blank');
      expect(explorerLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should show health check success message', () => {
      render(<PaymentRequestCard {...completedProps} />);

      expect(screen.getByText('Service is healthy')).toBeInTheDocument();
    });

    it('should have green border for completed status', () => {
      const { container } = render(<PaymentRequestCard {...completedProps} />);

      const card = container.querySelector('.border-green\\/30');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Status: failed', () => {
    it('should show failed status with error message', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="failed"
          healthCheckPassed={false}
          error="Service is down - payment blocked"
        />
      );

      expect(screen.getByText('Payment failed')).toBeInTheDocument();
      expect(screen.getByText('Service is down - payment blocked')).toBeInTheDocument();
    });

    it('should show health check failure message', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="failed"
          healthCheckPassed={false}
        />
      );

      expect(screen.getByText('Service failed health check - payment blocked')).toBeInTheDocument();
    });

    it('should have red border for failed status', () => {
      const { container } = render(
        <PaymentRequestCard
          {...baseProps}
          status="failed"
          error="Payment failed"
        />
      );

      const card = container.querySelector('.border-red\\/30');
      expect(card).toBeInTheDocument();
    });

    it('should render error with alert styling', () => {
      const { container } = render(
        <PaymentRequestCard
          {...baseProps}
          status="failed"
          error="Network timeout"
        />
      );

      const errorDiv = container.querySelector('.bg-red\\/10');
      expect(errorDiv).toBeInTheDocument();
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });
  });

  describe('URL Display', () => {
    it('should render URL as external link', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="completed"
        />
      );

      const link = screen.getByRole('link', { name: /example\.com\/premium-content/ });
      expect(link).toHaveAttribute('href', 'https://example.com/premium-content');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should truncate very long URLs', () => {
      const longUrl = 'https://example.com/very/long/path/that/should/be/truncated/in/ui';

      render(
        <PaymentRequestCard
          {...baseProps}
          url={longUrl}
          status="completed"
        />
      );

      const link = screen.getByRole('link', { name: new RegExp(longUrl) });
      expect(link).toHaveClass('truncate');
    });
  });

  describe('Payment Details', () => {
    it('should display amount and recipient when provided', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="completed"
          amount="1.50"
          recipient="0xRecipient123"
        />
      );

      expect(screen.getByText('Amount:')).toBeInTheDocument();
      expect(screen.getByText('$1.50')).toBeInTheDocument();
      expect(screen.getByText('Recipient:')).toBeInTheDocument();
      expect(screen.getByText('0xRecipient123')).toBeInTheDocument();
    });

    it('should not show payment details if amount or recipient is missing', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="completed"
        />
      );

      expect(screen.queryByText('Amount:')).not.toBeInTheDocument();
      expect(screen.queryByText('Recipient:')).not.toBeInTheDocument();
    });

    it('should truncate long recipient addresses', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="completed"
          amount="0.25"
          recipient="0x1234567890123456789012345678901234567890"
        />
      );

      const recipientSpan = screen.getByText('0x1234567890123456789012345678901234567890');
      expect(recipientSpan).toHaveClass('truncate');
    });
  });

  describe('Health Check Display', () => {
    it('should not show health check status when checking health', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="checking_health"
        />
      );

      expect(screen.queryByText('Service is healthy')).not.toBeInTheDocument();
      expect(screen.queryByText('Service failed health check')).not.toBeInTheDocument();
    });

    it('should show health check status for other states', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="completed"
          healthCheckPassed={true}
        />
      );

      expect(screen.getByText('Service is healthy')).toBeInTheDocument();
    });

    it('should not show health check status if undefined', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="processing"
        />
      );

      expect(screen.queryByText('Service is healthy')).not.toBeInTheDocument();
      expect(screen.queryByText('Service failed health check')).not.toBeInTheDocument();
    });
  });

  describe('Timestamp Display', () => {
    it('should display timestamp', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="completed"
          timestamp="2:45 PM"
        />
      );

      expect(screen.getByText('2:45 PM')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="completed"
        />
      );

      expect(screen.getByText('x402 Payment')).toBeInTheDocument();
    });

    it('should have accessible external links', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="completed"
          amount="0.25"
          recipient="0xRecipient"
          signature="tx-sig"
        />
      );

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });

    it('should have accessible buttons in approval state', () => {
      render(
        <PaymentRequestCard
          {...baseProps}
          status="pending_approval"
          amount="2.00"
          recipient="0xRecipient"
          onApprove={jest.fn()}
          onDecline={jest.fn()}
        />
      );

      const approveButton = screen.getByRole('button', { name: 'Approve $2.00' });
      const declineButton = screen.getByRole('button', { name: 'Decline' });

      expect(approveButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();
    });
  });
});
