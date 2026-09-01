import { isAdmin } from './_auth.js';

export default function handler(request) {
  return Response.json({ authenticated: isAdmin(request) }, { headers: { 'Cache-Control': 'no-store' } });
}
