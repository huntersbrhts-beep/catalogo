function abrirAdminSecao(secao){document.querySelectorAll('.admin-section').forEach(s=>s.classList.add('hidden'));document.getElementById('admin-'+secao)?.classList.remove('hidden');document.querySelectorAll('.admin-menu').forEach(b=>{b.className='admin-menu bg-gray-700 p-3 rounded-xl';});event?.target?.classList&&(event.target.className='admin-menu btn-primary p-3 rounded-xl'); if(secao==='pedidos')carregarPedidosAdmin(); if(secao==='cupons')renderizarCuponsAdmin(); if(secao==='config')renderizarConfigAdmin(); if(secao==='fidelidade')renderizarFidelidadeAdmin();}
function atualizarCamposPorCategoria(){const cat=document.getElementById('prod-categoria').value; const porcao=cat==='porcao'; document.getElementById('box-tamanhos').classList.toggle('hidden',!porcao); document.getElementById('box-preco-unico').classList.toggle('hidden',porcao);}
function gerarOptionsCategoria(cat){return getCategorias().map(op=>`<option value="${op.value}" ${op.value===cat?'selected':''}>${escaparHtml(op.text)}</option>`).join('');}
function renderizarProdutosAdmin(){const box=document.getElementById('lista-admin-produtos'); if(!box)return; const termo=(document.getElementById('busca-admin-produtos')?.value||'').toLowerCase(); let produtos=listaProdutos.filter(p=>(p.nome||'').toLowerCase().includes(termo)||(p.categoria||'').toLowerCase().includes(termo)); if(!produtos.length){box.innerHTML='<p class="text-gray-500">Nenhum produto encontrado.</p>';return;} box.innerHTML=produtos.map(prod=>{const t=obterTamanhosProduto(prod)||{}; const isPorcao=prod.categoria==='porcao'||t.P||t.M||t.G; return `<div class="admin-card"><div class="flex flex-col md:flex-row gap-4"><img src="${escaparHtml(prod.imagem_url||'')}" class="admin-img"><div class="flex-1 space-y-3"><input id="edit-nome-${prod.id}" value="${escaparHtml(prod.nome||'')}" class="w-full p-3 rounded-xl"><textarea id="edit-desc-${prod.id}" rows="2" class="w-full p-3 rounded-xl">${escaparHtml(prod.descricao||'')}</textarea><div class="grid grid-cols-1 md:grid-cols-3 gap-3"><input type="number" step="0.01" id="edit-preco-${prod.id}" value="${prod.preco||0}" class="p-3 rounded-xl" placeholder="Preço"><input type="number" id="edit-estoque-${prod.id}" value="${prod.estoque??''}" class="p-3 rounded-xl" placeholder="Estoque"><select id="edit-ativo-${prod.id}" class="p-3 rounded-xl"><option value="true" ${prod.ativo!==false?'selected':''}>Ativo</option><option value="false" ${prod.ativo===false?'selected':''}>Inativo</option></select></div><select id="edit-categoria-${prod.id}" class="w-full p-3 rounded-xl">${gerarOptionsCategoria(prod.categoria)}</select><div class="grid grid-cols-1 md:grid-cols-3 gap-3"><input type="number" step="0.01" id="edit-p-${prod.id}" value="${t.P||''}" placeholder="Porção P" class="p-3 rounded-xl"><input type="number" step="0.01" id="edit-m-${prod.id}" value="${t.M||''}" placeholder="Porção M" class="p-3 rounded-xl"><input type="number" step="0.01" id="edit-g-${prod.id}" value="${t.G||''}" placeholder="Porção G" class="p-3 rounded-xl"></div><label class="text-xs text-gray-400">Trocar imagem opcional:</label><input type="file" id="edit-imagem-${prod.id}" accept="image/*" class="w-full p-2 rounded-xl"><div class="flex flex-wrap gap-2"><button onclick="editarProduto('${prod.id}')" class="btn-primary px-4 py-2 rounded-xl">Salvar</button><button onclick="excluirProduto('${prod.id}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold">Excluir</button></div></div></div></div>`}).join('');}
async function editarProduto(id){const nome=document.getElementById('edit-nome-'+id).value.trim(); const descricao=document.getElementById('edit-desc-'+id).value.trim(); const categoria=document.getElementById('edit-categoria-'+id).value; const preco=numero(document.getElementById('edit-preco-'+id).value); const estoqueRaw=document.getElementById('edit-estoque-'+id).value; const arquivo=document.getElementById('edit-imagem-'+id).files[0]; if(!nome){alert('Informe o nome.');return;} const tamanhos={P:numero(document.getElementById('edit-p-'+id).value),M:numero(document.getElementById('edit-m-'+id).value),G:numero(document.getElementById('edit-g-'+id).value)}; let dados={nome,descricao,categoria,preco,estoque:estoqueRaw===''?null:parseInt(estoqueRaw),ativo:document.getElementById('edit-ativo-'+id).value==='true',tamanhos:(tamanhos.P||tamanhos.M||tamanhos.G)?tamanhos:null}; if(arquivo){const {data,error}=await enviarImagemProduto(arquivo); if(error){alert(error.message);return;} dados.imagem_url=data;} const {error}=await atualizarProdutoBanco(id,dados); if(error){alert('Erro ao salvar. Confira se rodou o supabase-sql.txt. '+error.message);return;} alert('Produto atualizado!'); carregarProdutosDoBanco();}
async function excluirProduto(id){if(!confirm('Excluir este produto?'))return; const {error}=await excluirProdutoBanco(id); if(error){alert(error.message);return;} carregarProdutosDoBanco();}
async function salvarProduto(e){e.preventDefault(); const nome=document.getElementById('prod-nome').value.trim(); const descricao=document.getElementById('prod-descricao').value.trim(); const categoria=document.getElementById('prod-categoria').value; const arquivo=document.getElementById('prod-imagem').files[0]; if(!nome||!arquivo){alert('Preencha nome e imagem.');return;} let preco=numero(document.getElementById('prod-preco').value); let tamanhos=null; if(categoria==='porcao'){tamanhos={P:numero(document.getElementById('prod-preco-p').value),M:numero(document.getElementById('prod-preco-m').value),G:numero(document.getElementById('prod-preco-g').value)}; preco=tamanhos.P||tamanhos.M||tamanhos.G; if(!preco){alert('Informe pelo menos um preço para P, M ou G.');return;}} else if(!preco){alert('Informe preço válido.');return;} const {data:imagem_url,error:uploadError}=await enviarImagemProduto(arquivo); if(uploadError){alert(uploadError.message);return;} const dados={nome,descricao,categoria,preco,imagem_url,estoque:document.getElementById('prod-estoque').value?parseInt(document.getElementById('prod-estoque').value):null,ativo:document.getElementById('prod-ativo').value==='true',tamanhos}; const {error}=await inserirProduto(dados); if(error){alert('Erro ao cadastrar. Confira se rodou o supabase-sql.txt. '+error.message);return;} alert('Produto cadastrado'); document.getElementById('form-produto').reset(); atualizarCamposPorCategoria(); carregarProdutosDoBanco();}
function criarCategoria(){const input=document.getElementById('nova-categoria'); const nome=input.value.trim(); if(!nome){alert('Digite categoria');return;} const valor=normalizarCategoria(nome); const select=document.getElementById('prod-categoria'); if([...select.options].some(op=>op.value===valor)){alert('Categoria já existe.');return;} const option=document.createElement('option'); option.value=valor; option.textContent=nome; select.appendChild(option); const ordem=getOrdemCategorias(); ordem.push(valor); salvarJsonLocal('ordem_categorias',ordem); input.value=''; atualizarCategoriasFiltro();}
async function fazerLogin(){const email=document.getElementById('login-email').value.trim(); const senha=document.getElementById('login-senha').value.trim(); if(!email||!senha){alert('Preencha e-mail e senha.');return;} const {error}=await _supabase.auth.signInWithPassword({email,password:senha}); if(error)alert(error.message);}
async function fazerLogout(){await _supabase.auth.signOut();}
function verificarEstadoLogin(){_supabase.auth.onAuthStateChange((event,session)=>{document.getElementById('secao-login').classList.toggle('hidden',!!session); document.getElementById('secao-admin-painel').classList.toggle('hidden',!session); if(session)carregarProdutosDoBanco();}); _supabase.auth.getSession().then(({data})=>{if(data.session){document.getElementById('secao-login').classList.add('hidden');document.getElementById('secao-admin-painel').classList.remove('hidden');}});}
async function carregarPedidosAdmin(){const box=document.getElementById('lista-admin-pedidos'); box.innerHTML='<p class="text-gray-400">Carregando...</p>'; const {data,error}=await buscarPedidos(); if(error){box.innerHTML='<p class="text-red-400">Tabela pedidos ainda não criada. Rode o supabase-sql.txt.</p>';return;} listaPedidos=data||[]; if(!listaPedidos.length){box.innerHTML='<p class="text-gray-500">Nenhum pedido salvo ainda.</p>';return;} box.innerHTML=listaPedidos.map(p=>`<div class="admin-card"><div class="flex justify-between gap-3"><div><b>${escaparHtml(p.cliente_nome)}</b><p class="text-sm text-gray-400">${escaparHtml(p.telefone)} • ${escaparHtml(p.tipo_pedido)} • ${new Date(p.created_at).toLocaleString('pt-BR')}</p><p class="text-orange-400 font-bold">${formatarMoeda(p.total_final)}</p></div><select onchange="alterarStatusPedido('${p.id}',this.value)" class="p-2 rounded-xl"><option ${p.status==='novo'?'selected':''} value="novo">Novo</option><option ${p.status==='preparo'?'selected':''} value="preparo">Preparo</option><option ${p.status==='finalizado'?'selected':''} value="finalizado">Finalizado</option></select></div><pre class="text-xs whitespace-pre-wrap mt-3 text-gray-300">${escaparHtml(JSON.stringify(p.itens,null,2))}</pre></div>`).join('');}
async function alterarStatusPedido(id,status){const {error}=await atualizarStatusPedidoBanco(id,status); if(error)alert(error.message);}
function salvarCupomAdmin(){const codigo=document.getElementById('cupom-codigo').value.trim().toUpperCase(); const tipo=document.getElementById('cupom-tipo').value; const valor=numero(document.getElementById('cupom-valor').value); const limite=parseInt(document.getElementById('cupom-limite')?.value||'0')||0; if(!codigo||!valor){alert('Informe código e valor.');return;} let cupons=getCupons().filter(c=>c.codigo!==codigo); cupons.push({codigo,tipo,valor,limite}); salvarJsonLocal('cupons_desconto',cupons); document.getElementById('cupom-codigo').value=''; document.getElementById('cupom-valor').value=''; if(document.getElementById('cupom-limite'))document.getElementById('cupom-limite').value=''; renderizarCuponsAdmin();}
function removerCupom(codigo){salvarJsonLocal('cupons_desconto',getCupons().filter(c=>c.codigo!==codigo));renderizarCuponsAdmin();}
function renderizarCuponsAdmin(){const box=document.getElementById('lista-cupons'); if(!box)return; const cupons=getCupons(); box.innerHTML=cupons.length?cupons.map(c=>{const limite=Number(c.limite||0); const usados=usoCupomCodigo(c.codigo); const limiteTxt=limite>0?` • usado ${usados}/${limite}`:' • sem limite'; return `<div class="admin-card flex justify-between gap-3"><span>${c.codigo} - ${c.tipo==='percentual'?c.valor+'%':formatarMoeda(c.valor)}${limiteTxt}</span><button onclick="removerCupom('${c.codigo}')" class="text-red-400">Excluir</button></div>`;}).join(''):'<p class="text-gray-500">Nenhum cupom.</p>';}
function salvarBannerAdmin(){const cfg=getConfigLoja(); cfg.banner=document.getElementById('config-banner').value.trim(); salvarJsonLocal('config_loja',cfg); atualizarStatusLoja(); alert('Banner salvo.');}
function salvarTaxaAdmin(){const bairro=normalizarCategoria(document.getElementById('taxa-bairro').value); const valor=numero(document.getElementById('taxa-valor').value); if(!bairro){alert('Informe bairro.');return;} const taxas=getTaxas(); taxas[bairro]=valor; salvarJsonLocal('taxas_entrega',taxas); renderizarConfigAdmin(); atualizarCarrinho();}
function removerTaxa(b){const taxas=getTaxas(); delete taxas[b]; salvarJsonLocal('taxas_entrega',taxas); renderizarConfigAdmin();}
function salvarHorarioAdmin(){const cfg=getConfigLoja(); cfg.abre=document.getElementById('hora-abre').value||'18:00'; cfg.fecha=document.getElementById('hora-fecha').value||'23:59'; cfg.forcar=document.getElementById('loja-forcar').value; salvarJsonLocal('config_loja',cfg); atualizarStatusLoja(); alert('Horário salvo.');}
function renderizarConfigAdmin(){const cfg=getConfigLoja(); document.getElementById('config-banner').value=cfg.banner||''; document.getElementById('hora-abre').value=cfg.abre||'18:00'; document.getElementById('hora-fecha').value=cfg.fecha||'23:59'; document.getElementById('loja-forcar').value=cfg.forcar||'auto'; const taxas=getTaxas(); document.getElementById('lista-taxas').innerHTML=Object.keys(taxas).length?Object.entries(taxas).map(([b,v])=>`<div class="admin-card flex justify-between"><span>${b}: ${formatarMoeda(v)}</span><button onclick="removerTaxa('${b}')" class="text-red-400">Excluir</button></div>`).join(''):'<p class="text-gray-500">Nenhuma taxa cadastrada.</p>'; renderizarCategoriasAdmin();}
function renderizarCategoriasAdmin(){const box=document.getElementById('lista-categorias-admin'); if(!box)return; const cats=getCategorias(); box.innerHTML=cats.map((c,i)=>`<div class="admin-card flex justify-between"><span>${escaparHtml(c.text)}</span><span><button onclick="moverCategoria('${c.value}',-1)" class="px-2">↑</button><button onclick="moverCategoria('${c.value}',1)" class="px-2">↓</button></span></div>`).join('');}
function moverCategoria(valor,dir){let ordem=getCategorias().map(c=>c.value); const i=ordem.indexOf(valor), j=i+dir; if(i<0||j<0||j>=ordem.length)return; [ordem[i],ordem[j]]=[ordem[j],ordem[i]]; salvarJsonLocal('ordem_categorias',ordem); atualizarCategoriasFiltro();}

