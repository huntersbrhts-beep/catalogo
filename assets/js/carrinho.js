function toggleCarrinho(){document.getElementById('sidebar-carrinho').classList.toggle('translate-x-full');}

function adicionarNoCarrinho(id){
  if(!lojaEstaAberta()&&!confirm('A loja está fechada. Deseja montar o pedido mesmo assim?'))return;
  const produto=listaProdutos.find(p=>p.id===id); if(!produto)return;
  const tamanhos=obterTamanhosProduto(produto); let tamanho=null, preco=produto.preco||0;
  if(tamanhos){const sel=document.getElementById('tam-'+id); tamanho=sel?.value||'P'; preco=Number(tamanhos[tamanho]||0);}
  const chave=id+(tamanho?'-'+tamanho:''); const existe=carrinhoCompras.find(i=>i.chave===chave);
  if(existe){existe.quantidade++;}else{carrinhoCompras.push({...produto,chave,tamanho,preco,quantidade:1});}
  atualizarCarrinho();
}

function calcularTotais(){
  let subtotal=0; carrinhoCompras.forEach(i=>subtotal+=Number(i.preco||0)*i.quantidade);
  const bairro=normalizarCategoria(document.getElementById('cliente-bairro')?.value||'');
  const taxaEntrega=tipoPedido==='entrega' ? Number(getTaxas()[bairro]||0) : 0;
  const cupom=(document.getElementById('cupom-cliente')?.value||'').trim().toUpperCase();
  const c=getCupons().find(x=>x.codigo===cupom); let descontoCupom=0; let cupomValido=false; let cupomBloqueado=false;
  if(c){if(cupomTemLimiteDisponivel(c)){descontoCupom=c.tipo==='percentual'?subtotal*(Number(c.valor)/100):Number(c.valor); cupomValido=true;}else{cupomBloqueado=true;}}
  if(cupom==='ROLETA' && typeof descontoRoleta!=='undefined' && descontoRoleta && descontoRoleta.tipo!=='nenhum'){
    const cupomRoleta={codigo:'ROLETA',limite:typeof obterLimiteRoleta==='function'?obterLimiteRoleta():0};
    if(cupomTemLimiteDisponivel(cupomRoleta)){descontoCupom=descontoRoleta.tipo==='percentual'?subtotal*(Number(descontoRoleta.valor)/100):Number(descontoRoleta.valor); cupomValido=true; cupomBloqueado=false;}else{descontoCupom=0; cupomValido=false; cupomBloqueado=true;}
  }
  const fidelidade=window.fidelidadeClienteAtual||null;
  const descontoFidelidade=(fidelidade&&fidelidade.premioDisponivel&&fidelidade.config?.tipoPremio==='desconto') ? subtotal*(Number(fidelidade.config.valorPremio||0)/100) : 0;
  const totalFinal=Math.max(0,subtotal+taxaEntrega-descontoCupom-descontoFidelidade);
  return {subtotal,taxaEntrega,descontoCupom,descontoVip:descontoFidelidade,totalFinal,cupomValido,cupomBloqueado};
}

function atualizarCarrinho(){
  const container=document.getElementById('itens-carrinho'); const contador=document.getElementById('cart-count'); const resumo=document.getElementById('resumo-carrinho'); let itens=0;
  if(carrinhoCompras.length===0){container.innerHTML='<p class="text-center text-gray-500">Carrinho vazio</p>'; contador.classList.add('hidden'); if(resumo)resumo.innerHTML='<div class="flex justify-between font-bold text-lg"><span>Total:</span><span>R$ 0,00</span></div>'; return;}
  container.innerHTML=carrinhoCompras.map(item=>{itens+=item.quantidade; return `<div class="flex justify-between items-center border-b border-gray-700 pb-3"><div><h4 class="font-bold">${escaparHtml(item.nome)} ${item.tamanho?'('+item.tamanho+')':''}</h4><p class="text-gray-400 text-sm">${item.quantidade}x ${formatarMoeda(item.preco)}</p></div><div class="flex items-center gap-2"><button onclick="alterarQtd('${item.chave}',-1)" class="bg-gray-700 px-3 py-1 rounded">-</button><button onclick="alterarQtd('${item.chave}',1)" class="bg-gray-700 px-3 py-1 rounded">+</button></div></div>`;}).join('');
  contador.textContent=itens; contador.classList.remove('hidden');
  const t=calcularTotais();
  resumo.innerHTML=`<div class="flex justify-between"><span>Subtotal:</span><span>${formatarMoeda(t.subtotal)}</span></div>${t.taxaEntrega?`<div class="flex justify-between"><span>Entrega:</span><span>${formatarMoeda(t.taxaEntrega)}</span></div>`:''}${t.descontoCupom?`<div class="flex justify-between text-green-400"><span>Cupom:</span><span>-${formatarMoeda(t.descontoCupom)}</span></div>`:''}${t.cupomBloqueado?`<div class="text-red-400 text-sm">Cupom esgotado ou limite atingido.</div>`:''}${t.descontoVip?`<div class="flex justify-between text-green-400"><span>Fidelidade:</span><span>-${formatarMoeda(t.descontoVip)}</span></div>`:''}<div class="flex justify-between font-bold text-lg border-t border-gray-700 pt-2"><span>Total:</span><span>${formatarMoeda(t.totalFinal)}</span></div>`;
}

