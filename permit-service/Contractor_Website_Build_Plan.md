# Contractor Website Build Plan
## Simple, Practical UI for Permit Service

**Timeline:** 3-4 days  
**Priority:** Desktop-optimized, mobile-responsive  
**Style:** Clean and professional (not flashy)

---

## 🎯 WHAT WE'RE BUILDING

A contractor-friendly website that:
- Explains what the service does (landing page)
- Guides them through a conversational permit process
- Shows real-time data extraction in sidebar
- Handles Tier 1 ($30) and Tier 2 ($150) + permit fees
- Generates downloadable PDFs
- Works great on desktop, good on mobile

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Axios (API calls)
- React PDF Viewer (for previewing forms)

**Backend:** Already built (from ROADMAP.md)
- `POST /api/v1/chat/message` - Conversational interface
- `GET /api/v1/chat/session/:sessionId` - Session retrieval

---

## 📐 SITE STRUCTURE

```
/                           Landing page
/chat                       Main chat interface (core feature)
/chat/[sessionId]           Resume existing session
/preview/[token]            Review & approve package (Tier 2)
/pricing                    Pricing breakdown
/how-it-works              Step-by-step explainer
/about                     About the service
```

---

## 🏗️ PAGE-BY-PAGE BREAKDOWN

### Page 1: Landing Page (`/`)

**Goal:** Explain value, build trust, get them to start

**Hero Section:**
```
[Hero Image: Contractor with tablet at job site]

Stop Spending 30+ Minutes on Permit Paperwork
AI-powered permit forms for HVAC contractors in Tampa Bay

[Start Permit Application] [See How It Works]

Trusted by [Your Boss's Company] and contractors across Tampa
```

**3-Step Process:**
```
1. Tell Us About Your Job          2. We Generate Your Forms          3. Download or Auto-Submit
   Chat with our AI or              Complete permit applications       Get PDFs instantly or we
   enter project details            with all required documents        submit directly to county
   [5 minutes]                      [30 seconds]                       [Your choice]
```

**Pricing Preview:**
```
Two Service Tiers:

Tier 1: DIY Submission - $30 + permit fees
✓ Complete permit application forms (PDF)
✓ All required documents checklist
✓ Ready to submit yourself
Perfect for: Contractors who know the process

Tier 2: Full Service - $150 + permit fees  
✓ Everything in Tier 1
✓ We submit to county for you
✓ Track application status
✓ 24-hour approval preview
Perfect for: Busy contractors who want it handled

[Get Started]
```

**Trust Signals:**
```
✓ Licensed contractors only
✓ County-verified forms
✓ Accela-integrated system
✓ Hillsborough, Pinellas, Pasco counties

"Cuts my permitting time from 45 minutes to 5 minutes. Game changer."
- [Your Boss's Name], [Company Name]
```

**Footer:**
- Links to How It Works, Pricing, About, Contact
- Disclaimer about accuracy
- Privacy policy

---

### Page 2: Chat Interface (`/chat`)

**The Main Event - Where Contractors Spend Their Time**

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Permit Application         Session: #ABC123   [?]  │
├─────────────────────────────────────┬───────────────────────┤
│                                     │                       │
│  Chat Area (60% width)             │  Data Sidebar (40%)   │
│                                     │                       │
│  AI: Hi! I'll help you get your    │  📋 Project Info      │
│  permit application ready. Let's    │  ┌─────────────────┐ │
│  start with the property address    │  │ ✓ Location      │ │
│  where the work will be done.       │  │ ⏳ Equipment    │ │
│                                     │  │ ⏳ Contractor   │ │
│  You: 123 Main St Tampa FL         │  │ ⏳ Property     │ │
│                                     │  └─────────────────┘ │
│  AI: Got it! Now tell me about     │                       │
│  the HVAC equipment...              │  📍 Address:          │
│                                     │  123 Main St          │
│  [Message input field............] │  Tampa, FL 33602      │
│  [Send]                             │                       │
│                                     │  💰 Estimated:        │
│                                     │  Calculating...       │
│                                     │                       │
└─────────────────────────────────────┴───────────────────────┘
```

**Chat Area Features:**
- Clean message bubbles (AI on left, user on right)
- Typing indicator when AI is thinking
- Auto-scroll to latest message
- Message timestamps (subtle)
- Option to upload documents (photos of equipment, etc.)

**Data Sidebar Features:**

**Section 1: Progress Tracker**
```
📋 Project Information