function salvarBannerAdmin(){const cfg=getConfigLoja(); cfg.banner=document.getElementById('config-banner').value.trim(); salvarJsonLocal('config_loja',cfg); atualizarStatusLoja(); alert('Banner salvo.');}
async function salvarAparenciaAdmin(){const cor=document.getElementById('config-cor-fundo')?.value||''; const usarImagem=document.getElementById('config-usar-imagem')?.value==='true'; const arquivo=document.getElementById('config-imagem-fundo')?.files?.[0]; const aparencia=getAparenciaLoja(); aparencia.corFundo=cor; aparencia.usarImagem=usarImagem; if(arquivo){aparencia.imagemFundo=await arquivoParaDataUrl(arquivo);} salvarJsonLocal('aparencia_loja',aparencia); aplicarAparenciaLoja(); alert('Plano de fundo salvo.');}
function limparImagemFundoAdmin(){const aparencia=getAparenciaLoja(); aparencia.imagemFundo=''; aparencia.usarImagem=false; salvarJsonLocal('aparencia_loja',aparencia); renderizarConfigAdmin(); aplicarAparenciaLoja();}
function salvarRedesAdmin(){const redes={instagram:document.getElementById('rede-instagram')?.value.trim()||'',facebook:document.getElementById('rede-facebook')?.value.trim()||'',whatsapp:document.getElementById('rede-whatsapp')?.value.trim()||'31984656166'}; salvarJsonLocal('redes_sociais',redes); renderizarRodapeRedes(); alert('Redes sociais salvas.');}
async function salvarRoletaConfigAdmin(){ await salvarTodosPremiosRoletaAdmin(); }
async function salvarPremioRoletaAdmin(){const texto=document.getElementById('premio-texto')?.value.trim(); const tipo=document.getElementById('premio-tipo')?.value; const valor=numero(document.getElementById('premio-valor')?.value||0); if(!texto){alert('Informe o nome do prêmio.');return;} if(tipo!=='nenhum'&&!valor){alert('Informe o valor do prêmio.');return;} const cfg=getConfigRoleta(); cfg.premios=cfg.premios||[]; if(cfg.premios.length>=8){alert('Limite de 8 prêmios na roleta.');return;} cfg.premios.push({texto,tipo,valor}); salvarJsonLocal('config_roleta',cfg); document.getElementById('premio-texto').value=''; document.getElementById('premio-valor').value=''; renderizarRoletaAdmin();}
async function removerPremioRoletaAdmin(i){const cfg=getConfigRoleta(); cfg.premios=(cfg.premios||[]).filter((_,idx)=>idx!==i); salvarJsonLocal('config_roleta',cfg); renderizarRoletaAdmin();}
function renderizarRoletaAdmin(){const cfg=getConfigRoleta(); const limiteEl=document.getElementById('roleta-limite-admin'); if(limiteEl)limiteEl.value=cfg.limite||0; const box=document.getElementById('lista-premios-roleta'); if(!box)return; const usados=usoCupomCodigo('ROLETA'); box.innerHTML=`<p class="text-sm text-gray-400 mb-2">Usados: ${usados}/${cfg.limite||'sem limite'}</p>`+((cfg.premios||[]).length?cfg.premios.map((p,i)=>`<div class="admin-card flex justify-between gap-3"><span>${escaparHtml(p.texto)} - ${p.tipo==='percentual'?p.valor+'%':p.tipo==='valor'?formatarMoeda(p.valor):'sem desconto'}</span><button onclick="removerPremioRoletaAdmin(${i})" class="text-red-400">Excluir</button></div>`).join(''):'<p class="text-gray-500">Nenhum prêmio cadastrado.</p>'); if(typeof renderizarFatiasRoleta==='function'){const labels=document.getElementById('roleta-labels'); if(labels)labels.dataset.ok=''; renderizarFatiasRoleta(true);}}
function renderizarConfigAdmin(){const cfg=getConfigLoja(); document.getElementById('config-banner').value=cfg.banner||''; document.getElementById('hora-abre').value=cfg.abre||'18:00'; document.getElementById('hora-fecha').value=cfg.fecha||'23:59'; document.getElementById('loja-forcar').value=cfg.forcar||'auto'; const taxas=getTaxas(); document.getElementById('lista-taxas').innerHTML=Object.keys(taxas).length?Object.entries(taxas).map(([b,v])=>`<div class="admin-card flex justify-between"><span>${b}: ${formatarMoeda(v)}</span><button onclick="removerTaxa('${b}')" class="text-red-400">Excluir</button></div>`).join(''):'<p class="text-gray-500">Nenhuma taxa cadastrada.</p>'; const a=getAparenciaLoja(); const cor=document.getElementById('config-cor-fundo'); if(cor)cor.value=a.corFundo||''; const usar=document.getElementById('config-usar-imagem'); if(usar)usar.value=a.usarImagem?'true':'false'; const redes=getRedesSociais(); if(document.getElementById('rede-instagram'))document.getElementById('rede-instagram').value=redes.instagram||''; if(document.getElementById('rede-facebook'))document.getElementById('rede-facebook').value=redes.facebook||''; if(document.getElementById('rede-whatsapp'))document.getElementById('rede-whatsapp').value=redes.whatsapp||'31984656166'; renderizarRoletaAdmin(); renderizarCategoriasAdmin(); aplicarAparenciaLoja(); renderizarRodapeRedes();}


