async function buscarProdutos(){
return await _supabase
.from('produtos')
.select('*')
.order('nome',{ascending:true});
}

async function inserirProduto(dadosProduto){
return await _supabase
.from('produtos')
.insert([dadosProduto]);
}

async function atualizarProdutoBanco(id,dadosAtualizados){
return await _supabase
.from('produtos')
.update(dadosAtualizados)
.eq('id',id);
}

async function excluirProdutoBanco(id){
return await _supabase
.from('produtos')
.delete()
.eq('id',id);
}

async function enviarImagemProduto(arquivo){
const nomeArquivo = Date.now() + '_' + arquivo.name;

const { error:uploadError } = await _supabase.storage
.from(BUCKET_IMAGENS)
.upload(nomeArquivo,arquivo);

if(uploadError){
return { error: uploadError };
}

const { data:urlData } = _supabase.storage
.from(BUCKET_IMAGENS)
.getPublicUrl(nomeArquivo);

return { data: urlData.publicUrl, error: null };
}
