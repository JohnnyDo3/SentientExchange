# AI-Permit-Tampa: Complete Build Plan
## Real AI Permitting Service for Tampa Bay Area 🏗️

**Timeline:** 10 Days to Hackathon  
**Goal:** Phase 1+2 Working, Phase 3 if time allows  
**Priority:** Tier 1+2 MUST work perfectly. Tier 3 is bonus.

---

## 🎯 THE VISION

**You're building:** The first AI-powered HVAC permitting service that integrates with Accela to automate permit requirements lookup and application form generation for Tampa Bay contractors.

**What makes this different:**
- Real business, not just a demo
- Solves actual pain point (permitting takes 30+ mins manually)
- Multi-tier service (info → forms → auto-submit)
- Works with actual Accela instances
- Listed on AgentMarket for AI agents to discover
- Pay-per-use via x402 micropayments

**The Opportunity:**
- 50%+ of US cities use Accela
- Tampa Bay has 6+ counties on Accela
- HVAC contractors hate permitting paperwork
- No AI solution exists yet
- Billion-dollar market potential

---

## 📊 SERVICE TIERS (All 3 Phases)

### 🎯 PHASE 1: "Permit Info API" - $5/query
**Status:** MUST HAVE for hackathon  
**Timeline:** Days 1-4  

**What it does:**
- **Input:** Equipment specs (furnace type, BTU, tonnage, location)
- **Process:** AI determines which permits needed for that county
- **Output:** JSON with permit types, fees, timeline, requirements
- **Target:** AI agents, contractor planning tools, research bots

**Implementation Details:**
- Query Accela Civic Platform API
- Use Claude to classify permit requirements
- Return structured JSON response
- Handle Hillsborough County first (Tampa)

**Success Criteria:**
- Can answer "What permits do I need for 5-ton HVAC in Tampa?"
- Returns accurate fees and timeline
- Works via API call
- Can demonstrate live in hackathon

---

### 🎯 PHASE 2: "Permit Form Generator" - $30/permit
**Status:** MUST HAVE for hackathon  
**Timeline:** Days 5-8  

**What it does:**
- **Input:** Equipment specs + contractor info + property details
- **Process:** AI fills out complete permit application forms
- **Output:** PDFs ready to submit (contractor reviews first)
- **Target:** Contractors who want forms done but will submit themselves

**Implementation Details:**
- Use Accela API to get blank form templates
- Use Claude to extract fields and requirements
- Auto-fill forms with provided data
- Generate PDF matching county format exactly
- Include all required attachments checklist

**Success Criteria:**
- Can generate actual Hillsborough County HVAC permit form
- PDF matches county format
- Your boss validates it's submission-ready
- Can demonstrate live form generation

---

### 🎯 PHASE 3: "Full Auto-Submit" - $150/permit
**Status:** STRETCH GOAL - if time allows  
**Timeline:** Days 9-10 (or post-hackathon)  

**What it does:**
- **Input:** Everything from Tier 2 + payment auth
- **Process:** AI submits permit directly to county
- **Output:** Permit application submitted, tracking number returned
- **Target:** Contractors who want completely hands-off service

**Implementation Details:**
- OAuth with Accela Civic Platform
- Automated form submission via API
- Handle payment processing for county fees
- Monitor submission status
- Send notifications on approval/rejection

**Success Criteria:**
- Can submit permit to Accela sandbox
- Receives confirmation number
- Can track status
- (For hackathon: mockup/concept demo is acceptable)

---

## 🗓️ 10-DAY BUILD SCHEDULE

### **Days 1-2: Foundation & Phase 1 Setup**

**Day 1:**
- [ ] Set up project repo with MCP server structure
- [ ] Register Accela developer account
- [ ] Get API credentials and sandbox access
- [ ] Set up authentication (OAuth 2.0)
- [ ] Test basic API connectivity

**Day 2:**
- [ ] Build county configuration system
- [ ] Create Hillsborough County config file
- [ ] Map HVAC permit types to Accela permit codes
- [ ] Get fee schedules from your boss
- [ ] Build permit classifier using Claude

---

### **Days 3-4: Phase 1 Implementation**

**Day 3:**
- [ ] Build Tier 1 API endpoint
- [ ] Implement equipment spec parser
- [ ] Create permit requirement lookup logic
- [ ] Connect to Accela Civic Platform
- [ ] Handle error cases