// ===== Correções V11: roleta realmente salva/atualiza e fidelidade visível =====
async function salvarTodosPremiosRoletaAdmin(){
  const limite=parseInt(document.getElementById('roleta-limite-admin')?.value||'0')||0;
  const premios=[];
  document.querySelectorAll('[data-premio-roleta-index]').forEach(row=>{
    const idx=row.getAttribute('data-premio-roleta-index');
    const texto=document.getElementById('premio-edit-texto-'+idx)?.value.trim()||'';
    const tipo=document.getElementById('premio-edit-tipo-'+idx)?.value||'nenhum';
    const valor=numero(document.getElementById('premio-edit-valor-'+idx)?.value||0);
    if(texto) premios.push({texto,tipo,valor:tipo==='nenhum'?0:valor});
  });
  await salvarConfigCompartilhada('config_roleta',{limite,premios});
  await recarregarConfigRoletaCompartilhada();
  if(typeof atualizarRoletaDepoisDoAdm==='function')atualizarRoletaDepoisDoAdm();
  renderizarRoletaAdmin();
  alert('Prêmios da roleta salvos e atualizados.');
}
function salvarRoletaConfigAdmin(){salvarTodosPremiosRoletaAdmin();}
async function salvarPremioRoletaAdmin(){
  const texto=document.getElementById('premio-texto')?.value.trim();
  const tipo=document.getElementById('premio-tipo')?.value;
  const valor=numero(document.getElementById('premio-valor')?.value||0);
  if(!texto){alert('Informe o nome do prêmio.');return;}
  if(tipo!=='nenhum'&&!valor){alert('Informe o valor do prêmio.');return;}
  const cfg=getConfigRoleta();
  cfg.premios=Array.isArray(cfg.premios)?cfg.premios:[];
  if(cfg.premios.length>=8){alert('Limite de 8 prêmios na roleta.');return;}
  cfg.premios.push({texto,tipo,valor:tipo==='nenhum'?0:valor});
  await salvarConfigCompartilhada('config_roleta',cfg);
  await recarregarConfigRoletaCompartilhada();
  document.getElementById('premio-texto').value='';
  document.getElementById('premio-valor').value='';
  if(typeof atualizarRoletaDepoisDoAdm==='function')atualizarRoletaDepoisDoAdm();
  renderizarRoletaAdmin();
}
async function removerPremioRoletaAdmin(i){
  const cfg=getConfigRoleta();
  cfg.premios=(cfg.premios||[]).filter((_,idx)=>idx!==i);
  await salvarConfigCompartilhada('config_roleta',cfg);
  await recarregarConfigRoletaCompartilhada();
  if(typeof atualizarRoletaDepoisDoAdm==='function')atualizarRoletaDepoisDoAdm();
  renderizarRoletaAdmin();
}
function renderizarRoletaAdmin(){
  const cfg=getConfigRoleta();
  const limiteEl=document.getElementById('roleta-limite-admin');
  if(limiteEl)limiteEl.value=cfg.limite||0;
  const box=document.getElementById('lista-premios-roleta');
  if(!box)return;
  const usados=usoCupomCodigo('ROLETA');
  const premios=Array.isArray(cfg.premios)?cfg.premios:[];
  box.innerHTML=`<div class="text-sm text-gray-400 mb-3">Usados: ${usados}/${cfg.limite||'sem limite'} • Edite abaixo e clique em <b>Salvar tudo</b>.</div>`+
    (premios.length?premios.map((p,i)=>`<div class="admin-card space-y-2" data-premio-roleta-index="${i}"><div class="grid grid-cols-1 md:grid-cols-4 gap-2"><input id="premio-edit-texto-${i}" value="${escaparHtml(p.texto||'')}" class="p-3 rounded-xl" placeholder="Nome"><select id="premio-edit-tipo-${i}" class="p-3 rounded-xl"><option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option><option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option><option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option></select><input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor||0)}" class="p-3 rounded-xl" placeholder="Valor"><button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl">Excluir</button></div></div>`).join(''):'<p class="text-gray-500">Nenhum prêmio cadastrado.</p>')+
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3"><button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-3 rounded-xl">Salvar tudo</button><button onclick="limparCacheLocalAdmin()" class="w-full bg-gray-700 p-3 rounded-xl">Limpar cache local</button></div>'; 
  if(typeof atualizarBotaoRoleta==='function')atualizarBotaoRoleta();
  if(typeof renderizarFatiasRoleta==='function')renderizarFatiasRoleta(true);
}
function renderizarFidelidadeAdmin(){
  const box=document.getElementById('lista-fidelidade-admin') || document.getElementById('lista-admin-fidelidade');
  if(!box)return;
  const dados=lerJsonLocal('historico_clientes',{});
  const linhas=Object.entries(dados).sort((a,b)=>(b[1].pedidos||0)-(a[1].pedidos||0));
  box.innerHTML=linhas.length?linhas.map(([tel,h])=>`<div class="admin-card flex justify-between gap-3"><div><b>${escaparHtml(tel)}</b><p class="text-sm text-gray-400">${h.pedidos||0} pedido(s) • Total ${formatarMoeda(h.total||0)}</p></div><span class="text-green-400 font-bold">${(h.pedidos||0)>=10?'10%':(h.pedidos||0)>=5?'5%':'sem desconto'}</span></div>`).join(''):'<p class="text-gray-500">Nenhum telefone salvo ainda. Os telefones entram aqui após enviar pedido.</p>';
}