✓ Location (Complete)
  123 Main St, Tampa, FL 33602
  Hillsborough County
  [Edit]

⏳ Equipment Details (In Progress)
  Type: Air Conditioner
  Tonnage: 5-ton
  [Complete this section]

⏳ Contractor Info (Pending)
⏳ Property Details (Pending)
⏳ Installation Info (Pending)
```

**Section 2: Live Cost Estimate**
```
💰 Cost Breakdown

Service Fee:
  Tier 1 (DIY Submit): $30
  Tier 2 (Full Service): $150
  [Select tier when ready]

Permit Fees: Calculating...
  (Will update as we gather info)

Total: TBD

[?] How are fees calculated?
```

**Section 3: Required Documents**
```
📄 Documents Needed

Based on your project:
□ Load calculation worksheet
□ Equipment specifications
□ Site plan
□ Contractor license

[Upload documents] (optional)
```

**Mobile Layout:**
- Stack chat on top, collapsible sidebar below
- Floating progress indicator (3 of 5 complete)
- "View Details" button to expand sidebar

---

### Page 3: Review & Generate (`/chat/[sessionId]/review`)

**After conversation is complete:**

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Review Your Permit Application                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ All Required Information Collected                        │
│                                                               │
│  📋 Project Summary                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Location: 123 Main St, Tampa, FL 33602                │  │
│  │ Equipment: 5-ton AC replacement, Carrier 24ACC660     │  │
│  │ Contractor: Cool Air HVAC (CAC123456)                 │  │
│  │ Owner: John Smith                                      │  │
│  │ Property: 2,400 sq ft, built 2005                     │  │
│  │ Cost: $8,500                                           │  │
│  │                                           [Edit Info]  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  📄 Documents We'll Generate                                 │
│  • Hillsborough County HVAC Permit Application              │
│  • Equipment Specifications Sheet                            │
│  • Load Calculation Worksheet                                │
│  • Site Plan (if in flood zone: FEMA Elevation Certificate) │
│                                                               │
│  💰 Final Cost                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Choose Your Service Level:                             │  │
│  │                                                         │  │
│  │ ○ Tier 1 - DIY Submission ........... $30.00          │  │
│  │   Service fee                          $30.00          │  │
│  │   Hillsborough permit fees           $425.00          │  │
│  │   Total                              $455.00          │  │
│  │   [Get PDFs]                                           │  │
│  │                                                         │  │
│  │ ○ Tier 2 - Full Service .......... $150.00            │  │
│  │   Service fee                         $150.00          │  │
│  │   Hillsborough permit fees           $425.00          │  │
│  │   Total                              $575.00          │  │
│  │   [Generate & Submit]                                  │  │
│  │                                                         │  │
│  │   We'll submit to county within 24 hours after you    │  │
│  │   approve the forms. You'll get a preview link first. │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [← Back to Edit] [Continue to Payment →]                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Clear summary of all collected data
- Edit button to go back and fix anything
- Side-by-side tier comparison
- Transparent cost breakdown (service + permit fees)
- Clear next steps for each tier

---

### Page 4: Payment (Flexible Design)

**Since you haven't decided on payment flow yet, here are 3 options built into the design:**

#### Option A: Pay-Per-Use (Stripe Checkout)
```
[Generate Forms Now - $455.00]
↓
Stripe Checkout Page
↓
Download PDFs
```

#### Option B: Credits System
```
Buy Credits First:
- 5 permits = $140 ($28 each, save $10)
- 10 permits = $250 ($25 each, save $50)
- 20 permits = $450 ($22.50 each, save $150)