**Day 4:**
- [ ] Test Tier 1 with real Tampa addresses
- [ ] Validate with your boss's actual projects
- [ ] Fix any incorrect permit classifications
- [ ] Optimize response time (<3 seconds)
- [ ] Document API usage

**🎯 CHECKPOINT:** Tier 1 working perfectly before moving to Phase 2

---

### **Days 5-6: Phase 2 Setup**

**Day 5:**
- [ ] Get blank permit form PDFs from Hillsborough
- [ ] Analyze form structure and fields
- [ ] Build PDF parsing system
- [ ] Create field extraction logic
- [ ] Map input data to form fields

**Day 6:**
- [ ] Build form generation pipeline
- [ ] Implement PDF filling library (pdf-lib or similar)
- [ ] Create data validation rules
- [ ] Build required attachments checklist
- [ ] Test with sample data

---

### **Days 7-8: Phase 2 Implementation**

**Day 7:**
- [ ] Build Tier 2 API endpoint
- [ ] Implement full form filling logic
- [ ] Generate test PDFs
- [ ] Compare with actual permit forms
- [ ] Fix formatting issues

**Day 8:**
- [ ] Test Tier 2 with your boss's real permit data
- [ ] Have boss review generated forms
- [ ] Fix any mistakes or missing fields
- [ ] Validate PDF quality
- [ ] Ensure submission-ready format

**🎯 CHECKPOINT:** Tier 2 generating valid, boss-approved PDFs

---

### **Days 9-10: Phase 3 (Time Permitting) + Polish**

**Day 9 - Phase 3 Attempt:**
- [ ] Research Accela permit submission API
- [ ] Build OAuth flow for auto-submission
- [ ] Create submission endpoint
- [ ] Test in sandbox environment
- [ ] **OR** if Phase 3 not feasible, create mockup/concept

**Day 10 - Final Polish:**
- [ ] Integrate with AgentMarket (MCP server)
- [ ] Set up x402 payment handling
- [ ] Create demo web interface
- [ ] Write API documentation
- [ ] Prepare hackathon presentation
- [ ] Test end-to-end flows
- [ ] Create backup demo if APIs fail

---

## 🛠️ TECHNICAL ARCHITECTURE

### Core Repository Structure:

```
ai-permit-tampa/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── config/
│   │   ├── counties/
│   │   │   ├── hillsborough.ts    # Tampa config
│   │   │   ├── pinellas.ts        # St. Pete (future)
│   │   │   └── pasco.ts           # (future)
│   │   └── accela.ts              # Accela API config
│   ├── services/
│   │   ├── phase1/
│   │   │   ├── permit-classifier.ts
│   │   │   ├── requirements-lookup.ts
│   │   │   └── fee-calculator.ts
│   │   ├── phase2/
│   │   │   ├── form-parser.ts
│   │   │   ├── pdf-generator.ts
│   │   │   └── data-validator.ts
│   │   └── phase3/
│   │       ├── auto-submitter.ts   # (stretch goal)
│   │       └── status-tracker.ts   # (stretch goal)
│   ├── integrations/
│   │   ├── accela-client.ts       # Accela API wrapper
│   │   ├── claude-ai.ts           # Claude API for classification
│   │   └── x402-payment.ts        # Payment handling
│   └── tools/
│       ├── permit-info.ts         # MCP tool: Phase 1
│       ├── generate-form.ts       # MCP tool: Phase 2
│       └── submit-permit.ts       # MCP tool: Phase 3
├── data/
│   ├── templates/
│   │   └── hillsborough-hvac.pdf  # Blank permit forms
│   ├── sample-data/
│   │   └── test-projects.json     # Test cases
│   └── fee-schedules/
│       └── hillsborough-2024.json
├── tests/
│   ├── phase1.test.ts
│   ├── phase2.test.ts
│   └── phase3.test.ts
├── docs/
│   ├── API.md                     # API documentation
│   └── DEMO.md                    # Hackathon demo script
└── package.json
```

### Tech Stack:

**Core:**
- TypeScript + Node.js
- MCP SDK (for AgentMarket integration)
- Express.js (if building demo web interface)

**Phase 1:**
- Accela Civic Platform API
- Anthropic Claude API (permit classification)
- Axios (HTTP requests)

