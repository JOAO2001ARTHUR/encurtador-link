export const RESERVED_SLUGS = new Set([
  'api',
  '_next',
  'static',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'admin',
  'dashboard',
  'links',
  'stats',
  'new',
  'edit',
  'delete',
  'qr',
  'auth',
  'login',
  'logout',
  'health',
  'status',
]);

export function normalizeUrl(url: string): string {
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeUrl(url));
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname.includes('.') &&
      parsed.hostname.length > 3
    );
  } catch {
    return false;
  }
}

export function sanitizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateRandomSlug(length = 6): string {
  // Discard ambiguous characters (0, O, 1, l, I)
  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
