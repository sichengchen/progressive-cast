import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const feedUrl = searchParams.get('url');

  if (!feedUrl) {
    return NextResponse.json(
      { error: 'Missing required parameter: url' },
      { status: 400 }
    );
  }

  try {
    // Validate URL format
    const url = new URL(feedUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json(
        { error: 'Invalid URL protocol. Only HTTP and HTTPS are allowed.' },
        { status: 400 }
      );
    }

    // Fetch RSS content
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Progressive-Cast/1.0 (Podcast Player)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
      // Set timeout
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch RSS feed: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('xml')) {
      return NextResponse.json(
        { error: 'Invalid content type. Expected XML format.' },
        { status: 400 }
      );
    }

    const rssContent = await response.text();

    // Return RSS content with appropriate CORS headers
    return new NextResponse(rssContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Cache for 1 hour
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('RSS fetch error:', error);
    
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch RSS feed' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 