Then use credits when generating
```

#### Option C: Subscription + Pay-Per-Use Hybrid
```
Free Tier: $0/month
- Pay $30 per Tier 1 permit
- Pay $150 per Tier 2 permit

Pro Tier: $49/month
- Pay $25 per Tier 1 permit (save $5)
- Pay $125 per Tier 2 permit (save $25)
- Unlimited permit lookups
```

**Recommendation:** Start with **Option A** (simplest). Add Option B/C later based on usage patterns.

---

### Page 5: Tier 2 Preview (`/preview/[token]`)

**For Tier 2 customers only - 24 hour approval window**

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Review Your Permit Package                                  │
│  Approval required within 24 hours                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📄 Your Documents                                           │
│                                                               │
│  1. HVAC Permit Application (Hillsborough County)            │
│     ┌─────────────────────────────────────────┐             │
│     │ [PDF Preview rendered here]             │             │
│     │                                          │             │
│     │ [View full size] [Download]             │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
│  2. Equipment Specifications                                 │
│     [Preview] [Download]                                     │
│                                                               │
│  3. Load Calculation Worksheet                               │
│     [Preview] [Download]                                     │
│                                                               │
│  ⚠️  Review Carefully                                        │
│  Once you approve, we'll submit these documents to           │
│  Hillsborough County on your behalf. You cannot make         │
│  changes after approval.                                     │
│                                                               │
│  ☐ I have reviewed all documents and confirm accuracy       │
│                                                               │
│  [← Request Changes]  [Approve & Submit to County →]        │
│                                                               │
│  Questions? Call us: (813) XXX-XXXX                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**After Approval:**
```
✓ Approved! Submitting to County...

Your permit application is being submitted to Hillsborough County.

Confirmation #: HC-2024-12345
Submitted: Oct 31, 2024 at 2:45 PM
Expected review: 7-10 business days

We'll email you when:
• County receives the application
• Application is under review
• Permit is approved/rejected

[View Submission Status] [Download PDFs for Your Records]
```

---

## 🎨 DESIGN SYSTEM

### Color Palette (Contractor-Friendly)

**Primary Colors:**
- Navy Blue `#1e3a8a` - Trust, professionalism
- Orange `#ea580c` - Action, construction industry
- Green `#16a34a` - Success, approval states

**Neutral Colors:**
- White `#ffffff` - Main background
- Gray 50 `#f9fafb` - Sidebar background
- Gray 200 `#e5e7eb` - Borders
- Gray 700 `#374151` - Body text
- Gray 900 `#111827` - Headings

**Status Colors:**
- Success: Green `#16a34a`
- Warning: Yellow `#eab308`
- Error: Red `#dc2626`
- Info: Blue `#3b82f6`

### Typography

**Desktop:**
- Headings: 32px / 24px / 20px (bold)
- Body: 16px (regular)
- Small: 14px

**Mobile:**
- Headings: 24px / 20px / 18px
- Body: 16px
- Small: 14px

**Fonts:**
- Primary: Inter (clean, readable)
- Fallback: System fonts

### Components

**Buttons:**
```
Primary:    [Orange background, white text, rounded]
Secondary:  [White background, navy border, navy text]
Disabled:   [Gray background, lighter text]
```

**Cards:**
```
White background
Subtle shadow
Rounded corners (8px)
Padding: 24px
```

**Form Inputs:**
```
Border: Gray 200
Focus: Blue ring
Error: Red border
Height: 44px (easy to tap on mobile)
```

---

## 📱 RESPONSIVE BREAKPOINTS

