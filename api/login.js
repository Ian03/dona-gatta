import { loginResponse } from './_auth.js';

export default async function handler(request) {
  if (request.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405 });
  try {
    return loginResponse((await request.json()).password);
  } catch {
    return Response.json({ error: 'Envie uma senha válida.' }, { status: 400 });
  }
}
