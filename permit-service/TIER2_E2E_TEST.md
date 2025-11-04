# Tier 2 End-to-End Testing Guide

## Prerequisites
- Backend running on http://localhost:3010
- Frontend running on http://localhost:3000
- RESEND_API_KEY set in .env (or check logs for email simulation)
- Valid Stripe test keys configured

## Test Scenarios

### 1. Happy Path - Full Tier 2 Flow

**Step 1: Start New Session**
1. Navigate to http://localhost:3000
2. Click "Get Started" or "Start New Application"
3. Verify chat interface loads

**Step 2: Fill Out Permit Information**
Provide the following test data through the chat:
```
Address: 2605 W Crest Ave, Tampa, FL 33614
System Type: Central AC replacement
Existing System: 15 years old, 3-ton
New System: 4-ton, 16 SEER Carrier system
Contractor: ABC HVAC Services
License: CFC1234567
Phone: (813) 555-1234
Email: contractor@test.com
Homeowner: John Smith
```

**Step 3: Select Tier 2**
1. After chat extracts all data, pricing page should appear
2. Click "Tier 2 - Full Service ($150)"
3. Verify Stripe payment modal opens

**Step 4: Complete Payment**
Use Stripe test card:
- Card: 4242 4242 4242 4242
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 33614)

**Step 5: Verify Package Generation**
1. After successful payment, should redirect to success page
2. Should see "Generating Your Permit Package..." loading state
3. After generation completes, verify:
   - ✅ Success message displayed
   - ✅ "What Happens Next?" section explains Tier 2 process
   - ✅ Preview link mentioned (if applicable)

**Step 6: Check Backend Logs**
Look for these log entries:
```
✅ PDF package generated successfully
✅ Approval token created for Tier 2
✅ Preview link email queued
```

**Step 7: Check Email (if RESEND_API_KEY set)**
1. Check contractor@test.com inbox
2. Verify email received: "📋 Review Your HVAC Permit Package - Action Required"
3. Verify email contains:
   - Preview link with token
   - Expiration time (24 hours)
   - Clear instructions

**Alternative - Check Logs (if no RESEND_API_KEY)**
Look for log entry:
```
RESEND_API_KEY not set - skipping email send (dev mode)
Preview link email (not sent): { to: 'contractor@test.com', previewUrl: '...', ... }
```

**Step 8: Open Preview Page**
1. Click preview link from email OR
2. Copy preview URL from logs: `http://localhost:3010/preview/{token}`
3. Verify preview page shows:
   - ✅ Submission ID and creation date
   - ✅ Warning about reviewing carefully
   - ✅ List of all PDFs with download links
   - ✅ "Approve & Submit to Accela" button

**Step 9: Download and Verify PDFs**
1. Click each "📄 Download PDF" link
2. Open PDFs and verify:
   - FEMA 301 form filled with correct data
   - FEMA 301A form (if applicable)
   - All fields populated correctly
   - Tampa/Hillsborough branding present

**Step 10: Approve and Submit**
1. Click "Approve & Submit to Accela" button
2. Verify loading state appears: "⏳ Submitting to Accela..."
3. After submission:
   - ✅ Success alert: "✓ Successfully submitted to Accela!"
   - ✅ Alert shows Accela Record ID
   - ✅ Page reloads

**Step 11: Verify Already Submitted State**
1. Refresh the preview page
2. Should see "✓ Already Submitted" page with:
   - Accela Record ID
   - Submission timestamp
   - Link to Accela Portal (if available)

**Step 12: Check Submission Confirmation Email**
1. Check contractor@test.com inbox again
2. Verify email received: "✅ Permit Submitted - Record ID: {recordId}"
3. Verify email contains:
   - Accela Record ID
   - "What Happens Next?" steps
   - Link to Accela portal (if available)
   - Submission timestamp

**Step 13: Verify Database State**
Check the SQLite database:
```bash
cd permit-service
sqlite3 data/permit-service.db
```

Run queries:
```sql
-- Check submission status
SELECT id, tier, status, accela_record_id, submitted_at
FROM submissions
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- tier: "tier2"
-- status: "submitted"
-- accela_record_id: "MOCK-..." or real ID
-- submitted_at: timestamp
```

---

### 2. Error Scenarios

#### Test 2.1: Expired Approval Token
1. Complete steps 1-7 from Happy Path
2. Manually set approval_expires_at to past date in database
3. Try to open preview link
4. Should see: "Approval Token Expired" error page

#### Test 2.2: Invalid Approval Token
1. Navigate to: `http://localhost:3010/preview/invalid-token-12345`
2. Should see: "Invalid or Expired Token" error page

#### Test 2.3: Missing Required Data
1. Start new session
2. Provide incomplete data (missing email or contractor info)
3. Try to proceed to payment
4. Should see validation errors

