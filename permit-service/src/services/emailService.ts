import { Resend } from 'resend';
import { logger } from '../middleware/logger';

// Initialize Resend with a dummy key if not provided (for tests)
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_tests');

const FROM_EMAIL = process.env.EMAIL_FROM || 'AI Permit Tampa <noreply@aipermittampa.com>';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3010';

interface PreviewLinkEmailParams {
  to: string;
  customerName?: string;
  previewUrl: string;
  expiresAt: Date;
  submissionId: string;
}

interface SubmissionConfirmationParams {
  to: string;
  customerName?: string;
  accelaRecordId: string;
  accelaUrl?: string;
  submissionId: string;
}

/**
 * Send preview link email to customer for Tier 2 approval
 */
export async function sendPreviewLinkEmail(params: PreviewLinkEmailParams): Promise<boolean> {
  const { to, customerName, previewUrl, expiresAt, submissionId } = params;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1976d2;
    }
    .header h1 {
      color: #1976d2;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin: 20px 0;
    }
    .cta-button {
      display: inline-block;
      background: #2e7d32;
      color: white !important;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .info-box {
      background: #f0f8ff;
      border-left: 4px solid #1976d2;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ff9800;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏗️ Review Your Permit Package</h1>
    </div>

    <div class="content">
      ${customerName ? `<p>Hi ${customerName},</p>` : '<p>Hello,</p>'}

      <p>Great news! Your HVAC permit package has been prepared and is ready for your review.</p>

      <div class="info-box">
        <strong>📋 Submission ID:</strong> ${submissionId}<br>
        <strong>⏰ Review Deadline:</strong> ${expiresAt.toLocaleString()}
      </div>

      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Click the button below to review your permit documents</li>
        <li>Download and verify all PDFs for accuracy</li>
        <li>Click "Approve & Submit to Accela" when ready</li>
        <li>We'll automatically submit to Tampa's permit system</li>
      </ol>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${previewUrl}" class="cta-button">
          📄 Review Permit Package
        </a>
      </div>

      <div class="warning-box">
        <strong>⚠️ Important:</strong> This review link expires in 24 hours. Please review and approve your package before ${expiresAt.toLocaleString()}.
      </div>

      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    </div>

    <div class="footer">
      <p>This is an automated email from AI Permit Tampa.<br>
      If you did not request this permit package, please contact support immediately.</p>
      <p style="margin-top: 10px;">
        <strong>Support:</strong> support@aipermittampa.com<br>
        <strong>Website:</strong> ${SITE_URL}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Review Your Permit Package

${customerName ? `Hi ${customerName},` : 'Hello,'}

Great news! Your HVAC permit package has been prepared and is ready for your review.

Submission ID: ${submissionId}
Review Deadline: ${expiresAt.toLocaleString()}

Next Steps:
1. Visit the review link: ${previewUrl}
2. Download and verify all PDFs for accuracy
3. Click "Approve & Submit to Accela" when ready
4. We'll automatically submit to Tampa's permit system

IMPORTANT: This review link expires in 24 hours.

If you have any questions, please contact support@aipermittampa.com.

---
This is an automated email from AI Permit Tampa.
Website: ${SITE_URL}
  `;

  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set - skipping email send (dev mode)');
      logger.info('Preview link email (not sent):', { to, previewUrl, submissionId });
      return true; // Don't fail in dev mode
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '📋 Review Your HVAC Permit Package - Action Required',
      html: htmlContent,
      text: textContent,
    });

    logger.info('Preview link email sent successfully', {
      to,
      submissionId,
      emailId: result.data?.id,
    });

    return true;
  } catch (error: any) {
    logger.error('Failed to send preview link email', {
      error: error.message,
      to,
      submissionId,
    });
    return false;
  }
}

/**
 * Send submission confirmation email after successful Accela submission
 */
export async function sendSubmissionConfirmationEmail(
  params: SubmissionConfirmationParams
): Promise<boolean> {
  const { to, customerName, accelaRecordId, accelaUrl, submissionId } = params;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2e7d32;
    }
    .header h1 {
      color: #2e7d32;
      margin: 0;
      font-size: 24px;
    }
    .success-badge {
      text-align: center;
      font-size: 48px;
      margin: 20px 0;
    }
    .content {
      margin: 20px 0;
    }
    .record-box {
      background: #e8f5e9;
      border-left: 4px solid #2e7d32;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .record-box strong {
      color: #1b5e20;
      font-size: 16px;
    }
    .record-id {
      font-size: 20px;
      color: #1b5e20;
      font-weight: 700;
      margin: 10px 0;
      font-family: monospace;
    }
    .cta-button {
      display: inline-block;
      background: #1976d2;
      color: white !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 14px;
      margin: 10px 0;
    }
    .info-box {
      background: #f0f8ff;
      border-left: 4px solid #1976d2;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Permit Submitted Successfully!</h1>
    </div>

    <div class="success-badge">🎉</div>

    <div class="content">
      ${customerName ? `<p>Hi ${customerName},</p>` : '<p>Hello,</p>'}

      <p><strong>Congratulations!</strong> Your HVAC permit application has been successfully submitted to Tampa's Accela system.</p>

      <div class="record-box">
        <strong>📝 Your Accela Record ID:</strong><br>
        <div class="record-id">${accelaRecordId}</div>
        ${
          accelaUrl
            ? `<div style="margin-top: 15px;">
          <a href="${accelaUrl}" class="cta-button">
            🔗 View in Accela Portal
          </a>
        </div>`
            : ''
        }
      </div>

      <div class="info-box">
        <strong>📋 Reference Information:</strong><br>
        Submission ID: ${submissionId}<br>
        Submitted: ${new Date().toLocaleString()}
      </div>

      <p><strong>What Happens Next?</strong></p>
      <ol>
        <li><strong>Processing:</strong> Tampa's permit department will review your application (typically 3-5 business days)</li>
        <li><strong>Payment:</strong> You'll receive instructions for permit fee payment directly from the county</li>
        <li><strong>Inspection:</strong> Once approved and fees are paid, schedule your required inspections</li>
        <li><strong>Completion:</strong> Pass inspections to receive your final permit approval</li>
      </ol>

      <div class="info-box">
        <strong>💡 Pro Tip:</strong> Save this email! You'll need your Accela Record ID to check status and communicate with the permit department.
      </div>

      <p>Thank you for using AI Permit Tampa! We're here to help if you have any questions.</p>
    </div>

    <div class="footer">
      <p>This is an automated confirmation from AI Permit Tampa.</p>
      <p style="margin-top: 10px;">
        <strong>Support:</strong> support@aipermittampa.com<br>
        <strong>Website:</strong> ${SITE_URL}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Permit Submitted Successfully!

${customerName ? `Hi ${customerName},` : 'Hello,'}

Congratulations! Your HVAC permit application has been successfully submitted to Tampa's Accela system.

Your Accela Record ID: ${accelaRecordId}
${accelaUrl ? `View in Portal: ${accelaUrl}` : ''}

Reference Information:
Submission ID: ${submissionId}
Submitted: ${new Date().toLocaleString()}

What Happens Next?
1. Processing: Tampa's permit department will review your application (typically 3-5 business days)
2. Payment: You'll receive instructions for permit fee payment directly from the county
3. Inspection: Once approved and fees are paid, schedule your required inspections
4. Completion: Pass inspections to receive your final permit approval

Pro Tip: Save this email! You'll need your Accela Record ID to check status and communicate with the permit department.

Thank you for using AI Permit Tampa!

---
Support: support@aipermittampa.com
Website: ${SITE_URL}
  `;

  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not set - skipping email send (dev mode)');
      logger.info('Submission confirmation email (not sent):', {
        to,
        accelaRecordId,
        submissionId,
      });
      return true; // Don't fail in dev mode
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `✅ Permit Submitted - Record ID: ${accelaRecordId}`,
      html: htmlContent,
      text: textContent,
    });

    logger.info('Submission confirmation email sent successfully', {
      to,
      submissionId,
      accelaRecordId,
      emailId: result.data?.id,
    });

    return true;
  } catch (error: any) {
    logger.error('Failed to send submission confirmation email', {
      error: error.message,
      to,
      submissionId,
      accelaRecordId,
    });
    return false;
  }
}
