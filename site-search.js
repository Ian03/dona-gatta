(() => {
  const trigger = document.querySelector('.search-toggle');
  if (!trigger) return;
  const models = [
    ['CAPRI', 'capri.html'], ['DAY USE', 'day-use.html'], ['MARÉ', 'mare.html'], ['CHECK IN', 'check-in.html'],
    ['ESCAPE', 'escape.html'], ['LOUNGE', 'lounge.html'], ['RESORT', 'resort.html'], ['BEACH CLUB', 'beach-club.html']
  ];
  const style = document.createElement('style');
  style.textContent = '.search-toggle{border:0;background:transparent;color:#fff;display:grid;place-items:center;padding:5px;cursor:pointer}.search-toggle svg{width:21px;height:21px;stroke-width:1.5}.search-overlay{position:fixed;z-index:200;inset:0;background:rgba(52,9,9,.96);padding:calc(24px + env(safe-area-inset-top)) 22px 25px;color:#fff;opacity:0;pointer-events:none;transition:opacity .25s}.search-overlay.open{opacity:1;pointer-events:auto}.search-box{max-width:640px;margin:auto}.search-top{display:flex;gap:12px;align-items:center;border-bottom:1px solid rgba(255,255,255,.45);padding-bottom:13px}.search-top input{flex:1;background:transparent;border:0;outline:0;color:#fff;font:30px Cormorant Garamond,Georgia,serif}.search-top input::placeholder{color:#d8bda9}.search-close{width:41px;height:41px;border:1px solid rgba(255,255,255,.5);border-radius:50%;background:transparent;color:#fff;font-size:25px}.search-results{display:grid;gap:1px;margin-top:25px}.search-results a{padding:16px 3px;border-bottom:1px solid rgba(255,255,255,.18);font:20px Cormorant Garamond,Georgia,serif;letter-spacing:.06em;color:#fff}.search-results a small{display:block;margin-top:4px;font:9px DM Sans,Arial,sans-serif;letter-spacing:.13em;text-transform:uppercase;color:#d7ad6a}.search-empty{color:#e8cdbd;font:18px Cormorant Garamond,Georgia,serif;margin-top:25px}';
  document.head.append(style);
  const overlay = document.createElement('section');
  overlay.className = 'search-overlay';
  overlay.innerHTML = '<div class="search-box"><div class="search-top"><input type="search" autocomplete="off" placeholder="Buscar modelo" aria-label="Buscar modelo"><button class="search-close" type="button" aria-label="Fechar busca">×</button></div><div class="search-results"></div></div>';
  document.body.append(overlay);
  const input = overlay.querySelector('input'), results = overlay.querySelector('.search-results');
  const render = () => { const term = input.value.trim().toLocaleUpperCase('pt-BR'); const found = models.filter(([name]) => name.includes(term)); results.innerHTML = found.length ? found.map(([name, page]) => `<a href="${page}">${name}<small>Coleção Destinos · ver variações</small></a>`).join('') : '<p class="search-empty">Nenhum modelo encontrado.</p>'; };
  const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; trigger.focus(); };
  trigger.onclick = () => { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; input.value = ''; render(); setTimeout(() => input.focus(), 80); };
  overlay.querySelector('.search-close').onclick = close;
  input.oninput = render;
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('open')) close(); });
})();
