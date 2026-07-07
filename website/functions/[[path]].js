// Cloudflare Pages Function for clean URL handling
// This handles all requests and provides true URL rewrites (not redirects)

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Clean URL mappings - serve HTML files without changing browser URL
  const cleanUrls = {
    '/getting-started': '/getting-started.html',
    '/features': '/features.html', 
    '/privacy': '/privacy.html',
    '/terms': '/terms.html'
  };

  // Handle clean URLs - serve HTML content without redirect
  if (cleanUrls[pathname]) {
    // Modify the URL to point to the actual HTML file
    const newUrl = new URL(request.url);
    newUrl.pathname = cleanUrls[pathname];
    
    // Fetch the HTML file content
    const modifiedRequest = new Request(newUrl, request);
    return await env.ASSETS.fetch(modifiedRequest);
  }

  // Handle trailing slashes - redirect to clean URLs
  if (pathname.endsWith('/') && pathname !== '/') {
    const cleanPath = pathname.slice(0, -1);
    if (cleanUrls[cleanPath]) {
      const redirectUrl = new URL(cleanPath, request.url);
      return Response.redirect(redirectUrl, 301);
    }
  }

  // Handle legacy screenshots redirect  
  if (pathname === '/screenshots') {
    const redirectUrl = new URL('/features', request.url);
    return Response.redirect(redirectUrl, 301);
  }

  // Handle index.html redirect
  if (pathname === '/index.html') {
    const redirectUrl = new URL('/', request.url);
    return Response.redirect(redirectUrl, 301);
  }

  // For all other requests, continue with normal processing
  return await next();
}