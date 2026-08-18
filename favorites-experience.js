(() => {
  if (!matchMedia('(max-width: 700px)').matches) return;
  const key = 'dona-gatta-favorites';
  const get = () => JSON.parse(localStorage.getItem(key) || '[]');
  const set = items => {
    localStorage.setItem(key, JSON.stringify(items));
    document.querySelectorAll('.favorite-count').forEach(node => node.textContent = items.length);
  };
  const toggle = item => {
    const items = get();
    const exists = items.some(entry => entry.page === item.page);
    set(exists ? items.filter(entry => entry.page !== item.page) : [...items, item]);
    return !exists;
  };
  const style = document.createElement('style');
  style.textContent = '.variation{position:relative}.variation-save{position:absolute;z-index:3;right:13px;top:13px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,250,246,.94);color:#401010;box-shadow:0 5px 16px rgba(64,16,16,.16);font-size:22px}.variation-save[aria-pressed="true"]{color:#a72f37}.saved-grid{display:grid;gap:11px;max-height:57svh;overflow:auto;padding-right:2px}.saved-item{display:grid;grid-template-columns:62px 1fr auto;gap:11px;align-items:center;padding:7px;border-bottom:1px solid #ead8cb}.saved-item img{width:62px;height:76px;object-fit:cover}.saved-item h3{font:16px DM Sans,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin:0}.saved-item p{font:15px/1.1 Cormorant Garamond,serif;margin:5px 0 0}.saved-item a{font:9px DM Sans,Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#401010;text-decoration:underline}.saved-item button{border:0;background:transparent;color:#8d3b34;font-size:20px;padding:5px}.saved-actions{display:flex;gap:9px;margin-top:9px}.saved-actions a{font:9px DM Sans,Arial,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#401010}.mobile-menu{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.mobile-menu a{transition:padding-left .25s,color .25s}.mobile-menu a:hover{padding-left:9px;color:#e4ba73}';
  document.head.append(style);
  const createWhatsAppLink = item => `https://wa.me/5575981513433?text=${encodeURIComponent(`Olá! Tenho interesse no modelo ${item.name}.\n\nFoto selecionada: ${item.image || ''}\n\nPoderiam me informar disponibilidade e valor?`)}`;
  const createSavedView = items => {
    const fragment = document.createDocumentFragment();
    const title = document.createElement('h2');
    title.style.font = '32px Italiana,Georgia,serif';
    title.style.margin = '0 0 12px';
    title.textContent = 'SALVOS';
    fragment.append(title);
    if (!items.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Nenhum modelo salvo ainda.';
      fragment.append(empty);
      return fragment;
    }
    const grid = document.createElement('div');
    grid.className = 'saved-grid';
    items.forEach((item, index) => {
      const article = document.createElement('article');
      article.className = 'saved-item';
      const image = document.createElement('img');
      image.src = item.image || '';
      image.alt = item.name || 'Modelo salvo';
      const content = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = item.name || 'Modelo';
      const text = document.createElement('p');
      text.textContent = 'Disponível para consultar';
      const actions = document.createElement('div');
      actions.className = 'saved-actions';
      const details = document.createElement('a');
      details.href = item.page || 'catalogo.html';
      details.textContent = 'Detalhes';
      const whatsapp = document.createElement('a');
      whatsapp.href = createWhatsAppLink(item);
      whatsapp.target = '_blank';
      whatsapp.rel = 'noopener';
      whatsapp.textContent = 'WhatsApp';
      actions.append(details, whatsapp);
      content.append(heading, text, actions);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.remove = String(index);
      remove.setAttribute('aria-label', `Remover ${item.name || 'modelo'}`);
      remove.textContent = '×';
      article.append(image, content, remove);
      grid.append(article);
    });
    fragment.append(grid);
    return fragment;
  };
  const setup = () => {
    const bar = document.querySelector('.mobile-tabbar');
    const sheet = document.querySelector('.quick-sheet');
    const content = sheet?.querySelector('.sheet-content');
    if (!bar || !sheet || !content) return false;
    const favoritesButton = bar.querySelector('[data-favorites]');
    favoritesButton.onclick = () => {
      const render = () => {
        const items = get();
        content.replaceChildren(createSavedView(items));
        content.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => { const items = get(); items.splice(Number(button.dataset.remove), 1); set(items); render(); });
      };
      render(); sheet.classList.add('open');
    };
    const model = document.title.split(' — ')[0];
    document.querySelectorAll('.variation').forEach((card, index) => {
      if (card.querySelector('.variation-save')) return;
      const image = card.querySelector('img')?.currentSrc || card.querySelector('img')?.src || '';
      const variation = card.querySelector('.choice')?.textContent.trim() || `Variação ${index + 1}`;
      const item = { name: `${model} · ${variation}`, page: `${location.pathname.split('/').pop()}#variacao-${index + 1}`, image };
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'variation-save';
      button.setAttribute('aria-label', `Salvar ${item.name}`);
      const saved = get().some(entry => entry.page === item.page);
      button.setAttribute('aria-pressed', String(saved)); button.textContent = saved ? '♥' : '♡';
      button.onclick = () => { const active = toggle(item); button.textContent = active ? '♥' : '♡'; button.setAttribute('aria-pressed', String(active)); };
      card.id = `variacao-${index + 1}`; card.append(button);
    });
    return true;
  };
  if (!setup()) setTimeout(setup, 350);
})();
