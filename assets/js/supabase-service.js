async function buscarProdutos(){return await _supabase.from('produtos').select('*').order('nome',{ascending:true});}
async function inserirProduto(dadosProduto){return await _supabase.from('produtos').insert([dadosProduto]);}
async function atualizarProdutoBanco(id,dadosAtualizados){return await _supabase.from('produtos').update(dadosAtualizados).eq('id',id);}
async function excluirProdutoBanco(id){return await _supabase.from('produtos').delete().eq('id',id);}
async function enviarImagemProduto(arquivo){const nomeArquivo=Date.now()+'_'+arquivo.name; const {error}=await _supabase.storage.from(BUCKET_IMAGENS).upload(nomeArquivo,arquivo); if(error)return {error}; const {data}= _supabase.storage.from(BUCKET_IMAGENS).getPublicUrl(nomeArquivo); return {data:data.publicUrl,error:null};}
async function inserirPedidoBanco(pedido){return await _supabase.from('pedidos').insert([pedido]).select().single();}
async function buscarPedidos(){return await _supabase.from('pedidos').select('*').order('created_at',{ascending:false}).limit(100);}
async function atualizarStatusPedidoBanco(id,status){return await _supabase.from('pedidos').update({status}).eq('id',id);}


// ===== Configurações compartilhadas no Supabase =====
// Isso evita que celular fique com roleta antiga salva apenas no cache/localStorage.
async function buscarConfiguracaoBanco(chave){
  return await _supabase
    .from('configuracoes')
    .select('valor,updated_at')
    .eq('chave', chave)
    .maybeSingle();
}
async function salvarConfiguracaoBanco(chave, valor){
  return await _supabase
    .from('configuracoes')
    .upsert([{ chave, valor, updated_at: new Date().toISOString() }], { onConflict: 'chave' })
    .select('chave,valor,updated_at')
    .single();
}
async function carregarConfiguracoesBanco(){
  const chaves=['config_roleta','redes_sociais','aparencia_loja','config_loja','taxas_entrega','cupons_desconto','ordem_categorias'];
  const { data, error } = await _supabase.from('configuracoes').select('chave,valor').in('chave', chaves);
  if(error){ console.warn('Configurações Supabase não carregadas. Rode o SQL v12.', error.message); return; }
  (data||[]).forEach(item=>{
    if(item && item.chave){
      try{ localStorage.setItem(item.chave, JSON.stringify(item.valor ?? {})); }catch(e){}
    }
  });
}
async function salvarConfigCompartilhada(chave, valor){
  // V17: para a roleta, não mascarar erro com localStorage.
  // Outras configs continuam salvando localmente como apoio visual.
  if(chave !== 'config_roleta') salvarJsonLocal(chave, valor);
  try{
    const resp = await salvarConfiguracaoBanco(chave, valor);
    if(resp.error){
      console.error('Não salvou configuração no Supabase:', chave, resp.error.message);
      return { data:null, error:resp.error };
    }
    if(chave !== 'config_roleta') salvarJsonLocal(chave, valor);
    return resp;
  }catch(e){
    console.error('Erro ao salvar configuração:', chave, e.message);
    return { data:null, error:{ message:e.message || String(e) } };
  }
}
