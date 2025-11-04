# AI-Powered Permit Platform - Development Roadmap

## Session Summary - What We Built

### ✅ Completed (Session 1)

1. **Strategic Planning**
   - Decided on contractor-first approach (web app + Stripe)
   - x402 payment for AI agents coming in Phase 2
   - Deployment: Vercel (frontend) + Railway (backend)

2. **Database Schema** (`src/db/database.ts`)
   - SQLite with better-sqlite3
   - Tables: `chat_sessions`, `submissions`, `users`
   - Session management with conversation history
   - Submission tracking with status workflow

3. **Conversational AI Service** (`src/services/conversationalAgent.ts`)
   - Claude 3.5 Sonnet integration
   - Natural language permit info extraction
   - Handles bulk info dumps OR guided conversations
   - Smart county/flood zone detection
   - Data validation and completeness checking

4. **Chat API Endpoints** (`src/server.ts`)
   - `POST /api/v1/chat/message` - Conversational interface
   - `GET /api/v1/chat/session/:sessionId` - Session retrieval
   - Real-time data extraction and tracking

### 🧪 To Test Current Work

Start the server:
```bash
cd permit-service
npm run build
npm start
```

Test the conversational AI:
```bash
# First message - creates new session
curl -X POST http://localhost:3010/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a permit for 123 Main Street Tampa FL 33602, replacing a 3-ton AC with a 3.5-ton Carrier unit"
  }'

# Follow-up message - use sessionId from response
curl -X POST http://localhost:3010/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID_HERE",
    "message": "The contractor is Cool Air HVAC, license CAC123456"
  }'
```

---

## Next 6 Steps to MVP

### Step 1: County Branding System (2-3 hours)

**Goal:** Add Tampa/Hillsborough County branding to generated forms

**Files to Create:**
- `src/config/counties/tampa.ts` - Tampa county configuration
- `src/services/countyBranding.ts` - Branding service

**Implementation:**
```typescript
// src/config/counties/tampa.ts
export const tampaConfig = {
  name: 'City of Tampa',
  county: 'Hillsborough',
  agency: 'tampa',
  logo: '/assets/tampa-logo.png', // Optional
  header: 'CITY OF TAMPA\nDEPARTMENT OF CONSTRUCTION SERVICES',
  contact: {
    address: '306 East Jackson Street, Tampa, FL 33602',
    phone: '(813) 274-8211',
    website: 'tampa.gov/construction-services',
  },
  accela: {
    recordType: 'Building/Mechanical/HVAC/Residential',
    environment: process.env.ACCELA_ENVIRONMENT || 'TEST',
  },
};

// src/services/countyBranding.ts
export function applyCountyBranding(
  doc: PDFDocument,
  county: string
): void {
  const config = getCountyConfig(county);

  // Add header
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .text(config.header, { align: 'center' });

  // Add footer with contact info
  doc.fontSize(8)
     .text(config.contact.address, 50, doc.page.height - 50);
}
```

**Update:**
- Enhance `src/services/standardForms.ts` to use county branding
- Add Tampa header/footer to all generated forms

---

### Step 2: FEMA Elevation Certificate (3-4 hours)

**Goal:** Download official FEMA form and fill it programmatically

**Files to Create:**
- `src/assets/fema-elevation-cert.pdf` - Downloaded FEMA form
- `src/services/femaFormFiller.ts` - Form filling service

**Steps:**

1. **Download FEMA Form:**
```bash
cd permit-service
mkdir -p src/assets
curl -o src/assets/fema-elevation-cert.pdf \
  https://www.fema.gov/sites/default/files/documents/fema_form-ff-206-fy-22-152.pdf
```

2. **Inspect Form Fields:**
Create a utility script to see what fields exist in the PDF:
```typescript
// scripts/inspect-fema-form.ts
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';

const pdfBytes = fs.readFileSync('src/assets/fema-elevation-cert.pdf');
const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();
const fields = form.getFields();

fields.forEach(field => {
  console.log(`${field.getName()}: ${field.constructor.name}`);
});
```