// ===== V12: roleta compartilhada entre computador e celular =====
async function recarregarConfigRoletaCompartilhada(){
  try{
    const { data, error } = await buscarConfiguracaoBanco('config_roleta');
    if(!error && data && data.valor){
      localStorage.setItem('config_roleta', JSON.stringify(data.valor));
    }
  }catch(e){}
}
async function limparCacheLocalAdmin(){
  const manterProdutos = true;
  ['config_roleta','redes_sociais','aparencia_loja','config_loja','taxas_entrega','cupons_desconto','ordem_categorias'].forEach(k=>localStorage.removeItem(k));
  if(typeof carregarConfiguracoesBanco==='function') await carregarConfiguracoesBanco();
  renderizarConfigAdmin();
  if(typeof atualizarRoletaDepoisDoAdm==='function') atualizarRoletaDepoisDoAdm();
  alert('Cache local limpo. Recarregue o site no celular ou abra novamente.');
}

// ===== V13: correção definitiva da roleta entre ADM e celular =====
async function salvarConfigRoletaRemotaObrigatoria(cfg){
  salvarJsonLocal('config_roleta', cfg);
  if(typeof salvarConfiguracaoBanco !== 'function') return { error: { message:'Função de configuração não carregou.' } };
  const { error } = await salvarConfiguracaoBanco('config_roleta', cfg);
  if(error){
    return { error };
  }
  return { error:null };
}

