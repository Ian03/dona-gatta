(() => {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone || sessionStorage.getItem('dona-gatta-install-dismissed')) return;
  let deferredPrompt;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const show = () => {
    if (document.querySelector('.install-prompt')) return;
    const style = document.createElement('style');
    style.textContent = '.install-prompt{position:fixed;z-index:120;right:15px;bottom:calc(88px + env(safe-area-inset-bottom));max-width:262px;padding:13px 38px 13px 15px;background:rgba(255,250,246,.96);border:1px solid #e3c7af;box-shadow:0 12px 30px rgba(64,16,16,.18);color:#401010;font:12px/1.28 DM Sans,Arial,sans-serif}.install-prompt strong{display:block;margin-bottom:3px;font-size:12px}.install-prompt button{border:0;background:transparent;color:#401010;cursor:pointer}.install-action{margin-top:9px;padding:7px 0!important;text-decoration:underline;font:10px DM Sans,Arial,sans-serif!important;letter-spacing:.1em;text-transform:uppercase}.install-close{position:absolute;right:6px;top:5px;font-size:19px}@media(min-width:701px){.install-prompt{bottom:22px}}';
    document.head.append(style);
    const prompt = document.createElement('aside');
    prompt.className = 'install-prompt';
    prompt.innerHTML = ios ? '<button class="install-close" aria-label="Fechar">×</button><strong>Leve a Dona Gatta com você</strong>Toque em Compartilhar e depois em “Adicionar à Tela de Início”.' : '<button class="install-close" aria-label="Fechar">×</button><strong>Instale o app Dona Gatta</strong>Tenha acesso rápido à coleção.<button class="install-action">Instalar app</button>';
    prompt.querySelector('.install-close').onclick = () => { sessionStorage.setItem('dona-gatta-install-dismissed', '1'); prompt.remove(); };
    const action = prompt.querySelector('.install-action');
    if (action) action.onclick = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; prompt.remove(); };
    document.body.append(prompt);
  };
  addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; show(); });
  if (ios) setTimeout(show, 1800);
})();