3. **Implement Form Filler:**
```typescript
// src/services/femaFormFiller.ts
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export async function fillFemaElevationCert(data: {
  propertyAddress: string;
  city: string;
  county: string;
  zipCode: string;
  ownerName: string;
  squareFootage: number;
  yearBuilt: number;
}): Promise<Buffer> {
  const templatePath = path.join(__dirname, '../assets/fema-elevation-cert.pdf');
  const templateBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // Fill fields we have data for
  form.getTextField('A1_PropertyAddress').setText(data.propertyAddress);
  form.getTextField('A2_City').setText(data.city);
  form.getTextField('A3_State').setText('FL');
  form.getTextField('A4_ZipCode').setText(data.zipCode);
  form.getTextField('A5_County').setText(data.county);

  // Leave elevation fields blank for surveyor
  // form.getTextField('C2a_TopBottomFloor').setText('');

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
```

4. **Integration:**
Update `src/services/documentPackage.ts` to include FEMA form for flood zones:
```typescript
// Check if property is in flood zone
if (['A', 'AE', 'V', 'VE'].includes(locationAnalysis.floodZone)) {
  const femaPdf = await fillFemaElevationCert({
    propertyAddress: request.permitInfo.location.address,
    city: request.permitInfo.location.city,
    county: request.permitInfo.location.county,
    zipCode: request.permitInfo.location.zipCode,
    ownerName: request.property.ownerName,
    squareFootage: request.property.squareFootage,
    yearBuilt: request.property.yearBuilt,
  });

  additionalDocs.push({
    name: 'FEMA Elevation Certificate',
    description: 'Official FEMA form for flood zone properties',
    pdf: femaPdf.toString('base64'),
  });
}
```

---

### Step 3: Stripe Payment Integration (4-5 hours)

**Goal:** Add Stripe payments for Tier 1 ($30) and Tier 2 ($150)

**Setup:**
1. Create Stripe account at stripe.com
2. Get API keys (test mode)
3. Add to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Files to Create:**
- `src/services/stripePayment.ts` - Payment service
- Add webhook endpoint to `src/server.ts`

**Implementation:**
```typescript
// src/services/stripePayment.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export async function createPaymentIntent(
  amountCents: number,
  tier: 'tier1' | 'tier2',
  metadata: {
    sessionId: string;
    userId?: string;
  }
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    metadata: {
      tier,
      sessionId: metadata.sessionId,
      userId: metadata.userId || 'guest',
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

export async function verifyWebhookSignature(
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );
}
```

**API Endpoints:**
```typescript
// POST /api/v1/create-payment
app.post('/api/v1/create-payment', async (req, res) => {
  const { sessionId, tier } = req.body;

  const amount = tier === 'tier1' ? 3000 : 15000; // $30 or $150

  const payment = await createPaymentIntent(amount, tier, { sessionId });

  res.json({
    clientSecret: payment.clientSecret,
    amount,
  });
});

// POST /api/v1/webhooks/stripe
app.post('/api/v1/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = await verifyWebhookSignature(req.body, sig);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { sessionId, tier } = paymentIntent.metadata;

      // Generate permit package here
      // await generatePackage(sessionId, tier);
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

---

### Step 4: Package Generation with Approval Token (3-4 hours)

**Goal:** Generate PDF package and create approval workflow for Tier 2

**Files to Update:**
- `src/server.ts` - Add package generation endpoint

**Implementation:**
```typescript
// POST /api/v1/generate-package
app.post('/api/v1/generate-package', async (req, res) => {
  const { sessionId, tier } = req.body;

  // Get session data
  const session = chatSessions.get(sessionId);
  if (!session || !session.extracted_data) {
    return res.status(400).json({ error: 'Incomplete session data' });
  }

  // Create submission record
  const submissionId = uuidv4();
  submissions.create({
    id: submissionId,
    userId: session.user_id,
    sessionId,
    tier,
    amountCents: tier === 'tier1' ? 3000 : 15000,
    permitData: session.extracted_data,
  });

  // Generate PDF package
  const result = await formGeneratorService.generateForm(
    session.extracted_data
  );

  // Save PDFs to submission
  const pdfPackage = {
    mainForm: result.form,
    additionalDocs: result.additionalDocuments,
  };
  submissions.setPdfPackage(submissionId, pdfPackage);

  if (tier === 'tier2') {
    // Create approval token
    const approvalToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    submissions.setApprovalToken(submissionId, approvalToken, expiresAt);

    res.json({
      submissionId,
      tier,
      approvalToken,
      expiresAt,
      previewUrl: `/preview/${approvalToken}`,
      pdfPackage,
    });
  } else {
    // Tier 1: Just return PDFs
    res.json({
      submissionId,
      tier,
      pdfPackage,
    });
  }
});

