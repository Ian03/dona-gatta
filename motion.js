(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
