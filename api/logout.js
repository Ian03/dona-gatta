import { logoutResponse } from './_auth.js';

export default function handler(request) {
  return request.method === 'POST'
    ? logoutResponse()
    : Response.json({ error: 'Método não permitido.' }, { status: 405 });
}
