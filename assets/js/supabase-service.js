async function buscarProdutos(){return await _supabase.from('produtos').select('*').order('nome',{ascending:true});}
async function inserirProduto(dadosProduto){return await _supabase.from('produtos').insert([dadosProduto]);}
async function atualizarProdutoBanco(id,dadosAtualizados){return await _supabase.from('produtos').update(dadosAtualizados).eq('id',id);}
async function excluirProdutoBanco(id){return await _supabase.from('produtos').delete().eq('id',id);}
async function enviarImagemProduto(arquivo){const nomeArquivo=Date.now()+'_'+arquivo.name; const {error}=await _supabase.storage.from(BUCKET_IMAGENS).upload(nomeArquivo,arquivo); if(error)return {error}; const {data}= _supabase.storage.from(BUCKET_IMAGENS).getPublicUrl(nomeArquivo); return {data:data.publicUrl,error:null};}
async function inserirPedidoBanco(pedido){return await _supabase.from('pedidos').insert([pedido]).select().single();}
async function buscarPedidos(){return await _supabase.from('pedidos').select('*').order('created_at',{ascending:false}).limit(100);}
async function atualizarStatusPedidoBanco(id,status){return await _supabase.from('pedidos').update({status}).eq('id',id);}


async function buscarConfiguracoesLoja(){return await _supabase.from('loja_config').select('chave,valor');}
async function buscarConfigLojaPorChave(chave){return await _supabase.from('loja_config').select('chave,valor').eq('chave',chave).single();}
async function salvarConfigLojaBanco(chave,valor){return await _supabase.from('loja_config').upsert([{chave,valor,updated_at:new Date().toISOString()}],{onConflict:'chave'}).select().single();}
async function enviarImagemConfig(arquivo){const nomeArquivo='config_'+Date.now()+'_'+arquivo.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const {error}=await _supabase.storage.from(BUCKET_IMAGENS).upload(nomeArquivo,arquivo); if(error)return {error}; const {data}= _supabase.storage.from(BUCKET_IMAGENS).getPublicUrl(nomeArquivo); return {data:data.publicUrl,error:null};}
async function buscarPedidosPorTelefone(telefone){return await _supabase.from('pedidos').select('id,created_at,status,total_final,telefone').eq('telefone',String(telefone||'').replace(/\D/g,'')).order('created_at',{ascending:false});}
