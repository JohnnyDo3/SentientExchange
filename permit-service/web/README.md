# AI Permit Tampa - Web Frontend

Professional web application for Tampa Bay HVAC contractors to obtain permits through conversational AI.

## Features

- **Landing Page**: Professional homepage with pricing, testimonials, and trust signals
- **Chat Interface**: Conversational AI permit application (5-minute process)
- **Review & Payment**: Tier selection and Stripe payment integration
- **Success Flow**: Download permits (Tier 1) or approval workflow (Tier 2)
- **Responsive Design**: Mobile-first, optimized for desktop

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Payments**: Stripe
- **Icons**: Heroicons (inline SVG)

## Getting Started

### Prerequisites

- Node.js 20+
- Backend API running on port 3010
- Stripe account (for payments)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.local.example .env.local
```

3. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3010/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
```

### Development

Run the dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

Build for production:
```bash
npm run build
npm start
```

## Project Structure

```
web/
├── app/
│   ├── chat/          # Conversational permit application
│   ├── review/        # Tier selection & payment
│   ├── success/       # Post-payment flow
│   ├── layout.tsx     # Root layout with header/footer
│   ├── page.tsx       # Landing page
│   └── globals.css    # Global styles
├── components/
│   └── layout/        # Header, Footer components
├── lib/
│   ├── api.ts         # Backend API client
│   └── store.ts       # Zustand state management
├── public/            # Static assets
└── README.md
```

## Pages

### 1. Landing Page (`/`)

- Hero section with trust badges
- How It Works (3 steps)
- Pricing comparison (Tier 1 vs Tier 2)
- Contractor testimonials
- Call-to-action sections

### 2. Chat Page (`/chat`)

- Real-time conversational interface
- Progress tracking sidebar
- Session persistence
- Error handling
- Auto-redirect to review when complete

### 3. Review Page (`/review`)

- Application summary
- Tier selection (interactive cards)
- Stripe payment integration
- Trust signals

### 4. Success Page (`/success`)

- **Tier 1**: Immediate PDF download
- **Tier 2**: Preview URL and approval instructions
- Next steps guidance
- New application option

## State Management

Using Zustand with persistence:

```typescript
const {
  sessionId,
  messages,
  permitData,
  selectedTier,
  addMessage,
  updatePermitData,
  setTier,
} = useChatStore()
```

### Persisted State

- `sessionId`: Current chat session ID
- `permitData`: Extracted permit information
- `selectedTier`: User's tier choice (1 or 2)

### Session State (not persisted)

- `messages`: Chat conversation
- `isLoading`: Loading indicator
- `progress`: Progress step tracking

## API Integration

All backend communication through `lib/api.ts`:

- `sendChatMessage()` - Chat with AI
- `createPaymentIntent()` - Initialize Stripe payment
- `generatePackage()` - Generate permit PDFs
- `submitToAccela()` - Submit to Accela (Tier 2)

## Design System

### Colors

- **Navy** (#0f172a to #64748b): Trust, professionalism
- **Orange** (#ea580c): CTAs, brand energy
- **Green** (#16a34a): Success states
- **Gray**: Neutral backgrounds

### Typography

- **Font**: Inter (Google Fonts)
- **Headings**: Bold, Navy-900
- **Body**: Regular, Gray-700

### Components

Custom Tailwind classes in `globals.css`:

- `.btn` - Base button
- `.btn-primary` - Orange CTA button
- `.btn-secondary` - White outline button
- `.card` - White card with shadow
- `.input` - Form input

## Responsive Design

### Breakpoints

- **Mobile**: Default (< 768px)
- **Tablet**: md (768px+)
- **Desktop**: lg (1024px+)

### Mobile Optimizations

- Hamburger menu navigation
- Bottom progress bar (chat)
- Single-column layouts
- Touch-optimized buttons

## Payment Flow

1. User completes chat → `/review`
2. User selects tier (1 or 2)
3. Click "Pay & Continue"
4. `createPaymentIntent()` creates Stripe session
5. Stripe processes payment
6. Redirect to `/success`
7. `generatePackage()` creates PDFs
8. **Tier 1**: Immediate download
9. **Tier 2**: Email preview link for approval

## Environment Variables

### Required

- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key

## Development Tips

### Testing Payment Flow

1. Use Stripe test keys (`pk_test_...`)
2. Test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any 3-digit CVC

### Testing Chat Flow

1. Start at `/chat`
2. Provide sample answers
3. Backend extracts permit data
4. Chat redirects to `/review` when complete

### Hot Reload

Next.js dev server includes:
- Fast Refresh (React components)
- Instant updates on file save
- Error overlay

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **First Load**: < 3s (on 3G)
- **Lighthouse Score**: 95+ (performance)
- **Bundle Size**: < 200KB (gzipped)

### Optimizations

- Code splitting (automatic with Next.js)
- Image optimization (Next.js Image)
- Font optimization (Google Fonts)
- CSS purging (Tailwind)

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Environment Variables in Production

Set in Vercel dashboard:
- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`

### Custom Server

```bash
npm run build
npm start
```

Runs on port 3000 by default.

## Troubleshooting

### "Failed to send message"

- Check backend is running on port 3010
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

### Payment Issues

- Verify Stripe keys are correct
- Check Stripe dashboard for test mode
- Ensure using test card numbers

### Hydration Errors

- Check for client-only code in components
- Use `'use client'` directive when needed
- Avoid `Date()` or `Math.random()` in SSR

## Future Enhancements

- [ ] Add more payment methods (ACH, Apple Pay)
- [ ] Implement chat history saving
- [ ] Add PDF preview in browser
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Accela status tracking dashboard

## Support

- Email: support@aipermittampa.com
- Issues: [GitHub Issues](#)

## License

Proprietary - AI Permit Tampa
