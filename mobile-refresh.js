(() => {
  if (!matchMedia('(max-width: 700px)').matches) return;

  const addRefresh = () => {
    const bar = document.querySelector('.mobile-tabbar');
    if (!bar || bar.querySelector('[data-refresh]')) return;
    const style = document.createElement('style');
    style.textContent = '.mobile-tabbar{grid-template-columns:repeat(5,1fr)!important}.mobile-tabbar [data-refresh]{font-size:9px}.mobile-tabbar [data-refresh] b{font-size:18px;line-height:16px}.mobile-tabbar [data-refresh]:disabled{opacity:.55}';
    document.head.append(style);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.refresh = 'true';
    button.setAttribute('aria-label', 'Atualizar site');
    button.innerHTML = '<b>↻</b><span>Atualizar</span>';
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.querySelector('span').textContent = 'Limpando';
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        await registration?.update();
        await Promise.all((await caches.keys()).map(key => caches.delete(key)));
        await Promise.all((await navigator.serviceWorker?.getRegistrations?.() || []).map(item => item.unregister()));
      } catch (_) {
        // A recarga com uma URL nova ainda pede a versão atual ao GitHub Pages.
      }
      const url = new URL(location.href);
      url.searchParams.set('atualizado', Date.now());
      location.replace(url.href);
    });
    bar.append(button);
  };
  addRefresh();
  setTimeout(addRefresh, 250);
})();
