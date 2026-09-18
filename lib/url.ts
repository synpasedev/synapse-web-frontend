/**
 * Application URL Constants
 */
export const PRODUCTION_SITE_URL = 'https://synapse-web-frontend-vercel.vercel.app';
export const LOCAL_DEV_SITE_URL = 'http://localhost:3000';

/**
 * Checks whether the current runtime environment is development mode
 */
export function isDevelopmentMode(): boolean {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }
  return process.env.NODE_ENV === 'development';
}

/**
 * Helper to get the canonical base URL for the application across:
 * - Browser runtime (window.location.origin — always matches the active origin)
 * - Development mode (defaults to http://localhost:3000 or window.location.origin)
 * - Production mode (defaults to https://synapse-web-frontend-vercel.vercel.app)
 * - Environment variables (NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL / VERCEL_PROJECT_PRODUCTION_URL)
 */
export function getURL(path: string = ''): string {
  // 1. Browser context: ALWAYS use the active window's origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
    return `${origin}${cleanPath}`;
  }

  // 2. Server context: Check development vs production
  let url = '';

  if (isDevelopmentMode()) {
    url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || LOCAL_DEV_SITE_URL;
  } else {
    // Production server context
    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (configuredUrl && !configuredUrl.includes('localhost') && !configuredUrl.includes('127.0.0.1')) {
      url = configuredUrl;
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      url = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else {
      url = PRODUCTION_SITE_URL;
    }
  }

  // Ensure url has a protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Sanitize: never use unassigned "synapse-web.vercel.app" without "-frontend-vercel"
  if (url.includes('synapse-web.vercel.app')) {
    url = url.replace('synapse-web.vercel.app', 'synapse-web-frontend-vercel.vercel.app');
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

/**
 * Canonical public URL for sharing notes, whiteboards, canvases, and workspace invites.
 * In development mode: returns http://localhost:3000 (or active localhost origin).
 * In production mode: returns https://synapse-web-frontend-vercel.vercel.app (or custom production domain).
 */
export function getPublicSiteUrl(path: string = ''): string {
  let baseUrl = '';

  // 1. Browser context
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isDevelopmentMode() || isLocal) {
      baseUrl = origin; // e.g. http://localhost:3000
    } else {
      baseUrl = origin; // e.g. https://synapse-web-frontend-vercel.vercel.app
    }
  }

  // 2. Server context
  if (!baseUrl) {
    if (isDevelopmentMode()) {
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || LOCAL_DEV_SITE_URL;
    } else {
      const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
      if (configuredUrl && !configuredUrl.includes('localhost') && !configuredUrl.includes('127.0.0.1')) {
        baseUrl = configuredUrl;
      } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
      } else {
        baseUrl = PRODUCTION_SITE_URL;
      }
    }
  }

  // Sanitize: never use unassigned "synapse-web.vercel.app" without "-frontend-vercel"
  if (baseUrl.includes('synapse-web.vercel.app')) {
    baseUrl = baseUrl.replace('synapse-web.vercel.app', 'synapse-web-frontend-vercel.vercel.app');
  }

  baseUrl = baseUrl.replace(/\/+$/, '');
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${baseUrl}${cleanPath}`;
}
