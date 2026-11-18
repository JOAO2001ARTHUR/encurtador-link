import { NextRequest, NextResponse } from 'next/server';
import { getLinkByCode, recordClick } from '@/lib/storage';
import { RESERVED_SLUGS } from '@/lib/utils';

interface RouteContext {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { code } = await context.params;

  // If this is a reserved slug, do not attempt to redirect
  if (RESERVED_SLUGS.has(code.toLowerCase())) {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    const link = await getLinkByCode(code);

    if (link && link.isActive) {
      // Record click count
      await recordClick(code);

      // Instant HTTP 307 Redirect directly to target URL
      return NextResponse.redirect(link.targetUrl, {
        status: 307,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'X-Redirect-By': 'AgilLink-Vercel',
        },
      });
    }

    // Link not found or disabled -> Redirect to home with notice
    const url = new URL('/', request.url);
    url.searchParams.set('not_found', code);
    return NextResponse.redirect(url, { status: 302 });
  } catch (err) {
    console.error(`[Redirect] Error redirecting slug "${code}":`, err);
    // On unexpected error, gracefully fallback to home
    const fallbackUrl = new URL('/', request.url);
    fallbackUrl.searchParams.set('error', 'redirect_failed');
    return NextResponse.redirect(fallbackUrl, { status: 302 });
  }
}