**Phase 2:**
- pdf-lib (PDF generation/manipulation)
- OR puppeteer (if need to render forms)
- OR PDFKit (simpler PDF creation)

**Phase 3 (if time):**
- Accela Construct API (submission)
- OAuth 2.0 implementation

**Payments:**
- x402 protocol integration
- Bitcoin Lightning (if x402 requires)

---

## 🗺️ COUNTY COVERAGE PLAN

### Hackathon Focus: Hillsborough County Only

**Why Hillsborough First:**
- Your boss works primarily here (Tampa)
- Largest market in Tampa Bay
- Can validate everything with real data
- Simplifies demo

**Hillsborough Details:**
- Population: 1.5M+
- Permit system: Accela Civic Platform
- HVAC permit types: Mechanical, Building (sometimes)
- Average fees: $200-500
- Timeline: 7-10 business days

### Post-Hackathon Expansion:

**Phase 1 Counties (Month 1):**
1. Hillsborough (Tampa) ✅ Ready at hackathon
2. Pinellas (St. Pete/Clearwater) - Add Week 1
3. Pasco (north of Tampa) - Add Week 2

**Phase 2 Counties (Months 2-3):**
4. Polk (Lakeland)
5. Hernando (Spring Hill)
6. Manatee (Bradenton)

**Phase 3: Florida-wide** (Months 4-6)
- On-demand county additions
- 2-3 hours per county to configure
- Eventually: all 67 Florida counties

---

## 💰 PRICING & BUSINESS MODEL

### Pricing Tiers:

| Tier | Service | Price | Use Case |
|------|---------|-------|----------|
| **Phase 1** | Permit Info API | **$5** | Quick lookup, planning, AI agents |
| **Phase 2** | Form Generator | **$30** | Ready-to-submit PDFs, save time |
| **Phase 3** | Full Auto-Submit | **$150** | Completely hands-off submission |

### Revenue Projections:

**Hackathon Demo:** $0 (free demos)

**Month 1 (Your Boss Testing):**
- 10 contractors trying it
- ~50 Phase 1 queries = $250
- ~10 Phase 2 forms = $300
- Total: **~$550**

**Month 3 (Tampa Bay Launch):**
- 30 contractors using regularly
- ~200 Phase 1 queries = $1,000
- ~100 Phase 2 forms = $3,000
- ~20 Phase 3 auto-submits = $3,000
- Total: **~$7,000/month**

**Month 6 (Multi-County):**
- 100+ contractors
- 500 Phase 1 = $2,500
- 300 Phase 2 = $9,000
- 100 Phase 3 = $15,000
- Total: **~$26,500/month**

**Year 1 Goal:**
- 200+ contractors across Florida
- $50,000-100,000/month revenue

---

## 🤖 AGENTMARKET INTEGRATION

### How AI Agents Discover Your Service:

**Step 1: Register on AgentMarket**
- List "AI-Permit-Tampa" service
- Provide MCP server endpoint
- Define x402 payment interface

**Step 2: Service Description**
```json
{
  "name": "AI-Permit-Tampa",
  "description": "HVAC permit requirements, forms, and auto-submission for Tampa Bay area",
  "capabilities": [
    "permit-info-lookup",
    "form-generation",
    "auto-submission"
  ],
  "coverage": ["Hillsborough", "Pinellas", "Pasco"],
  "pricing": {
    "info": "$5",
    "form": "$30",
    "submit": "$150"
  }
}
```

**Step 3: MCP Tools Exposed**
- `get_permit_requirements()` - Phase 1
- `generate_permit_form()` - Phase 2
- `submit_permit()` - Phase 3

### Example Agent Usage:

```typescript
// Coordinator agent building project plan
const permitInfo = await agentMarket.call('AI-Permit-Tampa', {
  tool: 'get_permit_requirements',
  params: {
    equipment: {
      type: 'air_conditioner',
      tonnage: 5,
      btu: 60000
    },
    location: {
      address: '123 Main St, Tampa, FL 33602',
      county: 'Hillsborough'
    }
  },
  payment: {
    method: 'x402',
    amount: 5
  }
});

// Returns:
{
  permits_required: ['Mechanical Permit', 'Building Permit'],
  total_fees: 450,
  timeline: '7-10 business days',
  requirements: [
    'Load calculation',
    'Site plan',
    'Equipment specifications'
  ]
}
```

