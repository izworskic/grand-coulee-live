const PHOTO_URL = 'https://www.usbr.gov/pn/grandcoulee/news/gallery/aerial/1.jpg';

export const runtime = 'nodejs';
export const revalidate = 86400;

export async function GET() {
  try {
    const upstream = await fetch(PHOTO_URL, {
      headers: {
        'User-Agent': 'GrandCouleeLive/1.0 (+https://chrisizworski.com)'
      },
      next: { revalidate: 86400 }
    });

    if (!upstream.ok) {
      return new Response('Grand Coulee dam image unavailable', {
        status: 502,
        headers: { 'Cache-Control': 'public, max-age=60' }
      });
    }

    const image = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    return new Response(image, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return new Response('Grand Coulee dam image unavailable', {
      status: 502,
      headers: { 'Cache-Control': 'public, max-age=60' }
    });
  }
}
