let descontoRoleta=null;
let roletaGirando=false;
const premiosRoleta=[
  {texto:'5% OFF',tipo:'percentual',valor:5},
  {texto:'10% OFF',tipo:'percentual',valor:10},
  {texto:'R$ 5 OFF',tipo:'valor',valor:5},
  {texto:'15% OFF',tipo:'percentual',valor:15},
  {texto:'R$ 10 OFF',tipo:'valor',valor:10},
  {texto:'SEM CUPOM',tipo:'nenhum',valor:0}
];
function abrirRoleta(){
  const modal=document.getElementById('modal-roleta-cupom');
  if(!modal)return;
  renderizarFatiasRoleta();
  modal.classList.add('active');
  document.body.style.overflow='hidden';
}
function fecharRoleta(){
  const modal=document.getElementById('modal-roleta-cupom');
  if(modal)modal.classList.remove('active');
  document.body.style.overflow='';
}
function renderizarFatiasRoleta(){
  const labels=document.getElementById('roleta-labels');
  if(!labels||labels.dataset.ok)return;
  labels.innerHTML=premiosRoleta.map((p,i)=>`<span style="transform:rotate(${i*60+30}deg) translateY(-105px) rotate(-${i*60+30}deg)">${p.texto}</span>`).join('');
  labels.dataset.ok='1';
}
function girarRoleta(){
  if(roletaGirando)return;
  const wheel=document.getElementById('roleta-wheel');
  const resultado=document.getElementById('resultado-roleta');
  if(!wheel||!resultado)return;
  roletaGirando=true;
  resultado.textContent='Girando...';
  const index=Math.floor(Math.random()*premiosRoleta.length);
  const voltas=5+Math.floor(Math.random()*3);
  const anguloFinal=(voltas*360)+(360-(index*60+30));
  wheel.style.transform=`rotate(${anguloFinal}deg)`;
  setTimeout(()=>{
    const premio=premiosRoleta[index];
    roletaGirando=false;
    if(premio.tipo==='nenhum'){
      descontoRoleta=null;
      resultado.textContent='Quase! Tente novamente em outro pedido.';
    }else{
      descontoRoleta={...premio,codigo:'ROLETA'};
      resultado.textContent=`Cupom liberado: ${premio.texto}`;
      const input=document.getElementById('cupom-cliente');
      if(input)input.value='ROLETA';
    }
    atualizarCarrinho();
  },3200);
}
window.abrirRoleta=abrirRoleta;
window.fecharRoleta=fecharRoleta;
window.girarRoleta=girarRoleta;
