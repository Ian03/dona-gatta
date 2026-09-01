import { put } from '@vercel/blob';
import { requireAdmin } from './_auth.js';

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405 });
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !TYPES.has(file.type) || file.size > MAX_BYTES) {
      return Response.json({ error: 'Envie JPG, PNG ou WEBP de no máximo 8 MB.' }, { status: 400 });
    }
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
    const pathname = `images/${Date.now()}-${safeName}`;
    await put(pathname, file, { access: 'private', contentType: file.type, cacheControlMaxAge: 31536000 });
    return Response.json({ url: `/api/media?pathname=${encodeURIComponent(pathname)}`, pathname });
  } catch (error) {
    console.error('Erro no upload:', error);
    return Response.json({ error: 'Não foi possível enviar a imagem.' }, { status: 500 });
  }
}
