import { get } from '@vercel/blob';

export default async function handler(request) {
  const pathname = new URL(request.url).searchParams.get('pathname');
  if (!pathname || !pathname.startsWith('images/')) return new Response('Não encontrado.', { status: 404 });
  const result = await get(pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') || undefined });
  if (!result) return new Response('Não encontrado.', { status: 404 });
  if (result.statusCode === 304) return new Response(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      'X-Content-Type-Options': 'nosniff',
      ETag: result.blob.etag,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
