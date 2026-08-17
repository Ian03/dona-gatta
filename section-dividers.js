(() => {
  if (!document.querySelector('.topbar')) return;
  const sections = [...document.querySelectorAll('main > section')];
  if (sections.length < 2) return;
  const style = document.createElement('style');
  style.textContent = '.section-divider{height:52px;display:flex;align-items:center;gap:13px;justify-content:center;padding:0 max(20px,calc((100% - 360px)/2));background:#fbf4ee;color:#765022;opacity:0;transform:scaleX(.76);transition:opacity .7s ease,transform .7s cubic-bezier(.16,1,.3,1)}.section-divider.is-visible{opacity:1;transform:none}.section-divider:before,.section-divider:after{content:"";height:1px;flex:1;background:linear-gradient(90deg,transparent,#765022)}.section-divider:after{background:linear-gradient(90deg,#765022,transparent)}.section-divider span{font-size:25px;line-height:1;filter:drop-shadow(0 2px 3px rgba(255,245,220,.8))}@media(max-width:600px){.section-divider{height:42px;padding:0 30px}.section-divider span{font-size:21px}}';
  document.head.append(style);
  const dividers = sections.slice(1, -1).map(section => {
    const divider = document.createElement('div');
    divider.className = 'section-divider';
    divider.setAttribute('aria-hidden', 'true');
    divider.innerHTML = '<span>✦</span>';
    section.after(divider);
    return divider;
  });
  if (!('IntersectionObserver' in window)) return dividers.forEach(divider => divider.classList.add('is-visible'));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { threshold: .25 });
  dividers.forEach(divider => observer.observe(divider));
})();