async function salvarTodosPremiosRoletaAdmin(){
  const limite=parseInt(document.getElementById('roleta-limite-admin')?.value||'0')||0;
  const premios=[];
  document.querySelectorAll('[data-premio-roleta-index]').forEach(row=>{
    const idx=row.getAttribute('data-premio-roleta-index');
    const texto=document.getElementById('premio-edit-texto-'+idx)?.value.trim()||'';
    const tipo=document.getElementById('premio-edit-tipo-'+idx)?.value||'nenhum';
    const valor=numero(document.getElementById('premio-edit-valor-'+idx)?.value||0);
    if(texto) premios.push({texto,tipo,valor:tipo==='nenhum'?0:valor});
  });
  const cfg={limite,premios};
  const { error } = await salvarConfigRoletaRemotaObrigatoria(cfg);
  if(error){
    alert('Não consegui salvar a roleta no Supabase. Rode o supabase-sql.txt e tente novamente. Erro: '+error.message);
    return;
  }
  if(typeof carregarConfigRoletaAtualizada==='function') await carregarConfigRoletaAtualizada();
  if(typeof atualizarRoletaDepoisDoAdm==='function') atualizarRoletaDepoisDoAdm();
  renderizarRoletaAdmin();
  alert('Prêmios salvos no Supabase. O celular agora vai carregar estes valores.');
}
function salvarRoletaConfigAdmin(){salvarTodosPremiosRoletaAdmin();}

