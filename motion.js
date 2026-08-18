(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isHomePage = document.querySelector('.journey-banner') && document.querySelector('.products');
  const isModelPage = document.querySelector('#variations');
  const style = document.createElement('style');
  style.textContent = `
    @view-transition{navigation:auto}
    .motion-card{transform-style:preserve-3d;will-change:transform;transition:transform .28s ease,box-shadow .28s ease}
    .motion-card:hover{box-shadow:0 18px 34px rgba(64,16,16,.16)}
    .product-card>a:first-child{position:relative;isolation:isolate}
    .product-card>a:first-child:after{content:"";position:absolute;inset:-25% -55%;z-index:1;pointer-events:none;background:linear-gradient(112deg,transparent 41%,rgba(255,255,255,.08) 46%,rgba(255,251,223,.7) 50%,rgba(255,255,255,.08) 54%,transparent 59%);transform:translateX(-70%) rotate(7deg);transition:transform .8s cubic-bezier(.2,.8,.2,1)}
    .product-card:hover>a:first-child:after{transform:translateX(70%) rotate(7deg)}
    .magnetic{will-change:transform;transition:transform .18s ease}
    .split-letter{display:inline-block;opacity:0;transform:translateY(.55em);animation:letter-in .68s cubic-bezier(.16,1,.3,1) forwards}
    .editorial,.launch,.brand-story,.promise,footer,.catalog,.variations{content-visibility:auto;contain-intrinsic-size:1px 700px}
    @keyframes letter-in{to{opacity:1;transform:translateY(0)}}
    @media (prefers-reduced-motion:reduce){.motion-card,.magnetic{transition:none!important;transform:none!important}.split-letter{animation:none;opacity:1;transform:none}.product-card>a:first-child:after{display:none}}
  `;
  document.head.append(style);

  if (!reduced) {
    document.querySelectorAll('.hero h1,.section-title h2,.intro h1').forEach(title => {
      if (title.dataset.split) return;
      const text = title.textContent;
      title.dataset.split = 'true';
      title.setAttribute('aria-label', text);
      title.textContent = '';
      [...text].forEach((letter, index) => {
        const span = document.createElement('span');
        span.className = 'split-letter';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = letter === ' ' ? '\u00a0' : letter;
        span.style.animationDelay = `${index * 34}ms`;
        title.append(span);
      });
    });
  }

  const modelVariations={
    'CAPRI':{folder:'CAPRI',items:['01','02','03','04','05','06','07','08','09','10']},
    'DAY USE':{folder:'DAY%20USE',items:['01','02','03','04','05','06','07']},
    'CHECK IN':{folder:'CHECK%20IN',items:['01','02','03','04','05','06','07','08']},
    'ESCAPE':{folder:'ESCAPE',items:['01','02','03','04','05']},
    'LOUNGE':{folder:'LOUNGE',items:['01','02','03','04','05']},
    'MARÉ':{folder:'MAR%C3%89',items:['01','02','03','04','05','06','07','08','09','10']},
    'RESORT':{folder:'RESORT',items:['01','02','03','04','05','06','07']},
    'BEACH CLUB':{folder:'BEACH%20CLUB',items:['01','02','03']}
  };
  const modelName=document.title.split(' — ')[0];
  const variationConfig=modelVariations[modelName];
  const variationGrid=document.querySelector('#variations');
  if(isModelPage && variationConfig && variationGrid){
    variationGrid.replaceChildren();
    variationConfig.items.forEach(number => {
      const article = document.createElement('article');
      article.className = 'variation';
      const imageWrap = document.createElement('div');
      imageWrap.className = 'variation-image';
      const image = document.createElement('img');
      image.src = `assets/otimizadas/Verao/${variationConfig.folder}/${number}-detail.webp`;
      image.alt = `${modelName} — Variação ${number}`;
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
      name.textContent = modelName;
      const choice = document.createElement('div');
      choice.className = 'choice';
      choice.textContent = `Variação ${number}`;
      content.append(name, choice);

      const link = document.createElement('a');
      link.className = 'choose';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Escolher';
      const imageUrl = new URL(image.getAttribute('src'), window.location.href).href;
      const message = `Olá! Tenho interesse no modelo ${modelName}, Variação ${number}.\n\nFoto selecionada: ${imageUrl}\n\nPoderiam me informar disponibilidade e valor?`;
      link.href = `https://wa.me/5575981513433?text=${encodeURIComponent(message)}`;

      info.append(content, link);
      article.append(imageWrap, info);
      variationGrid.append(article);
    });
  }

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover || reduced) return;
  document.querySelectorAll('.product-card,.card,.variation').forEach(card => {
    card.classList.add('motion-card');
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(800px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
  document.querySelectorAll('.btn,.choose').forEach(button => {
    button.classList.add('magnetic');
    button.addEventListener('pointermove', event => {
      const rect = button.getBoundingClientRect();
      button.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) * .11}px,${(event.clientY - rect.top - rect.height / 2) * .11}px)`;
    });
    button.addEventListener('pointerleave', () => { button.style.transform = ''; });
  });
})();
(() => {
  const isHomePage = document.querySelector('.journey-banner') && document.querySelector('.products');
  const isModelPage = document.querySelector('#variations');
  const loadScript = src => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.append(script);
  };
  const boot = () => {
    loadScript('mobile-app.js');
    loadScript('mobile-refresh.js');
    loadScript('menu-icons.js');
    loadScript('install-prompt.js');
    if (isHomePage) {
      loadScript('mobile-reel.js');
      loadScript('favorites-experience.js');
      loadScript('site-search.js');
      loadScript('section-dividers.js');
    }
    if (isModelPage) {
      loadScript('whatsapp-modelo.js');
    }
  };
  const schedule = window.requestIdleCallback
    ? callback => window.requestIdleCallback(callback, { timeout: 1500 })
    : callback => window.setTimeout(callback, 350);
  if (document.readyState === 'complete') {
    schedule(boot);
    return;
  }
  window.addEventListener('load', () => schedule(boot), { once: true });
})();
