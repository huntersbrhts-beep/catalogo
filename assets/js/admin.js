function renderizarProdutosAdmin(){
const box = document.getElementById('lista-admin-produtos');
if(!box) return;

if(listaProdutos.length===0){
box.innerHTML = '<p class="text-gray-500">Nenhum produto cadastrado.</p>';
return;
}

box.innerHTML = listaProdutos.map(prod=>`
<div class="admin-card">
<div class="flex flex-col md:flex-row gap-4">
<img src="${escaparHtml(prod.imagem_url || '')}" class="admin-img">
<div class="flex-1 space-y-3">
<input type="text" id="edit-nome-${prod.id}" value="${escaparHtml(prod.nome || '')}" class="w-full p-3 rounded-xl">
<textarea id="edit-desc-${prod.id}" rows="2" class="w-full p-3 rounded-xl">${escaparHtml(prod.descricao || '')}</textarea>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
<input type="number" step="0.01" id="edit-preco-${prod.id}" value="${prod.preco || 0}" class="w-full p-3 rounded-xl">
<select id="edit-categoria-${prod.id}" class="w-full p-3 rounded-xl">${gerarOptionsCategoria(prod.categoria)}</select>
</div>
<div>
<label class="text-xs text-gray-400">Trocar imagem opcional:</label>
<input type="file" id="edit-imagem-${prod.id}" accept="image/*" class="w-full p-2 rounded-xl">
</div>
<div class="flex flex-wrap gap-2">
<button onclick="editarProduto('${prod.id}')" class="btn-primary px-4 py-2 rounded-xl">Salvar alterações</button>
<button onclick="excluirProduto('${prod.id}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold">Excluir</button>
</div>
</div>
</div>
</div>
`).join('');
}

function gerarOptionsCategoria(categoriaAtualProduto){
const select = document.getElementById('prod-categoria');
return [...select.options].map(op=>`
<option value="${op.value}" ${op.value === categoriaAtualProduto ? 'selected' : ''}>${op.textContent}</option>
`).join('');
}

async function editarProduto(id){
const nome = document.getElementById('edit-nome-'+id).value.trim();
const descricao = document.getElementById('edit-desc-'+id).value.trim();
const preco = parseFloat(document.getElementById('edit-preco-'+id).value);
const categoria = document.getElementById('edit-categoria-'+id).value;
const arquivo = document.getElementById('edit-imagem-'+id).files[0];

if(!nome){ alert('Informe o nome do produto.'); return; }
if(isNaN(preco)){ alert('Informe um preço válido.'); return; }

let dadosAtualizados = { nome, descricao, preco, categoria };

if(arquivo){
const { data:imagemUrl, error:uploadError } = await enviarImagemProduto(arquivo);
if(uploadError){ alert(uploadError.message); return; }
dadosAtualizados.imagem_url = imagemUrl;
}

const { error } = await atualizarProdutoBanco(id,dadosAtualizados);
if(error){ alert(error.message); return; }

alert('Produto atualizado com sucesso!');
carregarProdutosDoBanco();
}

async function excluirProduto(id){
if(!confirm('Tem certeza que deseja excluir este produto?')) return;
const { error } = await excluirProdutoBanco(id);
if(error){ alert(error.message); return; }
alert('Produto excluído com sucesso!');
carregarProdutosDoBanco();
}

async function salvarProduto(e){
e.preventDefault();

const nome = document.getElementById('prod-nome').value.trim();
const descricao = document.getElementById('prod-descricao').value.trim();
const categoria = document.getElementById('prod-categoria').value;
const preco = parseFloat(document.getElementById('prod-preco').value);
const arquivo = document.getElementById('prod-imagem').files[0];

if(!nome){ alert('Informe o nome.'); return; }
if(isNaN(preco)){ alert('Informe preço válido.'); return; }
if(!arquivo){ alert('Selecione uma imagem.'); return; }

const { data:imagem_url, error:uploadError } = await enviarImagemProduto(arquivo);
if(uploadError){ alert(uploadError.message); return; }

const { error } = await inserirProduto({ nome, descricao, categoria, preco, imagem_url });
if(error){ alert(error.message); return; }

alert('Produto cadastrado');
document.getElementById('form-produto').reset();
carregarProdutosDoBanco();
}

function criarCategoria(){
const input = document.getElementById('nova-categoria');
const nome = input.value.trim();
if(!nome){ alert('Digite categoria'); return; }

const valor = normalizarCategoria(nome);
const select = document.getElementById('prod-categoria');
const existe = [...select.options].some(op=>op.value === valor);

if(existe){ alert('Categoria já existe.'); return; }

const option = document.createElement('option');
option.value = valor;
option.textContent = nome;
select.appendChild(option);
input.value = '';
atualizarCategoriasFiltro();
renderizarProdutosAdmin();
}

async function fazerLogin(){
const email = document.getElementById('login-email').value.trim();
const senha = document.getElementById('login-senha').value.trim();
if(!email || !senha){ alert('Preencha e-mail e senha.'); return; }

const { error } = await _supabase.auth.signInWithPassword({ email, password:senha });
if(error){ alert(error.message); }
}

async function fazerLogout(){
await _supabase.auth.signOut();
}

function verificarEstadoLogin(){
_supabase.auth.onAuthStateChange((event,session)=>{
if(session){
document.getElementById('secao-login').classList.add('hidden');
document.getElementById('secao-admin-painel').classList.remove('hidden');
carregarProdutosDoBanco();
}else{
document.getElementById('secao-login').classList.remove('hidden');
document.getElementById('secao-admin-painel').classList.add('hidden');
}
});
}
