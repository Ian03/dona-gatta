document.querySelectorAll('.variation').forEach(card=>{
  const model=card.querySelector('.variation-name').textContent.trim();
  const variation=card.querySelector('.choice').textContent.trim();
  const image=new URL(card.querySelector('.variation-image img').getAttribute('src'),window.location.href).href;
  const message=`Olá! Tenho interesse no modelo ${model}, ${variation}.\n\nFoto selecionada: ${image}\n\nPoderiam me informar disponibilidade e valor?`;
  card.querySelector('.choose').href=`https://wa.me/5575981513433?text=${encodeURIComponent(message)}`;
});
