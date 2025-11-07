# AgentMarket Brand Assets Organization

This document explains how to organize brand design files for easy access by designers.

---

## 📁 Recommended Folder Structure

```
brand-assets/
├── logos/
│   ├── svg/
│   │   ├── agentmarket-logo-gradient.svg
│   │   ├── agentmarket-logo-white.svg
│   │   ├── agentmarket-logo-purple.svg
│   │   └── agentmarket-icon-gradient.svg
│   ├── png/
│   │   ├── gradient/
│   │   │   ├── agentmarket-logo-gradient-1000px.png
│   │   │   ├── agentmarket-logo-gradient-2000px.png
│   │   │   └── agentmarket-logo-gradient-500px.png
│   │   ├── white/
│   │   │   ├── agentmarket-logo-white-1000px.png
│   │   │   └── agentmarket-logo-white-2000px.png
│   │   └── purple/
│   │       ├── agentmarket-logo-purple-1000px.png
│   │       └── agentmarket-logo-purple-2000px.png
│   └── print/
│       ├── agentmarket-logo-gradient.pdf (vector)
│       ├── agentmarket-logo-gradient-cmyk.pdf
│       └── agentmarket-logo-gradient-300dpi.tiff
│
├── colors/
│   ├── agentmarket-colors.ase (Adobe Swatch Exchange)
│   ├── agentmarket-colors.aco (Photoshop)
│   ├── agentmarket-colors.sketchpalette (Sketch)
│   └── color-reference.png (visual reference)
│
├── fonts/
│   ├── Inter/ (download from Google Fonts)
│   │   ├── Inter-Regular.ttf
│   │   ├── Inter-Medium.ttf
│   │   ├── Inter-SemiBold.ttf
│   │   ├── Inter-Bold.ttf
│   │   └── Inter-ExtraBold.ttf
│   └── font-samples.pdf (showing all weights/sizes)
│
├── templates/
│   ├── figma/
│   │   └── agentmarket-design-system.fig
│   ├── adobe/
│   │   ├── social-media-templates.psd
│   │   ├── flyer-template.ai
│   │   ├── business-card-template.ai
│   │   └── presentation-template.indd
│   ├── sketch/
│   │   └── agentmarket-ui-kit.sketch
│   └── canva/
│       └── canva-template-links.txt
│
├── guidelines/
│   ├── BRAND_QUICK_REFERENCE.pdf (export from markdown)
│   ├── BRAND_GUIDE.pdf (full guide, export from markdown)
│   └── brand-examples.pdf (visual examples)
│
└── examples/
    ├── social-media/
    │   ├── instagram-post-example-1.png
    │   ├── twitter-header-example.png
    │   └── linkedin-post-example.png
    ├── print/
    │   ├── business-card-example.pdf
    │   ├── flyer-example.pdf
    │   └── poster-example.pdf
    └── web/
        ├── website-hero-mockup.png
        ├── button-examples.png
        └── card-examples.png
```

---

## 🎨 What You Need to Create

### 1. Logo Files (Priority 1)

**Export Requirements:**

