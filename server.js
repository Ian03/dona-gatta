import { createServer } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const realRoot = realpathSync(ROOT);
const hbuildsAt = realRoot.indexOf(`${path.sep}hbuilds${path.sep}`);
const domainRoot = hbuildsAt >= 0 ? realRoot.slice(0, hbuildsAt) : ROOT;
const DATA_DIR = process.env.DATA_DIR || (hbuildsAt >= 0
  ? path.join(domainRoot, '.dona-gatta-data')
  : path.join(ROOT, 'runtime-data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const SITE_SETTINGS_FILE = path.join(DATA_DIR, 'site-settings.json');
const MAX_UPLOAD = 8 * 1024 * 1024;
const SESSION_AGE_SECONDS = 12 * 60 * 60;
const SITE_COVER_WIDTH = 1600;
const SITE_COVER_HEIGHT = 721;

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });

function getSessionSecret() {
  const secretPath = path.join(DATA_DIR, 'session-secret.key');
  if (!existsSync(secretPath)) {
    try { writeFileSync(secretPath, randomBytes(48), { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  return readFileSync(secretPath);
}

const SESSION_SECRET = getSessionSecret();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.pdf': 'application/pdf', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff', '.woff2': 'font/woff2'
};

function securityHeaders(response) {
  response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; connect-src 'self'; frame-src 'none'; manifest-src 'self'; worker-src 'self' blob:; upgrade-insecure-requests");
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0' });
  response.end(JSON.stringify(value));
}

function fixText(value) {
  if (typeof value !== 'string' || !/[ÃÂ]/.test(value)) return value;
  return Buffer.from(value, 'latin1').toString('utf8');
}

function normalizeName(value) {
  return fixText(value || '').replace(/^Modelo\s+/i, '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function localImagePath(folder, number, type) {
  const file = `${String(number).padStart(2, '0')}-${type}.webp`;
  return `/${['assets', 'otimizadas', 'Verao', folder, file].map(encodeURIComponent).join('/')}`;
}

function initialCatalog() {
  const backupPath = path.join(ROOT, 'backups', 'supabase-public-data.json');
  if (!existsSync(backupPath)) return { version: 1, collections: [] };
  const backupJson = readFileSync(backupPath, 'utf8').replace(/^\uFEFF/, '');
  const backup = JSON.parse(backupJson).backup;
  const models = [
    ['all-inclusive', 'ALL INCLUSIVE'], ['beach-club', 'BEACH CLUB'], ['capri', 'CAPRI'],
    ['check-in', 'CHECK IN'], ['day-use', 'DAY USE'], ['escape', 'ESCAPE'], ['lounge', 'LOUNGE'],
    ['MAR', 'MARÉ'], ['RESORT', 'RESORT'], ['SUNSET', 'SUNSET']
  ];
  const result = [];
  for (const [matchName, folder] of models) {
    const collection = (backup.colecoes || []).find(row => normalizeName(row.nome).includes(normalizeName(matchName)));
    if (!collection) continue;
    const rows = (backup.variacoes || []).filter(row => row.colecao_id === collection.id)
      .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
    const variations = rows.map((row, index) => ({
      ...row,
      descricao: fixText(row.descricao || `Variação ${String(index + 1).padStart(2, '0')}`),
      valor_vista: fixText(row.valor_vista || ''),
      valor_parcelado: fixText(row.valor_parcelado || ''),
      imagem_url: localImagePath(folder, index + 1, 'detail')
    }));
    result.push({
      ...collection,
      nome: fixText(collection.nome),
      catalogo_intro: fixText(collection.catalogo_intro || ''),
      catalogo_eyebrow: fixText(collection.catalogo_eyebrow || 'Coleção DESTINOS'),
      parcelamento_maximo: Number(collection.parcelamento_maximo || 5),
      capa_url: localImagePath(folder, 1, 'card'),
      variacoes: variations
    });
  }
  return { version: 1, updated_at: new Date().toISOString(), collections: result };
}

function readCatalog() {
  if (!existsSync(CATALOG_FILE)) {
    const temporary = `${CATALOG_FILE}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(initialCatalog(), null, 2), { mode: 0o600 });
    try { renameSync(temporary, CATALOG_FILE); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  const catalog = JSON.parse(readFileSync(CATALOG_FILE, 'utf8'));
  const fallbackCovers = [
    ['all-inclusive', 'ALL INCLUSIVE'], ['beach-club', 'BEACH CLUB'], ['capri', 'CAPRI'],
    ['check-in', 'CHECK IN'], ['day-use', 'DAY USE'], ['escape', 'ESCAPE'], ['lounge', 'LOUNGE'],
    ['maré', 'MARÉ'], ['resort', 'RESORT'], ['sunset', 'SUNSET']
  ];
  for (const collection of catalog.collections || []) {
    if (collection.capa_url) continue;
    const match = fallbackCovers.find(([name]) => normalizeName(collection.nome) === normalizeName(name));
    if (match) collection.capa_url = localImagePath(match[1], 1, 'card');
  }
  return catalog;
}

function saveCatalog(collections) {
  const catalog = { version: 1, updated_at: new Date().toISOString(), collections };
  const temporary = `${CATALOG_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(catalog, null, 2), { mode: 0o600 });
  renameSync(temporary, CATALOG_FILE);
  return catalog;
}

function readSiteCover() {
  if (!existsSync(SITE_SETTINGS_FILE)) return '';
  try {
    const settings = JSON.parse(readFileSync(SITE_SETTINGS_FILE, 'utf8'));
    return typeof settings.coverUrl === 'string' ? settings.coverUrl : '';
  } catch (error) {
    console.error('Erro ao ler configurações do site:', error);
    return '';
  }
}

function saveSiteCover(coverUrl) {
  if (coverUrl && !/^\/uploads\/capas\/[a-f0-9]{32}\.(?:jpg|png|webp)$/i.test(coverUrl)) {
    throw Object.assign(new Error('Imagem de capa inválida.'), { status: 400 });
  }
  if (coverUrl) {
    const filename = path.basename(coverUrl);
    const filePath = path.join(UPLOAD_DIR, 'capas', filename);
    const mime = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[path.extname(filename).slice(1).toLowerCase()];
    if (!existsSync(filePath)) throw Object.assign(new Error('O arquivo da capa não foi encontrado.'), { status: 400 });
    const data = readFileSync(filePath);
    const dimensions = getImageDimensions(data, mime);
    if (!dimensions || dimensions.width !== SITE_COVER_WIDTH || dimensions.height !== SITE_COVER_HEIGHT) {
      throw Object.assign(new Error(`A capa precisa ter exatamente ${SITE_COVER_WIDTH} × ${SITE_COVER_HEIGHT} px.`), { status: 400 });
    }
  }
  const temporary = `${SITE_SETTINGS_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify({ coverUrl, updated_at: new Date().toISOString() }, null, 2), { mode: 0o600 });
  renameSync(temporary, SITE_SETTINGS_FILE);
}

function readBody(request, maximumBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > maximumBytes) {
        reject(Object.assign(new Error('Requisição muito grande.'), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function parseMultipart(buffer, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.slice(1).find(Boolean);
  if (!boundary) throw Object.assign(new Error('Formulário inválido.'), { status: 400 });
  const marker = Buffer.from(`--${boundary}`);
  const parts = {};
  let cursor = 0;
  while ((cursor = buffer.indexOf(marker, cursor)) !== -1) {
    cursor += marker.length;
    if (buffer.subarray(cursor, cursor + 2).toString() === '--') break;
    if (buffer.subarray(cursor, cursor + 2).toString() === '\r\n') cursor += 2;
    const headersEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), cursor);
    if (headersEnd < 0) break;
    const headers = buffer.subarray(cursor, headersEnd).toString('utf8');
    const dataStart = headersEnd + 4;
    const nextBoundary = buffer.indexOf(Buffer.concat([Buffer.from('\r\n'), marker]), dataStart);
    if (nextBoundary < 0) break;
    const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || '';
    const name = disposition.match(/name="([^"]+)"/)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/)?.[1];
    if (name) parts[name] = { filename, data: buffer.subarray(dataStart, nextBoundary), headers };
    cursor = nextBoundary + 2;
  }
  return parts;
}

function cookieValue(request, key) {
  return (request.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${key}=`))?.slice(key.length + 1) || '';
}

function sign(payload) {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function isAdmin(request) {
  try {
    const [payload, signature] = cookieValue(request, 'dona_gatta_admin').split('.');
    if (!payload || !signature) return false;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.expiresAt > Date.now();
  } catch { return false; }
}

function requireAdmin(request, response) {
  if (isAdmin(request)) return true;
  sendJson(response, 401, { error: 'Não autorizado. Faça login novamente.' });
  return false;
}

function isImage(data, mime) {
  if (mime === 'image/jpeg') return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mime === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/webp') return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  return false;
}

function getImageDimensions(data, mime) {
  if (mime === 'image/png' && data.length >= 24 && data.toString('ascii', 12, 16) === 'IHDR') {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (mime === 'image/jpeg' && data.length >= 4) {
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) { offset++; continue; }
      while (data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > data.length) break;
      const segmentLength = data.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > data.length) break;
      const isFrame = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
        || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (isFrame && segmentLength >= 7) {
        return { height: data.readUInt16BE(offset + 3), width: data.readUInt16BE(offset + 5) };
      }
      offset += segmentLength;
    }
  }
  if (mime === 'image/webp' && data.length >= 30 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    let offset = 12;
    while (offset + 8 <= data.length) {
      const chunkType = data.toString('ascii', offset, offset + 4);
      const chunkSize = data.readUInt32LE(offset + 4);
      const chunk = offset + 8;
      if (chunk + chunkSize > data.length) break;
      if (chunkType === 'VP8X' && chunkSize >= 10) {
        return { width: 1 + data.readUIntLE(chunk + 4, 3), height: 1 + data.readUIntLE(chunk + 7, 3) };
      }
      if (chunkType === 'VP8 ' && chunkSize >= 10 && data[chunk + 3] === 0x9d && data[chunk + 4] === 0x01 && data[chunk + 5] === 0x2a) {
        return { width: data.readUInt16LE(chunk + 6) & 0x3fff, height: data.readUInt16LE(chunk + 8) & 0x3fff };
      }
      if (chunkType === 'VP8L' && chunkSize >= 5 && data[chunk] === 0x2f) {
        const bits = data.readUInt32LE(chunk + 1);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      offset = chunk + chunkSize + (chunkSize & 1);
    }
  }
  return null;
}

function handleUpload(request, response) {
  if (!requireAdmin(request, response)) return;
  readBody(request, MAX_UPLOAD + 64 * 1024).then(buffer => {
    const parts = parseMultipart(buffer, request.headers['content-type'] || '');
    const file = parts.file;
    const mime = file?.headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase();
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const requestedPath = parts.path?.data.toString() || '';
    const isSiteCoverUpload = requestedPath.replace(/\\/g, '/').startsWith('capas/site-cover/');
    if (!file?.filename || file.data.length > MAX_UPLOAD || !extensions[mime] || !isImage(file.data, mime)) {
      sendJson(response, 400, { error: 'Envie JPG, PNG ou WEBP de até 8 MB.' });
      return;
    }
    if (isSiteCoverUpload) {
      const dimensions = getImageDimensions(file.data, mime);
      if (!dimensions || dimensions.width !== SITE_COVER_WIDTH || dimensions.height !== SITE_COVER_HEIGHT) {
        sendJson(response, 400, { error: `A capa precisa ter exatamente ${SITE_COVER_WIDTH} × ${SITE_COVER_HEIGHT} px.` });
        return;
      }
    }
    const requestedFolder = requestedPath.split(/[\\/]/, 1)[0];
    const bucket = parts.bucket?.data.toString() || '';
    const directoryName = ['capas', 'variacoes'].includes(requestedFolder)
      ? requestedFolder
      : ['capas', 'variacoes'].includes(bucket) ? bucket : 'imagens';
    const directory = path.join(UPLOAD_DIR, directoryName);
    mkdirSync(directory, { recursive: true });
    const filename = `${randomBytes(16).toString('hex')}.${extensions[mime]}`;
    writeFileSync(path.join(directory, filename), file.data, { flag: 'wx', mode: 0o644 });
    sendJson(response, 201, { path: `${directoryName}/${filename}`, url: `/uploads/${directoryName}/${filename}` });
  }).catch(error => sendJson(response, error.status || 400, { error: error.message || 'Não foi possível enviar a imagem.' }));
}

function handleApi(request, response, url) {
  const action = url.searchParams.get('action');
  const method = request.method;
  if (action === 'session' && method === 'GET') {
    sendJson(response, 200, { authenticated: isAdmin(request) });
    return;
  }
  if (action === 'login' && method === 'POST') {
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword) {
      sendJson(response, 503, { error: 'Configure ADMIN_PASSWORD nas variáveis da aplicação Hostinger.' });
      return;
    }
    readBody(request, 16 * 1024).then(buffer => {
      let body;
      try { body = JSON.parse(buffer.toString('utf8')); }
      catch { sendJson(response, 400, { error: 'Envie email e senha válidos.' }); return; }
      if (String(body.email || '').trim().toLowerCase() !== 'admin@donagatta.com' || String(body.password || '') !== configuredPassword) {
        sendJson(response, 401, { error: 'Email ou senha incorretos.' });
        return;
      }
      const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + SESSION_AGE_SECONDS * 1000 })).toString('base64url');
      const secure = request.socket.encrypted || request.headers['x-forwarded-proto'] === 'https';
      const cookie = `dona_gatta_admin=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_AGE_SECONDS}${secure ? '; Secure' : ''}`;
      response.setHeader('Set-Cookie', cookie);
      sendJson(response, 200, { ok: true });
    }).catch(error => sendJson(response, error.status || 400, { error: 'Não foi possível autenticar.' }));
    return;
  }
  if (action === 'logout' && method === 'POST') {
    response.setHeader('Set-Cookie', 'dona_gatta_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    sendJson(response, 200, { ok: true });
    return;
  }
  if (action === 'catalog' && method === 'GET') {
    try { sendJson(response, 200, readCatalog()); }
    catch (error) { console.error('Erro ao ler catálogo:', error); sendJson(response, 500, { error: 'Não foi possível carregar o catálogo.' }); }
    return;
  }
  if (action === 'catalog' && method === 'PUT') {
    if (!requireAdmin(request, response)) return;
    readBody(request, 5 * 1024 * 1024).then(buffer => {
      let body;
      try { body = JSON.parse(buffer.toString('utf8')); }
      catch { sendJson(response, 400, { error: 'Catálogo inválido.' }); return; }
      if (!Array.isArray(body.collections)) { sendJson(response, 400, { error: 'Formato de catálogo inválido.' }); return; }
      try { sendJson(response, 200, saveCatalog(body.collections)); }
      catch (error) { console.error('Erro ao salvar catálogo:', error); sendJson(response, 500, { error: 'Não foi possível gravar o catálogo.' }); }
    }).catch(error => sendJson(response, error.status || 400, { error: error.message }));
    return;
  }
  if (action === 'site-cover' && method === 'GET') {
    sendJson(response, 200, { coverUrl: readSiteCover() });
    return;
  }
  if (action === 'site-cover' && method === 'PUT') {
    if (!requireAdmin(request, response)) return;
    readBody(request, 16 * 1024).then(buffer => {
      let body;
      try { body = JSON.parse(buffer.toString('utf8')); }
      catch { sendJson(response, 400, { error: 'Configuração inválida.' }); return; }
      if (typeof body.coverUrl !== 'string') { sendJson(response, 400, { error: 'Endereço da capa inválido.' }); return; }
      try {
        saveSiteCover(body.coverUrl);
        sendJson(response, 200, { coverUrl: body.coverUrl });
      } catch (error) {
        sendJson(response, error.status || 500, { error: error.message || 'Não foi possível salvar a capa.' });
      }
    }).catch(error => sendJson(response, error.status || 400, { error: error.message }));
    return;
  }
  if (action === 'upload' && method === 'POST') { handleUpload(request, response); return; }
  sendJson(response, 404, { error: 'Rota não encontrada.' });
}