// GET /preview/:token - HTML preview page for Tier 2
app.get('/preview/:token', (req, res) => {
  const submission = submissions.getByToken(req.params.token);

  if (!submission) {
    return res.status(404).send('Invalid or expired token');
  }

  // Render HTML page with PDFs and approval button
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Review Your Permit Package</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
          .pdf-list { margin: 20px 0; }
          .pdf-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
          button { background: #0070f3; color: white; padding: 15px 30px; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Review Your Permit Package</h1>
        <div class="pdf-list">
          ${submission.pdf_package.additionalDocs.map(doc => `
            <div class="pdf-item">
              <h3>${doc.name}</h3>
              <p>${doc.description}</p>
              <a href="data:application/pdf;base64,${doc.pdf}" download="${doc.name}.pdf">Download</a>
            </div>
          `).join('')}
        </div>
        <button onclick="approveAndSubmit()">Approve & Submit to Accela</button>
        <script>
          async function approveAndSubmit() {
            const res = await fetch('/api/v1/submit-to-accela', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                approvalToken: '${req.params.token}',
                confirmed: true
              })
            });
            const data = await res.json();
            alert('Submitted! Accela Record ID: ' + data.accelaRecordId);
          }
        </script>
      </body>
    </html>
  `);
});
```

---

### Step 5: Accela Submission Service (4-5 hours)

**Goal:** Automatically submit permits to Tampa's Accela portal (Tier 2)

**Files to Create:**
- `src/integrations/accelaSubmitter.ts` - Submission service
- `src/config/counties/tampa.ts` - Field mapping configuration