```css
/* Mobile First Approach */

/* Small phones */
@media (min-width: 320px) { }

/* Phones */
@media (min-width: 640px) { }

/* Tablets */
@media (min-width: 768px) {
  /* Show sidebar side-by-side with chat */
}

/* Desktop (optimize for this) */
@media (min-width: 1024px) {
  /* Full layout: chat 60%, sidebar 40% */
}

/* Large desktop */
@media (min-width: 1280px) { }
```

**Mobile Adjustments:**
- Stack sidebar below chat
- Floating "X of 5 complete" progress badge
- Bottom sheet for cost breakdown
- Larger tap targets (44px minimum)
- Simplified navigation

---

## 🔧 COMPONENT STRUCTURE

### Key Components to Build:

```typescript
components/
├── layout/
│   ├── Header.tsx              // Logo, navigation
│   ├── Footer.tsx              // Links, disclaimer
│   └── MobileNav.tsx           // Hamburger menu
├── chat/
│   ├── ChatContainer.tsx       // Main chat wrapper
│   ├── MessageList.tsx         // All messages
│   ├── Message.tsx             // Single message bubble
│   ├── MessageInput.tsx        // Input field + send
│   └── TypingIndicator.tsx     // "AI is typing..."
├── sidebar/
│   ├── DataSidebar.tsx         // Main sidebar wrapper
│   ├── ProgressTracker.tsx     // Checkmarks progress
│   ├── CostEstimate.tsx        // Live cost breakdown
│   └── DocumentsList.tsx       // Required docs
├── review/
│   ├── SummaryCard.tsx         // Project summary
│   ├── TierSelector.tsx        // Tier 1 vs Tier 2
│   ├── CostBreakdown.tsx       // Final pricing
│   └── PDFPreview.tsx          // Document preview
└── common/
    ├── Button.tsx              // Reusable button
    ├── Card.tsx                // Reusable card
    ├── Input.tsx               // Form input
    ├── Badge.tsx               // Status badges
    └── Modal.tsx               // Modals/dialogs
```

---

## 🔌 API INTEGRATION

### Connecting to Your Backend

**Base URL:** `http://localhost:3010` (dev) → `https://api.yourapp.com` (prod)

**API Calls:**

```typescript
// 1. Start new chat session
POST /api/v1/chat/message
{
  "message": "I need a permit for 123 Main St Tampa"
}
→ Returns: { sessionId, aiResponse, extractedData }

// 2. Continue conversation
POST /api/v1/chat/message
{
  "sessionId": "abc123",
  "message": "5-ton Carrier AC unit"
}
→ Returns: { aiResponse, extractedData, completeness }

// 3. Get session data
GET /api/v1/chat/session/:sessionId
→ Returns: { session, messages, extractedData }

// 4. Generate package (when ready)
POST /api/v1/generate-package
{
  "sessionId": "abc123",
  "tier": "tier1" | "tier2"
}
→ Returns: { submissionId, pdfPackage, approvalToken? }
```

**State Management with Zustand:**

```typescript
// stores/chatStore.ts
interface ChatState {
  sessionId: string | null;
  messages: Message[];
  extractedData: ExtractedData | null;
  isLoading: boolean;
  
  sendMessage: (content: string) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // ... implementation
}));
```

**Real-time Updates:**

```typescript
// Update sidebar as data comes in
useEffect(() => {
  const data = chatStore.extractedData;
  
  // Update progress tracker
  setProgress({
    location: data?.location ? 'complete' : 'pending',
    equipment: data?.equipment ? 'complete' : 'pending',
    contractor: data?.contractor ? 'complete' : 'pending',
  });
  
  // Update cost estimate
  if (data?.location?.county) {
    fetchPermitFees(data.location.county);
  }
}, [chatStore.extractedData]);
```

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### Desktop (Priority):
- Lazy load PDF previews
- Virtualize message list (if >50 messages)
- Debounce typing input (300ms)
- Cache API responses

