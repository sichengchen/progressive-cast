import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Validate URL
    new URL(url);
    
    // Fetch the audio file from the external server
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Progressive Cast Podcast App/1.0'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get content type and content length
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');

    // Create response headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Stream the response
    return new NextResponse(response.body, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}