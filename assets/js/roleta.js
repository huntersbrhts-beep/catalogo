let descontoRoleta = null;
let roletaGirando = false;
let roletaJaGirou = false;

const premiosRoleta = [
  { texto: '5% OFF', tipo: 'percentual', valor: 5 },
  { texto: '10% OFF', tipo: 'percentual', valor: 10 },
  { texto: 'R$ 5 OFF', tipo: 'valor', valor: 5 },
  { texto: '15% OFF', tipo: 'percentual', valor: 15 },
  { texto: 'R$ 10 OFF', tipo: 'valor', valor: 10 },
  { texto: 'SEM CUPOM', tipo: 'nenhum', valor: 0 }
];

function atualizarBotaoRoleta() {
  const btnCarrinho = document.getElementById('btn-abrir-roleta');
  const btnGirar = document.getElementById('btn-girar-roleta');

  if (btnCarrinho) {
    btnCarrinho.disabled = roletaJaGirou;
    btnCarrinho.classList.toggle('opacity-60', roletaJaGirou);
    btnCarrinho.classList.toggle('cursor-not-allowed', roletaJaGirou);
    btnCarrinho.innerHTML = roletaJaGirou
      ? '<i class="fas fa-lock mr-2"></i> Roleta já utilizada neste pedido'
      : '<i class="fas fa-gift mr-2"></i> Girar roleta de desconto';
  }

  if (btnGirar) {
    btnGirar.disabled = roletaJaGirou || roletaGirando;
    btnGirar.classList.toggle('opacity-60', roletaJaGirou || roletaGirando);
    btnGirar.classList.toggle('cursor-not-allowed', roletaJaGirou || roletaGirando);
    btnGirar.textContent = roletaJaGirou ? 'Roleta já usada' : 'Girar agora';
  }
}

function abrirRoleta() {
  const modal = document.getElementById('modal-roleta-cupom');
  const resultado = document.getElementById('resultado-roleta');
  if (!modal) return;

  renderizarFatiasRoleta();

  if (resultado && roletaJaGirou) {
    resultado.textContent = descontoRoleta && descontoRoleta.tipo !== 'nenhum'
      ? `Cupom já liberado: ${descontoRoleta.texto}`
      : 'Você já girou a roleta neste pedido.';
  }

  atualizarBotaoRoleta();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharRoleta() {
  const modal = document.getElementById('modal-roleta-cupom');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function renderizarFatiasRoleta() {
  const labels = document.getElementById('roleta-labels');
  if (!labels || labels.dataset.ok) return;

  labels.innerHTML = premiosRoleta.map((p, i) =>
    `<span style="transform:rotate(${i * 60 + 30}deg) translateY(-105px) rotate(-${i * 60 + 30}deg)">${p.texto}</span>`
  ).join('');

  labels.dataset.ok = '1';
}

function girarRoleta() {
  if (roletaGirando) return;

  const wheel = document.getElementById('roleta-wheel');
  const resultado = document.getElementById('resultado-roleta');
  if (!wheel || !resultado) return;

  if (roletaJaGirou) {
    resultado.textContent = 'A roleta só pode ser girada uma vez por pedido.';
    atualizarBotaoRoleta();
    return;
  }

  roletaGirando = true;
  roletaJaGirou = true;
  atualizarBotaoRoleta();
  resultado.textContent = 'Girando...';

  const index = Math.floor(Math.random() * premiosRoleta.length);
  const voltas = 5 + Math.floor(Math.random() * 3);
  const anguloFinal = (voltas * 360) + (360 - (index * 60 + 30));
  wheel.style.transform = `rotate(${anguloFinal}deg)`;

  setTimeout(() => {
    const premio = premiosRoleta[index];
    roletaGirando = false;

    if (premio.tipo === 'nenhum') {
      descontoRoleta = null;
      resultado.textContent = 'Quase! A roleta já foi usada neste pedido.';
    } else {
      descontoRoleta = { ...premio, codigo: 'ROLETA' };
      resultado.textContent = `Cupom liberado: ${premio.texto}`;
      const input = document.getElementById('cupom-cliente');
      if (input) input.value = 'ROLETA';
    }

    atualizarBotaoRoleta();
    atualizarCarrinho();
  }, 3200);
}

function resetarRoletaParaNovoPedido() {
  descontoRoleta = null;
  roletaGirando = false;
  roletaJaGirou = false;

  const input = document.getElementById('cupom-cliente');
  if (input && input.value.trim().toUpperCase() === 'ROLETA') input.value = '';

  const resultado = document.getElementById('resultado-roleta');
  if (resultado) resultado.textContent = '';

  const wheel = document.getElementById('roleta-wheel');
  if (wheel) wheel.style.transform = 'rotate(0deg)';

  atualizarBotaoRoleta();
}

window.abrirRoleta = abrirRoleta;
window.fecharRoleta = fecharRoleta;
window.girarRoleta = girarRoleta;
window.resetarRoletaParaNovoPedido = resetarRoletaParaNovoPedido;
window.atualizarBotaoRoleta = atualizarBotaoRoleta;
