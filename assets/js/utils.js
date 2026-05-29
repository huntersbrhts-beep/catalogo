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

function getRedesSociais(){return lerJsonLocal('redes_sociais',{instagram:'',facebook:'',whatsapp:'31984656166'});}
function getAparenciaLoja(){return lerJsonLocal('aparencia_loja',{corFundo:'',imagemFundo:'',usarImagem:false});}
function getConfigRoleta(){return lerJsonLocal('config_roleta',{limite:30,premios:[{texto:'5% OFF',tipo:'percentual',valor:5},{texto:'10% OFF',tipo:'percentual',valor:10},{texto:'R$ 5 OFF',tipo:'valor',valor:5},{texto:'15% OFF',tipo:'percentual',valor:15},{texto:'R$ 10 OFF',tipo:'valor',valor:10},{texto:'SEM CUPOM',tipo:'nenhum',valor:0}]});}
function aplicarAparenciaLoja(){const a=getAparenciaLoja(); if(a.usarImagem&&a.imagemFundo){document.body.style.background=`linear-gradient(rgba(15,15,16,.82),rgba(15,15,16,.92)), url('${a.imagemFundo}') center/cover fixed no-repeat`; }else if(a.corFundo){document.body.style.background=a.corFundo;}else{document.body.style.background='linear-gradient(180deg,#0f0f10 0%,#1a1a1d 100%)';}}
function renderizarRodapeRedes(){const el=document.getElementById('rodape-redes'); if(!el)return; const r=getRedesSociais(); const links=[]; if(r.instagram)links.push(`<a href="${escaparHtml(r.instagram)}" target="_blank" class="hover:text-orange-400"><i class="fab fa-instagram mr-1"></i>Instagram</a>`); if(r.facebook)links.push(`<a href="${escaparHtml(r.facebook)}" target="_blank" class="hover:text-orange-400"><i class="fab fa-facebook mr-1"></i>Facebook</a>`); if(r.whatsapp)links.push(`<a href="https://wa.me/55${String(r.whatsapp).replace(/\D/g,'')}" target="_blank" class="hover:text-green-400"><i class="fab fa-whatsapp mr-1"></i>WhatsApp</a>`); el.innerHTML=links.length?links.join('<span class="text-gray-600">•</span>'):'<span class="text-gray-500">Redes sociais em breve</span>';}
function arquivoParaDataUrl(arquivo){return new Promise((resolve,reject)=>{const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=reject; fr.readAsDataURL(arquivo);});}
