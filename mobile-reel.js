(() => {
  if (!matchMedia('(max-width: 700px)').matches) return;

  const storageKey = 'dona-gatta-favorites';
  const read = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
  const write = items => {
    localStorage.setItem(storageKey, JSON.stringify(items));
    document.querySelectorAll('.favorite-count').forEach(count => count.textContent = items.length);
  };
  const toggle = model => {
    const items = read();
    const found = items.some(item => item.page === model.page);
    write(found ? items.filter(item => item.page !== model.page) : [...items, model]);
    return !found;
  };
  const isSaved = model => read().some(item => item.page === model.page);
  const modelFromCard = card => {
    const anchor = card.matches('a') ? card : card.querySelector('a[href]');
    return {
      name: card.querySelector('.product-name,.card-name')?.textContent.trim() || 'Modelo',
      page: anchor?.getAttribute('href') || 'catalogo.html',
      image: card.querySelector('img')?.currentSrc || card.querySelector('img')?.src || ''
    };
  };

  const style = document.createElement('style');
  style.textContent = `
    .card-favorite{position:absolute;z-index:4;right:13px;top:13px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,250,246,.9);color:#401010;box-shadow:0 5px 15px rgba(64,16,16,.14);font-size:23px;line-height:1}.card-favorite[aria-pressed="true"]{color:#a72f37}.mobile-reel-trigger{display:flex;width:100%;align-items:center;justify-content:center;gap:10px;margin:15px 0 3px;padding:15px;background:#401010;border:0;color:#fff;font:10px DM Sans,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase}.reel-overlay{position:fixed;z-index:150;inset:0;background:#1f0909;opacity:0;pointer-events:none;transition:opacity .22s}.reel-overlay.open{opacity:1;pointer-events:auto}.reel-close{position:fixed;z-index:2;top:calc(14px + env(safe-area-inset-top));right:16px;width:43px;height:43px;border:1px solid rgba(255,255,255,.45);border-radius:50%;background:rgba(35,6,6,.45);color:#fff;font-size:26px}.reel-track{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain}.reel-item{height:100svh;scroll-snap-align:start;position:relative;isolation:isolate;background:#2a0d0d}.reel-item img{width:100%;height:100%;object-fit:cover;object-position:center 30%;opacity:.91}.reel-item:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.06) 35%,rgba(28,4,4,.82) 100%);pointer-events:none}.reel-copy{position:absolute;z-index:1;bottom:calc(35px + env(safe-area-inset-bottom));left:22px;right:22px;color:#fff}.reel-copy small{font:10px DM Sans,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;opacity:.8}.reel-copy h2{margin:8px 0 17px;font:48px/.84 Italiana,Georgia,serif;letter-spacing:.04em}.reel-actions{display:grid;grid-template-columns:48px 1fr 1fr;gap:8px}.reel-actions button,.reel-actions a{min-height:47px;border:1px solid rgba(255,255,255,.65);background:rgba(255,255,255,.1);display:grid;place-items:center;color:#fff;font:10px DM Sans,Arial,sans-serif;letter-spacing:.11em;text-transform:uppercase}.reel-actions button[aria-pressed="true"]{background:#fff;color:#8a1d28}.reel-actions .reel-primary{background:#fff;color:#401010;border-color:#fff}.reel-scroll-hint{position:absolute;z-index:1;right:21px;top:50%;color:#fff;writing-mode:vertical-rl;font:9px DM Sans,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;opacity:.75}
  `;
  document.head.append(style);

  const cards = [...document.querySelectorAll('.product-card,.catalog .card')];
  cards.forEach(card => {
    const model = modelFromCard(card);
    card.style.position = 'relative';
    const favorite = document.createElement('button');
    favorite.className = 'card-favorite';
    favorite.type = 'button';
    favorite.setAttribute('aria-label', `Salvar ${model.name}`);
    favorite.setAttribute('aria-pressed', String(isSaved(model)));
    favorite.textContent = isSaved(model) ? '♥' : '♡';
    favorite.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      const saved = toggle(model);
      favorite.textContent = saved ? '♥' : '♡';
      favorite.setAttribute('aria-pressed', String(saved));
    });
    card.append(favorite);
  });

  const homeCards = [...document.querySelectorAll('.product-card')];
  if (!homeCards.length) return;
  const section = document.querySelector('.collection .wrap');
  const trigger = document.createElement('button');
  trigger.className = 'mobile-reel-trigger';
  trigger.type = 'button';
  trigger.textContent = 'Explorar modelos em tela cheia  ↑';
  section?.append(trigger);

  const overlay = document.createElement('section');
  overlay.className = 'reel-overlay';
  overlay.setAttribute('aria-label', 'Vitrine de modelos');
  const models = homeCards.map(modelFromCard);
  const closeButton = document.createElement('button');
  closeButton.className = 'reel-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Fechar vitrine');
  closeButton.textContent = '×';
  const track = document.createElement('div');
  track.className = 'reel-track';
  models.forEach((model, index) => {
    const article = document.createElement('article');
    article.className = 'reel-item';
    const image = document.createElement('img');
    image.src = model.image || '';
    if (index) image.loading = 'lazy';
    image.alt = `Óculos ${model.name}`;
    const hint = document.createElement('span');
    hint.className = 'reel-scroll-hint';
    hint.textContent = 'deslize';
    const copy = document.createElement('div');
    copy.className = 'reel-copy';
    const small = document.createElement('small');
    small.textContent = 'Coleção Destinos';
    const heading = document.createElement('h2');
    heading.textContent = model.name || 'Modelo';
    const actions = document.createElement('div');
    actions.className = 'reel-actions';
    const save = document.createElement('button');
    save.type = 'button';
    save.dataset.save = String(index);
    save.setAttribute('aria-pressed', String(isSaved(model)));
    save.setAttribute('aria-label', `Salvar ${model.name}`);
    save.textContent = isSaved(model) ? '♥' : '♡';
    const details = document.createElement('a');
    details.href = model.page || 'catalogo.html';
    details.textContent = 'Detalhes';
    const whatsapp = document.createElement('a');
    whatsapp.className = 'reel-primary';
    whatsapp.target = '_blank';
    whatsapp.rel = 'noopener';
    whatsapp.textContent = 'WhatsApp';
    actions.append(save, details, whatsapp);
    copy.append(small, heading, actions);
    article.append(image, hint, copy);
    track.append(article);
  });
  overlay.append(closeButton, track);
  document.body.append(overlay);
  overlay.querySelectorAll('.reel-primary').forEach((link, index) => {
    const model = models[index];
    const message = `Olá! Tenho interesse no modelo ${model.name}.\n\nFoto selecionada: ${model.image}\n\nPoderiam me enviar disponibilidade e valor?`;
    link.href = `https://wa.me/5575981513433?text=${encodeURIComponent(message)}`;
  });
  const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };
  trigger.addEventListener('click', () => { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; });
  closeButton.addEventListener('click', close);
  overlay.querySelectorAll('[data-save]').forEach(button => button.addEventListener('click', () => {
    const model = models[Number(button.dataset.save)];
    const saved = toggle(model);
    button.textContent = saved ? '♥' : '♡';
    button.setAttribute('aria-pressed', String(saved));
    document.querySelectorAll('.card-favorite').forEach((heart, index) => {
      if (homeCards[index] && modelFromCard(homeCards[index]).page === model.page) { heart.textContent = saved ? '♥' : '♡'; heart.setAttribute('aria-pressed', String(saved)); }
    });
  }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
})();