**SVG (Vector):**
- Gradient version (with embedded gradient definition)
- White monochrome
- Purple monochrome (#9333ea)
- Icon/mark only (gradient)

**PNG (Transparent):**
- Sizes: 500px, 1000px, 2000px, 4000px width
- All color variations
- 72dpi for web

**Print Ready:**
- PDF with vector (CMYK color space)
- TIFF 300dpi for high-res printing

**File Naming:**
```
agentmarket-logo-[type]-[color]-[size].[ext]

Examples:
agentmarket-logo-wordmark-gradient.svg
agentmarket-logo-wordmark-white-2000px.png
agentmarket-logo-icon-gradient.svg
agentmarket-logo-horizontal-purple.pdf
```

---

### 2. Color Swatches (Priority 1)

Create color palette files for different design tools:

**Adobe Swatch Exchange (.ase):**
- Create in Photoshop or Illustrator
- Include all brand colors with names
- Organize: Primary → Secondary → Neutrals

**Photoshop Swatches (.aco):**
- For Photoshop users
- RGB and CMYK versions

**Sketch Palette (.sketchpalette):**
- For Sketch users
- Export from Sketch or use plugin

**Figma:**
- Create color styles in Figma library
- Name format: "Brand/Purple/Main" etc.

**Visual Reference:**
- PNG showing all colors with hex codes
- Can be quickly referenced without opening design tools

---

### 3. Design System / UI Kit (Priority 2)

**Figma (Recommended):**
- Component library with buttons, cards, inputs
- Text styles (all heading/body variations)
- Color styles (all brand colors)
- Auto-layout templates
- Share link for team access

**Sketch:**
- Symbol library with components
- Text styles
- Color swatches
- Template pages

**Adobe CC Libraries:**
- Colors as swatches
- Character styles for typography
- Logo files
- Common graphic elements

---

### 4. Templates (Priority 2)

**Social Media:**
- Instagram post (1080×1080px)
- Instagram story (1080×1920px)
- Twitter/X post (1200×675px)
- Twitter/X header (1500×500px)
- LinkedIn post (1200×627px)
- LinkedIn cover (1584×396px)
- Facebook post (1200×630px)

**Print:**
- Business card (3.5×2 inches, 300dpi, CMYK)
- Flyer (8.5×11 inches, 300dpi, CMYK)
- Poster (24×36 inches, 300dpi, CMYK)

**Presentation:**
- PowerPoint/Keynote template
- Title slide + content slide layouts

**Web:**
- Email header template
- Banner ad templates (various sizes)

---

### 5. Documentation (Priority 3)

**Export PDFs from Markdown:**
```bash
# Using pandoc or similar tool
pandoc BRAND_QUICK_REFERENCE.md -o BRAND_QUICK_REFERENCE.pdf
pandoc BRAND_GUIDE.md -o BRAND_GUIDE.pdf
```

**Create Visual Examples Document:**
- Show correct vs incorrect logo usage
- Color combinations in action
- Typography hierarchy examples
- Button states (default, hover, pressed)
- Card styles
- Real-world applications

---

## 🚀 Quick Start for Designers

### If you use Figma:
1. Open Figma design system file
2. Duplicate to your workspace
3. Use components and styles directly
4. File → Libraries → Publish (if team admin)

### If you use Adobe Creative Cloud:
1. Open Creative Cloud app
2. Libraries tab → Import color swatches (.ase file)
3. Add logos to library from logos/svg folder
4. Use templates from templates/adobe folder

### If you use Sketch:
1. Open Sketch UI kit file
2. Add to library (Sketch → Preferences → Libraries)
3. Install color palette (.sketchpalette)
4. Use symbols and styles in your designs

### If you use Canva:
1. Open canva-template-links.txt
2. Duplicate templates to your account
3. Customize with your content
4. Export as PNG/PDF

---

## 📦 Sharing with Team

### Cloud Storage Options:

**Option 1: Google Drive / Dropbox**
```
brand-assets/ → Share folder with team
└── Set permissions: View only for most, Edit for brand managers
```

**Option 2: Figma (for design files)**
- Create team workspace
- Share design system as published library
- Team members use as components

**Option 3: GitHub (for developers)**
- Store SVG logos and markdown docs in repo
- PNG files in separate assets folder (not in git, too large)

**Option 4: Brand Management Platform**
- Frontify, Brandfolder, Bynder (enterprise)
- Upload all assets with usage guidelines
- Team accesses via web portal

---

## 🔄 Keeping Assets Updated

**Version Control:**
- Date stamp asset folders (e.g., `logos-2025-01/`)
- Update version in filename for major changes (e.g., `v2`)
- Keep changelog in this README

**When to Update Assets:**
- Logo redesign or refinement
- New color added to palette
- New template types needed
- Brand guidelines change

**Who Can Update:**
- Brand manager: All files
- Lead designer: Templates and examples
- Marketing team: Request updates via brand manager

---

## ✅ Asset Creation Checklist

### Phase 1: Essentials (Week 1)
- [ ] Export logo files (SVG, PNG, PDF)
- [ ] Create color swatches (.ase, .aco)
- [ ] Install and document Inter font
- [ ] Create visual color reference PNG
- [ ] Export quick reference to PDF

### Phase 2: Templates (Week 2)
- [ ] Create Figma design system
- [ ] Create social media templates (top 3 platforms)
- [ ] Create business card template
- [ ] Create presentation template

### Phase 3: Documentation (Week 3)
- [ ] Create visual examples document
- [ ] Export full brand guide to PDF
- [ ] Create "good vs bad" examples
- [ ] Set up cloud storage and share links

### Phase 4: Distribution (Week 4)
- [ ] Share folder structure with team
- [ ] Publish Figma library (if applicable)
- [ ] Update README with actual file links
- [ ] Train team on accessing assets

---

## 📧 Asset Requests

**Need a new asset type?**
Email: design@sentientexchange.com

**Report broken or outdated assets:**
Email: brand@sentientexchange.com

**Emergency asset needs:**
[Contact info]

---

**Last Updated:** January 2025
**Maintained By:** [Brand Manager Name]
**Version:** 1.0