async function salvarPremioRoletaAdmin(){
  const texto=document.getElementById('premio-texto')?.value.trim();
  const tipo=document.getElementById('premio-tipo')?.value;
  const valor=numero(document.getElementById('premio-valor')?.value||0);
  if(!texto){alert('Informe o nome do prêmio.');return;}
  if(tipo!=='nenhum'&&!valor){alert('Informe o valor do prêmio.');return;}
  const cfg=getConfigRoleta();
  cfg.limite=Number(document.getElementById('roleta-limite-admin')?.value || cfg.limite || 0);
  cfg.premios=Array.isArray(cfg.premios)?cfg.premios:[];
  if(cfg.premios.length>=8){alert('Limite de 8 prêmios na roleta.');return;}
  cfg.premios.push({texto,tipo,valor:tipo==='nenhum'?0:valor});
  const { error } = await salvarConfigRoletaRemotaObrigatoria(cfg);
  if(error){
    alert('Não consegui salvar a roleta no Supabase. Rode o supabase-sql.txt e tente novamente. Erro: '+error.message);
    return;
  }
  document.getElementById('premio-texto').value='';
  document.getElementById('premio-valor').value='';
  if(typeof carregarConfigRoletaAtualizada==='function') await carregarConfigRoletaAtualizada();
  if(typeof atualizarRoletaDepoisDoAdm==='function') atualizarRoletaDepoisDoAdm();
  renderizarRoletaAdmin();
}

