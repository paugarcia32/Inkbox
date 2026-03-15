import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function handler(req: NextRequest): Promise<NextResponse> {
  const url = `${API_URL}${req.nextUrl.pathname}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.arrayBuffer()
      : undefined;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });

  // Build response headers, handling Set-Cookie specially
  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      resHeaders.append(key, value);
    }
  });

  // Forward each Set-Cookie header individually
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    resHeaders.append('set-cookie', cookie);
  }

  return new NextResponse(
    [204, 304].includes(upstream.status) ? null : upstream.body,
    { status: upstream.status, headers: resHeaders },
  );
}

export const GET = handler;
export const POST = handler;
