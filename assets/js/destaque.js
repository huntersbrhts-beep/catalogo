function produtoDestaqueAtual(){
  const cfg=getConfigDestaque();
  if(!cfg||cfg.ativo===false)return null;
  const prod=listaProdutos.find(p=>String(p.id)===String(cfg.produtoId));
  if(!prod)return null;
  return {cfg,prod};
}
function renderizarDestaqueHome(){
  const box=document.getElementById('produto-destaque-home');
  if(!box)return;
  const d=produtoDestaqueAtual();
  if(!d){box.classList.add('hidden');box.innerHTML='';return;}
  const {cfg,prod}=d;
  box.classList.remove('hidden');
  box.innerHTML=`<div class="destaque-card glass rounded-3xl p-4 md:p-6 mb-8 border border-orange-500/30">
    <div class="grid md:grid-cols-[180px_1fr_auto] gap-4 items-center">
      <img src="${escaparHtml(cfg.imagemUrl||prod.imagem_url||'')}" class="w-full h-40 md:h-36 object-cover rounded-2xl cursor-zoom-in" onclick="abrirImagemProduto('${escaparHtml(cfg.imagemUrl||prod.imagem_url||'')}','${escaparHtml(cfg.titulo||prod.nome)}')">
      <div><div class="text-orange-400 font-black text-sm uppercase tracking-widest">Oferta Relâmpago</div><h3 class="text-2xl font-black">${escaparHtml(cfg.titulo||prod.nome)}</h3><p class="text-gray-300 mt-1">${escaparHtml(cfg.texto||prod.descricao||'')}</p><div class="mt-3 flex items-center gap-3"><span class="text-gray-500 line-through">${cfg.precoAntigo?formatarMoeda(cfg.precoAntigo):''}</span><span class="text-3xl font-black text-orange-400">${cfg.precoPromocional?formatarMoeda(cfg.precoPromocional):formatarMoeda(precoInicialProduto(prod))}</span></div><div id="contador-destaque" class="text-xs text-yellow-300 mt-1"></div></div>
      <button onclick="adicionarDestaqueNoCarrinho()" class="btn-primary px-5 py-4 rounded-2xl font-black">Quero essa oferta</button>
    </div>
  </div>`;
  iniciarContadorDestaque(cfg.tempoMinutos||120);
}
function abrirPopupDestaque(){
  const d=produtoDestaqueAtual(); if(!d)return;
  const cfg=d.cfg, prod=d.prod;
  if(sessionStorage.getItem('popup_destaque_v12')==='1')return;
  sessionStorage.setItem('popup_destaque_v12','1');
  const modal=document.getElementById('modal-destaque'); const box=document.getElementById('conteudo-destaque');
  if(!modal||!box)return;
  box.innerHTML=`<img src="${escaparHtml(cfg.imagemUrl||prod.imagem_url||'')}" class="w-full h-56 object-cover rounded-2xl mb-4"><h3 class="text-3xl font-black text-orange-400">${escaparHtml(cfg.titulo||'Oferta do dia')}</h3><p class="text-gray-300 mt-2">${escaparHtml(cfg.texto||prod.descricao||'')}</p><div class="my-4"><span class="line-through text-gray-500 mr-2">${cfg.precoAntigo?formatarMoeda(cfg.precoAntigo):''}</span><span class="text-4xl font-black">${cfg.precoPromocional?formatarMoeda(cfg.precoPromocional):formatarMoeda(precoInicialProduto(prod))}</span></div><button onclick="adicionarDestaqueNoCarrinho();fecharPopupDestaque();toggleCarrinho();" class="w-full btn-primary py-4 rounded-2xl font-black">Aproveitar promoção</button>`;
  modal.classList.remove('hidden'); modal.classList.add('flex');
}
function fecharPopupDestaque(){const m=document.getElementById('modal-destaque'); if(m){m.classList.add('hidden');m.classList.remove('flex');}}
function adicionarDestaqueNoCarrinho(){
  const d=produtoDestaqueAtual(); if(!d)return;
  const {cfg,prod}=d;
  const preco=cfg.precoPromocional?Number(cfg.precoPromocional):precoInicialProduto(prod);
  const chave=prod.id+'-destaque';
  const existe=carrinhoCompras.find(i=>i.chave===chave);
  if(existe)existe.quantidade++; else carrinhoCompras.push({...prod,chave,nome:(cfg.titulo||prod.nome),preco,quantidade:1,destaque:true});
  atualizarCarrinho();
}
function iniciarContadorDestaque(minutos){
  const el=document.getElementById('contador-destaque'); if(!el)return;
  const key='destaque_fim_v12'; let fim=Number(sessionStorage.getItem(key)||0);
  if(!fim||fim<Date.now()){fim=Date.now()+Number(minutos||120)*60000; sessionStorage.setItem(key,String(fim));}
  clearInterval(window.timerDestaqueOferta);
  window.timerDestaqueOferta=setInterval(()=>{const falta=Math.max(0,fim-Date.now()); const h=Math.floor(falta/3600000); const m=Math.floor((falta%3600000)/60000); const s=Math.floor((falta%60000)/1000); el.textContent=falta?`⏳ Termina em ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:'Oferta encerrada';},1000);
}
function renderizarDestaqueAdmin(){
  const cfg=getConfigDestaque();
  const ativo=document.getElementById('dest-ativo'); if(ativo)ativo.value=String(cfg.ativo===true);
  const popup=document.getElementById('dest-popup'); if(popup)popup.value=String(cfg.mostrarPopup!==false);
  const produto=document.getElementById('dest-produto');
  if(produto){produto.innerHTML='<option value="">Escolha o produto</option>'+listaProdutos.map(p=>`<option value="${p.id}" ${String(p.id)===String(cfg.produtoId)?'selected':''}>${escaparHtml(p.nome)}</option>`).join('');}
  ['titulo','texto','preco-antigo','preco-promocional','tempo','imagem'].forEach(()=>{});
  if(document.getElementById('dest-titulo'))document.getElementById('dest-titulo').value=cfg.titulo||'';
  if(document.getElementById('dest-texto'))document.getElementById('dest-texto').value=cfg.texto||'';
  if(document.getElementById('dest-preco-antigo'))document.getElementById('dest-preco-antigo').value=cfg.precoAntigo||'';
  if(document.getElementById('dest-preco-promocional'))document.getElementById('dest-preco-promocional').value=cfg.precoPromocional||'';
  if(document.getElementById('dest-tempo'))document.getElementById('dest-tempo').value=cfg.tempoMinutos||120;
}
async function salvarDestaqueAdmin(){
  const arquivo=document.getElementById('dest-imagem')?.files?.[0];
  const atual=getConfigDestaque(); let imagemUrl=atual.imagemUrl||'';
  if(arquivo){const {data,error}=await enviarImagemConfig(arquivo); if(error){alert(error.message);return;} imagemUrl=data;}
  const cfg={ativo:document.getElementById('dest-ativo')?.value==='true',mostrarPopup:document.getElementById('dest-popup')?.value!=='false',produtoId:document.getElementById('dest-produto')?.value||'',titulo:document.getElementById('dest-titulo')?.value.trim()||'🔥 Oferta do dia',texto:document.getElementById('dest-texto')?.value.trim()||'',precoAntigo:document.getElementById('dest-preco-antigo')?.value||'',precoPromocional:document.getElementById('dest-preco-promocional')?.value||'',tempoMinutos:parseInt(document.getElementById('dest-tempo')?.value||'120')||120,imagemUrl};
  try{await salvarConfigSupabase('config_destaque',cfg);}catch(e){return;}
  alert('Produto destaque salvo no Supabase.');
  renderizarDestaqueAdmin(); renderizarDestaqueHome();
}