async function removerPremioRoletaAdmin(i){
  const cfg=getConfigRoleta();
  cfg.premios=(cfg.premios||[]).filter((_,idx)=>idx!==i);
  const { error } = await salvarConfigRoletaRemotaObrigatoria(cfg);
  if(error){alert('Erro ao salvar no Supabase: '+error.message); return;}
  if(typeof carregarConfigRoletaAtualizada==='function') await carregarConfigRoletaAtualizada();
  if(typeof atualizarRoletaDepoisDoAdm==='function') atualizarRoletaDepoisDoAdm();
  renderizarRoletaAdmin();
}

async function renderizarRoletaAdmin(){
  if(typeof carregarConfigRoletaAtualizada==='function') await carregarConfigRoletaAtualizada();
  const cfg=getConfigRoleta();
  const limiteEl=document.getElementById('roleta-limite-admin');
  if(limiteEl)limiteEl.value=cfg.limite||0;
  const box=document.getElementById('lista-premios-roleta');
  if(!box)return;
  const usados=usoCupomCodigo('ROLETA');
  const premios=Array.isArray(cfg.premios)?cfg.premios:[];
  box.innerHTML=`<div class="text-sm text-gray-400 mb-3">Usados: ${usados}/${cfg.limite||'sem limite'} • Estes dados são salvos no Supabase para aparecer no celular.</div>`+
    (premios.length?premios.map((p,i)=>`<div class="admin-card space-y-2" data-premio-roleta-index="${i}"><div class="grid grid-cols-1 md:grid-cols-4 gap-2"><input id="premio-edit-texto-${i}" value="${escaparHtml(p.texto||'')}" class="p-3 rounded-xl" placeholder="Nome"><select id="premio-edit-tipo-${i}" class="p-3 rounded-xl"><option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option><option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option><option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option></select><input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor||0)}" class="p-3 rounded-xl" placeholder="Valor"><button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl">Excluir</button></div></div>`).join(''):'<p class="text-gray-500">Nenhum prêmio cadastrado.</p>')+
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3"><button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-3 rounded-xl">Salvar tudo no Supabase</button><button onclick="limparCacheLocalAdmin()" class="w-full bg-gray-700 p-3 rounded-xl">Limpar cache local</button></div>'; 
  if(typeof atualizarBotaoRoleta==='function')atualizarBotaoRoleta();
  if(typeof renderizarFatiasRoleta==='function')renderizarFatiasRoleta();
}

// ===== V14 DEFINITIVO: ADM salva e lê roleta somente pela configuração compartilhada =====
function normalizarPremioRoletaAdminV14(p){
  const texto = String(p?.texto || '').trim();
  const tipo = ['percentual','valor','nenhum'].includes(String(p?.tipo || '').toLowerCase()) ? String(p.tipo).toLowerCase() : 'nenhum';
  const valor = tipo === 'nenhum' ? 0 : numero(p?.valor || 0);
  if(!texto) return null;
  return { texto, tipo, valor };
}

function normalizarConfigRoletaAdminV14(cfg){
  return {
    limite: Number(cfg?.limite || 0),
    premios: Array.isArray(cfg?.premios) ? cfg.premios.map(normalizarPremioRoletaAdminV14).filter(Boolean).slice(0,8) : []
  };
}

async function buscarRoletaAdminV14(){
  try{
    if(typeof buscarConfiguracaoBanco === 'function'){
      const { data, error } = await buscarConfiguracaoBanco('config_roleta');
      if(error) throw error;
      if(data && data.valor){
        const cfg = normalizarConfigRoletaAdminV14(data.valor);
        salvarJsonLocal('config_roleta', cfg);
        if(typeof salvarConfigRoletaMemoria === 'function') salvarConfigRoletaMemoria({...cfg, fonte:'Supabase'});
        return { cfg, fonte:'Supabase', error:null };
      }
    }
  }catch(e){
    return { cfg: normalizarConfigRoletaAdminV14(getConfigRoleta()), fonte:'localStorage', error:e };
  }
  return { cfg: normalizarConfigRoletaAdminV14(getConfigRoleta()), fonte:'localStorage', error:null };
}

async function salvarRoletaAdminV14(cfg){
  const normalizada = normalizarConfigRoletaAdminV14(cfg);
  salvarJsonLocal('config_roleta', normalizada);
  if(typeof salvarConfigRoletaMemoria === 'function') salvarConfigRoletaMemoria({...normalizada, fonte:'Supabase'});
  if(typeof salvarConfiguracaoBanco !== 'function'){
    return { error: { message: 'Função salvarConfiguracaoBanco não carregou.' } };
  }
  const { error } = await salvarConfiguracaoBanco('config_roleta', normalizada);
  if(!error && typeof carregarConfigRoletaAtualizada === 'function') await carregarConfigRoletaAtualizada();
  return { error };
}