function alterarQtd(chave,valor){const item=carrinhoCompras.find(i=>i.chave===chave); if(!item)return; item.quantidade+=valor; if(item.quantidade<=0)carrinhoCompras=carrinhoCompras.filter(i=>i.chave!==chave); atualizarCarrinho();}
function selecionarTipoPedido(tipo){tipoPedido=tipo; const endereco=document.getElementById('box-endereco'); const btnEntrega=document.getElementById('btn-entrega'); const btnRetirada=document.getElementById('btn-retirada'); if(tipo==='retirada'){endereco.style.display='none'; btnRetirada.className='flex-1 btn-primary py-3 rounded-xl'; btnEntrega.className='flex-1 bg-gray-700 py-3 rounded-xl';}else{endereco.style.display='block'; btnEntrega.className='flex-1 btn-primary py-3 rounded-xl'; btnRetirada.className='flex-1 bg-gray-700 py-3 rounded-xl';} atualizarCarrinho();}

function obterFormaPagamento(){return document.getElementById('cliente-pagamento')?.value||'';}
function telefoneLimpo(v){return String(v||'').replace(/\D/g,'');}
function gerarNumeroPedido(){return 'DL'+Date.now().toString().slice(-7);}

let timerFidelidade=null;
function agendarConsultaFidelidade(){clearTimeout(timerFidelidade); timerFidelidade=setTimeout(atualizarFidelidadeCliente,450);}
async function atualizarFidelidadeCliente(){
  const telefone=telefoneLimpo(document.getElementById('cliente-telefone')?.value||'');
  const box=document.getElementById('box-fidelidade-cliente');
  if(!box)return;
  if(!telefone||telefone.length<8){window.fidelidadeClienteAtual=null; box.classList.add('hidden'); atualizarCarrinho(); return;}
  const cfg=getProgramaFidelidade();
  if(!cfg.ativo){window.fidelidadeClienteAtual=null; box.classList.add('hidden'); atualizarCarrinho(); return;}
  box.classList.remove('hidden'); box.innerHTML='<span class="text-gray-300">Consultando fidelidade...</span>';
  try{
    const {data,error}=await buscarPedidosPorTelefone(telefone);
    if(error)throw error;
    const pedidos=(data||[]).filter(p=>p.status!=='cancelado');
    const totalPedidos=pedidos.length;
    const meta=Number(cfg.metaPedidos||5);
    const progresso=meta?totalPedidos%meta:0;
    const premioDisponivel=meta>0 && totalPedidos>0 && totalPedidos%meta===0;
    window.fidelidadeClienteAtual={telefone,totalPedidos,progresso,meta,premioDisponivel,config:cfg};
    const estrelas='★'.repeat(Math.min(progresso,meta))+'☆'.repeat(Math.max(0,meta-progresso));
    box.innerHTML=`<div class="font-bold text-green-400">Programa de fidelidade</div><div>${estrelas}</div><div class="text-sm text-gray-300">${totalPedidos} pedido(s) encontrados neste celular. ${premioDisponivel?'🎁 Prêmio disponível neste pedido!':`Faltam ${Math.max(0,meta-progresso)} pedido(s) para o prêmio.`}</div><div class="text-xs text-gray-400">Prêmio: ${escaparHtml(cfg.textoPremio||'desconto de fidelidade')}</div>`;
    atualizarCarrinho();
  }catch(e){console.warn('Erro ao buscar fidelidade:',e); box.innerHTML='<span class="text-red-400">Não foi possível consultar a fidelidade agora.</span>';}
}

function montarResumoCliente(numeroPedido,nome,telefone,tipoPedido,bairro,endereco,formaPagamento,totais){
  let txt=`✅ *Pedido ${numeroPedido} confirmado!*

Obrigado pela preferência, ${nome}! 🍔

*Resumo do seu pedido:*
`;
  carrinhoCompras.forEach(i=>{txt+=`• ${i.quantidade}x ${i.nome}${i.tamanho?' '+i.tamanho:''} - ${formatarMoeda(Number(i.preco)*i.quantidade)}\n`;});
  txt+=`\nSubtotal: ${formatarMoeda(totais.subtotal)}\n`;
  if(totais.taxaEntrega)txt+=`Entrega: ${formatarMoeda(totais.taxaEntrega)}\n`;
  if(totais.descontoCupom)txt+=`Cupom: -${formatarMoeda(totais.descontoCupom)}\n`;
  if(totais.descontoVip)txt+=`Fidelidade: -${formatarMoeda(totais.descontoVip)}\n`;
  txt+=`Total: ${formatarMoeda(totais.totalFinal)}\nForma de pagamento: ${formaPagamento}\n`;
  txt+=tipoPedido==='entrega'?`Entrega: ${bairro} - ${endereco}\n`:'Retirada no balcão\n';
  txt+='\nAgradecemos seu pedido! Em breve vamos confirmar pelo WhatsApp. 🙌';
  return txt;
}

