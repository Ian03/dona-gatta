const fs = require('fs');

const raw = fs.readFileSync('backups/supabase-public-data.json', 'utf8').replace(/^\uFEFF/, '');
const backup = JSON.parse(raw).backup;

const modelDefs = [
  { id: 'all-inclusive', db: 'ALL INCLUSIVE', folder: 'ALL INCLUSIVE', count: 8 },
  { id: 'beach-club', db: 'BEACH CLUB', folder: 'BEACH CLUB', count: 7 },
  { id: 'capri', db: 'CAPRI', folder: 'CAPRI', count: 10 },
  { id: 'check-in', db: 'CHECK IN', folder: 'CHECK IN', count: 8 },
  { id: 'day-use', db: 'DAY USE', folder: 'DAY USE', count: 7 },
  { id: 'escape', db: 'ESCAPE', folder: 'ESCAPE', count: 5 },
  { id: 'lounge', db: 'LOUNGE', folder: 'LOUNGE', count: 5 },
  { id: 'mare', db: 'MAR', folder: 'MARÉ', count: 10 },
  { id: 'resort', db: 'RESORT', folder: 'RESORT', count: 7 },
  { id: 'sunset', db: 'SUNSET', folder: 'SUNSET', count: 8 }
];

function fixText(value) {
  if (typeof value !== 'string') return value;
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch {
    return value;
  }
}

function cleanModelName(name) {
  return fixText(name || '').replace(/^Modelo\s+/i, '').trim();
}

function normalizeName(name) {
  return cleanModelName(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function stringifyForJs(value) {
  return JSON.stringify(value, null, 2).replace(/\n/g, '\n  ');
}

const collections = backup.colecoes.map(collection => ({
  ...collection,
  nome: fixText(collection.nome),
  catalogo_intro: fixText(collection.catalogo_intro),
  catalogo_eyebrow: fixText(collection.catalogo_eyebrow)
}));

const variations = backup.variacoes.map(variation => ({
  ...variation,
  descricao: fixText(variation.descricao),
  valor_vista: fixText(variation.valor_vista),
  valor_parcelado: fixText(variation.valor_parcelado)
}));

const data = modelDefs.map(def => {
  const collection = collections.find(item => normalizeName(item.nome).includes(def.db));
  const collectionVariations = variations
    .filter(variation => collection && variation.colecao_id === collection.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return {
    id: def.id,
    name: collection ? cleanModelName(collection.nome) : def.db,
    folder: def.folder,
    count: def.count,
    eyebrow: collection?.catalogo_eyebrow || 'Coleção Verão',
    intro: collection?.catalogo_intro || 'Escolha a sua variação favorita e consulte a disponibilidade com a nossa equipe.',
    installments: collection?.parcelamento_maximo || 5,
    variations: Array.from({ length: def.count }, (_, index) => {
      const source = collectionVariations[index];
      return {
        descricao: source?.descricao || `Variação ${String(index + 1).padStart(2, '0')}`,
        valor_vista: source?.valor_vista || '',
        valor_parcelado: source?.valor_parcelado || ''
      };
    })
  };
});

const output = `const LOCAL_CATALOG_MODELS = ${stringifyForJs(data)};

function localImagePath(model, index, type) {
  const number = String(index).padStart(2, '0');
  return encodeURI(\`assets/otimizadas/Verao/\${model.folder}/\${number}-\${type}.webp\`);
}

function buildLocalVariation(model, variation, index) {
  return {
    id: \`\${model.id}-\${String(index).padStart(2, '0')}\`,
    descricao: variation.descricao || \`Variação \${String(index).padStart(2, '0')}\`,
    valor_vista: variation.valor_vista || '',
    valor_parcelado: variation.valor_parcelado || '',
    imagem_url: localImagePath(model, index, 'detail')
  };
}

function buildLocalCollection(model) {
  return {
    id: model.id,
    nome: model.name,
    catalogo_eyebrow: model.eyebrow,
    catalogo_intro: model.intro,
    parcelamento_maximo: model.installments || 5,
    capa_url: localImagePath(model, 1, 'card'),
    variacoes: model.variations.map((variation, index) => buildLocalVariation(model, variation, index + 1))
  };
}

function getLocalCatalogCollections() {
  return LOCAL_CATALOG_MODELS.map(buildLocalCollection);
}

function getLocalCatalogCollection(id) {
  return getLocalCatalogCollections().find(collection => collection.id === id) || null;
}
`;

fs.writeFileSync('local-catalog.js', output, 'utf8');