---

## 🎯 HACKATHON DEMO STRATEGY

### The Two-Use-Case Demo:

#### **Use Case 1: Human Contractor** (Show Tier 1+2)

**Setup:** Simple web interface
**Flow:**
1. Contractor enters: "5-ton AC replacement at 123 Main St, Tampa"
2. Clicks "Get Permit Info" → **$5 charge**
3. Sees: Mechanical permit required, $450 fee, 7-10 days
4. Clicks "Generate Form" → **$30 charge**
5. Downloads PDF, reviews, ready to submit

**Demo Time:** 2 minutes  
**Wow Factor:** 30 minutes of work → 30 seconds

---

#### **Use Case 2: AI Agent Swarm** (Show AgentMarket Integration)

**Setup:** Show agent terminal/logs
**Flow:**
1. User asks Coordinator: "Plan my office HVAC upgrade"
2. Coordinator spawns:
   - Research Agent → discovers AI-Permit-Tampa on AgentMarket
   - Budget Agent → needs permit costs
3. Research Agent calls `get_permit_requirements()`
4. Pays $5 via x402 automatically
5. Gets permit data back in 3 seconds
6. Incorporates into project plan

**Demo Time:** 3 minutes  
**Wow Factor:** AI agents paying AI services automatically

---

### Visual Demo Assets:

