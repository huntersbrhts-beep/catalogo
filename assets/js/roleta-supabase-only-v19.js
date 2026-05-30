/* V19 - Roleta SOMENTE Supabase.
   Objetivo: eliminar qualquer salvamento/carregamento local de config_roleta. */
(function(){
  'use strict';
  const CHAVE = 'config_roleta';
  const VERSAO = 'v19-somente-supabase';
  let ultimaCfg = { limite:0, premios:[], fonte:'não carregada', erro:null, updated_at:null };

  function n(v){ const x = Number(String(v ?? '0').replace(',', '.')); return Number.isFinite(x) ? x : 0; }
  function esc(v){
    if(typeof escaparHtml === 'function') return escaparHtml(v);
    return String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }
  function premioValido(p){
    const texto = String((p && (p.texto || p.nome || p.codigo)) || '').trim();
    const tipoRaw = String((p && p.tipo) || 'nenhum').toLowerCase().trim();
    const tipo = ['percentual','valor','nenhum'].includes(tipoRaw) ? tipoRaw : 'nenhum';
    const valor = tipo === 'nenhum' ? 0 : n(p && p.valor);
    if(!texto) return null;
    return { texto, tipo, valor };
  }
  function normalizar(valor, fonte, updated_at, erro){
    const premios = Array.isArray(valor && valor.premios) ? valor.premios.map(premioValido).filter(Boolean).slice(0,8) : [];
    return { limite:n(valor && valor.limite), premios, fonte:fonte || 'Supabase', updated_at:updated_at || null, erro:erro || null };
  }
  function mesmoConteudo(a,b){
    const A = normalizar(a).premios.map(p=>`${p.texto}|${p.tipo}|${p.valor}`).join(';;') + '|L' + n(a && a.limite);
    const B = normalizar(b).premios.map(p=>`${p.texto}|${p.tipo}|${p.valor}`).join(';;') + '|L' + n(b && b.limite);
    return A === B;
  }
  function bloquearLocalRoleta(){
    try{ localStorage.removeItem(CHAVE); }catch(e){}
    if(window.salvarJsonLocal && !window.__salvarJsonLocalOriginalV19){
      window.__salvarJsonLocalOriginalV19 = window.salvarJsonLocal;
      window.salvarJsonLocal = function(chave, valor){
        if(chave === CHAVE){
          console.warn('BLOQUEADO: config_roleta não pode salvar local. Salvamento deve ser no Supabase.');
          try{ localStorage.removeItem(CHAVE); }catch(e){}
          return false;
        }
        return window.__salvarJsonLocalOriginalV19(chave, valor);
      };
    }
    window.getConfigRoleta = function(){ return { limite:ultimaCfg.limite || 0, premios:Array.isArray(ultimaCfg.premios) ? ultimaCfg.premios : [] }; };
  }
  async function lerSupabase(){
    bloquearLocalRoleta();
    if(typeof _supabase === 'undefined') return { cfg:normalizar(null,'ERRO',null,'Supabase não carregou.'), error:{message:'Supabase não carregou.'} };
    const { data, error } = await _supabase.from('configuracoes').select('chave,valor,updated_at').eq('chave', CHAVE).maybeSingle();
    if(error) return { cfg:normalizar(null,'ERRO Supabase',null,error.message || String(error)), error };
    if(!data || !data.valor) return { cfg:normalizar(null,'Supabase vazio',null,'Não existe config_roleta na tabela configuracoes.'), error:{message:'Não existe config_roleta na tabela configuracoes.'} };
    const cfg = normalizar(data.valor, 'Supabase '+VERSAO, data.updated_at, null);
    if(!cfg.premios.length) cfg.erro = 'config_roleta existe, mas está sem prêmios válidos.';
    ultimaCfg = cfg;
    window.roletaConfigAtual = cfg;
    bloquearLocalRoleta();
    return { cfg, error:null };
  }
  async function salvarSupabase(cfg){
    bloquearLocalRoleta();
    const valor = normalizar(cfg, 'tela').premios.length ? {
      limite:n(cfg && cfg.limite), premios:normalizar(cfg).premios, _versao:VERSAO, _salvo_em:new Date().toISOString()
    } : null;
    if(!valor || !valor.premios.length) return { error:{message:'Adicione pelo menos 1 prêmio válido.'}, data:null };
    if(typeof _supabase === 'undefined') return { error:{message:'Supabase não carregou.'}, data:null };
    const gravacao = await _supabase.from('configuracoes')
      .upsert([{ chave:CHAVE, valor, updated_at:new Date().toISOString() }], { onConflict:'chave' })
      .select('chave,valor,updated_at')
      .maybeSingle();
    if(gravacao.error) return { error:gravacao.error, data:null };
    const leitura = await _supabase.from('configuracoes').select('chave,valor,updated_at').eq('chave', CHAVE).maybeSingle();
    if(leitura.error) return { error:leitura.error, data:null };
    if(!leitura.data || !leitura.data.valor) return { error:{message:'Gravou, mas a leitura voltou vazia.'}, data:null };
    if(!mesmoConteudo(valor, leitura.data.valor)) return { error:{message:'Gravou, mas o Supabase retornou conteúdo diferente do salvo.'}, data:null };
    ultimaCfg = normalizar(leitura.data.valor, 'Supabase '+VERSAO, leitura.data.updated_at, null);
    window.roletaConfigAtual = ultimaCfg;
    bloquearLocalRoleta();
    return { error:null, data:ultimaCfg };
  }
  function coletarPremiosTela(){
    const premios=[];
    document.querySelectorAll('[data-premio-roleta-index]').forEach(row=>{
      const idx=row.getAttribute('data-premio-roleta-index');
      const p=premioValido({
        texto:document.getElementById('premio-edit-texto-'+idx)?.value || '',
        tipo:document.getElementById('premio-edit-tipo-'+idx)?.value || 'nenhum',
        valor:document.getElementById('premio-edit-valor-'+idx)?.value || 0
      });
      if(p) premios.push(p);
    });
    return premios;
  }
  async function atualizarVisualRoleta(){
    bloquearLocalRoleta();
    if(typeof renderizarFatiasRoleta === 'function') renderizarFatiasRoleta();
    if(typeof atualizarBotaoRoleta === 'function') atualizarBotaoRoleta();
    if(typeof atualizarCarrinho === 'function') atualizarCarrinho();
  }
  window.carregarConfigRoletaAtualizada = async function(){
    const { cfg } = await lerSupabase();
    return cfg;
  };
  window.obterPremiosRoleta = function(){ return Array.isArray(ultimaCfg.premios) ? ultimaCfg.premios : []; };
  window.obterLimiteRoleta = function(){ return n(ultimaCfg.limite); };
  window.renderizarRoletaAdmin = async function(){
    const box=document.getElementById('lista-premios-roleta');
    const limiteEl=document.getElementById('roleta-limite-admin');
    if(!box) return;
    box.innerHTML='<div class="admin-card text-gray-300">Lendo roleta diretamente do Supabase...</div>';
    const { cfg } = await lerSupabase();
    if(limiteEl) limiteEl.value = cfg.limite || 0;
    const usados = typeof usoCupomCodigo === 'function' ? usoCupomCodigo('ROLETA') : 0;
    box.innerHTML =
      `<div class="bg-blue-500/10 border border-blue-500/30 text-blue-100 p-3 rounded-xl text-sm mb-3">
        <b>Roleta V19 - SOMENTE SUPABASE</b><br>
        Fonte: <b>${esc(cfg.fonte)}</b><br>
        Chave: <b>${CHAVE}</b><br>
        LocalStorage: <b>BLOQUEADO para roleta</b><br>
        ${cfg.updated_at ? 'Atualizado: '+new Date(cfg.updated_at).toLocaleString('pt-BR')+'<br>' : ''}
        ${cfg.erro ? '<span class="text-red-300">Erro: '+esc(cfg.erro)+'</span>' : '<span class="text-green-300">Configuração carregada do Supabase.</span>'}
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
        </div>`).join('') : '<p class="text-yellow-300 bg-yellow-500/10 p-3 rounded-xl">Nenhum prêmio no Supabase. Adicione abaixo e salve.</p>')+
      '<button onclick="salvarTodosPremiosRoletaAdmin()" class="w-full btn-primary p-4 rounded-xl mt-3 text-lg">SALVAR TUDO NO SUPABASE</button>'+
      '<button onclick="diagnosticoRoletaSupabase()" class="w-full bg-gray-700 p-3 rounded-xl mt-2">Testar leitura Supabase</button>'+
      '<button onclick="limparCacheRoletaLocalV19()" class="w-full bg-red-900/70 p-3 rounded-xl mt-2">Limpar config_roleta local</button>';
    await atualizarVisualRoleta();
  };
  window.salvarTodosPremiosRoletaAdmin = async function(){
    const limite=n(document.getElementById('roleta-limite-admin')?.value || 0);
    const premios=coletarPremiosTela();
    const resp=await salvarSupabase({limite,premios});
    if(resp.error){ alert('NÃO salvou no Supabase. Erro real: '+(resp.error.message || resp.error)); return; }
    await window.renderizarRoletaAdmin();
    alert('Salvo no SUPABASE com sucesso. Prêmios ativos: '+resp.data.premios.map(p=>p.texto).join(', '));
  };
  window.salvarRoletaConfigAdmin = window.salvarTodosPremiosRoletaAdmin;
  window.salvarPremioRoletaAdmin = async function(){
    const novo=premioValido({texto:document.getElementById('premio-texto')?.value || '', tipo:document.getElementById('premio-tipo')?.value || 'nenhum', valor:document.getElementById('premio-valor')?.value || 0});
    if(!novo){ alert('Informe o nome do prêmio.'); return; }
    if(novo.tipo !== 'nenhum' && !novo.valor){ alert('Informe o valor do prêmio.'); return; }
    const { cfg } = await lerSupabase();
    const premios=[...(cfg.premios || []), novo].slice(0,8);
    const limite=n(document.getElementById('roleta-limite-admin')?.value || cfg.limite || 0);
    const resp=await salvarSupabase({limite,premios});
    if(resp.error){ alert('NÃO salvou no Supabase. Erro real: '+(resp.error.message || resp.error)); return; }
    const t=document.getElementById('premio-texto'); if(t) t.value='';
    const v=document.getElementById('premio-valor'); if(v) v.value='';
    await window.renderizarRoletaAdmin();
    alert('Prêmio salvo no SUPABASE.');
  };
  window.removerPremioRoletaAdmin = async function(i){
    const { cfg } = await lerSupabase();
    if(cfg.erro){ alert('Não consegui ler do Supabase: '+cfg.erro); return; }
    const premios=(cfg.premios || []).filter((_,idx)=>idx !== i);
    if(!premios.length){ alert('A roleta precisa ter pelo menos 1 prêmio.'); return; }
    const resp=await salvarSupabase({limite:cfg.limite,premios});
    if(resp.error){ alert('NÃO removeu no Supabase. Erro real: '+(resp.error.message || resp.error)); return; }
    await window.renderizarRoletaAdmin();
  };
  window.diagnosticoRoletaSupabase = async function(){
    const { cfg } = await lerSupabase();
    alert(cfg.erro ? 'ERRO Supabase: '+cfg.erro : 'Lendo do SUPABASE: '+cfg.premios.map(p=>p.texto+' ('+p.tipo+' '+p.valor+')').join(', '));
  };
  window.limparCacheRoletaLocalV19 = function(){
    try{ localStorage.removeItem(CHAVE); sessionStorage.removeItem(CHAVE); }catch(e){}
    alert('Cache local da roleta removido. Agora ela só lê do Supabase.');
  };
  const antigoRenderConfig = window.renderizarConfigAdmin;
  window.renderizarConfigAdmin = function(){
    if(typeof antigoRenderConfig === 'function') antigoRenderConfig();
    setTimeout(()=>window.renderizarRoletaAdmin(), 100);
  };
  document.addEventListener('DOMContentLoaded', async ()=>{
    bloquearLocalRoleta();
    await lerSupabase();
    await atualizarVisualRoleta();
    setTimeout(()=>window.renderizarRoletaAdmin(), 700);
  });
})();
