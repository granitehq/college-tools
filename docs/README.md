# College Tools Website

This directory contains the professional website for College Tools, built to be deployed on Cloudflare Pages at `college-tools.granite-hq.com`.

## 🚀 Quick Start

```bash
# Build the website
npm run build

# Start local development server
npm run dev
```

Then visit http://localhost:8080

## 📁 Structure

```
docs/
├── index.html              # Landing page
├── privacy.html            # Privacy policy (generated from PRIVACY.md)
├── terms.html              # Terms of service (generated from TERMS.md)
├── getting-started.html    # Setup instructions
├── screenshots.html        # Feature gallery
└── assets/
    ├── css/
    │   └── style.css       # Main stylesheet (vanilla CSS)
    ├── js/                 # Future JavaScript files
    ├── images/
    │   ├── logo.svg        # College Tools logo
    │   ├── hero.svg        # Hero section illustration
    │   └── screenshots/    # Feature screenshots (PNG format)
    └── favicon/
        └── favicon.svg     # Site favicon
```

## 🎨 Design System

- **Colors**: Google Material Design inspired palette
- **Typography**: Inter font family
- **CSS**: Modern vanilla CSS with Grid/Flexbox
- **Responsive**: Mobile-first design
- **Performance**: Optimized for fast loading

## 📝 Content Management

Website content is generated from:
- `PRIVACY.md` → `privacy.html`
- `TERMS.md` → `terms.html`
- Build script templates for other pages

## 🔧 Development

### Build Process

The build script (`scripts/build-website.js`) converts markdown files to HTML using a consistent template and generates all necessary files.

### Local Development

1. Run `npm run build` to generate HTML files
2. Run `npm run dev` to start local server
3. Edit source files and rebuild as needed

### Adding New Pages

1. Update the build script to include new page templates
2. Add navigation links to the HTML template
3. Rebuild and test

## 🚀 Deployment

Ready for Cloudflare Pages deployment:

1. Connect GitHub repository to Cloudflare Pages
2. Set build directory to `/docs`
3. Configure custom domain: `college-tools.granite-hq.com`
4. Enable Cloudflare Analytics

## 🔄 Next Steps

1. **Replace placeholder images** with actual screenshots
2. **Update contact information** in PRIVACY.md and TERMS.md
3. **Add Cloudflare Analytics token** in build script
4. **Take real screenshots** of College Tools features
5. **Deploy to Cloudflare Pages**

## 🎯 Features

- ✅ Professional design with Google Material colors
- ✅ Mobile responsive layout
- ✅ Privacy policy with Cloudflare Analytics details
- ✅ Terms of service
- ✅ Getting started guide
- ✅ Feature gallery (with placeholders)
- ✅ SEO optimized with meta tags
- ✅ Fast loading with minimal CSS/JS

## 📊 Analytics

Website includes Cloudflare Analytics integration:
- Cookieless tracking
- Privacy-compliant data collection
- Real-time visitor insights
- Performance monitoring