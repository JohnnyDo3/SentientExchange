import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentRequestCard from '@/components/chat/PaymentRequestCard';

describe('PaymentRequestCard', () => {
  it('should render payment URL', () => {
    render(
      <PaymentRequestCard
        url="https://premium.example.com/article"
        status="completed"
        amount="0.50"
        recipient="RecipientAddress123"
        signature="sig-abc-123"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/premium\.example\.com/i)).toBeInTheDocument();
  });

  it('should display payment amount', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="completed"
        amount="1.25"
        recipient="RecipientAddress123"
        signature="sig-abc-123"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/1\.25/)).toBeInTheDocument();
  });

  it('should show completed status', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="completed"
        amount="0.50"
        recipient="RecipientAddress123"
        signature="sig-abc-123"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('should show pending status', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="pending"
        amount="0.50"
        recipient="RecipientAddress123"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('should show approval needed status', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="approval_needed"
        amount="5.00"
        recipient="RecipientAddress123"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/approval.*needed/i)).toBeInTheDocument();
  });

  it('should show failed status', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="failed"
        amount="0.50"
        recipient="RecipientAddress123"
        healthCheckPassed={false}
        timestamp={Date.now()}
        error="Payment declined"
      />
    );

    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('should display payment signature when completed', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="completed"
        amount="0.50"
        recipient="RecipientAddress123"
        signature="sig-abc-123-def-456"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/sig-abc/i)).toBeInTheDocument();
  });

  it('should display recipient address', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="completed"
        amount="0.50"
        recipient="RecipientAddress123xyz"
        signature="sig-abc-123"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/RecipientAddress123/i)).toBeInTheDocument();
  });

  it('should show health check passed indicator', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="completed"
        amount="0.50"
        recipient="RecipientAddress123"
        signature="sig-abc-123"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/health.*passed/i)).toBeInTheDocument();
  });

  it('should show health check failed indicator', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="failed"
        amount="0.50"
        recipient="RecipientAddress123"
        healthCheckPassed={false}
        timestamp={Date.now()}
        error="Service unavailable"
      />
    );

    expect(screen.getByText(/health.*failed/i)).toBeInTheDocument();
  });

  it('should display error message when provided', () => {
    render(
      <PaymentRequestCard
        url="https://example.com"
        status="failed"
        amount="0.50"
        recipient="RecipientAddress123"
        healthCheckPassed={false}
        timestamp={Date.now()}
        error="Insufficient funds"
      />
    );

    expect(screen.getByText(/Insufficient funds/i)).toBeInTheDocument();
  });

  it('should show approval needed message for high amounts', () => {
    render(
      <PaymentRequestCard
        url="https://expensive.com"
        status="approval_needed"
        amount="10.00"
        recipient="RecipientAddress123"
        healthCheckPassed={true}
        timestamp={Date.now()}
      />
    );

    expect(screen.getByText(/10\.00/)).toBeInTheDocument();
    expect(screen.getByText(/approval/i)).toBeInTheDocument();
  });
});