function safeStaticPath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { return null; }
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(part => part.startsWith('.') || ['private', 'backups', 'backup-vercel', 'api', 'node_modules'].includes(part.toLowerCase()))) return null;
  if (segments.some(part => ['package.json', 'package-lock.json', 'server.js', 'hostinger.md'].includes(part.toLowerCase()))) return null;
  if (segments.some(part => /\.(php\d*|phtml|phar)$/i.test(part))) return null;
  const relative = segments.length ? path.join(...segments) : 'index.html';
  const file = path.resolve(ROOT, relative);
  return file.startsWith(`${ROOT}${path.sep}`) ? file : null;
}

function serveStatic(request, response, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  let file;
  if (url.pathname.startsWith('/uploads/')) {
    let relative;
    try { relative = url.pathname.slice('/uploads/'.length).split('/').map(decodeURIComponent); }
    catch { response.writeHead(400); response.end(); return; }
    if (relative.length !== 2 || !['capas', 'variacoes', 'imagens'].includes(relative[0])) file = null;
    else file = path.resolve(UPLOAD_DIR, relative[0], relative[1]);
    if (file && !file.startsWith(`${UPLOAD_DIR}${path.sep}`)) file = null;
  } else {
    file = safeStaticPath(url.pathname);
  }
  if (!file || !existsSync(file)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Não encontrado.');
    return;
  }
  let stats;
  try { stats = statSync(file); }
  catch { response.writeHead(404); response.end(); return; }
  if (!stats.isFile()) { response.writeHead(404); response.end(); return; }
  const headers = { 'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream' };
  if (['.html', '.js', '.css', '.webmanifest'].includes(path.extname(file).toLowerCase()) || path.basename(file) === 'sw.js') headers['Cache-Control'] = 'no-store, max-age=0, must-revalidate';
  else headers['Cache-Control'] = 'public, max-age=3600';
  response.writeHead(200, headers);
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
}

const server = createServer((request, response) => {
  securityHeaders(response);
  let url;
  try { url = new URL(request.url, 'http://localhost'); }
  catch { response.writeHead(400); response.end(); return; }
  if (url.pathname === '/api/index.php') { handleApi(request, response, url); return; }
  serveStatic(request, response, url);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Dona Gatta ouvindo na porta ${port}`));
