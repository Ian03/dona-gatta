gsap.registerPlugin(ScrollTrigger);
gsap.set('.reveal', { autoAlpha: 1 });
gsap.from('.hero-copy', { y: 36, opacity: 0, duration: 1.1, ease: 'power3.out' });
gsap.utils.toArray('.reveal').slice(1).forEach(el => gsap.from(el, {
  scrollTrigger: { trigger: el, start: 'top 88%' },
  y: 35,
  opacity: 0,
  duration: .8,
  ease: 'power2.out'
}));
gsap.to('.hero-bg', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

const productModal = document.querySelector('.product-modal');
const modalClose = productModal.querySelector('.modal-close');

function closeProduct() {
  productModal.classList.remove('open');
  productModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('menu-open');
}

modalClose.addEventListener('click', closeProduct);
productModal.addEventListener('click', e => { if (e.target === productModal) closeProduct(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProduct(); });

const menu = document.querySelector('.mobile-menu');
const toggle = document.querySelector('.menu-toggle');
toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  document.body.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', open);
});
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  menu.classList.remove('open');
  document.body.classList.remove('menu-open');
  toggle.setAttribute('aria-expanded', 'false');
}));

function parseBrazilianPrice(value) {
  if (value == null) return NaN;
  const normalized = String(value).replace(/\s+/g, '').replace(/[R$r$\u00A0]/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
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

function buildHeartIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z');
  svg.append(path);
  return svg;
}

function buildPriceSummaryHTML(summary, installmentLimit) {
  const stack = document.createElement('div');
  stack.className = 'price-stack';
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

  stack.append(featured, pix);
  return stack;
}

async function loadIndexCollections() {
  let collections = [];
  if (typeof getLocalCatalogCollections === 'function') {
    collections = getLocalCatalogCollections();
  } else if (supabaseClient) {
    const { data, error } = await supabaseClient.from('colecoes').select('*, variacoes(valor_vista, valor_parcelado)').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    collections = data || [];
  }

  const wrapper = document.querySelector('.products');
  if (!wrapper) return;

  wrapper.replaceChildren();
  collections.forEach((model, index) => {
    const summary = getCollectionPriceSummary(model.variacoes);
    const article = document.createElement('article');
    article.className = 'product-card';
    const imageLink = document.createElement('a');
    imageLink.className = 'product-image';
    imageLink.href = `modelo.html?id=${encodeURIComponent(model.id)}`;
    imageLink.setAttribute('aria-label', `Ver variações do modelo ${model.nome}`);
    const img = document.createElement('img');
    img.src = model.capa_url || '';
    img.width = 720;
    img.height = 900;
    img.loading = index < 2 ? 'eager' : 'lazy';
    img.fetchPriority = index < 2 ? 'high' : 'low';
    img.decoding = 'async';
    img.alt = `Óculos ${model.nome}`;
    imageLink.append(img);

    const info = document.createElement('div');
    info.className = 'product-info';
    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'product-name';
    name.textContent = model.nome || 'Modelo';
    left.append(name, buildPriceSummaryHTML(summary, model.parcelamento_maximo));

    const heart = document.createElement('a');
    heart.className = 'heart';
    heart.href = `modelo.html?id=${encodeURIComponent(model.id)}`;
    heart.setAttribute('aria-label', `Ver variações do ${model.nome}`);
    heart.append(buildHeartIcon());

    info.append(left, heart);
    article.append(imageLink, info);
    wrapper.append(article);
  });
}

loadIndexCollections();