async function salvarTodosPremiosRoletaAdmin(){
  const limite = parseInt(document.getElementById('roleta-limite-admin')?.value || '0') || 0;
  const premios = [];
  document.querySelectorAll('[data-premio-roleta-index]').forEach(row=>{
    const idx = row.getAttribute('data-premio-roleta-index');
    const texto = document.getElementById('premio-edit-texto-'+idx)?.value.trim() || '';
    const tipo = document.getElementById('premio-edit-tipo-'+idx)?.value || 'nenhum';
    const valor = numero(document.getElementById('premio-edit-valor-'+idx)?.value || 0);
    const premio = normalizarPremioRoletaAdminV14({texto,tipo,valor});
    if(premio) premios.push(premio);
  });
  const { error } = await salvarRoletaAdminV14({ limite, premios });
  if(error){
    alert('A roleta NÃO foi salva no Supabase. Rode o supabase-sql.txt atualizado e tente novamente. Erro: '+error.message);
    return;
  }
  await renderizarRoletaAdmin();
  if(typeof atualizarRoletaDepoisDoAdm === 'function') await atualizarRoletaDepoisDoAdm();
  alert('Roleta salva no Supabase com sucesso. Abra no celular e teste novamente.');
}

async function salvarRoletaConfigAdmin(){
  await salvarTodosPremiosRoletaAdmin();
}

async function salvarPremioRoletaAdmin(){
  const texto = document.getElementById('premio-texto')?.value.trim();
  const tipo = document.getElementById('premio-tipo')?.value || 'nenhum';
  const valor = numero(document.getElementById('premio-valor')?.value || 0);
  const premio = normalizarPremioRoletaAdminV14({ texto, tipo, valor });
  if(!premio){ alert('Informe o nome do prêmio.'); return; }
  if(premio.tipo !== 'nenhum' && !premio.valor){ alert('Informe o valor do prêmio.'); return; }
  const { cfg } = await buscarRoletaAdminV14();
  cfg.limite = parseInt(document.getElementById('roleta-limite-admin')?.value || cfg.limite || '0') || 0;
  cfg.premios = Array.isArray(cfg.premios) ? cfg.premios : [];
  if(cfg.premios.length >= 8){ alert('Limite de 8 prêmios na roleta.'); return; }
  cfg.premios.push(premio);
  const { error } = await salvarRoletaAdminV14(cfg);
  if(error){
    alert('A roleta NÃO foi salva no Supabase. Rode o supabase-sql.txt atualizado e tente novamente. Erro: '+error.message);
    return;
  }
  const t=document.getElementById('premio-texto'); if(t)t.value='';
  const v=document.getElementById('premio-valor'); if(v)v.value='';
  await renderizarRoletaAdmin();
  if(typeof atualizarRoletaDepoisDoAdm === 'function') await atualizarRoletaDepoisDoAdm();
}

async function removerPremioRoletaAdmin(i){
  const { cfg } = await buscarRoletaAdminV14();
  cfg.premios = (cfg.premios || []).filter((_,idx)=>idx!==i);
  const { error } = await salvarRoletaAdminV14(cfg);
  if(error){ alert('Não consegui remover no Supabase: '+error.message); return; }
  await renderizarRoletaAdmin();
  if(typeof atualizarRoletaDepoisDoAdm === 'function') await atualizarRoletaDepoisDoAdm();
}

async function renderizarRoletaAdmin(){
  const { cfg, fonte, error } = await buscarRoletaAdminV14();
  const limiteEl = document.getElementById('roleta-limite-admin');
  if(limiteEl) limiteEl.value = cfg.limite || 0;
  const box = document.getElementById('lista-premios-roleta');
  if(!box) return;
  const usados = usoCupomCodigo('ROLETA');
  const premios = Array.isArray(cfg.premios) ? cfg.premios : [];
  box.innerHTML =
    `<div class="bg-blue-500/10 border border-blue-500/30 text-blue-200 p-3 rounded-xl text-sm mb-3">Fonte da roleta: <b>${escaparHtml(fonte)}</b>${error ? '<br>Erro: '+escaparHtml(error.message || error) : ''}</div>`+
    `<p class="text-sm text-gray-400 mb-2">Usados: ${usados}/${cfg.limite || 'sem limite'} • Prêmios: ${premios.length}</p>`+
    (premios.length ? premios.map((p,i)=>`<div class="admin-card space-y-2" data-premio-roleta-index="${i}"><div class="grid grid-cols-1 md:grid-cols-4 gap-2"><input id="premio-edit-texto-${i}" value="${escaparHtml(p.texto||'')}" class="p-3 rounded-xl" placeholder="Nome"><select id="premio-edit-tipo-${i}" class="p-3 rounded-xl"><option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option><option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option><option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option></select><input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor||0)}" class="p-3 rounded-xl" placeholder="Valor"><button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl">Excluir</button></div></div>`).join('') : '<p class="text-gray-500">Nenhum prêmio cadastrado.</p>')+
    '<button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-3 rounded-xl mt-3">Salvar tudo no Supabase</button>';
}

window.salvarTodosPremiosRoletaAdmin = salvarTodosPremiosRoletaAdmin;
window.salvarRoletaConfigAdmin = salvarRoletaConfigAdmin;
window.salvarPremioRoletaAdmin = salvarPremioRoletaAdmin;
window.removerPremioRoletaAdmin = removerPremioRoletaAdmin;
window.renderizarRoletaAdmin = renderizarRoletaAdmin;