**Show on Screen:**
1. Tampa Bay map with coverage areas
2. Accela portal (in background to prove it's real)
3. Before/After: Manual (30 min) vs AI (30 sec)
4. Pricing comparison vs competitors
5. AgentMarket listing showing discovery

**Have Ready:**
- Your boss as live testimonial
- Real Tampa addresses for queries
- Backup demo if APIs fail (video/screenshots)

---

## ✅ SUCCESS CRITERIA

### Phase 1 (MUST HAVE):
- [ ] Can query for permit requirements
- [ ] Returns accurate Tampa/Hillsborough info
- [ ] Response time < 5 seconds
- [ ] Works live at hackathon
- [ ] Your boss validates accuracy

### Phase 2 (MUST HAVE):
- [ ] Generates valid permit form PDFs
- [ ] Matches county format exactly
- [ ] Your boss approves as submission-ready
- [ ] Can demonstrate live generation
- [ ] PDF downloads work

### Phase 3 (NICE TO HAVE):
- [ ] Can submit to Accela sandbox, OR
- [ ] Have compelling mockup/concept demo
- [ ] Future roadmap is clear

### Integration (MUST HAVE):
- [ ] Listed on AgentMarket
- [ ] x402 payment works
- [ ] AI agents can discover service
- [ ] MCP server running

### Demo (MUST HAVE):
- [ ] Both use cases work flawlessly
- [ ] Can handle live questions
- [ ] Has backup if APIs fail
- [ ] Judges understand the vision

---

## 🚨 CRITICAL SUCCESS FACTORS

### 1. Accuracy is Everything
- **Wrong permit info = lawsuit potential**
- Your boss MUST validate everything
- Test with real projects before demo
- Have disclaimer in place

### 2. PDFs Must Match Exactly
- Counties reject incorrect formats
- Test print/download quality
- Verify all fields populate correctly
- Include all required sections

### 3. Payment Must Work
- x402 is the hackathon differentiator
- Test payment flow thoroughly
- Have fallback if x402 fails
- Show payment confirmation

### 4. Boss Validation is Key
- Real contractor approval sells it
- Use his actual permit data for testing
- Get his testimonial for demo
- He is your credibility

---

## 📊 DATA YOU NEED FROM YOUR BOSS

### Required Information:

**Permit Applications:**
- [ ] 3-5 completed HVAC permit applications
- [ ] Both residential and commercial examples
- [ ] Include all attachments (load calcs, plans, etc.)

**Equipment Specs:**
- [ ] Common equipment types he installs
- [ ] Typical tonnage ranges (2-ton to 10-ton)
- [ ] BTU ratings
- [ ] Brand/model examples

**Fee Information:**
- [ ] Current Hillsborough fee schedule
- [ ] How fees vary by project size
- [ ] Any additional fees (impact fees, etc.)
- [ ] Payment methods accepted

**Process Details:**
- [ ] Typical timeline from application to approval
- [ ] Common rejection reasons
- [ ] Required documents checklist
- [ ] Inspector requirements

### Testing Feedback:
- [ ] Week 1: Test Phase 1 with his addresses
- [ ] Week 2: Review generated PDFs
- [ ] Week 3: Try submitting a test permit
- [ ] Week 4: Expand to other contractors

---

## 🛡️ RISK MITIGATION

### Technical Risks:

**Risk:** Accela API limits/downtime  
**Mitigation:** Cache results, have backup demo video

**Risk:** PDF generation doesn't match county format  
**Mitigation:** Start with simple forms, iterate based on boss feedback

**Risk:** x402 payment integration complex  
**Mitigation:** Implement simple payment mock first, add real x402 later

**Risk:** Phase 3 auto-submit too complex  
**Mitigation:** Make it stretch goal, mockup is acceptable

### Business Risks:

**Risk:** Counties change permit requirements  
**Mitigation:** Build configuration system for easy updates

**Risk:** Accela changes API  
**Mitigation:** Use stable API versions, monitor deprecations

**Risk:** Competitors copy idea  
**Mitigation:** First-mover advantage, focus on execution speed

---

## 🎓 RESOURCES & DOCUMENTATION

### Accela Resources:
- Developer Portal: https://developer.accela.com
- Civic Platform API Docs
- Construct API Docs (for Phase 3)
- Community Forums

### MCP Resources:
- MCP SDK Documentation
- AgentMarket Integration Guide
- x402 Payment Protocol Spec

### PDF Libraries:
- pdf-lib (recommended for form filling)
- PDFKit (for generation from scratch)
- Puppeteer (if need complex rendering)

---

## 🚀 POST-HACKATHON ROADMAP

### Week 1-2: Refinement
- Fix bugs found during hackathon
- Add Pinellas County
- Improve error handling
- Create customer dashboard

### Month 1: Launch to Boss's Network
- Onboard 10-20 contractors
- Gather feedback
- Iterate on UX
- Add Pasco County

### Month 2-3: Tampa Bay Expansion
- Add remaining counties
- Build contractor accounts
- Implement analytics
- Marketing push

### Month 4-6: Florida-wide
- Add counties on demand
- Hire support person
- Scale infrastructure
- Explore other permit types (electrical, plumbing)

### Year 1: National Expansion
- Expand to other Accela cities
- Add more contractor types
- Build partner network
- Fundraise if needed

---

## 💪 YOU HAVE EVERYTHING YOU NEED

✅ **Clear Vision:** Automate HVAC permitting  
✅ **Real Problem:** Contractors hate paperwork  
✅ **Validated Market:** Your boss + Tampa Bay  
✅ **Technical Plan:** 3 clear phases  
✅ **Business Model:** Pay-per-use  
✅ **Competitive Edge:** AI + x402 + first-mover  
✅ **Timeline:** Ambitious but doable

---

## 🏗️ BUILD PRIORITY SUMMARY

### MUST BUILD (Days 1-8):
**Phase 1 + Phase 2**
- Info lookup working perfectly
- Form generation producing valid PDFs
- Boss-validated accuracy
- AgentMarket integration
- Demo-ready

### SHOULD BUILD (Days 9-10):
**Phase 3 Attempt**
- Try auto-submission
- OR create compelling mockup
- Show future vision

### COULD BUILD (Post-Hackathon):
- Additional counties
- Web interface polish
- Analytics dashboard
- Customer accounts

---

## 🎯 FINAL CHECKLIST FOR CLAUDE CODE

Give Claude Code this plan and these instructions:

1. **Read this entire document first**
2. **Set up Accela developer account** (Day 1)
3. **Build Phase 1 first** (Days 1-4), get it perfect
4. **Only move to Phase 2** after Phase 1 works (Days 5-8)
5. **Attempt Phase 3** if time allows (Days 9-10)
6. **Test everything** with boss's real data
7. **Prepare demo** assets and backup plan
8. **Focus on accuracy** over features

**Timeline is tight. Execution is everything. You got this!** 🔥

---

**NEXT STEP:** Give this document to Claude Code and say:  
*"Build AI-Permit-Tampa following this plan. Phase 1+2 must work perfectly. Phase 3 is stretch goal. Start with Day 1 tasks."*

**NOW GO BUILD IT!** 🏗️💪
