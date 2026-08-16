(() => {
  const iconCss = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css';
  if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href.includes('bootstrap-icons'))) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = iconCss; document.head.append(link);
  }
  const style = document.createElement('style');
  style.textContent = '.nav-icons .bi{font-size:21px;line-height:1}.menu-toggle .bi{font-size:27px}.mobile-tabbar .bi{font-size:18px;line-height:1}.mobile-tabbar [data-refresh] .bi{font-size:17px}.mobile-tabbar b{font-weight:400;line-height:1}';
  document.head.append(style);
  const icons = { Buscar: 'search', Conta: 'person', Sacola: 'bag', 'Abrir menu': 'list' };
  document.querySelectorAll('.nav-icons a,.menu-toggle').forEach(item => {
    const label = item.getAttribute('aria-label');
    if (!icons[label]) return;
    const bubble = item.querySelector('.bubble');
    item.replaceChildren(Object.assign(document.createElement('i'), { className: `bi bi-${icons[label]}`, ariaHidden: 'true' }));
    if (bubble) item.append(bubble);
  });
  const applyBottomIcons = () => {
    const bar = document.querySelector('.mobile-tabbar');
    if (!bar) return false;
    const map = [['Início', 'house'], ['Modelos', 'grid-3x3-gap'], ['Salvos', 'heart'], ['Contato', 'whatsapp'], ['Atualizar', 'arrow-clockwise']];
    map.forEach(([name, icon]) => {
      const item = [...bar.querySelectorAll('a,button')].find(node => node.textContent.includes(name));
      const mark = item?.querySelector('b');
      if (mark) mark.innerHTML = `<i class="bi bi-${icon}" aria-hidden="true"></i>`;
    });
    return true;
  };
  if (!applyBottomIcons()) setTimeout(applyBottomIcons, 300);
})();
