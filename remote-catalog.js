let remoteCatalog;

async function getRemoteCatalogCollections() {
  if (remoteCatalog !== undefined) return remoteCatalog;
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    const response = await fetch('/api/catalog', { cache: 'no-store', signal: controller.signal });
    window.clearTimeout(timeout);
    if (!response.ok) throw new Error('Catálogo remoto indisponível');
    const catalog = await response.json();
    remoteCatalog = Array.isArray(catalog.collections) && catalog.collections.length ? catalog.collections : null;
  } catch {
    remoteCatalog = null;
  }
  return remoteCatalog;
}