### Mobile:
- Compress images
- Minimize bundle size
- Use system fonts
- Service worker for offline message retry

### Both:
- Next.js image optimization
- Static generation for landing page
- API route caching where appropriate

---

## 🧪 TESTING STRATEGY

### Manual Testing Checklist:

**Landing Page:**
- [ ] Clear value proposition
- [ ] Call-to-action buttons work
- [ ] Pricing is accurate
- [ ] Mobile layout looks good

**Chat Interface:**
- [ ] Can send messages
- [ ] AI responses appear
- [ ] Sidebar updates in real-time
- [ ] Progress tracker accurate
- [ ] Cost estimate calculates correctly
- [ ] Works on mobile (collapsible sidebar)

**Review Page:**
- [ ] All data displays correctly
- [ ] Edit buttons work
- [ ] Tier selection clear
- [ ] Cost breakdown accurate (service + permit fees)
- [ ] Payment flow works

**Tier 2 Preview:**
- [ ] PDFs render correctly
- [ ] Download buttons work
- [ ] Approval flow functional
- [ ] Token expiration works (24 hours)

### Browser Testing:
- Chrome (primary)
- Safari (important for iOS)
- Firefox (nice to have)
- Mobile Safari (critical)
- Mobile Chrome (critical)

---

## 📅 BUILD TIMELINE

### Day 1: Foundation
**Morning:**
- [ ] Set up Next.js project with TypeScript + Tailwind
- [ ] Configure environment variables
- [ ] Set up basic routing structure
- [ ] Create design system (colors, typography)

**Afternoon:**
- [ ] Build landing page
- [ ] Create header/footer components
- [ ] Add navigation
- [ ] Make it responsive

**Evening:**
- [ ] Test landing page on mobile
- [ ] Deploy to Vercel (so you can share progress)

---

### Day 2: Chat Interface
**Morning:**
- [ ] Create chat page layout
- [ ] Build chat components (MessageList, Message, Input)
- [ ] Set up Zustand store for chat state
- [ ] Connect to backend API

**Afternoon:**
- [ ] Build sidebar components
- [ ] Implement progress tracker
- [ ] Add cost estimate section
- [ ] Wire up real-time data updates

**Evening:**
- [ ] Test full chat flow
- [ ] Fix any API integration issues
- [ ] Test on mobile layout

---

### Day 3: Review & Payment
**Morning:**
- [ ] Build review page
- [ ] Create summary card component
- [ ] Implement tier selector
- [ ] Show cost breakdown

**Afternoon:**
- [ ] Add Stripe integration (or payment placeholder)
- [ ] Build package generation flow
- [ ] Handle success/error states

**Evening:**
- [ ] Test end-to-end flow (chat → review → payment)
- [ ] Fix any bugs
- [ ] Test on mobile

---

### Day 4: Tier 2 & Polish
**Morning:**
- [ ] Build Tier 2 preview page
- [ ] Implement PDF preview
- [ ] Add approval workflow
- [ ] Handle token expiration

**Afternoon:**
- [ ] Polish all pages (design consistency)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Improve mobile experience

**Evening:**
- [ ] Final testing on all pages
- [ ] Test with your boss (get contractor feedback)
- [ ] Deploy to production
- [ ] Update environment variables

---

## 🚀 DEPLOYMENT

### Vercel (Recommended for Next.js)

**Setup:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd web
vercel

# Production deployment
vercel --prod
```

**Environment Variables (Vercel Dashboard):**
```
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Custom Domain:**
- Point DNS to Vercel
- Add domain in Vercel dashboard
- Enable SSL (automatic)

---

## 🔐 SECURITY CONSIDERATIONS

### Frontend Security:
- Never store API keys in frontend code
- Use environment variables for public keys only
- Validate all user inputs client-side (UX)
- Server validates everything (security)
- Use HTTPS only
- Implement CSRF protection for forms

