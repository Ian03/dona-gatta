function parseBrazilianPrice(value) {
  if (value == null) return NaN;
  const normalized = String(value)
    .replace(/\s+/g, '')
    .replace(/[R$r$\u00A0]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  if (!normalized) return NaN;
  return Number(normalized);
}

function formatBrazilianPrice(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

const defaultCollectionEyebrow = 'Coleção Verão';
const defaultCollectionIntro = 'Escolha a sua variação favorita e consulte a disponibilidade com a nossa equipe.';

function clampInstallments(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(12, Math.max(1, parsed));
}

function buildInstallmentLabel(value) {
  const installments = clampInstallments(value);
  return `Até ${installments}x${installments <= 5 ? ' sem juros' : ''}`;
}

function buildPriceBlock(installmentValue, cashValue, installmentLimit) {
  const parcelado = parseBrazilianPrice(installmentValue);
  const vista = parseBrazilianPrice(cashValue);
  const hasValidPrices = Number.isFinite(parcelado) && Number.isFinite(vista) && parcelado >= vista;
  const savings = hasValidPrices ? parcelado - vista : 0;
  const block = document.createElement('div');
  block.className = 'price-block';

  const featured = document.createElement('div');
  featured.className = 'price-card price-card-featured';
  const featuredLabel = document.createElement('span');
  featuredLabel.className = 'price-label';
  featuredLabel.textContent = 'Parcelado';
  const featuredValue = document.createElement('strong');
  featuredValue.className = 'price-value';
  featuredValue.textContent = installmentValue || 'Consulte';
  const featuredNote = document.createElement('span');
  featuredNote.className = 'price-saving';
  featuredNote.textContent = buildInstallmentLabel(installmentLimit);
  featured.append(featuredLabel, featuredValue, featuredNote);

  const pix = document.createElement('div');
  pix.className = 'price-card price-card-pix';
  const pixLabel = document.createElement('span');
  pixLabel.className = 'price-label';
  pixLabel.textContent = 'À vista no Pix';
  const pixValue = document.createElement('strong');
  pixValue.className = 'price-value';
  pixValue.textContent = cashValue || 'Consulte';
  pix.append(pixLabel, pixValue);

  if (hasValidPrices && savings > 0) {
    const saving = document.createElement('span');
    saving.className = 'price-saving';
    saving.textContent = `Economize ${formatBrazilianPrice(savings)} no Pix`;
    pix.append(saving);
  }

  block.append(featured, pix);
  return block;
}

async function loadModel() {
  const urlParams = new URLSearchParams(window.location.search);
  const modelId = urlParams.get('id');

  if (!modelId) {
    document.getElementById('model-name').textContent = 'Modelo não encontrado.';
    document.getElementById('variations').replaceChildren();
    return;
  }

  let model = null;
  let error = null;
  if (typeof getLocalCatalogCollection === 'function') {
    model = getLocalCatalogCollection(modelId);
  } else if (supabaseClient) {
    const result = await supabaseClient
      .from('colecoes')
      .select('*, variacoes(*)')
      .eq('id', modelId)
      .single();
    model = result.data;
    error = result.error;
  }

  if (error || !model) {
    console.error(error);
    document.getElementById('model-name').textContent = 'Modelo não encontrado.';
    document.getElementById('variations').replaceChildren();
    return;
  }

  document.title = `${model.nome} — Coleção Verão | Dona Gatta`;
  document.getElementById('model-eyebrow').textContent = model.catalogo_eyebrow || defaultCollectionEyebrow;
  document.getElementById('model-name').textContent = model.nome;
  document.getElementById('model-intro').textContent = model.catalogo_intro || defaultCollectionIntro;

  const variationsContainer = document.getElementById('variations');
  if (!model.variacoes || model.variacoes.length === 0) {
    variationsContainer.replaceChildren();
    const empty = document.createElement('p');
    empty.style.gridColumn = '1/-1';
    empty.style.textAlign = 'center';
    empty.textContent = 'Nenhuma variação adicionada ainda.';
    variationsContainer.append(empty);
    return;
  }

  variationsContainer.replaceChildren();
  model.variacoes.forEach((v, idx) => {
    const article = document.createElement('article');
    article.className = 'variation';

    const imageWrap = document.createElement('div');
    imageWrap.className = 'variation-image';
    const image = document.createElement('img');
    image.src = v.imagem_url || '';
    image.alt = `${model.nome} — Variação ${idx + 1}`;
    image.width = 1400;
    image.height = 1800;
    image.loading = 'lazy';
    image.decoding = 'async';
    imageWrap.append(image);

    const info = document.createElement('div');
    info.className = 'variation-info';
    const content = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'variation-name';
    name.textContent = model.nome || 'Modelo';
    const choice = document.createElement('div');
    choice.className = 'choice';
    choice.textContent = v.descricao || '';
    content.append(name, choice, buildPriceBlock(v.valor_parcelado, v.valor_vista, model.parcelamento_maximo));

    const link = document.createElement('a');
    link.className = 'choose';
    link.href = `https://wa.me/5575981513433?text=${encodeURIComponent('Olá! Gostaria de consultar o modelo ' + model.nome + ' (' + (v.descricao || '') + ').')}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Escolher';

    info.append(content, link);
    article.append(imageWrap, info);
    variationsContainer.append(article);
  });
}

loadModel();
