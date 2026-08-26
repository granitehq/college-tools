#!/usr/bin/env node

/**
 * Local preview server for website/.
 *
 * Cloudflare Pages serves clean URLs (/features, /getting-started) through
 * website/functions/[[path]].js. A plain static file server does not, so
 * clean URLs 404 locally even though they work in production. This server
 * mirrors that Function so local preview matches the deployed site.
 *
 * The clean-URL map is parsed out of the Pages Function itself rather than
 * duplicated here, so the two cannot drift apart.
 *
 * Usage: node scripts/dev-server.js [port]
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const WEBSITE_DIR = path.join(__dirname, '..', 'website');
const FUNCTION_FILE = path.join(WEBSITE_DIR, 'functions', '[[path]].js');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Reads the clean-URL map out of the Cloudflare Pages Function so local
 * preview uses exactly the production mapping.
 * @returns {Object<string, string>} Clean path to HTML file path
 */
function readCleanUrlMap() {
  const source = fs.readFileSync(FUNCTION_FILE, 'utf8');
  const block = source.match(/const cleanUrls = \{([\s\S]*?)\}/);

  if (!block) {
    throw new Error('Could not parse cleanUrls from ' + FUNCTION_FILE);
  }

  const map = {};
  const entry = /'([^']+)'\s*:\s*'([^']+)'/g;
  let match;

  while ((match = entry.exec(block[1])) !== null) {
    map[match[1]] = match[2];
  }

  return map;
}

/**
 * Resolves a request path to a file on disk, guarding against traversal.
 * @param {string} pathname - Request pathname
 * @returns {?string} Absolute file path, or null when outside the root
 */
function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const target = path.join(WEBSITE_DIR, decoded);
  const relative = path.relative(WEBSITE_DIR, target);

  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return target;
}

/**
 * Sends a file with the correct content type.
 * @param {http.ServerResponse} res - Response
 * @param {string} filePath - Absolute file path
 */
function sendFile(res, filePath) {
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'});
  fs.createReadStream(filePath).pipe(res);
}

/**
 * Sends a permanent redirect, matching the Pages Function behavior.
 * @param {http.ServerResponse} res - Response
 * @param {string} location - Target location
 */
function redirect(res, location) {
  res.writeHead(301, {Location: location});
  res.end();
}

const cleanUrls = readCleanUrlMap();

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  // Clean URL rewrite - serve the HTML without changing the browser URL
  if (cleanUrls[pathname]) {
    const filePath = resolveFile(cleanUrls[pathname]);
    if (filePath && fs.existsSync(filePath)) return sendFile(res, filePath);
  }

  // Trailing slash on a clean URL redirects to the canonical form
  if (pathname.endsWith('/') && pathname !== '/') {
    const trimmed = pathname.slice(0, -1);
    if (cleanUrls[trimmed]) return redirect(res, trimmed);
  }

  // Legacy redirects, mirrored from the Pages Function
  if (pathname === '/screenshots') return redirect(res, '/features');
  if (pathname === '/index.html') return redirect(res, '/');

  const filePath = resolveFile(pathname === '/' ? '/index.html' : pathname);

  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return sendFile(res, filePath);
  }

  res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
  res.end('<h1>404 Not Found</h1><p>No file for <code>' + pathname + '</code></p>');
});

server.listen(PORT, () => {
  console.log('College Tools website preview');
  console.log('  http://localhost:' + PORT);
  console.log('  Clean URLs: ' + Object.keys(cleanUrls).join(', '));
  console.log('  Ctrl+C to stop');
});
