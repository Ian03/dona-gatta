let remoteCatalog;

async function getRemoteCatalogCollections() {
  if (remoteCatalog !== undefined) return remoteCatalog;
  try {
    const response = await fetch('/api/catalog', { cache: 'no-store' });
    if (!response.ok) throw new Error('Catálogo remoto indisponível');
    const catalog = await response.json();
    remoteCatalog = Array.isArray(catalog.collections) && catalog.collections.length ? catalog.collections : null;
  } catch {
    remoteCatalog = null;
  }
  return remoteCatalog;
}