#### Test 2.4: Already Submitted
1. Use a previously submitted approval token
2. Try to submit again
3. Should see "already submitted" response with existing Accela Record ID

---

### 3. Email Notification Tests

#### Test 3.1: Preview Link Email Content
Verify email template includes:
- ✅ Professional HTML formatting
- ✅ Personalized greeting (contractor name if available)
- ✅ Submission ID
- ✅ Expiration deadline
- ✅ Clear call-to-action button
- ✅ Step-by-step instructions
- ✅ Warning about 24-hour expiration
- ✅ Plain text fallback

#### Test 3.2: Confirmation Email Content
Verify email template includes:
- ✅ Success badge and emoji
- ✅ Prominent Accela Record ID
- ✅ Link to Accela portal
- ✅ "What Happens Next?" timeline
- ✅ Pro tip about saving the email
- ✅ Support contact info

---

### 4. Security Tests

#### Test 4.1: CORS Protection
```bash
curl -X POST http://localhost:3010/api/v1/chat/message \
  -H "Origin: http://evil-site.com" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","message":"test"}'
```
Should be blocked by CORS (unless origin is in whitelist)

#### Test 4.2: Error Message Sanitization
1. Set NODE_ENV=production in backend .env
2. Restart backend server
3. Trigger an error (e.g., invalid session ID)
4. Verify error message is generic: "An error occurred while processing your request"
5. Check logs to confirm detailed error is logged but not exposed to client

#### Test 4.3: Encryption Key Validation
1. Remove ACCELA_ENCRYPTION_KEY from .env
2. Set NODE_ENV=production
3. Restart backend
4. Should throw error on startup: "ACCELA_ENCRYPTION_KEY must be set in production"

---

### 5. Integration Tests

#### Test 5.1: Accela Mock Mode
1. Verify .env has `ACCELA_MOCK_MODE=true`
2. Submit a Tier 2 application
3. Check backend logs:
```
✅ Should see: "Accela submission successful"
✅ Should see: "mockMode: true"
✅ Record ID should start with "MOCK-"
```

#### Test 5.2: Accela Real Mode (if credentials available)
1. Set `ACCELA_MOCK_MODE=false`
2. Add real Accela credentials to .env
3. Submit a Tier 2 application
4. Verify real record created in Accela system

---

### 6. Performance Tests

#### Test 6.1: PDF Generation Speed
1. Time the PDF generation step
2. Should complete in < 5 seconds for typical permit

#### Test 6.2: Email Delivery Speed
1. With real RESEND_API_KEY configured
2. Check email delivery time
3. Should receive within 1-2 minutes

---

## Expected Results Summary

### ✅ Successful Tier 2 Flow Indicators:
1. Payment completes successfully
2. PDF package generated with all forms
3. Preview link email sent (or logged)
4. Preview page displays all documents
5. Approval button works
6. Accela submission completes
7. Confirmation email sent (or logged)
8. Database shows status="submitted"
9. Database shows accela_record_id populated
10. Subsequent preview page visits show "already submitted" state

### ❌ Common Issues & Fixes:

**Issue: "Missing API key" error for Resend**
- Fix: Set RESEND_API_KEY in .env or accept dev mode (logs only)

**Issue: Stripe payment fails**
- Fix: Verify Stripe test keys in .env, use test card 4242...

**Issue: PDF download fails**
- Fix: Check browser console for errors, verify base64 encoding

**Issue: Accela submission times out**
- Fix: Check Accela credentials, network connectivity, or use mock mode

**Issue: Preview link shows "Invalid Token"**
- Fix: Verify token in database, check expiration time

---

## Manual Test Checklist

- [ ] Happy path complete end-to-end
- [ ] Expired token error page
- [ ] Invalid token error page
- [ ] Missing data validation
- [ ] Already submitted state
- [ ] Preview email template (dev logs or real email)
- [ ] Confirmation email template (dev logs or real email)
- [ ] PDF downloads work
- [ ] PDF content is correct
- [ ] Database state updated correctly
- [ ] CORS protection works
- [ ] Error messages sanitized in production
- [ ] Encryption key validation works
- [ ] Accela mock mode works
- [ ] Performance acceptable

---

## Automated Test Script

Create `test-e2e-tier2.js` for automated testing:

```javascript
// TODO: Implement automated E2E test using Playwright or Puppeteer
// This would simulate user interaction through the full flow
```

---

## Monitoring in Production

### Key Metrics to Track:
1. Tier 2 payment completion rate
2. PDF generation success rate
3. Email delivery rate
4. Accela submission success rate
5. Average time from payment to Accela submission
6. Number of expired approval tokens (indicates user friction)

### Alerts to Set Up:
- Email delivery failures > 5% of attempts
- Accela submission failures > 10% of attempts
- PDF generation errors
- Payment processing errors
