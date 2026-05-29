function toggleCarrinho(){
document.getElementById('sidebar-carrinho').classList.toggle('translate-x-full');
}

function adicionarNoCarrinho(id){
const produto = listaProdutos.find(p=>p.id===id);
if(!produto) return;

const existe = carrinhoCompras.find(i=>i.id===id);
if(existe){
existe.quantidade++;
}else{
carrinhoCompras.push({...produto,quantidade:1});
}

atualizarCarrinho();
}

function atualizarCarrinho(){
const container = document.getElementById('itens-carrinho');
const contador = document.getElementById('cart-count');
let total = 0;
let itens = 0;

if(carrinhoCompras.length===0){
container.innerHTML = '<p class="text-center text-gray-500">Carrinho vazio</p>';
contador.classList.add('hidden');
document.getElementById('total-carrinho').textContent='R$ 0,00';
return;
}

container.innerHTML = carrinhoCompras.map(item=>{
total += item.preco * item.quantidade;
itens += item.quantidade;
return `
<div class="flex justify-between items-center border-b border-gray-700 pb-3">
<div>
<h4 class="font-bold">${escaparHtml(item.nome)}</h4>
<p class="text-gray-400 text-sm">${item.quantidade}x ${formatarMoeda(item.preco)}</p>
</div>
<div class="flex items-center gap-2">
<button onclick="alterarQtd('${item.id}',-1)" class="bg-gray-700 px-3 py-1 rounded">-</button>
<button onclick="alterarQtd('${item.id}',1)" class="bg-gray-700 px-3 py-1 rounded">+</button>
</div>
</div>`;
}).join('');

contador.textContent = itens;
contador.classList.remove('hidden');
document.getElementById('total-carrinho').textContent = formatarMoeda(total);
}

function alterarQtd(id,valor){
const item = carrinhoCompras.find(i=>i.id===id);
if(!item) return;
item.quantidade += valor;
if(item.quantidade <=0){
carrinhoCompras = carrinhoCompras.filter(i=>i.id!==id);
}
atualizarCarrinho();
}

function selecionarTipoPedido(tipo){
tipoPedido = tipo;
const endereco = document.getElementById('box-endereco');
const btnEntrega = document.getElementById('btn-entrega');
const btnRetirada = document.getElementById('btn-retirada');

if(tipo === 'retirada'){
endereco.style.display='none';
btnRetirada.className = 'flex-1 btn-primary py-3 rounded-xl';
btnEntrega.className = 'flex-1 bg-gray-700 py-3 rounded-xl';
}else{
endereco.style.display='block';
btnEntrega.className = 'flex-1 btn-primary py-3 rounded-xl';
btnRetirada.className = 'flex-1 bg-gray-700 py-3 rounded-xl';
}
}

function buscarHistorico(telefone){
const dados = JSON.parse(localStorage.getItem('historico_clientes') || '{}');
return dados[telefone] || { pedidos:0, total:0 };
}

function salvarHistorico(telefone,valor){
const dados = JSON.parse(localStorage.getItem('historico_clientes') || '{}');
if(!dados[telefone]){ dados[telefone]={ pedidos:0, total:0 }; }
dados[telefone].pedidos +=1;
dados[telefone].total += valor;
localStorage.setItem('historico_clientes',JSON.stringify(dados));
}

function calcularDesconto(telefone,total){
const cliente = buscarHistorico(telefone);
let desconto = 0;
if(cliente.pedidos >= 5){ desconto = total * 0.05; }
if(cliente.pedidos >= 10){ desconto = total * 0.10; }
return desconto;
}

function enviarWhatsApp(){
if(carrinhoCompras.length===0){ alert('Carrinho vazio'); return; }
const nome = document.getElementById('cliente-nome').value.trim();
const telefone = document.getElementById('cliente-telefone').value.trim();
const endereco = document.getElementById('cliente-endereco').value.trim();

if(!nome){ alert('Informe nome'); return; }
if(!telefone){ alert('Informe telefone'); return; }
if(tipoPedido === 'entrega' && !endereco){ alert('Informe endereço'); return; }

let total = 0;
let msg = `🍔 *NOVO PEDIDO - DU LANCHES* 🍔\n\n`;
msg += `👤 ${nome}\n`;
msg += `📞 ${telefone}\n`;
msg += `🛒 ${tipoPedido}\n`;
if(tipoPedido === 'entrega'){ msg += `📍 ${endereco}\n`; }
msg += `\n----------------\n\n`;

carrinhoCompras.forEach(item=>{
const subtotal = item.preco * item.quantidade;
total += subtotal;
msg += `${item.quantidade}x ${item.nome}\n`;
msg += `${formatarMoeda(subtotal)}\n\n`;
});

const desconto = calcularDesconto(telefone,total);
const totalFinal = total - desconto;
if(desconto > 0){ msg += `🎁 Desconto: -${formatarMoeda(desconto)}\n`; }
msg += `🧾 TOTAL: ${formatarMoeda(totalFinal)}`;

salvarHistorico(telefone,totalFinal);
window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_NUMERO}&text=${encodeURIComponent(msg)}`,'_blank');
}
