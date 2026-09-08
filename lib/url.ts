/**
 * Helper to get the canonical base URL for the application across:
 * - Browser runtime (window.location.origin — always matches the actual origin)
 * - Vercel deployments & previews (VERCEL_URL / NEXT_PUBLIC_VERCEL_URL)
 * - Custom production domains (NEXT_PUBLIC_SITE_URL)
 * - Local development (http://localhost:3000)
 */
export function getURL(path: string = ''): string {
  // 1. Browser context: ALWAYS use the active window's origin
  // This guarantees that whether the user is on localhost, Vercel preview (*.vercel.app),
  // or a custom domain, client redirects always stay on the current origin!
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
    return `${origin}${cleanPath}`;
  }

  // 2. Server context: Check environment variables
  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  let url = '';

  // If NEXT_PUBLIC_SITE_URL is explicitly configured and not localhost, use it
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
    url = process.env.NEXT_PUBLIC_SITE_URL;
  } else if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    url = process.env.NEXT_PUBLIC_APP_URL;
  } else if (vercelUrl) {
    url = `https://${vercelUrl}`;
  } else {
    url =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';
  }

  // Ensure url has a protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Normalize path
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  return `${url}${cleanPath}`;
}

/**
 * Get request origin respecting reverse proxies (X-Forwarded-Proto & X-Forwarded-Host)
 */
export function getRequestOrigin(request: Request): string {
  const headers = request.headers;
  const forwardedHost = headers.get('x-forwarded-host');
  const forwardedProto = headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = headers.get('host');
  if (host) {
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    const proto = isLocalhost ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  return getURL();
}