function exibirResumoCliente(texto){
  const modal=document.getElementById('modal-resumo-pedido'); const box=document.getElementById('texto-resumo-pedido');
  if(modal&&box){box.textContent=texto; modal.classList.remove('hidden'); modal.classList.add('flex');}
  else alert(texto);
}
function fecharResumoPedido(){const modal=document.getElementById('modal-resumo-pedido'); if(modal){modal.classList.add('hidden'); modal.classList.remove('flex');}}
function copiarResumoPedido(){const texto=document.getElementById('texto-resumo-pedido')?.textContent||''; navigator.clipboard?.writeText(texto); alert('Resumo copiado.');}

async function enviarWhatsApp(){
  if(carrinhoCompras.length===0){alert('Carrinho vazio');return;}
  const nome=document.getElementById('cliente-nome').value.trim(); const telefone=document.getElementById('cliente-telefone').value.trim(); const endereco=document.getElementById('cliente-endereco').value.trim(); const bairro=document.getElementById('cliente-bairro')?.value.trim()||''; const formaPagamento=obterFormaPagamento();
  if(!nome){alert('Informe nome');return;} if(!telefone){alert('Informe telefone');return;} if(!formaPagamento){alert('Escolha a forma de pagamento');return;} if(tipoPedido==='entrega'&&(!endereco||!bairro)){alert('Informe bairro e endereço');return;}
  const totais=calcularTotais(); const numeroPedido=gerarNumeroPedido();
  let msg=`🍔 *NOVO PEDIDO - DU LANCHES* 🍔\n\n🧾 Pedido: *${numeroPedido}*\n👤 ${nome}\n📞 ${telefone}\n🛒 ${tipoPedido}\n💳 ${formaPagamento}\n`; if(tipoPedido==='entrega')msg+=`🏘️ ${bairro}\n📍 ${endereco}\n`; msg+='\n----------------\n\n';
  carrinhoCompras.forEach(i=>{msg+=`${i.quantidade}x ${i.nome}${i.tamanho?' '+i.tamanho:''}\n${formatarMoeda(Number(i.preco)*i.quantidade)}\n\n`;});
  msg+=`Subtotal: ${formatarMoeda(totais.subtotal)}\n`; if(totais.taxaEntrega)msg+=`Entrega: ${formatarMoeda(totais.taxaEntrega)}\n`; if(totais.descontoCupom)msg+=`Cupom: -${formatarMoeda(totais.descontoCupom)}${(document.getElementById('cupom-cliente')?.value||'').trim().toUpperCase()==='ROLETA'?' (Roleta)':''}\n`; if(totais.descontoVip)msg+=`Fidelidade: -${formatarMoeda(totais.descontoVip)}\n`; msg+=`🧾 TOTAL: ${formatarMoeda(totais.totalFinal)}`;
  const itensPedido=carrinhoCompras.map(i=>({id:i.id,nome:i.nome,tamanho:i.tamanho,preco:i.preco,quantidade:i.quantidade}));
  const resumoCliente=montarResumoCliente(numeroPedido,nome,telefone,tipoPedido,bairro,endereco,formaPagamento,totais);
  const pedido={numero_pedido:numeroPedido,cliente_nome:nome,telefone:telefoneLimpo(telefone),tipo_pedido:tipoPedido,bairro,endereco,forma_pagamento:formaPagamento,itens:itensPedido,subtotal:totais.subtotal,taxa_entrega:totais.taxaEntrega,desconto:totais.descontoCupom+totais.descontoVip,total_final:totais.totalFinal,status:'novo',resumo_cliente:resumoCliente};
  try{await inserirPedidoBanco(pedido);}catch(e){alert('Pedido não foi salvo no Supabase: '+(e.message||e)); return;}
  const cupomUsado=(document.getElementById('cupom-cliente')?.value||'').trim().toUpperCase(); if(totais.cupomValido&&cupomUsado)await registrarUsoCupom(cupomUsado);
  const numeroWpp='55'+String(getRedesSociais().whatsapp||WHATSAPP_NUMERO).replace(/\D/g,'').replace(/^55/,''); window.open(`https://api.whatsapp.com/send?phone=${numeroWpp}&text=${encodeURIComponent(msg)}`,'_blank');
  exibirResumoCliente(resumoCliente);
  carrinhoCompras=[]; atualizarCarrinho(); renderizarCuponsAdmin(); if(typeof resetarRoletaParaNovoPedido==='function')resetarRoletaParaNovoPedido(); atualizarFidelidadeCliente();
}
