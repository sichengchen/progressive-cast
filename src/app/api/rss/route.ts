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
        'User-Agent': 'Mozilla/5.0 (compatible; Progressive-Cast/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/plain, */*',
      },
      // Increase timeout for production environment
      signal: AbortSignal.timeout(15000), // 15 seconds timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch RSS feed: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const rssContent = await response.text();

    // More flexible content validation - check if content looks like XML
    const trimmedContent = rssContent.trim();
    if (!trimmedContent.startsWith('<?xml') && !trimmedContent.startsWith('<rss') && !trimmedContent.startsWith('<feed')) {
      const contentType = response.headers.get('content-type');
      console.warn(`Suspicious content type: ${contentType}, content preview: ${trimmedContent.substring(0, 200)}`);
      
      // Still try to parse if it might be XML-like content
      if (!trimmedContent.includes('<') || !trimmedContent.includes('>')) {
        return NextResponse.json(
          { error: 'Invalid content format. Expected XML/RSS format.' },
          { status: 400 }
        );
      }
    }

    // Return RSS content with appropriate CORS headers
    return new NextResponse(rssContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
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

    // Handle timeout errors specifically
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timeout. The RSS feed took too long to respond.' },
        { status: 408 }
      );
    }

    // More detailed error reporting for production debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Detailed RSS fetch error:', {
      url: feedUrl,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: `Failed to fetch RSS feed: ${errorMessage}` },
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