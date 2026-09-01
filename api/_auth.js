import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_NAME = 'dona_gatta_admin';
const SESSION_MAX_AGE = 60 * 60 * 12;

function secret() {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    throw new Error('ADMIN_PASSWORD e ADMIN_SESSION_SECRET precisam ser configurados na Vercel.');
  }
  return process.env.ADMIN_SESSION_SECRET;
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function cookies(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(pair => pair.length));
}

export function isAdmin(request) {
  try {
    const token = cookies(request)[SESSION_NAME];
    if (!token) return false;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const { expiresAt } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(request) {
  if (isAdmin(request)) return null;
  return Response.json({ error: 'Não autorizado.' }, { status: 401 });
}

export function loginResponse(password) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const actual = String(password || '');
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: 'Senha incorreta.' }, { status: 401 });
  }
  const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + SESSION_MAX_AGE * 1000 })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${SESSION_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`,
      'Cache-Control': 'no-store'
    }
  });
}

export function logoutResponse() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${SESSION_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
      'Cache-Control': 'no-store'
    }
  });
}
