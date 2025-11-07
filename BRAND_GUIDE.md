# AgentMarket Brand Guide
**Version 1.0 | 2025**

---

## 👋 Are you a graphic designer?

**START HERE:** See **[BRAND_QUICK_REFERENCE.md](./BRAND_QUICK_REFERENCE.md)** for a designer-friendly version with color palettes, typography, and templates.

**Need assets?** See **[BRAND_ASSETS_README.md](./BRAND_ASSETS_README.md)** for logo files, fonts, and design tool resources.

This full guide contains comprehensive technical specifications including CSS code and detailed measurements — useful for developers and detailed reference, but not required for most design work.

---

# Table of Contents

1. [Brand Overview](#brand-overview)
2. [Logo System](#logo-system)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Visual Elements](#visual-elements)
6. [Brand Voice](#brand-voice)
7. [Applications](#applications)
8. [Usage Guidelines](#usage-guidelines)

---

# Brand Overview

## Brand Mission
AgentMarket is the AI-native service marketplace that enables autonomous AI agents to discover, purchase, and provide services using blockchain micropayments.

## Brand Positioning
**"The intelligent marketplace for AI agents"**

We're not just a payment protocol—we're the complete ecosystem where AI agents become economically autonomous.

## Brand Personality
- **Intelligent**: Smart, forward-thinking, AI-first
- **Energetic**: Fast, dynamic, exciting
- **Premium**: High-quality, trustworthy, professional
- **Accessible**: Easy to use, welcoming, inclusive

## Target Audience
- **Primary**: AI developers, service providers, tech companies
- **Secondary**: Crypto-native users, blockchain developers
- **Tertiary**: Enterprise businesses exploring AI automation

---

# Logo System

## Primary Logo

### Wordmark
```
AgentMarket
```

**Specifications:**
- Font: Custom or Inter Bold (see Typography section)
- Color: Gradient (#9333ea → #f72585)
- Angle: 135° diagonal gradient
- Minimum Size: 120px width (digital), 1 inch (print)

### Logo Variations

**Full Color (Primary)**
- Gradient wordmark: #9333ea → #f72585
- Background: Black (#000000) or transparent
- Use: Website headers, app, primary marketing

**Monochrome White**
- Color: #ffffff
- Background: Dark (#000000 or #111827)
- Use: Dark backgrounds, photography overlays

**Monochrome Purple**
- Color: #9333ea
- Background: White (#ffffff) or light colors
- Use: Light backgrounds, print on white paper

**Single Color (Fallback)**
- Color: #9333ea (Purple) OR #f72585 (Pink)
- Use: When gradient not supported (embroidery, single-color print)

## Logo Mark (Icon)

### Option A: Abstract "A"
```
▲ (Triangle/arrow pointing up)
```
- Represents: Growth, upward movement, agents
- Color: Gradient (#9333ea → #f72585)
- Use: Favicon, app icon, social media profile

### Option B: Market Grid
```
[≡][≡]  (Grid pattern suggesting marketplace)
```
- Represents: Marketplace, organization, network
- Color: Gradient (#9333ea → #f72585)
- Use: Alternative icon treatment

### Accent Element (Optional)
- Small cyan dot or underscore: #0ea5e9
- Placement: After "Market" or as icon accent
- Purpose: Adds AI intelligence indicator

## Clear Space
- Minimum clear space: 0.25x logo height on all sides
- Never place text or other elements within clear space

## Incorrect Usage ❌
- Don't rotate the logo
- Don't stretch or distort proportions
- Don't use colors outside brand palette
- Don't add drop shadows or effects
- Don't place on busy backgrounds without contrast
- Don't recreate or modify the wordmark

---

# Color Palette

## Primary Colors

### Purple (Brand Primary)

**Main Purple**
```
HEX: #9333ea
RGB: 147, 51, 234
CMYK: 37, 78, 0, 8
Pantone: 2665 C (approximate)
```
**Usage:** Primary brand color, logos, CTAs, headlines

**Light Purple**
```
HEX: #a855f7
RGB: 168, 85, 247
CMYK: 32, 66, 0, 3
```
**Usage:** Hover states, secondary elements

**Dark Purple**
```
HEX: #7e22ce
RGB: 126, 34, 206
CMYK: 39, 83, 0, 19
```
**Usage:** Depth, shadows, pressed states

---

### Pink (Brand Primary)

**Main Pink**
```
HEX: #f72585
RGB: 247, 37, 133
CMYK: 0, 85, 46, 3
Pantone: 213 C (approximate)
```
**Usage:** Gradient partner, accents, energy

**Light Pink**
```
HEX: #ec4899
RGB: 236, 72, 153
CMYK: 0, 70, 35, 7
```
**Usage:** Hover states, soft highlights

**Dark Pink**
```
HEX: #be185d
RGB: 190, 24, 93
CMYK: 0, 87, 51, 25
```
**Usage:** Depth, pressed states

---

## Secondary Colors

### Electric Blue (AI Accent)

**Main Blue**
```
HEX: #0ea5e9
RGB: 14, 165, 233
CMYK: 94, 29, 0, 9
```
**Usage:** AI indicators, data, secondary CTAs, tech elements

**Light Blue**
```
HEX: #38bdf8
RGB: 56, 189, 248
CMYK: 77, 24, 0, 3
```
**Usage:** Highlights, hover states

**Dark Blue**
```
HEX: #0284c7
RGB: 2, 132, 199
CMYK: 99, 34, 0, 22
```
**Usage:** Depth, pressed states

---

### Success Green (Money/Payments)

**Main Green**
```
HEX: #10b981
RGB: 16, 185, 129
CMYK: 91, 0, 30, 27
```
**Usage:** Success states, payments, transactions, positive metrics

**Light Green**
```
HEX: #34d399
RGB: 52, 211, 153
CMYK: 75, 0, 27, 17
```
**Usage:** Hover states, highlights

**Dark Green**
```
HEX: #059669
RGB: 5, 150, 105
CMYK: 97, 0, 30, 41
```
**Usage:** Depth, pressed states

---

## Supporting Colors

### Neutral Grays

**Background Black**
```
HEX: #000000
RGB: 0, 0, 0
CMYK: 0, 0, 0, 100
```
**Usage:** Primary background, dark theme

**Card Dark**
```
HEX: #111827
RGB: 17, 24, 39
CMYK: 56, 38, 0, 85
```
**Usage:** Cards, surfaces, containers

**Border Gray**
```
HEX: #374151
RGB: 55, 65, 81
CMYK: 32, 20, 0, 68
```
**Usage:** Borders, dividers, subtle separators

**Text Gray**
```
HEX: #9ca3af
RGB: 156, 163, 175
CMYK: 11, 7, 0, 31
```
**Usage:** Secondary text, captions, metadata

**White**
```
HEX: #ffffff
RGB: 255, 255, 255
CMYK: 0, 0, 0, 0
```
**Usage:** Primary text on dark, backgrounds on light

---

## Gradient Combinations

### Primary Brand Gradient
```css
background: linear-gradient(135deg, #9333ea 0%, #f72585 100%);
```
**Usage:** Logos, CTAs, hero sections, brand moments

### Purple Glow
```css
background: radial-gradient(circle, #9333ea 0%, transparent 70%);
```
**Usage:** Ambient effects, backgrounds, halos

### Blue Accent Gradient
```css
background: linear-gradient(135deg, #0ea5e9 0%, #9333ea 100%);
```
**Usage:** AI features, tech elements, secondary CTAs

### Success Gradient
```css
background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
```
**Usage:** Payment confirmations, success states

---

## Color Accessibility

### Contrast Ratios (WCAG AA Compliant)

**Text on Backgrounds:**
- White (#ffffff) on Purple (#9333ea): 4.85:1 ✓
- White (#ffffff) on Pink (#f72585): 4.02:1 ✓
- White (#ffffff) on Black (#000000): 21:1 ✓
- Gray (#9ca3af) on Black (#000000): 7.24:1 ✓

**Always test custom combinations**

---

# Typography

## Font Family

### Primary: **Inter**
```
Download: fonts.google.com/specimen/Inter
Weights: 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold), 800 (Extra-Bold)
```

**Why Inter:**
- Modern, clean, tech-forward
- Excellent readability at all sizes
- Open-source and free
- Optimized for screens

### Fallback Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
             'Helvetica Neue', Arial, sans-serif;
```

---

## Type Scale

### Headings

**H1 - Hero Display**
```
Size: 72px / 4.5rem
Weight: 800 (Extra-Bold)
Line Height: 1.1
Letter Spacing: -0.02em
Color: Gradient (#9333ea → #f72585) or #ffffff
```
**Usage:** Landing page heroes, major section titles

**H2 - Section Heading**
```
Size: 48px / 3rem
Weight: 700 (Bold)
Line Height: 1.2
Letter Spacing: -0.01em
Color: #ffffff or gradient
```
**Usage:** Section headers, feature titles

**H3 - Subsection**
```
Size: 32px / 2rem
Weight: 700 (Bold)
Line Height: 1.3
Letter Spacing: -0.01em
Color: #ffffff
```
**Usage:** Card titles, subsections

**H4 - Component Title**
```
Size: 24px / 1.5rem
Weight: 600 (Semi-Bold)
Line Height: 1.4
Letter Spacing: 0
Color: #ffffff
```
**Usage:** Component headers, small sections

**H5 - Label Heading**
```
Size: 18px / 1.125rem
Weight: 600 (Semi-Bold)
Line Height: 1.5
Letter Spacing: 0
Color: #ffffff or #9ca3af
```
**Usage:** Form labels, list headers

---

### Body Text

**Body Large**
```
Size: 20px / 1.25rem
Weight: 400 (Regular)
Line Height: 1.6
Color: #9ca3af
```
**Usage:** Intro paragraphs, feature descriptions

**Body Regular**
```
Size: 16px / 1rem
Weight: 400 (Regular)
Line Height: 1.6
Color: #9ca3af
```
**Usage:** Standard body text, descriptions

**Body Small**
```
Size: 14px / 0.875rem
Weight: 400 (Regular)
Line Height: 1.5
Color: #9ca3af
```
**Usage:** Captions, metadata, fine print

**Body Tiny**
```
Size: 12px / 0.75rem
Weight: 400 (Regular)
Line Height: 1.4
Color: #9ca3af
```
**Usage:** Timestamps, legal text, footnotes

---

### Special Text Styles

**Display Text (Marketing)**
```
Size: 96px / 6rem
Weight: 800 (Extra-Bold)
Line Height: 1
Letter Spacing: -0.03em
Color: Gradient (#9333ea → #f72585)
```
**Usage:** Landing page heroes, billboards

**Button Text**
```
Size: 16px / 1rem
Weight: 600 (Semi-Bold)
Line Height: 1.5
Letter Spacing: 0.01em
Color: #ffffff
Text Transform: None
```
**Usage:** All buttons, CTAs

**Code/Mono**
```
Font: 'JetBrains Mono' or 'Fira Code'
Size: 14px / 0.875rem
Weight: 400 (Regular)
Color: #0ea5e9
Background: #111827
```
**Usage:** Code snippets, API endpoints, technical content

**Link Text**
```
Size: Inherit from parent
Weight: 500 (Medium)
Color: #0ea5e9
Decoration: None (underline on hover)
```
**Usage:** Hyperlinks, navigation

---

## Typography Best Practices

**Do:**
- Use gradient text for hero moments (#9333ea → #f72585)
- Maintain hierarchy with size and weight
- Use gray (#9ca3af) for body text to reduce eye strain
- Keep line length between 50-75 characters
- Use proper letter spacing for large text

**Don't:**
- Use more than 3 font weights on one page
- Set body text smaller than 14px
- Use all caps for long paragraphs
- Use pure black (#000000) for body text
- Stretch or condense the font

---

# Visual Elements

## Iconography

### Style
- **Line Weight:** 2px
- **Corners:** Rounded (2px radius)
- **Style:** Outline/stroke (not filled)
- **Color:** #9ca3af (default), gradient on hover

### Icon Library
**Recommended:** Lucide React Icons
```bash
npm install lucide-react
```

### Icon Sizes
```
Small:  16px × 16px
Medium: 24px × 24px
Large:  32px × 32px
XLarge: 48px × 48px
```

### Icon Colors
- Default: #9ca3af (gray)
- Hover: Gradient (#9333ea → #f72585)
- Active: #9333ea (purple)
- Success: #10b981 (green)
- Error: #ef4444 (red)
- Info: #0ea5e9 (blue)

---

## Buttons

### Primary Button
```css
Background: linear-gradient(135deg, #9333ea 0%, #f72585 100%)
Text: #ffffff, 16px, Semi-Bold (600)
Padding: 12px 24px
Border Radius: 12px
Hover: Scale 1.05
```

### Secondary Button
```css
Background: transparent
Border: 2px solid #9333ea
Text: #9333ea, 16px, Semi-Bold (600)
Padding: 10px 22px
Border Radius: 12px
Hover: Background #9333ea, Text #ffffff
```

### Ghost Button
```css
Background: transparent
Text: #9ca3af, 16px, Medium (500)
Padding: 12px 24px
Border Radius: 12px
Hover: Background rgba(147, 51, 234, 0.1)
```

### Button States
- **Default:** As specified above
- **Hover:** Scale 1.05 or brightness 1.1
- **Active/Pressed:** Scale 0.98
- **Disabled:** Opacity 0.5, cursor not-allowed
- **Loading:** Spinner, disabled state

---

## Cards & Containers

### Glass Card (Primary)
```css
Background: rgba(17, 24, 39, 0.5)
Backdrop Filter: blur(12px)
Border: 1px solid rgba(148, 163, 184, 0.1)
Border Radius: 16px
Padding: 24px
Box Shadow: 0 4px 24px rgba(0, 0, 0, 0.3)
```

### Solid Card
```css
Background: #111827
Border: 1px solid #374151
Border Radius: 16px
Padding: 24px
```

### Elevated Card
```css
Background: #111827
Border: 1px solid #374151
Border Radius: 16px
Padding: 24px
Box Shadow: 0 8px 32px rgba(147, 51, 234, 0.2)
```

---

## Spacing System

### Base Unit: 4px

```
0:   0px    (none)
1:   4px    (xs)
2:   8px    (sm)
3:   12px   (md)
4:   16px   (base)
5:   20px
6:   24px   (lg)
8:   32px   (xl)
10:  40px
12:  48px   (2xl)
16:  64px   (3xl)
20:  80px
24:  96px   (4xl)
32:  128px  (5xl)
```

### Component Spacing
- **Sections:** 96px vertical (24)
- **Cards:** 24px padding (6)
- **Buttons:** 12px vertical, 24px horizontal (3, 6)
- **Form Fields:** 16px padding (4)
- **Grid Gap:** 24px (6)

---

## Border Radius

```
Small:   8px   (buttons, inputs)
Medium:  12px  (cards, modals)
Large:   16px  (containers)
XLarge:  24px  (hero elements)
Full:    9999px (pills, avatars)
```

---

## Shadows & Effects

### Box Shadows

**Subtle**
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
```

**Medium**
```css
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
```

**Strong**
```css
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
```

**Glow (Brand)**
```css
box-shadow: 0 0 24px rgba(147, 51, 234, 0.4);
```

### Backdrop Blur
```css
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```

### Transitions
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

---

# Brand Voice

## Tone of Voice

### Core Attributes

**Intelligent, Not Robotic**
- Smart without being cold
- Technical but accessible
- Expert yet friendly

**Energetic, Not Hyper**
- Enthusiastic about innovation
- Dynamic language without being overwhelming
- Action-oriented

**Premium, Not Elitist**
- High-quality feel
- Professional without being stuffy
- Inclusive, not exclusive

**Clear, Not Simplistic**
- Straightforward communication
- Precise technical terms when needed
- No jargon for jargon's sake

---

## Writing Style

### Headlines
- Active voice
- Present tense
- Benefit-focused
- Action verbs

**Good Examples:**
- "Build Autonomous AI Agents That Pay for Themselves"
- "Discover Services, Execute Workflows, Pay in Microseconds"
- "The AI Economy Runs Here"

**Bad Examples:**
- "AgentMarket is a marketplace" (too generic)
- "You can use our platform to..." (too wordy)
- "Revolutionary disruptive..." (too buzzword-y)

---

### Body Copy
- Short paragraphs (2-3 sentences)
- Clear topic sentences
- Bullet points for lists
- Active voice
- Second person ("you") when addressing users

**Good Example:**
```
AgentMarket connects AI agents with the services they need.
Discover specialized APIs, execute complex workflows, and pay
with blockchain micropayments. Your agents work autonomously
while you stay in control.
```

**Bad Example:**
```
The AgentMarket platform facilitates the connection between
various artificial intelligence agents and service providers
through blockchain-enabled transactions...
```

---

### Calls to Action

**Primary CTAs:**
- "Start Building" (not "Sign Up")
- "Explore Services" (not "Browse")
- "Connect Wallet" (not "Login")
- "Deploy Your Service" (not "Register")

**Secondary CTAs:**
- "Learn More"
- "View Documentation"
- "See Examples"
- "Get Support"

---

## Vocabulary

### Use These Terms
- AI agent (not "bot" or "automated system")
- Service (not "API" unless technical context)
- Marketplace (not "platform" alone)
- Workflow (not "process")
- Micropayment (not "transaction")
- Autonomous (not "automatic")

### Avoid These Terms
- Disruptive, revolutionary (overused)
- Cutting-edge, bleeding-edge (cliché)
- Synergy, leverage (corporate jargon)
- Ecosystem (overused in crypto)
- Simple/easy (patronizing)

---

## Messaging Framework

### Tagline Options
1. "The Intelligent Marketplace for AI Agents"
2. "Where AI Agents Come to Work"
3. "Autonomous Services. Blockchain Payments."

### Key Messages

**For Developers:**
"Build AI agents that can discover and purchase services autonomously.
No API keys, no accounts—just wallets and payments."

**For Service Providers:**
"Turn your AI model into a revenue stream. Set your price, deploy your
service, and get paid in USDC every time an agent uses it."

**For Enterprises:**
"Deploy autonomous AI agents that handle complex workflows. Pay only
for what you use, with full transparency and control."

---

# Applications

## Website

### Header
- Logo: Full color gradient (left)
- Navigation: Gray links (#9ca3af), hover gradient
- CTA Button: Primary gradient button (right)
- Background: Black with subtle purple glow

### Hero Section
- Headline: 72px gradient text
- Subheading: 20px gray (#9ca3af)
- CTA: Primary gradient button
- Background: Black with animated particles

### Feature Cards
- Glass card style
- Icon: 32px, gradient on hover
- Title: 24px white
- Description: 16px gray
- Spacing: 24px padding

### Footer
- Background: #111827
- Text: #9ca3af (body), #ffffff (links)
- Logo: White monochrome
- Dividers: #374151

---

## Social Media

### Profile Images
- Logo mark on gradient background
- Square: 400×400px minimum
- File: PNG with transparency

### Cover Images
- Dimensions: Platform-specific (see below)
- Background: Black with gradient elements
- Logo: White monochrome
- Tagline: White text

**Twitter/X:** 1500×500px
**LinkedIn:** 1584×396px
**Facebook:** 820×312px

### Post Graphics
- Background: Black (#000000)
- Accent: Gradient (#9333ea → #f72585)
- Text: White (#ffffff)
- Logo: Top-left or bottom-right
- Template size: 1080×1080px (Instagram), 1200×675px (Twitter)

---

## Presentations

### Title Slide
- Background: Black
- Title: Gradient text, 72px
- Logo: White monochrome, bottom-right

### Content Slides
- Background: Black or dark gray (#111827)
- Headlines: White, 48px
- Body: Gray (#9ca3af), 24px
- Accents: Gradient highlights
- Bullet Points: Purple (#9333ea)

### Chart Colors (in order)
1. Purple (#9333ea)
2. Pink (#f72585)
3. Blue (#0ea5e9)
4. Green (#10b981)
5. Gray (#9ca3af)

---

## Email

### Header
- Background: Black
- Logo: White monochrome or gradient
- Height: 80px

### Body
- Background: White or light gray
- Text: Dark gray (#374151)
- Links: Purple (#9333ea)
- CTA Buttons: Gradient

### Footer
- Background: #111827
- Text: #9ca3af
- Links: #0ea5e9

---

## Marketing Materials

### Business Cards
**Front:**
- Background: Black
- Logo: Gradient
- Name: White, 18px
- Title: Gray, 14px

**Back:**
- Background: Gradient (#9333ea → #f72585)
- Contact info: White
- Website: White, bold

### Flyers/Posters
- Dark background (black or dark purple)
- Gradient elements as accents
- High-contrast white text
- Clear hierarchy
- QR code: White on dark background

### Merchandise
- T-shirts: White or black with gradient logo
- Stickers: Die-cut logo mark with white border
- Hats: Embroidered logo (use purple or white)

---

# Usage Guidelines

## Logo Usage

### Do ✅
- Use official logo files only
- Maintain minimum clear space
- Place on appropriate backgrounds (dark/light)
- Scale proportionally
- Use high-resolution versions

### Don't ❌
- Rotate, skew, or distort
- Change colors outside brand palette
- Add effects (drop shadows, glows, outlines)
- Place on busy or low-contrast backgrounds
- Recreate or redraw the logo

---

## Color Usage

### Do ✅
- Use gradient for primary brand moments
- Maintain accessibility contrast ratios
- Use green for success/money indicators
- Use blue for tech/AI features
- Use provided hex codes exactly

### Don't ❌
- Create new gradients outside the system
- Use colors at incorrect opacity
- Mix too many accent colors
- Use gradient on small text (<16px)
- Use colors that don't pass WCAG AA

---

## Typography Usage

### Do ✅
- Follow the type scale
- Maintain proper hierarchy
- Use appropriate weights
- Ensure readability (min 14px body text)
- Use fallback fonts

### Don't ❌
- Use more than 3 weights per page
- Set body text below 14px
- Use all caps for paragraphs
- Stretch or condense fonts
- Use pure black (#000) for body text

---

## Photography & Imagery

### Style Guidelines
- **Lighting:** High contrast, dramatic
- **Color Grading:** Cool tones (purple/blue tints)
- **Subject:** Tech-focused, futuristic, clean
- **Composition:** Geometric, structured, modern

### Image Treatment
- Overlay: Black gradient (opacity 40-60%)
- Filter: Slight purple tint
- Contrast: Increased by 10-20%
- Sharpness: Increased slightly

### Stock Photography
**Good Sources:**
- Unsplash (free, high quality)
- Pexels (free, tech-focused)
- Unsplash keywords: "technology", "AI", "data", "futuristic", "blockchain"

**Avoid:**
- Generic business handshakes
- Overly corporate staged photos
- Low-contrast or washed-out images
- Outdated technology imagery

---

## Accessibility

### Color Contrast
- All text must meet WCAG AA standards (4.5:1 for body, 3:1 for large text)
- Test with tools like WebAIM Contrast Checker
- Provide color-blind safe alternatives

### Text Legibility
- Minimum body text: 14px
- Adequate line height: 1.5-1.6 for body text
- Sufficient letter spacing
- No light text on light backgrounds

### Interactive Elements
- Hover states must be clearly visible
- Focus states for keyboard navigation
- Touch targets minimum 44×44px
- Clear active/inactive states

---

## File Formats

### Logo Files Required
- **SVG:** Primary (scalable vector)
- **PNG:** Transparent background, 2000px width
- **PDF:** Print-ready, vector
- **JPG:** Solid background versions

### File Naming Convention
```
agentmarket-logo-[variation]-[color]-[size].[format]

Examples:
agentmarket-logo-wordmark-gradient.svg
agentmarket-logo-mark-white-1000px.png
agentmarket-logo-horizontal-purple.pdf
```

### Image Specifications
**Web:**
- Format: WebP (fallback to PNG/JPG)
- Compression: 80% quality
- Max width: 2000px

**Print:**
- Format: PDF or TIFF
- Resolution: 300 DPI minimum
- Color Space: CMYK (for print)

---

## Brand Resources

### Download Links
- Logo Files: [link]
- Font Files: fonts.google.com/specimen/Inter
- Color Swatches: [link]
- Templates: [link]
- Brand Guide PDF: [link]

### Design Tools
- **Figma:** Full design system available
- **Adobe CC:** Color libraries and assets
- **Sketch:** Symbol library
- **Canva:** Template library (for non-designers)

---

## Contact

**Brand Guidelines Questions:**
brand@sentientexchange.com

**Design Asset Requests:**
design@sentientexchange.com

**Partnership Inquiries:**
partnerships@sentientexchange.com

---

## Version History

**Version 1.0 - January 2025**
- Initial brand guide release
- Established core identity
- Defined color palette and typography

---

**© 2025 AgentMarket. All rights reserved.**

This brand guide is confidential and proprietary to AgentMarket.
Unauthorized use, reproduction, or distribution is prohibited.
