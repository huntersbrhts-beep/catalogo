function escaparHtml(valor){return String(valor ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function formatarMoeda(valor){return `R$ ${Number(valor || 0).toFixed(2)}`;}
function normalizarCategoria(nome){return String(nome||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
function mudarAba(nome){document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));document.getElementById('aba-'+nome)?.classList.add('active');}
function lerJsonLocal(chave,padrao){try{return JSON.parse(localStorage.getItem(chave)) ?? padrao;}catch(e){return padrao;}}
function salvarJsonLocal(chave,valor){localStorage.setItem(chave,JSON.stringify(valor));}
function numero(v){const n=parseFloat(v);return isNaN(n)?0:n;}
function hojeMinutos(){const d=new Date();return d.getHours()*60+d.getMinutes();}
function minutosDeHora(h){const [a,b]=String(h||'00:00').split(':').map(Number);return (a||0)*60+(b||0);}
function getConfigLoja(){return lerJsonLocal('config_loja',{banner:'',abre:'18:00',fecha:'23:59',forcar:'auto'});}
function getTaxas(){return lerJsonLocal('taxas_entrega',{});}
function getCupons(){return lerJsonLocal('cupons_desconto',[]);}
function getOrdemCategorias(){return lerJsonLocal('ordem_categorias',[]);}
function lojaEstaAberta(){const c=getConfigLoja(); if(c.forcar==='aberta')return true; if(c.forcar==='fechada')return false; const a=minutosDeHora(c.abre), f=minutosDeHora(c.fecha), n=hojeMinutos(); return a<=f ? n>=a && n<=f : n>=a || n<=f;}
function atualizarStatusLoja(){const el=document.getElementById('status-loja'); if(!el)return; const aberta=lojaEstaAberta(); el.textContent=aberta?'🟢 Loja aberta':'🔴 Loja fechada'; el.className='inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 '+(aberta?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'); const b=document.getElementById('banner-promocional'); const cfg=getConfigLoja(); if(b){b.innerHTML=escaparHtml(cfg.banner||''); b.classList.toggle('hidden',!cfg.banner);}}

function getUsoCupons(){return lerJsonLocal('uso_cupons_desconto',{});}
function salvarUsoCupons(dados){salvarJsonLocal('uso_cupons_desconto',dados);}
function usoCupomCodigo(codigo){const usos=getUsoCupons(); return Number(usos[String(codigo||'').toUpperCase()]||0);}
function cupomTemLimiteDisponivel(cupom){if(!cupom)return false; const limite=Number(cupom.limite||0); if(limite<=0)return true; return usoCupomCodigo(cupom.codigo)<limite;}
function registrarUsoCupom(codigo){codigo=String(codigo||'').trim().toUpperCase(); if(!codigo)return; const usos=getUsoCupons(); usos[codigo]=Number(usos[codigo]||0)+1; salvarUsoCupons(usos);}