**Implementation:**
```typescript
// src/integrations/accelaSubmitter.ts
import { AccelaClient } from './accela-client.js';
import { FormGeneratorRequest } from '../utils/validation.js';
import { tampaConfig } from '../config/counties/tampa.js';

export class AccelaSubmitter {
  private client: AccelaClient;

  constructor() {
    this.client = new AccelaClient();
  }

  async submitToTampa(permitData: FormGeneratorRequest, pdfs: any[]) {
    // Create record
    const recordData = {
      type: tampaConfig.accela.recordType,
      description: `HVAC ${permitData.permitInfo.jobType} - ${permitData.permitInfo.equipmentType}`,

      // Map property address
      addresses: [{
        streetStart: permitData.permitInfo.location.address,
        city: permitData.permitInfo.location.city,
        state: 'FL',
        zip: permitData.permitInfo.location.zipCode,
      }],

      // Map contractor info
      contacts: [{
        type: 'Contractor',
        firstName: permitData.contractor.name.split(' ')[0],
        lastName: permitData.contractor.name.split(' ').slice(1).join(' '),
        phone1: permitData.contractor.phone,
        email: permitData.contractor.email,
      }],

      // Map owner info
      owners: [{
        firstName: permitData.property.ownerName.split(' ')[0],
        lastName: permitData.property.ownerName.split(' ').slice(1).join(' '),
        phone: permitData.property.ownerPhone,
      }],
    };

    // Create record via Accela API
    const response = await this.client.post('/v4/records', recordData);
    const recordId = response.result.id;

    // Upload PDFs as documents
    for (const pdf of pdfs) {
      const pdfBuffer = Buffer.from(pdf.pdf, 'base64');
      await this.client.uploadDocument(recordId, pdf.name, pdfBuffer);
    }

    // Set custom form data
    await this.client.put(`/v4/records/${recordId}/customForms`, {
      equipmentType: permitData.permitInfo.equipmentType,
      tonnage: permitData.permitInfo.tonnage,
      manufacturer: permitData.equipmentDetails.manufacturer,
      model: permitData.equipmentDetails.model,
      estimatedCost: permitData.installation.estimatedCost,
    });

    return {
      recordId,
      url: `https://aca-prod.accela.com/tampa/Cap/CapDetail.aspx?Module=Permits&capID=${recordId}`,
    };
  }
}
```

**API Endpoint:**
```typescript
// POST /api/v1/submit-to-accela
app.post('/api/v1/submit-to-accela', async (req, res) => {
  const { approvalToken, confirmed } = req.body;

  if (!confirmed) {
    return res.status(400).json({ error: 'Confirmation required' });
  }

  const submission = submissions.getByToken(approvalToken);

  if (!submission) {
    return res.status(404).json({ error: 'Invalid token' });
  }

  try {
    const submitter = new AccelaSubmitter();
    const result = await submitter.submitToTampa(
      submission.permit_data,
      submission.pdf_package.additionalDocs
    );

    // Update submission with Accela info
    submissions.setAccelaSubmission(
      submission.id,
      result.recordId,
      result.url
    );

    res.json({
      success: true,
      accelaRecordId: result.recordId,
      accelaUrl: result.url,
      pdfPackage: submission.pdf_package, // Return PDFs for contractor's records
    });
  } catch (error) {
    logger.error('Accela submission failed:', error);
    res.status(500).json({
      error: 'Submission failed',
      details: error.message,
      pdfPackage: submission.pdf_package, // Still give them the PDFs
    });
  }
});
```

---

### Step 6: Basic Web UI (6-8 hours)

**Goal:** Create simple Next.js frontend for testing

**Setup:**
```bash
cd permit-service/..
npx create-next-app@latest web --typescript --tailwind --app
cd web
npm install axios zustand
```

**Key Pages:**
1. `app/page.tsx` - Landing page
2. `app/chat/page.tsx` - Chat interface
3. `app/preview/[token]/page.tsx` - Approval page

**Simple Chat Component:**
```typescript
// app/chat/page.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [extractedData, setExtractedData] = useState(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: input }]);

    const response = await axios.post(`${API_URL}/api/v1/chat/message`, {
      sessionId,
      message: input,
    });

    // Update session
    if (!sessionId) setSessionId(response.data.sessionId);

    // Add AI response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.data.aiResponse
    }]);

    // Update extracted data
    setExtractedData(response.data.extractedData);

    setInput('');
  };

  return (
    <div className="flex h-screen">
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              <div className="inline-block p-3 my-2 rounded-lg bg-gray-100">
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Tell me about your permit..."
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Data summary sidebar */}
      <div className="w-80 border-l p-4 bg-gray-50">
        <h2 className="font-bold mb-4">Extracted Data</h2>
        {extractedData && (
          <pre className="text-xs overflow-auto">
            {JSON.stringify(extractedData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
```

---

## Testing Checklist

After completing all steps:

- [ ] Conversational AI extracts all required fields
- [ ] County branding appears on forms
- [ ] FEMA form included for flood zones
- [ ] Stripe payment flow works (test mode)
- [ ] PDF package generated correctly
- [ ] Tier 2 approval workflow functional
- [ ] Accela submission succeeds (TEST environment)
- [ ] Web UI chat works end-to-end

---

## Deployment (When Ready)

### Backend (Railway)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Frontend (Vercel)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd web
vercel
```

---

## Environment Variables Needed

```env
# Backend (.env)
PORT=3010
NODE_ENV=production
DATABASE_PATH=./data/permit-app.db

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Accela
ACCELA_API_URL=https://apis.accela.com
ACCELA_AGENCY=tampa
ACCELA_ENVIRONMENT=PROD
ACCELA_CLIENT_ID=...
ACCELA_CLIENT_SECRET=...
ACCELA_SCOPE=records addresses documents customforms

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Success Metrics

**MVP Complete When:**
- Contractor can chat with AI to gather permit info
- Full permit package generated (PDF + FEMA form)
- Stripe payment processed
- Auto-submit to Tampa Accela working
- Web UI functional for end-to-end flow

**Revenue Target:**
- 10 permits/month = $500-$1,500/month
- 50 permits/month = $2,500-$7,500/month
- 100 permits/month = $5,000-$15,000/month

---

## Notes for Next Session

- All core AI infrastructure is DONE and working
- Focus on user-facing features (payments, forms, UI)
- Test thoroughly in Accela TEST environment before PROD
- Keep x402 for Phase 2 (AI agents market)

**Priority Order:**
1. Step 3 (Stripe) - Gets revenue flowing
2. Step 4 (Package Gen) - Completes Tier 1
3. Step 5 (Accela) - Completes Tier 2
4. Steps 1, 2, 6 - Polish and UI

Good luck! 🚀
