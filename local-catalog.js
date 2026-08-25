const LOCAL_CATALOG_GROUP = 'Coleção Verão';
const LOCAL_CATALOG_INTRO = 'Escolha a sua variação favorita e consulte a disponibilidade com a nossa equipe.';

const LOCAL_CATALOG_MODELS = [
  { id: 'all-inclusive', name: 'ALL INCLUSIVE', folder: 'ALL INCLUSIVE', count: 8 },
  { id: 'beach-club', name: 'BEACH CLUB', folder: 'BEACH CLUB', count: 7 },
  { id: 'capri', name: 'CAPRI', folder: 'CAPRI', count: 10 },
  { id: 'check-in', name: 'CHECK IN', folder: 'CHECK IN', count: 8 },
  { id: 'day-use', name: 'DAY USE', folder: 'DAY USE', count: 7 },
  { id: 'escape', name: 'ESCAPE', folder: 'ESCAPE', count: 5 },
  { id: 'lounge', name: 'LOUNGE', folder: 'LOUNGE', count: 5 },
  { id: 'mare', name: 'MARÉ', folder: 'MARÉ', count: 10 },
  { id: 'resort', name: 'RESORT', folder: 'RESORT', count: 7 },
  { id: 'sunset', name: 'SUNSET', folder: 'SUNSET', count: 8 }
];

function localImagePath(model, index, type) {
  const number = String(index).padStart(2, '0');
  return encodeURI(`assets/otimizadas/Verao/${model.folder}/${number}-${type}.webp`);
}

function buildLocalVariation(model, index) {
  return {
    id: `${model.id}-${String(index).padStart(2, '0')}`,
    descricao: `Variação ${String(index).padStart(2, '0')}`,
    valor_vista: '',
    valor_parcelado: '',
    imagem_url: localImagePath(model, index, 'detail')
  };
}

function buildLocalCollection(model) {
  return {
    id: model.id,
    nome: model.name,
    catalogo_eyebrow: LOCAL_CATALOG_GROUP,
    catalogo_intro: LOCAL_CATALOG_INTRO,
    parcelamento_maximo: 5,
    capa_url: localImagePath(model, 1, 'card'),
    variacoes: Array.from({ length: model.count }, (_, index) => buildLocalVariation(model, index + 1))
  };
}

function getLocalCatalogCollections() {
  return LOCAL_CATALOG_MODELS.map(buildLocalCollection);
}

function getLocalCatalogCollection(id) {
  return getLocalCatalogCollections().find(collection => collection.id === id) || null;
}
