---
name: demo-prepare
description: Prepare environment for hackathon demo recording
---

Set up the perfect environment for hackathon demo video (Day 9):

## 1. Clean Environment Setup
**Reset everything to pristine state:**
- Stop all running services
- Clear terminal history: `history -c`
- Close unnecessary applications
- Set terminal theme to readable colors
- Increase font size for recording (14pt minimum)
- Set terminal to 80x24 or larger
- Clear browser cache and cookies

## 2. Database Preparation
**Create impressive demo data:**
- Reset database to empty state
- Seed with 20+ diverse example services:
  - Image analysis (multiple providers, different prices)
  - Sentiment analysis
  - Text summarization
  - Translation services
  - Data extraction
  - OCR services
  - Content moderation
  - Audio transcription
  - Video analysis
  - Code analysis

**Each service should have:**
- Realistic pricing ($0.01 - $0.50)
- High ratings (4.2 - 4.9 stars)
- Significant transaction history (500-2000 jobs)
- Good success rates (95-99.5%)
- Fast response times (1-5 seconds)

## 3. Wallet Funding
**Ensure smooth payment demo:**
- Pre-fund wallet with $5 testnet USDC
- Verify balance: `wallet.getBalance('usdc')`
- Test one transaction before recording
- Keep backup wallet funded
- Have block explorer tab ready

## 4. Services Health Check
**Verify all services running:**
- Start all example services (image-analyzer, sentiment, summarizer)
- Test each health endpoint
- Verify x402 payment flow works
- Check response times acceptable
- Ensure logs are verbose but clean

## 5. Demo Script Creation
**Write step-by-step script:**

```markdown
# AgentMarket Demo Script

## Opening (30 seconds)
"What if AI agents could buy services from each other, automatically?
Today I'll show you AgentMarket - the first marketplace for AI commerce."

## Problem Statement (30 seconds)
"There are 1000+ AI agents with payment capabilities, but no way to
discover services. AgentMarket solves this."

## Demo Flow (90 seconds)
1. Open Claude Desktop
2. Ask: "Find me an image analysis service under $0.05"
3. Show: AgentMarket discovers 5 services
4. Ask: "Analyze this sunset image: [URL]"
5. Show: Claude uses purchase_service
6. Show: Payment executed automatically ($0.02)
7. Show: Results returned in 3 seconds
8. Show: Transaction on Base Sepolia explorer
9. Ask: "Rate this service 5 stars"
10. Show: Reputation updated

## Technical Deep Dive (30 seconds)
- Show architecture diagram
- MCP + x402 + CDP integration
- 3 core components

## Vision (20 seconds)
"AI agents working together, paying each other,
forming autonomous commerce networks."

Total: 3 minutes
```

## 6. Fallback Preparations
**In case something fails:**
- Take screenshots of each step beforehand
- Record successful run as backup
- Have pre-recorded transaction hash ready
- Keep working examples in separate terminal
- Have rehearsed explanation for any failure

## 7. Demo Environment Variables
```bash
export DEMO_MODE=true              # Slower, more verbose
export LOG_LEVEL=info              # Clean logs, no debug noise
export SHOW_PAYMENT_DETAILS=true   # Display transaction info
export DEMO_DELAY=1000             # 1 second between steps
```

## 8. Recording Setup
**Technical setup:**
- Screen resolution: 1920x1080 minimum
- Recording tool: OBS Studio or Loom
- Microphone check (clear audio)
- Background music (optional, low volume)
- Frame rate: 30fps minimum
- Video format: MP4 (h264)

**What to record:**
- Terminal with commands
- Claude Desktop interface
- Browser with block explorer
- Switch between windows smoothly

## 9. Rehearsal
**Practice 3 times:**
- First run: Find all bugs
- Second run: Smooth execution
- Third run: Perfect timing

**Check:**
- Total time under 3 minutes
- Audio clear and confident
- No awkward pauses
- Smooth transitions
- All services respond quickly
- Payments work flawlessly

## 10. Quick Access Setup
**Prepare all URLs:**
- Local services: http://localhost:3001, 3002, 3003
- MCP server: stdio (already configured)
- Block explorer: https://sepolia.basescan.org
- Project GitHub: [URL]
- Live deployment: [GCP URL]

**Generate QR codes:**
- QR to GitHub repo
- QR to live deployment
- QR to demo video

## 11. Testing Checklist
Run through complete demo flow 3 times:
- [ ] Services all healthy
- [ ] Discovery returns results
- [ ] Purchase executes payment
- [ ] Payment confirms on-chain
- [ ] Service returns correct data
- [ ] Rating updates reputation
- [ ] No errors in logs
- [ ] Performance acceptable
- [ ] Terminal output clean

## 12. Final Preparations
**Before recording:**
- Restart computer for fresh state
- Close all unnecessary apps
- Disable notifications
- Airplane mode (after services started)
- Full screen terminal
- Put phone on silent
- Good lighting
- Water nearby
- Bathroom break
- Deep breath!

## Output
Generate demo-checklist.md with:
- Pre-recording checklist
- During recording reminders
- Post-recording tasks
- Video editing notes
- Upload instructions

Display summary: "Demo environment ready! Run practice demo? (Y/n)"