### Session Management:
- Store sessionId in memory (not localStorage)
- OR use httpOnly cookies
- Implement session timeout
- Clear sensitive data on logout

### Payment Security:
- Never handle credit card data directly
- Use Stripe Elements (PCI compliant)
- Validate amounts server-side
- Log all transactions

---

## 📊 ANALYTICS TO ADD (Post-Launch)

Track these contractor behaviors:
- Where do they drop off in the chat?
- How long does average session take?
- Tier 1 vs Tier 2 selection rate
- Mobile vs desktop usage
- Most common permit types
- Bounce rate on landing page

**Tools:**
- Google Analytics 4 (free)
- Vercel Analytics (built-in)
- Hotjar (optional - see where users click)

---

## 🎯 SUCCESS CRITERIA

### MVP Complete When:
- [x] Landing page explains the service clearly
- [x] Chat interface works smoothly
- [x] Sidebar shows real-time progress
- [x] Review page shows accurate costs (service + permit fees)
- [x] Can generate Tier 1 PDFs
- [x] Tier 2 approval workflow works
- [x] Responsive on mobile
- [x] Your boss can use it successfully

### Contractor-Ready When:
- [x] Payment processing works
- [x] PDFs are county-approved
- [x] No critical bugs
- [x] Fast loading times (<3 sec)
- [x] Mobile experience is good
- [x] Clear help/support option

---

## 🤔 DESIGN DECISIONS EXPLAINED

### Why live sidebar over hidden until complete?
**Contractors benefit from seeing progress:**
- Catch mistakes early (wrong address, wrong tonnage)
- Know how much longer it'll take
- See cost estimate update in real-time
- Feel in control of the process

### Why desktop-optimized?
**Contractors use it in office, not job site:**
- More detail, more data
- Easier to review documents
- Better for form review
- Mobile is for quick lookups on-site

### Why Option B landing page?
**Trust is critical for a new service:**
- Need to explain what it does first
- Show pricing transparency upfront
- Prove legitimacy with testimonials
- Can't just drop into a chat (confusing)

---

## 💡 FUTURE ENHANCEMENTS (Post-MVP)

### Phase 1 Improvements:
- Save favorite contractors/properties
- Duplicate past permits
- Email receipt of PDFs
- SMS notifications for Tier 2 status

### Phase 2 Features:
- Multi-county support (Pinellas, Pasco)
- Bulk permit upload (CSV)
- Team accounts (share permits)
- QuickBooks integration

### Phase 3 Advanced:
- Mobile app (React Native)
- Photo upload for equipment specs (OCR)
- Voice input for chat
- Predictive permit cost based on history

---

## 🎤 FINAL NOTES

**Keep It Simple:**
- Don't over-design - contractors want fast and functional
- Clear labels, no jargon
- Big buttons, easy to use
- Show don't tell

**Test with Real Contractors:**
- Your boss is your best validator
- Watch him use it (don't help)
- Fix confusing parts
- Iterate based on his feedback

**Permit Fees Are Critical:**
- Must be accurate (liability if wrong)
- Update regularly (counties change fees)
- Show breakdown clearly
- Your boss should verify fee schedules

**Mobile Matters:**
- Quick lookups happen on-site
- Contractors check status on phone
- Don't neglect mobile testing
- But optimize for desktop first

---

## ✅ CHECKLIST FOR CLAUDE CODE

When you give this to Claude Code:

1. **Start with Day 1 tasks** (foundation + landing page)
2. **Use the exact file structure** provided
3. **Follow the design system** (colors, typography)
4. **Connect to existing backend API** (from ROADMAP.md)
5. **Optimize for desktop first**, ensure mobile works
6. **Show live data in sidebar** (progress + cost)
7. **Test after each major feature**
8. **Get boss feedback** early and often

---

**NOW BUILD A WEBSITE CONTRACTORS WILL ACTUALLY USE!** 🛠️💪

[Give this plan to Claude Code and let it cook]
