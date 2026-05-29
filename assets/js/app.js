document.addEventListener('DOMContentLoaded',()=>{
carregarProdutosDoBanco();
verificarEstadoLogin();
atualizarCategoriasFiltro();
});

// Garante que os botões onclick do HTML funcionem também no GitHub Pages
window.mudarAba = mudarAba;
window.filtrarCategoria = filtrarCategoria;
window.toggleCarrinho = toggleCarrinho;
window.adicionarNoCarrinho = adicionarNoCarrinho;
window.alterarQtd = alterarQtd;
window.selecionarTipoPedido = selecionarTipoPedido;
window.enviarWhatsApp = enviarWhatsApp;
window.fazerLogin = fazerLogin;
window.fazerLogout = fazerLogout;
window.salvarProduto = salvarProduto;
window.criarCategoria = criarCategoria;
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;

window.addEventListener('error', function(e){
console.error('Erro no site:', e.message, e.filename, e.lineno);
});
