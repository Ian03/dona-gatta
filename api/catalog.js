import { get, put } from '@vercel/blob';
import { requireAdmin } from './_auth.js';

const CATALOG_PATH = 'catalog/catalog.json';

async function readCatalog() {
  const result = await get(CATALOG_PATH, { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}

export default async function handler(request) {
  if (request.method === 'GET') {
    try {
      const catalog = await readCatalog();
      return Response.json(catalog || { version: 1, collections: [] }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('Erro ao ler catálogo:', error);
      return Response.json({ error: 'Não foi possível carregar o catálogo.' }, { status: 500 });
    }
  }

  if (request.method !== 'PUT') return Response.json({ error: 'Método não permitido.' }, { status: 405 });
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    if (!Array.isArray(body.collections)) throw new Error('Formato inválido.');
    const catalog = { version: 1, collections: body.collections, updatedAt: new Date().toISOString() };
    await put(CATALOG_PATH, JSON.stringify(catalog), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      allowOverwrite: true,
      cacheControlMaxAge: 0
    });
    return Response.json(catalog);
  } catch (error) {
    return Response.json({ error: error.message || 'Não foi possível salvar o catálogo.' }, { status: 400 });
  }
}
