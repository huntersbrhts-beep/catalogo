async function carregarProdutosDoBanco(){
const { data,error } = await buscarProdutos();

if(error){
console.log(error);
alert('Erro ao carregar produtos: ' + error.message);
return;
}

listaProdutos = data || [];
renderizarProdutosNoHtml();
renderizarProdutosAdmin();
atualizarCategoriasComProdutos();
}

function filtrarCategoria(categoria,btn){
categoriaAtual = categoria;
document.querySelectorAll('.categoria-btn').forEach(b=>b.classList.remove('categoria-ativa'));
btn.classList.add('categoria-ativa');
renderizarProdutosNoHtml();
}

function renderizarProdutosNoHtml(){
const grid = document.getElementById('grid-produtos');
let produtos = listaProdutos;

if(categoriaAtual !== 'todos'){
produtos = listaProdutos.filter(p=>p.categoria === categoriaAtual);
}

if(produtos.length===0){
grid.innerHTML = '<p class="col-span-full text-center text-gray-500">Nenhum produto encontrado</p>';
return;
}

grid.innerHTML = produtos.map(prod=>`
<div class="card-produto">
<div class="overflow-hidden h-52">
<img src="${escaparHtml(prod.imagem_url || '')}" class="w-full h-full object-cover">
</div>
<div class="p-5">
<h3 class="font-bold text-xl mb-2">${escaparHtml(prod.nome)}</h3>
<p class="text-gray-400 text-sm mb-4">${escaparHtml(prod.descricao || '')}</p>
<div class="flex justify-between items-center">
<span class="text-orange-400 font-bold text-lg">${formatarMoeda(prod.preco)}</span>
<button onclick="adicionarNoCarrinho('${prod.id}')" class="btn-primary px-4 py-2 rounded-xl shadow-lg">Adicionar</button>
</div>
</div>
</div>
`).join('');
}

function atualizarCategoriasFiltro(){
const select = document.getElementById('prod-categoria');
const container = document.getElementById('filtros-categorias');

container.innerHTML = `
<button onclick="filtrarCategoria('todos',this)" class="categoria-btn categoria-ativa p-3 rounded-xl shadow font-bold">🍔 Todos</button>
`;

[...select.options].forEach(op=>{
container.innerHTML += `
<button onclick="filtrarCategoria('${op.value}',this)" class="categoria-btn p-3 rounded-xl shadow">${op.textContent}</button>
`;
});
}

function atualizarCategoriasComProdutos(){
const select = document.getElementById('prod-categoria');

listaProdutos.forEach(prod=>{
if(!prod.categoria) return;
const existe = [...select.options].some(op=>op.value === prod.categoria);
if(!existe){
const option = document.createElement('option');
option.value = prod.categoria;
option.textContent = prod.categoria;
select.appendChild(option);
}
});

atualizarCategoriasFiltro();
}
