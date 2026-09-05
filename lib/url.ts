/**
 * Helper to get the canonical base URL for the application across:
 * - Local development (http://localhost:3000)
 * - Vercel previews (https://synapse-xxx.vercel.app)
 * - Custom production domains (https://synapse.app)
 * - Reverse proxies (using x-forwarded headers when available)
 */
export function getURL(path: string = ''): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000';

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
