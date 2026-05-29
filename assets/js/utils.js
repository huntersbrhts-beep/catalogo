function escaparHtml(valor){
return String(valor ?? '')
.replace(/&/g,'&amp;')
.replace(/</g,'&lt;')
.replace(/>/g,'&gt;')
.replace(/"/g,'&quot;')
.replace(/'/g,'&#039;');
}

function formatarMoeda(valor){
return `R$ ${Number(valor || 0).toFixed(2)}`;
}

function normalizarCategoria(nome){
return String(nome || '')
.toLowerCase()
.normalize('NFD')
.replace(/[\u0300-\u036f]/g,'')
.replace(/\s+/g,'-');
}

function mudarAba(nome){
document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
document.getElementById('aba-'+nome).classList.add('active');
}
