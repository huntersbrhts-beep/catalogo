/* V20 - ROLETA DEFINITIVA SOMENTE SUPABASE
   Este arquivo substitui todas as versões antigas da roleta.
   Regras:
   1) config_roleta NÃO pode ser salva no localStorage.
   2) ADM salva, lê e confirma SOMENTE na tabela configuracoes do Supabase.
   3) Cliente/celular lê a roleta do Supabase toda vez que abre/gira.
*/

var descontoRoleta = null;
var roletaGirando = false;
var roletaJaGirou = false;
var roletaConfigAtual = { limite:0, premios:[], fonte:'não carregada', updated_at:null, erro:null };

(function(){
  'use strict';

  const CHAVE = 'config_roleta';
  const VERSAO = 'v20-supabase-final';
  const STORAGE_ORIGINAL_SET = Storage.prototype.setItem;

  function n(v){
    const x = Number(String(v ?? '0').replace(',', '.'));
    return Number.isFinite(x) ? x : 0;
  }

  function esc(v){
    if(typeof escaparHtml === 'function') return escaparHtml(v);
    return String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }

  function bloquearLocalStorageRoleta(){
    try{ localStorage.removeItem(CHAVE); }catch(e){}
    try{ sessionStorage.removeItem(CHAVE); }catch(e){}

    if(!window.__ROLETA_V20_STORAGE_BLOQUEADO__){
      window.__ROLETA_V20_STORAGE_BLOQUEADO__ = true;
      Storage.prototype.setItem = function(chave, valor){
        if(String(chave) === CHAVE){
          console.warn('[ROLETA V20] BLOQUEADO localStorage/sessionStorage para config_roleta. Salvamento permitido apenas no Supabase.');
          try{ this.removeItem(CHAVE); }catch(e){}
          return;
        }
        return STORAGE_ORIGINAL_SET.call(this, chave, valor);
      };
    }

    if(window.salvarJsonLocal && !window.__ROLETA_V20_SALVAR_JSON_ORIGINAL__){
      window.__ROLETA_V20_SALVAR_JSON_ORIGINAL__ = window.salvarJsonLocal;
      window.salvarJsonLocal = function(chave, valor){
        if(String(chave) === CHAVE){
          console.warn('[ROLETA V20] salvarJsonLocal(config_roleta) bloqueado.');
          try{ localStorage.removeItem(CHAVE); }catch(e){}
          return false;
        }
        return window.__ROLETA_V20_SALVAR_JSON_ORIGINAL__(chave, valor);
      };
    }
  }

  function normalizarPremio(p){
    const texto = String((p && (p.texto || p.nome || p.codigo)) || '').trim();
    const tipoRaw = String((p && p.tipo) || 'nenhum').trim().toLowerCase();
    const tipo = ['percentual','valor','nenhum'].includes(tipoRaw) ? tipoRaw : 'nenhum';
    const valor = tipo === 'nenhum' ? 0 : n(p && p.valor);
    if(!texto) return null;
    return { texto, tipo, valor };
  }

  function normalizarConfig(valor, fonte, updated_at, erro){
    const premios = Array.isArray(valor && valor.premios)
      ? valor.premios.map(normalizarPremio).filter(Boolean).slice(0,8)
      : [];
    return {
      limite:n(valor && valor.limite),
      premios,
      fonte:fonte || 'Supabase',
      updated_at:updated_at || null,
      erro:erro || null,
      _versao: valor && valor._versao
    };
  }

  function setMemoria(cfg){
    roletaConfigAtual = cfg;
    window.roletaConfigAtual = cfg;
    bloquearLocalStorageRoleta();
    return cfg;
  }

  async function lerSupabase(){
    bloquearLocalStorageRoleta();
    if(typeof _supabase === 'undefined'){
      return { data:null, error:{ message:'Supabase não carregou. Confira assets/js/config.js.' } };
    }
    return await _supabase
      .from('configuracoes')
      .select('chave,valor,updated_at')
      .eq('chave', CHAVE)
      .maybeSingle();
  }

  async function carregarDoSupabase(){
    const resp = await lerSupabase();
    if(resp.error){
      return setMemoria(normalizarConfig(null, 'ERRO Supabase', null, resp.error.message || String(resp.error)));
    }
    if(!resp.data || !resp.data.valor){
      return setMemoria(normalizarConfig(null, 'Supabase vazio', null, 'Não existe linha config_roleta na tabela configuracoes. Rode o supabase-sql.txt e salve a roleta no ADM.'));
    }
    const cfg = normalizarConfig(resp.data.valor, 'Supabase '+VERSAO, resp.data.updated_at, null);
    if(!cfg.premios.length){
      cfg.erro = 'config_roleta foi encontrada no Supabase, mas está sem prêmios válidos.';
    }
    return setMemoria(cfg);
  }

  async function salvarNoSupabase(cfg){
    bloquearLocalStorageRoleta();
    const valor = {
      limite:n(cfg && cfg.limite),
      premios:Array.isArray(cfg && cfg.premios) ? cfg.premios.map(normalizarPremio).filter(Boolean).slice(0,8) : [],
      _versao:VERSAO,
      _salvo_em:new Date().toISOString()
    };

    if(!valor.premios.length){
      return { data:null, error:{ message:'Adicione pelo menos 1 prêmio válido antes de salvar.' } };
    }
    if(typeof _supabase === 'undefined'){
      return { data:null, error:{ message:'Supabase não carregou. Confira assets/js/config.js.' } };
    }

    const gravacao = await _supabase
      .from('configuracoes')
      .upsert([{ chave:CHAVE, valor, updated_at:new Date().toISOString() }], { onConflict:'chave' })
      .select('chave,valor,updated_at')
      .maybeSingle();

    if(gravacao.error){
      return { data:null, error:gravacao.error };
    }

    const leitura = await lerSupabase();
    if(leitura.error){
      return { data:null, error:leitura.error };
    }
    if(!leitura.data || !leitura.data.valor){
      return { data:null, error:{ message:'O Supabase aceitou o upsert, mas a leitura voltou vazia.' } };
    }

    const cfgLida = normalizarConfig(leitura.data.valor, 'Supabase '+VERSAO, leitura.data.updated_at, null);
    const salvo = valor.premios.map(p=>`${p.texto}|${p.tipo}|${p.valor}`).join(';;') + '|L' + valor.limite;
    const lido = cfgLida.premios.map(p=>`${p.texto}|${p.tipo}|${p.valor}`).join(';;') + '|L' + cfgLida.limite;

    if(salvo !== lido){
      return { data:null, error:{ message:'O Supabase leu dados diferentes dos salvos. Apague duplicidades/políticas antigas da tabela configuracoes.' } };
    }

    setMemoria(cfgLida);
    return { data:cfgLida, error:null };
  }

  function statusRoletaTexto(cfg){
    if(cfg.erro) return `ERRO: ${cfg.erro}`;
    return `${cfg.premios.length} prêmio(s) carregado(s) do ${cfg.fonte}${cfg.updated_at ? ' • '+new Date(cfg.updated_at).toLocaleString('pt-BR') : ''}`;
  }

  function coletarPremiosTela(){
    const premios = [];
    document.querySelectorAll('[data-premio-roleta-index]').forEach(row=>{
      const idx = row.getAttribute('data-premio-roleta-index');
      const p = normalizarPremio({
        texto:document.getElementById('premio-edit-texto-'+idx)?.value || '',
        tipo:document.getElementById('premio-edit-tipo-'+idx)?.value || 'nenhum',
        valor:document.getElementById('premio-edit-valor-'+idx)?.value || 0
      });
      if(p) premios.push(p);
    });
    return premios;
  }

  function limparVisualRoleta(){
    const labels = document.getElementById('roleta-labels');
    if(labels){ labels.removeAttribute('data-ok'); labels.innerHTML = ''; }
    const wheel = document.getElementById('roleta-wheel');
    if(wheel) wheel.style.transform = 'rotate(0deg)';
  }

  function aplicarCoresRoleta(){
    const wheel = document.getElementById('roleta-wheel');
    if(!wheel) return;
    const premios = window.obterPremiosRoleta();
    if(!premios.length){
      wheel.style.background = 'conic-gradient(#333 0deg 360deg)';
      return;
    }
    const cores = ['#ff7a00','#1f1f22','#ff9d00','#2a2a2d','#e86800','#111','#b45309','#3f3f46'];
    const passo = 360 / premios.length;
    wheel.style.background = `conic-gradient(${premios.map((_,i)=>`${cores[i%cores.length]} ${i*passo}deg ${(i+1)*passo}deg`).join(',')})`;
  }

  window.getConfigRoleta = function(){
    return { limite:n(roletaConfigAtual.limite), premios:Array.isArray(roletaConfigAtual.premios) ? roletaConfigAtual.premios : [] };
  };

  window.obterPremiosRoleta = function(){
    return Array.isArray(roletaConfigAtual.premios) ? roletaConfigAtual.premios : [];
  };

  window.obterLimiteRoleta = function(){
    return n(roletaConfigAtual.limite);
  };

  window.carregarConfigRoletaAtualizada = async function(){
    return await carregarDoSupabase();
  };

  window.renderizarFatiasRoleta = function(){
    const labels = document.getElementById('roleta-labels');
    if(!labels) return;
    const premios = window.obterPremiosRoleta();
    aplicarCoresRoleta();
    labels.removeAttribute('data-ok');
    if(!premios.length){
      labels.innerHTML = '<span style="transform:translateY(-105px)">Sem prêmios</span>';
      return;
    }
    const passo = 360 / premios.length;
    labels.innerHTML = premios.map((p,i)=>{
      const ang = i * passo + passo / 2;
      return `<span style="transform:rotate(${ang}deg) translateY(-105px) rotate(-${ang}deg)">${esc(p.texto)}</span>`;
    }).join('');
    labels.dataset.ok = String(premios.length);
  };

  window.atualizarBotaoRoleta = function(){
    const btnCarrinho = document.getElementById('btn-abrir-roleta');
    const btnGirar = document.getElementById('btn-girar-roleta');
    const semPremios = !window.obterPremiosRoleta().length;
    const esgotada = typeof cupomTemLimiteDisponivel === 'function'
      ? !cupomTemLimiteDisponivel({ codigo:'ROLETA', limite:window.obterLimiteRoleta() })
      : false;
    const travada = roletaJaGirou || roletaGirando || semPremios || esgotada;

    if(btnCarrinho){
      btnCarrinho.disabled = roletaJaGirou || semPremios || esgotada;
      btnCarrinho.classList.toggle('opacity-60', btnCarrinho.disabled);
      btnCarrinho.classList.toggle('cursor-not-allowed', btnCarrinho.disabled);
      btnCarrinho.innerHTML = semPremios
        ? '<i class="fas fa-triangle-exclamation mr-2"></i> Roleta sem prêmios no Supabase'
        : (esgotada
          ? '<i class="fas fa-ban mr-2"></i> Cupons da roleta esgotados'
          : (roletaJaGirou
            ? '<i class="fas fa-lock mr-2"></i> Roleta já utilizada neste pedido'
            : '<i class="fas fa-gift mr-2"></i> Girar roleta de desconto'));
    }

    if(btnGirar){
      btnGirar.disabled = travada;
      btnGirar.classList.toggle('opacity-60', travada);
      btnGirar.classList.toggle('cursor-not-allowed', travada);
      btnGirar.textContent = semPremios ? 'Sem prêmios no Supabase' : (esgotada ? 'Cupons esgotados' : (roletaJaGirou ? 'Roleta já usada' : 'Girar agora'));
    }
  };

  window.abrirRoleta = async function(){
    const modal = document.getElementById('modal-roleta-cupom');
    const resultado = document.getElementById('resultado-roleta');
    if(!modal) return;
    const cfg = await carregarDoSupabase();
    limparVisualRoleta();
    window.renderizarFatiasRoleta();
    if(resultado){
      if(roletaJaGirou){
        resultado.textContent = descontoRoleta && descontoRoleta.tipo !== 'nenhum' ? `Cupom já liberado: ${descontoRoleta.texto}` : 'Você já girou a roleta neste pedido.';
      }else{
        resultado.textContent = cfg.erro ? `Não carregou do Supabase: ${cfg.erro}` : statusRoletaTexto(cfg);
      }
    }
    window.atualizarBotaoRoleta();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.fecharRoleta = function(){
    const modal = document.getElementById('modal-roleta-cupom');
    if(modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.girarRoleta = async function(){
    if(roletaGirando) return;
    const resultado = document.getElementById('resultado-roleta');
    const wheel = document.getElementById('roleta-wheel');
    if(!wheel || !resultado) return;

    const cfg = await carregarDoSupabase();
    limparVisualRoleta();
    window.renderizarFatiasRoleta();

    if(roletaJaGirou){ resultado.textContent = 'A roleta só pode ser girada uma vez por pedido.'; window.atualizarBotaoRoleta(); return; }
    if(cfg.erro){ resultado.textContent = 'Roleta não carregou do Supabase: ' + cfg.erro; window.atualizarBotaoRoleta(); return; }
    if(typeof cupomTemLimiteDisponivel === 'function' && !cupomTemLimiteDisponivel({ codigo:'ROLETA', limite:window.obterLimiteRoleta() })){
      resultado.textContent = 'Os cupons da roleta acabaram.'; window.atualizarBotaoRoleta(); return;
    }

    const premios = window.obterPremiosRoleta();
    if(!premios.length){ resultado.textContent = 'Nenhum prêmio salvo no Supabase. Vá no ADM, adicione prêmios e salve.'; window.atualizarBotaoRoleta(); return; }

    roletaGirando = true;
    window.atualizarBotaoRoleta();
    resultado.textContent = `Girando com ${premios.length} prêmio(s) do Supabase...`;

    const index = Math.floor(Math.random() * premios.length);
    const passo = 360 / premios.length;
    const voltas = 6 + Math.floor(Math.random() * 3);
    const anguloFinal = (voltas * 360) + (360 - (index * passo + passo / 2));
    wheel.style.transform = `rotate(${anguloFinal}deg)`;

    setTimeout(()=>{
      const premio = premios[index];
      roletaGirando = false;
      roletaJaGirou = true;
      if(premio.tipo === 'nenhum'){
        descontoRoleta = null;
        window.descontoRoleta = null;
        resultado.textContent = `Resultado: ${premio.texto}`;
      }else{
        descontoRoleta = { ...premio, codigo:'ROLETA' };
        window.descontoRoleta = descontoRoleta;
        resultado.textContent = `Cupom liberado: ${premio.texto}`;
        const input = document.getElementById('cupom-cliente');
        if(input) input.value = 'ROLETA';
      }
      window.atualizarBotaoRoleta();
      if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
    }, 3200);
  };

  window.resetarRoletaParaNovoPedido = function(){
    descontoRoleta = null;
    window.descontoRoleta = null;
    roletaGirando = false;
    roletaJaGirou = false;
    const input = document.getElementById('cupom-cliente');
    if(input && input.value.trim().toUpperCase() === 'ROLETA') input.value = '';
    const resultado = document.getElementById('resultado-roleta');
    if(resultado) resultado.textContent = '';
    limparVisualRoleta();
    window.atualizarBotaoRoleta();
  };

  window.renderizarRoletaAdmin = async function(){
    const box = document.getElementById('lista-premios-roleta');
    const limiteEl = document.getElementById('roleta-limite-admin');
    if(!box) return;

    box.innerHTML = '<div class="admin-card text-gray-300">Carregando roleta direto do Supabase...</div>';
    const cfg = await carregarDoSupabase();
    if(limiteEl) limiteEl.value = cfg.limite || 0;
    const usados = typeof usoCupomCodigo === 'function' ? usoCupomCodigo('ROLETA') : 0;

    box.innerHTML =
      `<div class="bg-purple-500/10 border border-purple-500/40 text-purple-100 p-3 rounded-xl text-sm mb-3">
        <b>Roleta V20 - SOMENTE SUPABASE</b><br>
        Fonte: <b>${esc(cfg.fonte)}</b><br>
        Chave: <b>${CHAVE}</b><br>
        LocalStorage: <b>BLOQUEADO</b><br>
        ${cfg.updated_at ? 'Atualizado: '+new Date(cfg.updated_at).toLocaleString('pt-BR')+'<br>' : ''}
        ${cfg.erro ? '<span class="text-red-300">Erro: '+esc(cfg.erro)+'</span>' : '<span class="text-green-300">Lido do Supabase com sucesso.</span>'}
      </div>`+
      `<p class="text-sm text-gray-400 mb-2">Usados: ${usados}/${cfg.limite || 'sem limite'} • Prêmios: ${cfg.premios.length}</p>`+
      (cfg.premios.length ? cfg.premios.map((p,i)=>`
        <div class="admin-card space-y-2" data-premio-roleta-index="${i}">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input id="premio-edit-texto-${i}" value="${esc(p.texto)}" class="p-3 rounded-xl" placeholder="Nome">
            <select id="premio-edit-tipo-${i}" class="p-3 rounded-xl">
              <option value="percentual" ${p.tipo==='percentual'?'selected':''}>%</option>
              <option value="valor" ${p.tipo==='valor'?'selected':''}>R$</option>
              <option value="nenhum" ${p.tipo==='nenhum'?'selected':''}>Sem desconto</option>
            </select>
            <input id="premio-edit-valor-${i}" type="number" step="0.01" value="${Number(p.valor || 0)}" class="p-3 rounded-xl" placeholder="Valor">
            <button onclick="removerPremioRoletaAdmin(${i})" class="bg-red-600 hover:bg-red-700 text-white rounded-xl p-3">Excluir</button>
          </div>
        </div>`).join('') : '<p class="text-yellow-300 bg-yellow-500/10 p-3 rounded-xl">Nenhum prêmio salvo no Supabase. Adicione abaixo e clique em salvar.</p>')+
      '<button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-4 rounded-xl mt-3 text-lg">SALVAR TUDO NO SUPABASE</button>'+
      '<button onclick="diagnosticoRoletaSupabase()" class="w-full bg-gray-700 p-3 rounded-xl mt-2">Testar leitura Supabase</button>'+
      '<button onclick="limparCacheRoletaLocal()" class="w-full bg-red-900/70 p-3 rounded-xl mt-2">Limpar roleta local do aparelho</button>';

    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
  };

  window.salvarTodosPremiosRoletaAdmin = async function(){
    const limite = n(document.getElementById('roleta-limite-admin')?.value || 0);
    const premios = coletarPremiosTela();
    const resp = await salvarNoSupabase({ limite, premios });
    if(resp.error){
      alert('NÃO salvou no Supabase. Erro real: ' + (resp.error.message || resp.error));
      return;
    }
    await window.renderizarRoletaAdmin();
    alert('SALVO NO SUPABASE. Prêmios ativos: ' + resp.data.premios.map(p=>p.texto).join(', '));
  };

  window.salvarRoletaConfigAdmin = window.salvarTodosPremiosRoletaAdmin;

  window.salvarPremioRoletaAdmin = async function(){
    const novo = normalizarPremio({
      texto:document.getElementById('premio-texto')?.value || '',
      tipo:document.getElementById('premio-tipo')?.value || 'nenhum',
      valor:document.getElementById('premio-valor')?.value || 0
    });
    if(!novo){ alert('Informe o nome do prêmio.'); return; }
    if(novo.tipo !== 'nenhum' && !novo.valor){ alert('Informe o valor do prêmio.'); return; }
    const cfg = await carregarDoSupabase();
    if(cfg.erro && cfg.fonte !== 'Supabase vazio'){
      alert('Não consegui ler a roleta no Supabase: ' + cfg.erro);
      return;
    }
    const premios = [...(cfg.premios || []), novo].slice(0,8);
    const limite = n(document.getElementById('roleta-limite-admin')?.value || cfg.limite || 0);
    const resp = await salvarNoSupabase({ limite, premios });
    if(resp.error){ alert('NÃO salvou no Supabase. Erro real: ' + (resp.error.message || resp.error)); return; }
    const txt = document.getElementById('premio-texto'); if(txt) txt.value = '';
    const val = document.getElementById('premio-valor'); if(val) val.value = '';
    await window.renderizarRoletaAdmin();
    alert('Prêmio adicionado e salvo no SUPABASE.');
  };

  window.removerPremioRoletaAdmin = async function(i){
    const cfg = await carregarDoSupabase();
    if(cfg.erro){ alert('Não consegui ler do Supabase: ' + cfg.erro); return; }
    const premios = (cfg.premios || []).filter((_,idx)=>idx !== i);
    if(!premios.length){ alert('A roleta precisa ter pelo menos 1 prêmio. Edite o prêmio atual ou adicione outro antes de excluir.'); return; }
    const resp = await salvarNoSupabase({ limite:cfg.limite, premios });
    if(resp.error){ alert('NÃO removeu no Supabase. Erro real: ' + (resp.error.message || resp.error)); return; }
    await window.renderizarRoletaAdmin();
  };

  window.diagnosticoRoletaSupabase = async function(){
    const cfg = await carregarDoSupabase();
    if(cfg.erro){ alert('ERRO ao ler Supabase: ' + cfg.erro); return; }
    alert('SUPABASE OK. Prêmios lidos: ' + cfg.premios.map(p=>p.texto).join(', '));
  };

  window.limparCacheRoletaLocal = function(){
    bloquearLocalStorageRoleta();
    alert('config_roleta local removida e bloqueada neste aparelho. A roleta agora só lê do Supabase.');
  };

  window.atualizarRoletaDepoisDoAdm = async function(){
    await carregarDoSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
  };

  const renderConfigAntigo = window.renderizarConfigAdmin;
  window.renderizarConfigAdmin = function(){
    if(typeof renderConfigAntigo === 'function') renderConfigAntigo();
    setTimeout(()=>window.renderizarRoletaAdmin(), 100);
  };

  bloquearLocalStorageRoleta();

  document.addEventListener('DOMContentLoaded', async ()=>{
    bloquearLocalStorageRoleta();
    await carregarDoSupabase();
    window.renderizarFatiasRoleta();
    window.atualizarBotaoRoleta();
    setTimeout(()=>window.renderizarRoletaAdmin(), 300);
  });
})();
