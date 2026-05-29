function abrirImagemProduto(src,nome){
  if(!src)return;
  const modal=document.getElementById('modal-imagem-produto');
  const img=document.getElementById('modal-imagem-produto-img');
  const titulo=document.getElementById('modal-imagem-produto-titulo');
  if(!modal||!img)return;
  img.src=src;
  img.alt=nome||'Imagem do produto';
  if(titulo)titulo.textContent=nome||'Imagem do produto';
  modal.classList.add('active');
  document.body.style.overflow='hidden';
}
function fecharImagemProduto(){
  const modal=document.getElementById('modal-imagem-produto');
  const img=document.getElementById('modal-imagem-produto-img');
  if(modal)modal.classList.remove('active');
  if(img)img.src='';
  document.body.style.overflow='';
}
window.abrirImagemProduto=abrirImagemProduto;
window.fecharImagemProduto=fecharImagemProduto;
