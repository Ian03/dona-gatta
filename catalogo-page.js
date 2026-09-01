function parseBrazilianPrice(value) {
  if (value == null) return NaN;
  const normalized = String(value).replace(/\s+/g, '').replace(/[R$r$\u00A0]/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) return NaN;
  return Number(normalized);
}

function formatBrazilianPrice(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function clampInstallments(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(12, Math.max(1, parsed));
}

function buildInstallmentLabel(value) {
  const installments = clampInstallments(value);
  return `Até ${installments}x${installments <= 5 ? ' sem juros' : ''}`;
}

function getCollectionPriceSummary(variacoes = []) {
  const valid = variacoes.map(v => ({
    parceladoRaw: v.valor_parcelado,
    vistaRaw: v.valor_vista,
    parcelado: parseBrazilianPrice(v.valor_parcelado),
    vista: parseBrazilianPrice(v.valor_vista)
  })).filter(v => Number.isFinite(v.parcelado) || Number.isFinite(v.vista));
  if (!valid.length) return null;
  const featured = valid.filter(v => Number.isFinite(v.parcelado)).sort((a, b) => a.parcelado - b.parcelado)[0] || valid[0];
  const pix = valid.filter(v => Number.isFinite(v.vista)).sort((a, b) => a.vista - b.vista)[0] || valid[0];
  const savings = Number.isFinite(featured.parcelado) && Number.isFinite(pix.vista) && featured.parcelado >= pix.vista ? featured.parcelado - pix.vista : NaN;
  return { parceladoLabel: featured.parceladoRaw || '', vistaLabel: pix.vistaRaw || '', savings };
}

function buildPriceSummaryHTML(summary, installmentLimit) {
  const wrap = document.createElement('div');
  wrap.className = 'catalog-prices';
  const featured = document.createElement('div');
  featured.className = 'price-chip price-chip-featured';
  const featuredLabel = document.createElement('span');
  featuredLabel.className = 'price-chip-label';
  featuredLabel.textContent = 'Parcelado';
  const featuredValue = document.createElement('strong');
  featuredValue.className = 'price-chip-value';
  featuredValue.textContent = summary?.parceladoLabel || 'Consulte';
  const featuredNote = document.createElement('span');
  featuredNote.className = 'price-chip-note';
  featuredNote.textContent = buildInstallmentLabel(installmentLimit);
  featured.append(featuredLabel, featuredValue, featuredNote);

  const pix = document.createElement('div');
  pix.className = 'price-chip price-chip-pix';
  const pixLabel = document.createElement('span');
  pixLabel.className = 'price-chip-label';
  pixLabel.textContent = 'À vista no Pix';
  const pixValue = document.createElement('strong');
  pixValue.className = 'price-chip-value';
  pixValue.textContent = summary?.vistaLabel || 'Consulte';
  const pixSaving = document.createElement('span');
  pixSaving.className = `price-chip-saving ${Number.isFinite(summary?.savings) && summary.savings > 0 ? '' : 'price-chip-saving-neutral'}`;
  pixSaving.textContent = Number.isFinite(summary?.savings) && summary.savings > 0
    ? `Economize ${formatBrazilianPrice(summary.savings)} no Pix`
    : 'Melhor valor para pagamento à vista';
  pix.append(pixLabel, pixValue, pixSaving);

  wrap.append(featured, pix);
  return wrap;
}

async function loadCatalog() {
  let collections = [];
  const remote = typeof getRemoteCatalogCollections === 'function' ? await getRemoteCatalogCollections() : null;
  if (remote) collections = remote;
  else if (typeof getLocalCatalogCollections === 'function') collections = getLocalCatalogCollections();

  const grid = document.getElementById('catalog-grid');
  if (!collections.length) {
    grid.replaceChildren();
    const empty = document.createElement('p');
    empty.style.gridColumn = '1/-1';
    empty.style.textAlign = 'center';
    empty.textContent = 'Nenhuma coleção disponível no momento.';
    grid.append(empty);
    return;
  }

  grid.replaceChildren();
  collections.forEach(c => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `modelo.html?id=${encodeURIComponent(c.id)}`;
    card.setAttribute('aria-label', `Ver variações do modelo ${c.nome}`);
    const photo = document.createElement('div');
    photo.className = 'product-photo';
    const img = document.createElement('img');
    img.src = c.capa_url || '';
    img.width = 720;
    img.height = 900;
    img.alt = `Óculos ${c.nome}`;
    img.fetchPriority = 'high';
    img.decoding = 'async';
    photo.append(img);
    const info = document.createElement('div');
    info.className = 'card-info';
    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = c.nome || 'Modelo';
    const code = document.createElement('div');
    code.className = 'card-code';
    code.textContent = 'Coleção Verão · Ver variações';
    info.append(name, code, buildPriceSummaryHTML(getCollectionPriceSummary(c.variacoes), c.parcelamento_maximo));
    card.append(photo, info);
    grid.append(card);
  });
}

loadCatalog();
