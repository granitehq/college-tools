# College Tools Website

This directory contains the static public website for College Tools, deployed on Cloudflare Pages at `college-tools.granite-hq.com`. It explains the Google Sheets application, links to the copyable template, documents setup, and hosts the privacy and terms pages.

## Quick Start

Run these commands from the repository root:

```bash
npm run build
npm run dev
node website/validate-website.mjs
```

Then visit http://localhost:8080.

`npm run build` stamps the current git hash into website footer text. `npm run dev` then serves the site through `scripts/dev-server.js`, which mirrors the Pages Function so clean URLs like `/features` resolve locally exactly as they do in production. The website itself is plain HTML, CSS, assets, Cloudflare Pages metadata, and a small Pages Function for clean URLs.

## Structure

```text
website/
├── index.html              # Landing page
├── getting-started.html    # Setup instructions
├── features.html           # Feature gallery
├── privacy.html            # Privacy policy
├── terms.html              # Terms of service
├── _headers                # Cloudflare Pages response headers
├── _redirects              # Legacy redirects
├── functions/[[path]].js   # Clean URL rewrites
├── validate-website.mjs    # Dependency-free static validation
└── assets/
    ├── css/style.css       # Main stylesheet
    ├── favicon/            # Manifest and browser icons
    └── images/             # Logo and feature screenshots
```

## Design System

- Colors: Google Material inspired palette
- Typography: Inter font family loaded from Google Fonts
- CSS: Vanilla CSS with Grid/Flexbox
- Responsive: Mobile-first layout
- Analytics: Cloudflare Web Analytics beacon

## URL Model

Canonical public URLs are clean URLs:

- `/`
- `/getting-started`
- `/features`
- `/privacy`
- `/terms`

The HTML files remain in the folder as Cloudflare Pages assets. `functions/[[path]].js` rewrites clean URLs to the matching `.html` files without changing the browser URL. Navigation should link to clean URLs to avoid duplicate public paths.

**Adding a page requires two edits.** Create the `.html` file *and* add its clean URL to the `cleanUrls` map in `functions/[[path]].js`. Without the second edit the page deploys but 404s on its clean URL. `validate-website.mjs` fails the build if a page is missing its mapping.

For local preview, `scripts/dev-server.js` parses that same `cleanUrls` map straight out of the Pages Function, so the dev server and production cannot drift apart.

## Validation

Run the website-specific validation before deploying:

```bash
node website/validate-website.mjs
```

The validation checks deploy-sensitive issues: third-party-compatible headers, manifest icon references, clean internal URLs, clean-URL mappings for every page, safe new-tab links, supported structured data, and stale maintenance notes.

## Deployment

Cloudflare Pages should serve `website/` as the project output directory. Keep `_headers`, `_redirects`, `functions/`, `manifest.json`, `robots.txt`, and `sitemap.xml` in this folder because they are deployment inputs.
