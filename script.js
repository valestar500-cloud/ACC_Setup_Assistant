let DATA = null;

const PROBLEMI = [
  { id:'sottosterzo_curva', label:'Sottosterzo in curva', needsFase:true, sintomo:'sottosterzo' },
  { id:'sovrasterzo_curva', label:'Sovrasterzo in curva', needsFase:true, sintomo:'sovrasterzo' },
  { id:'instabilita_frenata', label:'Instabilità in frenata', needsFase:false, sottocasi:'instabilita_frenata', domandaSottocaso:'Quando si manifesta?' },
  { id:'instabile_sui_cordoli', label:'Instabile sui cordoli', needsFase:false, sottocasi:'instabile_sui_cordoli', domandaSottocaso:'Come reagisce la vettura sul cordolo o sulla sconnessione?' },
  { id:'fatica_cambio_direzione', label:'Problemi a cambiare direzione', needsFase:false, sottocasi:'cambio_direzione', domandaSottocaso:'Come si comporta la vettura?' },
  { id:'temperatura_gomme', label:'Temperatura gomme', needsFase:false, temperatura:true }
];
const FASI = [
  { id:'ingresso', label:'Ingresso' },
  { id:'apex', label:'Apex' },
  { id:'uscita', label:'Uscita' }
];
const PREFERENZE = [
  { id:'sottosterzante', label:'Sottosterzante' },
  { id:'neutro', label:'Neutro' },
  { id:'sovrasterzante', label:'Sovrasterzante' }
];
const VELOCITA_CURVA = [
  { id:'bassa', label:'Lenta (<145 km/h)' },
  { id:'alta', label:'Veloce (>145 km/h)' }
];
const CATEGORIE = [
  { id:'GT2', label:'GT2' },
  { id:'GT3', label:'GT3' },
  { id:'GT4', label:'GT4' }
];
const LIVELLI = ['lieve','media','decisa'];

let state = { problema:null, fase:null, velocita_curva:'', sottocaso:null, pista:'', auto:'', preferenza:'neutro', categoria:'GT3',
  gomme:{ ant_sx:'', ant_dx:'', post_sx:'', post_dx:'' },
  gommeModalita:'base', gommeTipo:'slick',
  gommeAvanzate:{ ant_sx:{o:'',m:'',i:''}, ant_dx:{o:'',m:'',i:''}, post_sx:{o:'',m:'',i:''}, post_dx:{o:'',m:'',i:''} } };
let showResults = false;

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem('acc-setup-state') || '{}');
    state = Object.assign(state, saved);
  }catch(e){ /* niente di salvato, si riparte dai default */ }
}
function saveState(){
  try{ localStorage.setItem('acc-setup-state', JSON.stringify(state)); }catch(e){ /* storage non disponibile, va bene lo stesso */ }
}

function el(tag, cls, text){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(text !== undefined) e.textContent = text;
  return e;
}

// Il bagliore del bottone attivo è un elemento unico per gruppo: resta nel contenitore tra un render e l'altro
// e scivola da un bottone all'altro (i bottoni invece vengono ricreati a ogni render).
function getGlow(container){
  if(!container._glow){
    container._glow = el('div','choice-glow');
    container._glow.setAttribute('aria-hidden','true');
  }
  return container._glow;
}
function placeGlow(container, animate){
  const glow = container._glow;
  const active = container.querySelector('.choice-btn.active');
  if(!glow) return;
  if(!active){ glow.classList.remove('on'); return; }
  const wasOn = glow.classList.contains('on');
  // la prima volta (o dopo un ridimensionamento) niente scivolamento: il bagliore parte direttamente dal bottone
  const instant = !animate || !wasOn;
  if(instant) glow.classList.add('no-anim');
  glow.style.left = active.offsetLeft + 'px';
  glow.style.top = active.offsetTop + 'px';
  glow.style.width = active.offsetWidth + 'px';
  glow.style.height = active.offsetHeight + 'px';
  glow.style.setProperty('--i', active.style.getPropertyValue('--i') || 0);
  if(instant){ void glow.offsetWidth; glow.classList.remove('no-anim'); }
  glow.classList.add('on');
}
function renderChoices(container, items, selectedId, onPick){
  const glow = getGlow(container);
  Array.from(container.children).forEach(c=>{ if(c !== glow) c.remove(); });
  if(glow.parentNode !== container) container.appendChild(glow);
  items.forEach((item, i)=>{
    const b = el('button','choice-btn'+(item.id===selectedId?' active':''), item.label);
    b.type = 'button';
    b.style.setProperty('--i', i);
    b.addEventListener('click', ()=> onPick(item.id));
    container.appendChild(b);
  });
  placeGlow(container, true);
}
function repositionGlows(){
  document.querySelectorAll('.choices').forEach(c=> placeGlow(c, false));
  document.querySelectorAll('.wheel-buttons').forEach(placeWheelGlow);
}
window.addEventListener('resize', repositionGlows);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(repositionGlows);

function renderProblemaChoices(){
  renderChoices(document.getElementById('problema-choices'), PROBLEMI, state.problema, id=>{
    state.problema = id;
    const def = PROBLEMI.find(p=>p.id===id);
    if(!def.needsFase) state.fase = def.fase || null;
    else state.fase = null;
    state.sottocaso = null;
    state.velocita_curva = '';
    saveState(); render();
  });
}
function renderSottocasoChoices(){
  const def = PROBLEMI.find(p=>p.id===state.problema);
  if(!def || !def.sottocasi) return;
  document.getElementById('sottocaso-domanda').textContent = def.domandaSottocaso || 'Quando si manifesta?';
  const casi = DATA.sottocasi[def.sottocasi];
  const items = Object.keys(casi).map(k=>({ id:k, label:casi[k].label }));
  renderChoices(document.getElementById('sottocaso-choices'), items, state.sottocaso, id=>{
    state.sottocaso = id; saveState(); render();
  });
}
function renderFaseChoices(){
  renderChoices(document.getElementById('fase-choices'), FASI, state.fase, id=>{
    state.fase = id; saveState(); render();
  });
}
function renderVelocitaChoices(){
  renderChoices(document.getElementById('velocita-choices'), VELOCITA_CURVA, state.velocita_curva, id=>{
    state.velocita_curva = (state.velocita_curva===id) ? '' : id; saveState(); render();
  });
}
const WHEEL_LABELS = { ant_sx:'Ant. SX', ant_dx:'Ant. DX', post_sx:'Post. SX', post_dx:'Post. DX' };
const WHEEL_LABELS_LUNGHI = { ant_sx:'Anteriore sinistra', ant_dx:'Anteriore destra', post_sx:'Posteriore sinistra', post_dx:'Posteriore destra' };

function buildOmiInputs(key){
  const wrap = el('div','omi-inputs');
  ['o','m','i'].forEach(zona=>{
    const box = el('div','omi-box');
    box.appendChild(el('div','omi-letter', zona.toUpperCase()));
    const input = document.createElement('input');
    input.type = 'number'; input.className = 'omi-input'; input.placeholder = '—';
    input.value = state.gommeAvanzate[key][zona];
    input.addEventListener('input', ()=>{
      state.gommeAvanzate[key][zona] = input.value;
      saveState(); renderResults();
    });
    box.appendChild(input);
    wrap.appendChild(box);
  });
  return wrap;
}

function renderGommeModalitaChoices(){
  const items = [{id:'base', label:'Modifiche base'}, {id:'avanzate', label:'Modifiche avanzate'}];
  renderChoices(document.getElementById('gomme-modalita-choices'), items, state.gommeModalita, id=>{
    state.gommeModalita = id; saveState(); render();
  });
}
function renderGommeTipoChoices(){
  const box = document.getElementById('gomme-tipo-choices');
  if(state.gommeModalita !== 'avanzate'){ box.innerHTML=''; return; }
  const items = [{id:'slick', label:'Slick'}, {id:'wet', label:'Wet'}];
  renderChoices(box, items, state.gommeTipo, id=>{
    state.gommeTipo = id; saveState(); render();
  });
}

// Bottoni Alta/Bassa delle gomme: la griglia viene ricreata a ogni render, quindi lo scivolamento
// del bagliore si fa con le Web Animations, partendo dalla posizione memorizzata al render precedente.
let wheelGlowPrev = {};
function wheelGlowGeom(active){
  return { left:active.offsetLeft, top:active.offsetTop, width:active.offsetWidth, height:active.offsetHeight };
}
function placeWheelGlow(container){
  const glow = container.querySelector('.wheel-glow');
  const active = container.querySelector('.wheel-btn[class*="active-"]');
  if(!glow || !active) return;
  const g = wheelGlowGeom(active);
  glow.style.left = g.left+'px'; glow.style.top = g.top+'px';
  glow.style.width = g.width+'px'; glow.style.height = g.height+'px';
}
function renderWheelGlows(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const next = {};
  if(state.gommeModalita !== 'avanzate'){
    ['ant_sx','ant_dx','post_sx','post_dx'].forEach(key=>{
      const container = document.querySelector('#wheel-grid .wheel-card[data-wheel="'+key+'"] .wheel-buttons');
      const active = container && container.querySelector('.wheel-btn[class*="active-"]');
      if(!active) return;
      const tone = active.classList.contains('active-alta') ? 'alta' : 'bassa';
      const glow = el('div','wheel-glow '+tone);
      glow.setAttribute('aria-hidden','true');
      const idx = Array.prototype.indexOf.call(container.querySelectorAll('.wheel-btn'), active);
      glow.style.setProperty('--i', idx);
      container.insertBefore(glow, container.firstChild);
      placeWheelGlow(container);
      const g = wheelGlowGeom(active);
      const cs = getComputedStyle(glow);
      const cur = Object.assign({}, g, { color:cs.backgroundColor, shadow:cs.boxShadow });
      const prev = wheelGlowPrev[key];
      if(!reduce && glow.animate){
        const px = o => ({ left:o.left+'px', top:o.top+'px', width:o.width+'px', height:o.height+'px',
                            backgroundColor:o.color, boxShadow:o.shadow });
        if(prev){
          glow.animate([px(prev), px(cur)], { duration:500 * SLOW, easing:'cubic-bezier(.34,1.3,.5,1)' });
        } else if(!container.closest('.entering')){
          glow.animate([{ opacity:0, transform:'scale(.85)' }, { opacity:1, transform:'none' }],
                       { duration:300 * SLOW, easing:'ease-out' });
        }
      }
      next[key] = cur;
    });
  }
  wheelGlowPrev = next;
}

function renderWheelGrid(){
  document.getElementById('gomme-step-label').textContent =
    state.gommeModalita==='avanzate' ? 'Inserisci le temperature rilevate (O, M, I)' : 'Quali gomme? (tocca per selezionare)';
  const grid = document.getElementById('wheel-grid');
  grid.innerHTML = '';
  const order = [['ant_sx','lf',true],['ant_dx','rf',true],['post_sx','lr',false],['post_dx','rr',false]];
  order.forEach(([key,cls,isFront])=>{
    const card = el('div','wheel-card '+cls);
    card.dataset.wheel = key;
    if(state.gommeModalita==='avanzate'){
      if(isFront) card.appendChild(buildOmiInputs(key));
      card.appendChild(el('div','wheel-label', WHEEL_LABELS[key]));
      if(!isFront) card.appendChild(buildOmiInputs(key));
    } else {
      card.appendChild(el('div','wheel-label', WHEEL_LABELS[key]));
      const btns = el('div','wheel-buttons');
      ['alta','bassa'].forEach(v=>{
        const b = el('button','wheel-btn'+(state.gomme[key]===v?' active-'+v:''), v==='alta'?'Alta':'Bassa');
        b.type = 'button';
        b.addEventListener('click', ()=>{
          state.gomme[key] = (state.gomme[key]===v) ? '' : v;
          saveState(); render();
        });
        btns.appendChild(b);
      });
      card.appendChild(btns);
    }
    grid.appendChild(card);
  });
  const carIcon = el('div','wheel-car');
  carIcon.innerHTML = '<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">'
    + '<rect class="car-rail" x="10" y="10" width="60" height="8" rx="4"/>'
    + '<rect class="car-rail" x="10" y="102" width="60" height="8" rx="4"/>'
    + '<rect class="car-rail" x="36" y="14" width="8" height="92" rx="4"/>'
    + '<circle class="car-hub" cx="40" cy="60" r="5"/>'
    + '<rect class="car-wheel" x="2" y="2" width="16" height="30" rx="5"/>'
    + '<rect class="car-wheel" x="62" y="2" width="16" height="30" rx="5"/>'
    + '<rect class="car-wheel" x="2" y="88" width="16" height="30" rx="5"/>'
    + '<rect class="car-wheel" x="62" y="88" width="16" height="30" rx="5"/>'
    + '</svg>';
  grid.appendChild(carIcon);
  renderWheelGlows();
}
function renderPreferenzaChoices(){
  renderChoices(document.getElementById('preferenza-choices'), PREFERENZE, state.preferenza, id=>{
    state.preferenza = id; saveState(); render();
  });
}
function renderPistaSelect(){
  const sel = document.getElementById('pista-select');
  sel.innerHTML = '';
  sel.appendChild(new Option('Altra pista (generica)',''));
  DATA.piste.forEach(p=> sel.appendChild(new Option(p.nome, p.nome)));
  sel.value = state.pista || '';
  sel.addEventListener('change', ()=>{ state.pista = sel.value; saveState(); renderPistaInfo(); renderPistaHint(); render(); });
  renderPistaInfo();
  renderPistaHint();
}
function renderCategoriaChoices(){
  renderChoices(document.getElementById('categoria-choices'), CATEGORIE, state.categoria, id=>{
    if(state.categoria===id) return;
    state.categoria = id; state.auto = ''; saveState();
    renderCategoriaChoices(); renderAutoSelect(); render();
  });
}

function renderAutoSelect(){
  const sel = document.getElementById('auto-select');
  sel.innerHTML = '';
  sel.appendChild(new Option('Non specificata',''));
  const og1 = document.createElement('optgroup'); og1.label = 'Auto specifiche ' + state.categoria;
  const disponibili = DATA.auto.note_specifiche.filter(a=> a.categoria===state.categoria);
  if(disponibili.length){
    disponibili.forEach(a=> og1.appendChild(new Option(a.auto, a.auto)));
  } else {
    const opt = new Option('Nessuna auto ' + state.categoria + ' disponibile ancora', '');
    opt.disabled = true;
    og1.appendChild(opt);
  }
  sel.appendChild(og1);
  const og2 = document.createElement('optgroup'); og2.label = 'Solo layout (generico)';
  og2.appendChild(new Option('Motore anteriore (generico)', '__layout_anteriore__'));
  og2.appendChild(new Option('Motore centrale (generico)', '__layout_centrale__'));
  og2.appendChild(new Option('Motore posteriore (generico)', '__layout_posteriore__'));
  sel.appendChild(og2);
  sel.value = state.auto || '';
  sel.addEventListener('change', ()=>{ state.auto = sel.value; saveState(); renderCarInfo(); render(); });
  renderCarInfo();
}

function renderCarInfo(){
  const box = document.getElementById('car-info');
  const autoInfo = getAutoInfo(state.auto);
  if(!autoInfo || !autoInfo.nome){ box.classList.remove('visible'); box.innerHTML=''; return; }
  const layoutLabel = { anteriore:'Motore anteriore', centrale:'Motore centrale', posteriore:'Motore posteriore' }[autoInfo.layout] || autoInfo.layout;
  let html = '<div class="info-box-tags"><span class="chip">'+escapeHtml(layoutLabel)+'</span><span class="chip">'+escapeHtml(autoInfo.aspirazione)+'</span></div>';
  html += escapeHtml(autoInfo.nota);
  box.innerHTML = html;
  box.classList.add('visible');
}

function renderPistaInfo(){
  const box = document.getElementById('pista-info');
  const pista = state.pista ? DATA.piste.find(p=>p.nome===state.pista) : null;
  if(!pista){ box.classList.remove('visible'); box.innerHTML=''; return; }
  const aeroLabel = { basso:'Aero: basso', medio:'Aero: medio', alto:'Aero: alto' }[pista.profilo_aero] || pista.profilo_aero;
  const superficieLabel = { liscia:'Superficie liscia', media:'Superficie media', cordoli_aggressivi:'Cordoli aggressivi' }[pista.superficie] || pista.superficie;
  const mixLabel = { veloci:'Curve veloci', lente_medie:'Curve lente/medie', miste:'Curve miste' }[pista.mix_curve_dominante] || pista.mix_curve_dominante;
  const usuraLabel = pista.usura_gomme==='elevata' ? 'Usura gomme elevata' : null;
  let html = '<div class="info-box-tags"><span class="chip">'+escapeHtml(aeroLabel)+'</span><span class="chip">'+escapeHtml(superficieLabel)+'</span><span class="chip">'+escapeHtml(mixLabel)+'</span>';
  if(usuraLabel) html += '<span class="chip">'+escapeHtml(usuraLabel)+'</span>';
  html += '</div>';
  html += escapeHtml(pista.note);
  box.innerHTML = html;
  box.classList.add('visible');
}

function getPistaSetupBase(pista){
  if(pista.superficie==='cordoli_aggressivi'){
    return { altezza:'più alta del solito', molle:'più morbide', arb:'più morbide' };
  }
  if(pista.superficie==='liscia'){
    return { altezza:'più bassa del solito', molle:'medio rigide', arb:'più rigide' };
  }
  return { altezza:'nella media', molle:'nella media', arb:'nella media' };
}

function renderPistaHint(){
  const box = document.getElementById('pista-hint');
  const pista = state.pista ? DATA.piste.find(p=>p.nome===state.pista) : null;
  if(!pista){ box.classList.remove('visible'); box.innerHTML=''; return; }
  const base = getPistaSetupBase(pista);
  const direzioneLabel = {
    equilibrato: 'mix equilibrato di curve a destra e sinistra',
    prevalenza_destra: 'prevalenza di curve a destra',
    prevalenza_sinistra: 'prevalenza di curve a sinistra'
  }[pista.curve_direzione] || pista.curve_direzione;
  const rigiditaTxt = (base.molle===base.arb) ? ('molle/ARB ' + base.molle) : ('molle ' + base.molle + ', ARB ' + base.arb);
  let testo = 'Altezza da terra ' + base.altezza + ', ' + rigiditaTxt +
    ' come punto di partenza. ' + direzioneLabel.charAt(0).toUpperCase() + direzioneLabel.slice(1) + '.';
  if(pista.usura_gomme==='elevata'){
    if(pista.curve_direzione==='prevalenza_destra'){
      testo += ' Le gomme sinistre (esterne più spesso) scaldano prima; le destre faticano di più a entrare in temperatura.';
    } else if(pista.curve_direzione==='prevalenza_sinistra'){
      testo += ' Le gomme destre (esterne più spesso) scaldano prima; le sinistre faticano di più a entrare in temperatura.';
    }
  }
  box.innerHTML = '<b>Per questa pista:</b> ' + escapeHtml(testo);
  if(pista.consigli_base && pista.consigli_base.length){
    const badge = pista.consigli_base.map(c=>
      '<span class="chip chip-consigliato">Consigliato: '+escapeHtml(c.parametro)+' '+escapeHtml(c.valore)+'</span>'
    ).join('');
    box.innerHTML += '<div class="context-chips" style="margin:8px 0 0;">'+badge+'</div>';
  }
  box.classList.add('visible');
}

function getAutoInfo(value){
  if(!value) return null;
  if(value.indexOf('__layout_')===0){
    const layout = value.replace('__layout_','').replace(/__$/,'');
    return { layout, nome:null };
  }
  const entry = DATA.auto.note_specifiche.find(a=>a.auto===value);
  if(entry) return { layout:entry.layout, nome:entry.auto, nota:entry.nota, aspirazione:entry.aspirazione };
  return null;
}

function isNaturalTendency(fase, sintomo, layout){
  if(layout==='anteriore'){
    return (sintomo==='sottosterzo') || (fase==='uscita' && sintomo==='sovrasterzo');
  }
  if(layout==='posteriore'){
    return (fase==='ingresso' && sintomo==='sovrasterzo') || (fase==='uscita' && sintomo==='sottosterzo');
  }
  return false;
}

function getParametriNonDisponibili(){
  const result = new Set();
  const catDefaults = DATA.auto.non_disponibili_categoria && DATA.auto.non_disponibili_categoria[state.categoria];
  if(catDefaults) catDefaults.forEach(p=>result.add(p));
  const autoInfo = getAutoInfo(state.auto);
  if(autoInfo && autoInfo.nome){
    const entry = DATA.auto.note_specifiche.find(a=>a.auto===autoInfo.nome);
    if(entry && entry.parametri_non_disponibili) entry.parametri_non_disponibili.forEach(p=>result.add(p));
  }
  return result;
}

function getBaseAzioni(){
  const def = PROBLEMI.find(p=>p.id===state.problema);
  if(!def) return { azioni:[], sintomo:null };
  const nonDisponibili = getParametriNonDisponibili();
  const filtra = list => nonDisponibili.size ? list.filter(a=> !nonDisponibili.has(a.parametro)) : list;
  if(def.sottocasi){
    if(!state.sottocaso) return { azioni:[], sintomo:null };
    const caso = DATA.sottocasi[def.sottocasi][state.sottocaso];
    if(caso.redirect) return { azioni:[], sintomo:null, redirect: caso.redirect };
    return { azioni: filtra(caso.azioni), sintomo:null, prioritaParametri: caso.priorita_parametri || null,
             tecnicaGuida: caso.tecnica_guida || null, spiegazione: caso.spiegazione || null };
  }
  if(def.curveLente){
    const cl = DATA.curve_lente[def.curveLente];
    return { azioni: filtra(cl.azioni), sintomo:null, prioritaParametri: cl.priorita_parametri || null };
  }
  const faseObj = DATA.fasi_curva.find(f=>f.fase===state.fase);
  if(!faseObj) return { azioni:[], sintomo:def.sintomo };
  const probObj = faseObj.problemi.find(p=>p.sintomo===def.sintomo);
  if(!probObj) return { azioni:[], sintomo: def.sintomo, prioritaParametri: null };
  let elenco = probObj.azioni;
  const extra = probObj.azioni_extra_velocita && probObj.azioni_extra_velocita[state.velocita_curva];
  if(extra) elenco = elenco.concat(extra);
  return { azioni: filtra(elenco), sintomo: def.sintomo, prioritaParametri: probObj.priorita_parametri || null };
}

function getMeccanicoSubPriority(parametro){
  // dentro al bilanciamento meccanico, sospensione (molle/corsa/bump stop) e ARB sono le leve
  // di base (steady-state), i cambiamenti più percepibili; gli ammortizzatori (bump/rebound)
  // agiscono più sul transitorio e sono notoriamente più difficili da sentire: a parità di
  // punteggio, vanno mostrati dopo. Il rake resta neutro, non è oggetto di questa richiesta.
  if(/^(arb|molle|bump_stop)/.test(parametro)) return -0.05; // bump_stop copre durezza e range
  if(/^(bump_lento|bump_veloce|rebound)/.test(parametro)) return 0.05;
  return 0;
}

function getLayoutRule(azione, sintomo){
  // regole specifiche per layout motore (dati: auto.layout_motore.<layout>.priorita_azioni):
  // fissano la quantità consigliata di un parametro e, se indicata, la posizione in elenco
  const autoInfo = getAutoInfo(state.auto);
  if(!autoInfo || !sintomo) return null;
  const layoutData = DATA.auto.layout_motore[autoInfo.layout];
  if(!layoutData || !layoutData.priorita_azioni) return null;
  return layoutData.priorita_azioni.find(r =>
    r.parametro===azione.parametro &&
    r.quando.some(q => q.fase===state.fase && q.sintomo===sintomo)
  ) || null;
}

function getScalaVelocita(sintomo){
  if(!sintomo || !state.velocita_curva) return null;
  const perSintomo = DATA.meta.priorita_velocita_curva && DATA.meta.priorita_velocita_curva[sintomo];
  const perFase = perSintomo && perSintomo[state.fase];
  return (perFase && perFase[state.velocita_curva]) || null;
}

function getVelocitaOverride(azione, sintomo){
  const livelli = getScalaVelocita(sintomo);
  if(!livelli) return null;
  for(const g of livelli){
    const m = g.parametri.find(p=>p.parametro===azione.parametro && p.percentuale);
    if(m) return m.percentuale;
  }
  return null;
}

function computeAdjusted(azione, sintomo){
  const pista = state.pista ? DATA.piste.find(p=>p.nome===state.pista) : null;
  const autoInfo = getAutoInfo(state.auto);
  const layoutRule = getLayoutRule(azione, sintomo);
  const velocitaOverride = getVelocitaOverride(azione, sintomo);
  const livelloBase = layoutRule ? layoutRule.percentuale : (velocitaOverride || azione.percentuale_regolazione);
  let score = azione.priorita;
  if(azione.regime==='meccanico'){ score += getMeccanicoSubPriority(azione.parametro); }
  let levelShift = 0;
  const notes = [];

  if(state.velocita_curva){
    // la velocità della curva, quando indicata, è più specifica del profilo aerodinamico generale
    // della pista: sostituisce quel calcolo invece di sommarsi, per non generare messaggi contraddittori
    if(state.velocita_curva==='alta' && azione.regime==='aero'){
      score -= 0.4; notes.push({text:'curva veloce: leva aerodinamica prioritaria qui', tipo:'pista'});
    }
    if(state.velocita_curva==='bassa'){
      if(azione.regime==='meccanico'){ score -= 0.3; }
      if(azione.regime==='aero'){ score += 0.5; notes.push({text:'curva lenta: leva aerodinamica secondaria qui', tipo:'pista-secondaria'}); }
    }
  } else if(pista){
    if(azione.regime==='aero'){
      if(pista.profilo_aero==='alto'){ score -= 0.4; notes.push({text:'pista ad alto carico aerodinamico: leva prioritaria qui', tipo:'pista'}); }
      if(pista.profilo_aero==='basso'){ score += 0.6; notes.push({text:'carico aerodinamico basso: leva secondaria su questa pista', tipo:'pista-secondaria'}); }
    }
    if(azione.regime==='meccanico'){
      if(pista.profilo_aero==='basso'){ score -= 0.2; }
    }
  }
  if(pista && azione.regime==='meccanico' && pista.superficie==='cordoli_aggressivi' && /bump/.test(azione.parametro)){
    score -= 0.4; notes.push({text:'pista con cordoli aggressivi: sospensione prioritaria', tipo:'pista'});
  }
  if(pista && azione.regime==='meccanico' && /arb/.test(azione.parametro)){
    if(pista.superficie==='cordoli_aggressivi'){
      score -= 0.3; notes.push({text:'pista con cordoli aggressivi: barre più morbide aiutano la compliance', tipo:'pista'});
    } else if(pista.superficie==='liscia'){
      score -= 0.2; notes.push({text:'pista liscia: barre più rigide aiutano la stabilità', tipo:'pista'});
    }
  }
  if(pista && /ride_height/.test(azione.parametro)){
    if(pista.superficie==='cordoli_aggressivi'){
      notes.push({text:'pista sconnessa: ride height aumentata', tipo:'pista'});
    } else if(pista.superficie==='liscia'){
      notes.push({text:'pista piatta: ride height bassa', tipo:'pista'});
    }
  }

  if(autoInfo && sintomo && (sintomo==='sottosterzo' || sintomo==='sovrasterzo')){
    if(isNaturalTendency(state.fase, sintomo, autoInfo.layout)){
      // se c'è una regola specifica per il layout, la quantità è già quella giusta per quel layout
      if(!layoutRule && !velocitaOverride && !azione.quantita_fissa){ levelShift -= 1; }
    }
  }

  if(state.preferenza && state.preferenza!=='neutro' && sintomo && (sintomo==='sottosterzo' || sintomo==='sovrasterzo')){
    const vuoleSovrasterzo = state.preferenza==='sovrasterzante';
    if(sintomo==='sottosterzo'){
      if(vuoleSovrasterzo){ levelShift += 1; notes.push({text:'spinge verso la tua preferenza di guida', tipo:'preferenza'}); }
      else { levelShift -= 1; notes.push({text:'in linea con la tua preferenza di guida', tipo:'preferenza'}); }
    } else {
      if(vuoleSovrasterzo){ levelShift -= 1; notes.push({text:'in linea con la tua preferenza di guida', tipo:'preferenza'}); }
      else { levelShift += 1; notes.push({text:'spinge verso la tua preferenza di guida', tipo:'preferenza'}); }
    }
  }

  const baseIdx = LIVELLI.indexOf(livelloBase);
  const rawIdx = baseIdx + levelShift;
  const newIdx = Math.min(2, Math.max(0, rawIdx));
  const facoltativa = rawIdx < 0;

  return {
    score,
    percentuale: LIVELLI[newIdx],
    percentualeOriginale: LIVELLI[baseIdx],
    cambiata: newIdx !== baseIdx,
    facoltativa,
    notes,
    layoutRule
  };
}

function getAvvertenze(sintomo){
  const autoInfo = getAutoInfo(state.auto);
  const result = { evita:{}, verificaPrima:[], enfatizza:{}, facoltativa:{} };
  if(!autoInfo || !autoInfo.nome) return result;
  const entry = DATA.auto.note_specifiche.find(a=>a.auto===autoInfo.nome);
  if(!entry || !entry.avvertenze) return result;
  entry.avvertenze.forEach(av=>{
    const match = av.quando.some(q => {
      if(q.problema && q.problema !== state.problema) return false;
      if(q.fase && q.fase !== state.fase) return false;
      if(q.sintomo && q.sintomo !== sintomo) return false;
      if(q.velocita && q.velocita !== state.velocita_curva) return false;
      return !!(q.problema || q.fase || q.sintomo || q.velocita);
    });
    if(!match) return;
    if(av.tipo==='evita'){
      av.parametri.forEach(p=> result.evita[p] = av.testo);
    } else if(av.tipo==='verifica_prima'){
      result.verificaPrima.push(av.testo);
    } else if(av.tipo==='enfatizza'){
      av.parametri.forEach(p=> result.enfatizza[p] = av.testo);
    } else if(av.tipo==='facoltativa'){
      av.parametri.forEach(p=> result.facoltativa[p] = { percentuale: av.percentuale, testo: av.testo });
    }
  });
  return result;
}

let TIER_INFO = null;

function iconaPriorita(livello){
  return '<span class="prio prio-'+livello+'" role="img" aria-label="Priorità '+livello+'" title="Priorità '+livello+'">' +
         '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2.5 23 21.5H1Z M11 9h2v6h-2Z M11 16.5h2v2h-2Z"/></svg></span>';
}

function renderResults(){
  const empty = document.getElementById('results-empty');
  const content = document.getElementById('results-content');
  if(!state.problema){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = 'Scegli almeno il problema da risolvere, poi premi "Mostra i consigli".';
    return;
  }
  if(!showResults){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = 'Premi "Mostra i consigli" qui sotto per vedere i risultati.';
    return;
  }
  if(state.problema==='temperatura_gomme'){
    if(state.gommeModalita==='avanzate') renderResultsGommeAvanzate(empty, content);
    else renderResultsGomme(empty, content);
    return;
  }
  const defCorrenteEarly = PROBLEMI.find(p=>p.id===state.problema);
  if(defCorrenteEarly && defCorrenteEarly.sottocasi && !state.sottocaso){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = 'Rispondi alla domanda qui sopra, poi premi "Mostra i consigli".';
    return;
  }
  if(defCorrenteEarly && defCorrenteEarly.needsFase && !state.fase){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = 'Scegli la fase della curva qui sopra, poi premi "Mostra i consigli".';
    return;
  }
  const { azioni, sintomo, prioritaParametri: prioritaFase, redirect, tecnicaGuida, spiegazione } = getBaseAzioni();
  if(redirect){
    empty.style.display='none'; content.style.display='block';
    let html = '<div class="principio">' + escapeHtml(redirect.testo) + '</div>';
    html += '<button type="button" class="cta redirect-btn" id="redirect-btn">' + escapeHtml(redirect.pulsante) + '</button>';
    content.innerHTML = html;
    document.getElementById('redirect-btn').addEventListener('click', ()=>{
      state.problema = redirect.problema; state.fase = redirect.fase; state.sottocaso = null;
      saveState();
      render();
      showResults = true;
      renderResults();
      syncResultsGlow();
    });
    return;
  }
  // la scala legata a curva lenta/veloce (se il sintomo la definisce per la velocità scelta)
  // ha precedenza su quella di fase, perché è un contesto più specifico
  const prioritaVelocita = getScalaVelocita(sintomo);
  const prioritaParametri = prioritaVelocita || prioritaFase;
  if(!azioni.length){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = 'Nessun dato disponibile per questa combinazione. Prova un\'altra fase.';
    return;
  }
  empty.style.display='none'; content.style.display='block';

  const { evita, verificaPrima, enfatizza, facoltativa: facoltativeAuto } = getAvvertenze(sintomo);

  const computed = azioni.map(a=>{
    const adj = computeAdjusted(a, sintomo);
    if(adj.layoutRule && adj.layoutRule.posizione){
      // regola per layout con posizione: passa davanti a qualsiasi altro segnale di contesto
      adj.score = -100 + adj.layoutRule.posizione;
    }
    if(a.facoltativa_default){
      adj.facoltativa = true;
      adj.facoltativaEccezione = true; // non farla sovrascrivere dal livello di priorità
      if(a.facoltativa_nota) adj.notes.push({ text: a.facoltativa_nota, tipo:'nota' });
    }
    if(a.nota_informativa){
      // nota grigia puramente informativa, non rende l'azione facoltativa
      adj.notes.push({ text: a.nota_informativa, tipo:'nota' });
    }
    const eccezione = facoltativeAuto[a.parametro];
    if(eccezione){
      // eccezione specifica per questa auto: ultimo consiglio del gruppo, mostrato come facoltativo
      adj.score = 100;
      adj.percentuale = eccezione.percentuale;
      adj.percentualeOriginale = eccezione.percentuale;
      adj.cambiata = false;
      adj.facoltativa = true;
      adj.facoltativaEccezione = true;
      if(eccezione.testo) adj.notes.push({ text: eccezione.testo, tipo:'auto' });
    }
    const sconsigliata = Object.prototype.hasOwnProperty.call(evita, a.parametro);
    if(sconsigliata) adj.score += 10;
    if(Object.prototype.hasOwnProperty.call(enfatizza, a.parametro)){
      adj.score -= 0.5;
      adj.notes.push({ text: enfatizza[a.parametro], tipo:'auto' });
    }
    return Object.assign({}, a, adj, { sconsigliata, avvertenzaTesto: sconsigliata ? evita[a.parametro] : null });
  });
  computed.sort((a,b)=> a.score - b.score);

  // Problemi con una scala di priorità propria (dati: priorita_parametri): il livello 1-4 decide il
  // gruppo, indipendentemente da auto, pista e categoria del parametro; dentro al livello vale l'ordine
  // della lista. Sconsigliate e eccezioni per singola auto restano in fondo al loro gruppo.
  const modoPriorita = !!(prioritaParametri && prioritaParametri.length);
  if(modoPriorita){
    const posizioni = {};
    let n = 0;
    prioritaParametri.forEach(g=> g.parametri.forEach(par=>{
      // la scala di fase (generale) usa stringhe semplici, quella di velocità usa oggetti
      // {parametro, percentuale}: qui si leggono entrambi i formati
      const nome = typeof par === 'string' ? par : par.parametro;
      posizioni[nome] = { livello:g.livello, ordine:n++, percentuale: typeof par === 'string' ? null : par.percentuale };
    }));
    computed.forEach(a=>{
      const m = posizioni[a.parametro];
      a.livello = m ? m.livello : 4;
      a.ordineLista = m ? m.ordine : 1000;
      // un parametro ad alta priorità non va presentato come "facoltativo" solo per il carattere
      // naturale del layout (resta ridotta la quantità); l'eccezione per singola auto resta
      if(a.livello <= 3 && !a.facoltativaEccezione) a.facoltativa = false;
    });
    computed.sort((x,y)=>{
      const fx = x.score >= 10 ? 1 : 0, fy = y.score >= 10 ? 1 : 0;
      if(fx !== fy) return fx - fy;
      if(x.ordineLista !== y.ordineLista) return x.ordineLista - y.ordineLista;
      return x.score - y.score;
    });
  }

  const tiers = {1:[],2:[],3:[],4:[]};
  computed.forEach(a=> tiers[modoPriorita ? a.livello : a.priorita].push(a));

  // stessa logica di precedenza usata nel punteggio: la velocità della curva,
  // se indicata, decide l'ordine; altrimenti il profilo aerodinamico della pista
  let netAero = 0;
  const pistaObj = state.pista ? DATA.piste.find(p=>p.nome===state.pista) : null;
  if(state.velocita_curva==='alta') netAero = 1;
  else if(state.velocita_curva==='bassa') netAero = -1;
  else if(pistaObj){
    if(pistaObj.profilo_aero==='alto') netAero = 1;
    else if(pistaObj.profilo_aero==='basso') netAero = -1;
  }
  const ordineTier = (netAero > 0 && !modoPriorita) ? [2,1,3,4] : [1,2,3,4];

  let html = '';

  const chips = [];
  if(state.velocita_curva){ chips.push('<span class="chip">'+escapeHtml(state.velocita_curva==='alta' ? 'Curva veloce (>145 km/h)' : 'Curva lenta (<145 km/h)')+'</span>'); }
  if(state.pista) chips.push('<span class="chip">'+escapeHtml(state.pista)+'</span>');
  const autoInfo = getAutoInfo(state.auto);
  if(autoInfo) chips.push('<span class="chip">'+escapeHtml(autoInfo.nome || ('Motore ' + autoInfo.layout))+'</span>');
  if(state.preferenza && state.preferenza!=='neutro') chips.push('<span class="chip">Preferenza: '+escapeHtml(state.preferenza)+'</span>');
  if(sintomo==='sottosterzo' || sintomo==='sovrasterzo'){
    chips.push('<span class="chip sym-'+sintomo+'">'+sintomo+'</span>');
  }
  if(chips.length){
    html += '<div class="context-chips">' + chips.join('') + '</div>';
  }

  const defCorrente = PROBLEMI.find(p=>p.id===state.problema);
  if(defCorrente && defCorrente.curveLente){
    const notaGuida = DATA.curve_lente[defCorrente.curveLente].nota;
    if(notaGuida){
      html += '<div class="principio"><b>Consiglio di guida:</b> ' + escapeHtml(notaGuida) + '</div>';
    }
  }

  verificaPrima.forEach(t=>{
    html += '<div class="principio avviso-auto"><b>Per questa auto:</b> ' + escapeHtml(t) + '</div>';
  });

  if(tecnicaGuida && tecnicaGuida.length){
    html += '<div class="tecnica-guida"><h3 class="tecnica-guida-title">Tecnica di guida</h3><ul>';
    tecnicaGuida.forEach(t=> html += '<li>'+escapeHtml(t)+'</li>');
    html += '</ul></div>';
  }
  if(spiegazione){
    html += '<div class="principio">' + escapeHtml(spiegazione) + '</div>';
  }

  ordineTier.forEach(t=>{
    const group = tiers[t];
    if(!group.length) return;

    const noteCount = {};
    group.forEach(a=>{
      const seen = new Set();
      a.notes.forEach(n=>{
        if((n.tipo==='pista' || n.tipo==='pista-secondaria') && !seen.has(n.text)){
          seen.add(n.text);
          if(!noteCount[n.text]) noteCount[n.text] = { tipo:n.tipo, count:0 };
          noteCount[n.text].count++;
        }
      });
    });
    const hoisted = Object.keys(noteCount).filter(text => noteCount[text].count === group.length);

    if(modoPriorita){
      html += '<div class="tier"><h3 class="tier-title">Priorità '+t+'</h3>';
    } else {
      html += '<div class="tier"><h3 class="tier-title">'+TIER_INFO[t].title+'</h3><p class="tier-desc">'+escapeHtml(TIER_INFO[t].desc)+'</p>';
    }
    hoisted.forEach(text=>{
      const cls = noteCount[text].tipo==='pista-secondaria' ? 'tier-note-pista' : 'tier-note';
      html += '<div class="'+cls+'">'+escapeHtml(text)+'</div>';
    });
    group.forEach(a=>{
      html += '<div class="azione'+(a.facoltativa?' facoltativa':'')+(a.sconsigliata?' sconsigliata':'')+'">';
      html += '  <div class="azione-main">';
      const conSimbolo = modoPriorita && a.livello >= 1 && a.livello <= 3;
      html += '    <div class="azione-testo'+(conSimbolo?' con-prio':'')+'">'+(conSimbolo ? iconaPriorita(a.livello) : '')+escapeHtml(a.testo)+'</div>';
      if(!a.senza_percentuale){
        html += '    <div class="azione-meta">';
        html += '      <span class="tag">'+escapeHtml(a.parametro)+'</span>';
        html += '    </div>';
      }
      if(a.notes.length){
        const secondarie = a.notes.filter(n=>n.tipo==='pista-secondaria' && !hoisted.includes(n.text)).map(n=>n.text);
        const altre = a.notes.filter(n=> n.tipo!=='pista-secondaria' && !(n.tipo==='pista' && hoisted.includes(n.text)) ).map(n=>n.text);
        if(secondarie.length){
          html += '    <div class="azione-note-pista">'+escapeHtml(secondarie.join(' · '))+'</div>';
        }
        if(altre.length){
          html += '    <div class="azione-note">'+escapeHtml(altre.join(' · '))+'</div>';
        }
      }
      if(a.sconsigliata){
        html += '    <div class="azione-warn">⚠ '+escapeHtml(a.avvertenzaTesto)+'</div>';
      }
      html += '  </div>';
      if(!a.senza_percentuale){
        html += '  <div class="azione-perc">';
        if(a.cambiata){ html += '<span class="perc-old">'+a.percentualeOriginale+'</span>'; }
        html += '<span class="perc-'+a.percentuale+'">'+a.percentuale+'</span>';
        html += '  </div>';
      }
      html += '</div>';
    });
    html += '</div>';
  });

  content.innerHTML = html;
}

function renderResultsGomme(empty, content){
  const selezionate = Object.keys(state.gomme).filter(k => state.gomme[k]);
  if(!selezionate.length){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = 'Seleziona almeno una gomma qui sopra (Alta o Bassa) per vedere i consigli.';
    return;
  }
  empty.style.display='none'; content.style.display='block';

  let html = '<div class="principio"><b>Attenzione:</b> ' + escapeHtml(DATA.temperatura_gomme.nota_bilanciamento) + '</div>';

  selezionate.forEach(key=>{
    const direzione = state.gomme[key];
    const azioni = DATA.temperatura_gomme[direzione==='alta' ? 'troppo_alta' : 'troppo_bassa'].azioni;
    html += '<div class="gomma-risultato">';
    html += '  <div class="gomma-risultato-titolo">' + escapeHtml(WHEEL_LABELS_LUNGHI[key]) + ' — <span class="gomma-dir-' + direzione + '">' + (direzione==='alta' ? 'troppo alta' : 'troppo bassa') + '</span></div>';
    html += '  <ul class="gomma-azioni">';
    azioni.forEach(a=>{ html += '<li>' + escapeHtml(a.testo) + '</li>'; });
    html += '  </ul>';
    html += '</div>';
  });

  content.innerHTML = html;
}

function diagnosiZonaGomma(o, m, i){
  const s = DATA.temperatura_gomme_avanzata.soglie;
  const zone = { interna:i, centro:m, esterna:o };
  const min = Math.min(o,m,i), max = Math.max(o,m,i), media = (o+m+i)/3, gradiente = max-min;
  let livelloDistrib = gradiente > s.gradiente_accettabile ? 'non_uniforme' : (gradiente > s.gradiente_ottima ? 'accettabile' : 'ottima');
  let caso = null;
  let tendenza = null;
  if(livelloDistrib !== 'ottima'){
    // il caso dominante (e i relativi consigli) vale sia per "accettabile" che per "non uniforme":
    // anche dentro al range di sicurezza, una zona nettamente più calda ha comunque una causa precisa
    const ordinate = Object.entries(zone).sort((a,b)=> b[1]-a[1]);
    if(ordinate[0][1] - ordinate[1][1] >= s.zona_dominante){
      caso = ordinate[0][0];
    }
  } else {
    // dentro "ottima" il margine è piccolo, ma una tendenza residua (esterna o centro più calde)
    // vale comunque una nota leggera, non un comando: l'interna più calda non si segnala, è la norma.
    // confronto diretto, non "primo vs secondo" come nei casi grossi: esterna vs interna, centro vs le altre due
    if(o - i >= s.tendenza_ottima){
      tendenza = 'esterna';
    } else if(m - Math.max(o,i) >= s.tendenza_ottima){
      tendenza = 'centro';
    }
  }
  const troppoBassa = o < s.range_min || m < s.range_min || i < s.range_min || media < s.range_min;
  const troppoAlta = o > s.range_max || m > s.range_max || i > s.range_max || media > s.range_max;
  return { o, m, i, min, max, media, gradiente, livelloDistrib, caso, tendenza, troppoBassa, troppoAlta };
}

function renderResultsGommeAvanzate(empty, content){
  if(state.gommeTipo !== 'slick'){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = "L'analisi avanzata è disponibile per ora solo per le gomme Slick.";
    return;
  }
  const dati = state.gommeAvanzate;
  const compilate = Object.keys(dati).filter(k => dati[k].o!=='' && dati[k].m!=='' && dati[k].i!=='');
  if(!compilate.length){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = "Inserisci le tre temperature (O, M, I) di almeno una gomma qui sopra per vedere l'analisi.";
    return;
  }
  empty.style.display='none'; content.style.display='block';

  const AV = DATA.temperatura_gomme_avanzata;
  const diagnosi = {};
  compilate.forEach(k=> diagnosi[k] = diagnosiZonaGomma(parseFloat(dati[k].o), parseFloat(dati[k].m), parseFloat(dati[k].i)));

  let html = '<div class="principio">Rileva le temperature ai box dopo 4-5 giri costanti, quando la gomma ha raggiunto una condizione di lavoro stabile: misurazioni prese prima o dopo non sono affidabili.</div>';
  compilate.forEach(key=>{
    const d = diagnosi[key];
    html += '<div class="gomma-risultato">';
    html += '  <div class="gomma-risultato-titolo">' + escapeHtml(WHEEL_LABELS_LUNGHI[key]) + '</div>';
    html += '  <div class="gomma-av-riepilogo">O ' + d.o + '° · M ' + d.m + '° · I ' + d.i + '°'
          + ' — media ' + d.media.toFixed(1) + '°, gradiente ' + d.gradiente.toFixed(1) + '°</div>';

    // quando una zona domina ED è anche fuori dal range sano, distribuzione e temperatura assoluta
    // interagiscono: l'esterna calda spiega (e precede) la pressione alta; il centro caldo ribalta
    // la direzione della pressione invece di sommarsi ad essa
    const fuoriRange = d.troppoAlta || d.troppoBassa;
    const esternaECalda = d.caso==='esterna' && d.troppoAlta;
    // qui non serve lo stesso margine della segnalazione standalone: basta che il centro sia la zona
    // più calda delle tre perché la stessa causa (sovra-pressione) spieghi sia questo sia il "troppo calda"
    const centroECalda = d.troppoAlta && d.m > d.o && d.m > d.i;

    // 1) distribuzione (sempre mostrata, a tre livelli)
    html += '  <div class="gomma-av-distrib gomma-av-' + d.livelloDistrib + '">' + escapeHtml(AV.distribuzione[d.livelloDistrib]) + '</div>';
    if(d.caso && !esternaECalda){
      const c = AV.distribuzione.casi[d.caso];
      html += '  <div class="gomma-av-problema">' + escapeHtml(c.problema) + '</div>';
      html += '  <ul class="gomma-av-consigli">';
      c.consigli.forEach(testo=> html += '<li>' + escapeHtml(testo) + '</li>');
      html += '  </ul>';
    }
    if(d.tendenza){
      html += '  <div class="gomma-av-tendenza">' + escapeHtml(AV.distribuzione.tendenze[d.tendenza]) + '</div>';
    }

    if(esternaECalda){
      // la causa (camber) precede l'effetto (pressione/toe/duct): un'unica lista 1-4, non due blocchi separati.
      // il brake duct qui dentro compare solo se l'altra gomma dello stesso asse NON è anch'essa calda:
      // altrimenti se ne occupa già, una volta sola, la sezione "Brake duct per asse" più sotto
      const partnerAsse = { ant_sx:'ant_dx', ant_dx:'ant_sx', post_sx:'post_dx', post_dx:'post_sx' }[key];
      const partnerCondivide = diagnosi[partnerAsse] && diagnosi[partnerAsse].troppoAlta;
      html += '  <div class="gomma-av-problema">' + escapeHtml(AV.distribuzione.casi.esterna.problema) + '</div>';
      const unificati = [
        { livello:1, testo:'Aumenta camber negativo', percentuale:'lieve' },
        { livello:2, testo:'Aumenta la pressione', percentuale:'lieve' },
        { livello:3, testo:'Riduci il toe', percentuale:'lieve' }
      ];
      if(!partnerCondivide){
        unificati.push({ livello:4, testo:"Aumenta l'apertura del brake duct dell'asse corrispondente", percentuale:'lieve' });
      }
      unificati.forEach(cc=>{
        html += '  <div class="azione"><div class="azione-main">';
        html += '    <div class="azione-testo con-prio">' + iconaPriorita(cc.livello) + escapeHtml(cc.testo) + '</div>';
        html += '  </div><div class="azione-perc"><span class="perc-' + cc.percentuale + '">' + cc.percentuale + '</span></div></div>';
      });
    } else {
      // 2) temperatura assoluta (pressione/toe per singola ruota; il brake duct si mostra per asse più sotto)
      ['troppo_bassa','troppo_alta'].forEach(tipo=>{
        const flag = tipo==='troppo_bassa' ? d.troppoBassa : d.troppoAlta;
        if(!flag) return;
        const a = AV.assoluta[tipo];
        html += '  <div class="gomma-av-problema">' + escapeHtml(a.problema) + '</div>';
        a.consigli.filter(cc=>!cc.asse).forEach(cc=>{
          // il centro che domina spiega da solo la sovra-pressione: non ripetere "aumenta pressione"
          if(centroECalda && tipo==='troppo_alta' && /pressione/.test(cc.testo)){
            // se il blocco distribuzione non ha già mostrato "riduci la pressione" (perché il centro non
            // superava la propria soglia standalone), lo si aggiunge comunque qui: la pressione va
            // indicata in una sola direzione, mai lasciata assente
            if(d.caso !== 'centro' && d.tendenza !== 'centro'){
              html += '  <div class="azione"><div class="azione-main">';
              html += '    <div class="azione-testo con-prio">' + iconaPriorita(cc.livello) + 'Riduci la pressione della gomma</div>';
              html += '  </div><div class="azione-perc"><span class="perc-lieve">lieve</span></div></div>';
            }
            return;
          }
          html += '  <div class="azione"><div class="azione-main">';
          html += '    <div class="azione-testo con-prio">' + iconaPriorita(cc.livello) + escapeHtml(cc.testo) + '</div>';
          html += '  </div><div class="azione-perc"><span class="perc-' + cc.percentuale + '">' + cc.percentuale + '</span></div></div>';
        });
      });
    }

    html += '</div>';
  });

  // 3) brake duct per asse, solo se entrambe le ruote dello stesso asse condividono la stessa tendenza
  const assi = [['ant_sx','ant_dx','anteriori'], ['post_sx','post_dx','posteriori']];
  const ductHtml = [];
  assi.forEach(([sx,dx,labelAsse])=>{
    const dSx = diagnosi[sx], dDx = diagnosi[dx];
    if(!dSx || !dDx) return;
    ['troppo_bassa','troppo_alta'].forEach(tipo=>{
      const flagSx = tipo==='troppo_bassa' ? dSx.troppoBassa : dSx.troppoAlta;
      const flagDx = tipo==='troppo_bassa' ? dDx.troppoBassa : dDx.troppoAlta;
      if(flagSx && flagDx){
        const testo = AV.assoluta[tipo].asse_testo.replace('{asse}', labelAsse);
        ductHtml.push('<div class="azione"><div class="azione-main"><div class="azione-testo con-prio">' +
          iconaPriorita(1) + escapeHtml(testo) + '</div></div><div class="azione-perc"><span class="perc-lieve">lieve</span></div></div>');
      }
    });
  });
  if(ductHtml.length){
    html += '<div class="gomma-risultato"><div class="gomma-risultato-titolo">Brake duct (per asse)</div>' + ductHtml.join('') + '</div>';
  }

  content.innerHTML = html;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderTyres(){
  const grid = document.getElementById('tyre-grid');
  grid.innerHTML = '';
  const labels = { asciutto_caldo:'Asciutto, caldo', asciutto_freddo:'Asciutto, freddo', wet:'Pioggia (wet)', umido:'Pista umida' };
  DATA.pressioni_temperature_gomme.forEach(t=>{
    const card = el('div','tyre-card');
    card.appendChild(el('h4', null, labels[t.condizione] || t.condizione));
    const val = el('div','val');
    val.innerHTML = t.pressione_psi.min + (t.pressione_psi.min!==t.pressione_psi.max ? '–'+t.pressione_psi.max : '') + ' PSI<br>' +
                     t.temperatura_c.min + '–' + t.temperatura_c.max + ' °C<br>' + escapeHtml(t.nota);
    card.appendChild(val);
    grid.appendChild(card);
  });
}

function renderPrincipioBanner(){
  const banner = document.getElementById('principio-banner');
  banner.innerHTML = '<div class="inner"><b>Prima di intervenire:</b> ' + escapeHtml(DATA.meta.principio_diagnosi) + '</div>';
}

function renderCarattereNaturale(){
  const box = document.getElementById('carattere-naturale');
  const def = PROBLEMI.find(p=>p.id===state.problema);
  const autoInfo = getAutoInfo(state.auto);
  const sintomo = def ? def.sintomo : null;
  if(!def || !autoInfo || !state.fase || !sintomo || !(sintomo==='sottosterzo' || sintomo==='sovrasterzo') || !isNaturalTendency(state.fase, sintomo, autoInfo.layout)){
    box.classList.remove('visible'); box.innerHTML=''; return;
  }
  box.innerHTML = "Carattere naturale di un'auto a motore " + autoInfo.layout + ": l'auto tende già in questa direzione anche senza modifiche.";
  box.classList.add('visible');
}

const SLOW = 1.25; // stesso moltiplicatore di --slow in style.css
// Fa partire la cascata d'ingresso dei bottoni di un passo e la toglie a fine animazione
function markEntering(step, delayMs){
  step.style.setProperty('--d', delayMs + 'ms');
  step.classList.add('entering');
  clearTimeout(step._enteringTimer);
  step._enteringTimer = setTimeout(()=> step.classList.remove('entering'), (delayMs + 1300) * SLOW);
}

// Mostra/nasconde un passo con animazione; `entering` serve solo a far entrare i bottoni a cascata alla prima comparsa
function setStepVisible(step, on){
  const was = step.classList.contains('visible');
  if(on === was) return;
  if(on){
    markEntering(step, 0);
  } else {
    step.classList.remove('entering');
  }
  step.classList.toggle('visible', on);
}

function updateFaseVisibility(){
  const def = PROBLEMI.find(p=>p.id===state.problema);
  const needsFase = !!(def && def.needsFase);
  setStepVisible(document.getElementById('fase-step'), needsFase);
  setStepVisible(document.getElementById('velocita-step'), needsFase && !!state.fase);
  if(!needsFase) state.velocita_curva = '';
  setStepVisible(document.getElementById('gomme-step'), !!(def && def.temperatura));
  setStepVisible(document.getElementById('sottocaso-step'), !!(def && def.sottocasi));
}

function render(){
  showResults = false;
  renderProblemaChoices();
  updateFaseVisibility();
  renderFaseChoices();
  renderSottocasoChoices();
  renderVelocitaChoices();
  renderGommeModalitaChoices();
  renderGommeTipoChoices();
  renderWheelGrid();
  renderCategoriaChoices();
  renderPreferenzaChoices();
  renderCarattereNaturale();
  renderResults();
  syncResultsGlow();
}

// La luce del bottone "Mostra i consigli" viaggia fino al pannello dei consigli e ne diventa il bordo luminoso;
// quando i consigli si nascondono (render) torna nel bottone.
let resultsGlow = null, resultsGlowOpen = false;
function ctaRectInResults(){
  const b = document.getElementById('show-btn').getBoundingClientRect();
  const panel = document.getElementById('results');
  const r = panel.getBoundingClientRect();
  return { left:b.left - r.left - panel.clientLeft, top:b.top - r.top - panel.clientTop, width:b.width, height:b.height };
}
function setGlowRect(g, rect){
  if(!rect){ g.style.left = g.style.top = g.style.width = g.style.height = ''; return; }
  g.style.left = rect.left+'px'; g.style.top = rect.top+'px';
  g.style.width = rect.width+'px'; g.style.height = rect.height+'px';
}
// consigli che entrano a cascata con rimbalzo: solo alla prima comparsa, non negli aggiornamenti dal vivo
function revealResults(){
  const content = document.getElementById('results-content');
  const empty = document.getElementById('results-empty');
  const targets = [];
  if(empty.style.display !== 'none') targets.push(empty);
  Array.from(content.children).forEach(c=>{
    if(c.classList.contains('tier')) targets.push(...c.children); else targets.push(c);
  });
  targets.forEach((t, i)=>{ t.style.setProperty('--i', Math.min(i, 14)); t.classList.add('rv'); });
  setTimeout(()=> targets.forEach(t=>{ t.classList.remove('rv'); t.style.removeProperty('--i'); }),
             (320 + 14 * 65 + 800) * SLOW);
}
function syncResultsGlow(){
  if(!resultsGlow || showResults === resultsGlowOpen) return;
  resultsGlowOpen = showResults;
  const g = resultsGlow, btn = document.getElementById('show-btn');
  clearTimeout(g._offTimer);
  if(showResults){
    g.classList.add('no-anim'); g.classList.remove('expanded'); g.classList.add('on');
    setGlowRect(g, ctaRectInResults());
    void g.offsetWidth;
    g.classList.remove('no-anim'); setGlowRect(g, null); g.classList.add('expanded');
    btn.classList.add('sent');
    revealResults();
  } else {
    g.classList.remove('expanded');
    setGlowRect(g, ctaRectInResults());
    btn.classList.remove('sent');
    g._offTimer = setTimeout(()=> g.classList.remove('on'), 450 * SLOW);
  }
}

function init(){
  TIER_INFO = {
    1: { title:'Bilanciamento meccanico', desc:DATA.meta.priorita["1"] },
    2: { title:'Bilanciamento aerodinamico', desc:DATA.meta.priorita["2"] },
    3: { title:'Frenata, differenziale, elettronica', desc:DATA.meta.priorita["3"] },
    4: { title:'Rifinitura', desc:DATA.meta.priorita["4"] }
  };
  loadState();
  document.querySelectorAll('.substep').forEach(step=>{
    const inner = el('div','substep-inner');
    while(step.firstChild) inner.appendChild(step.firstChild);
    step.appendChild(inner);
  });
  document.querySelectorAll('.step:not(.substep)').forEach((step, k)=> markEntering(step, k * 140));
  renderPrincipioBanner();
  renderPistaSelect();
  renderCategoriaChoices();
  renderAutoSelect();
  renderTyres();
  render();
  resultsGlow = el('div','results-glow');
  resultsGlow.setAttribute('aria-hidden','true');
  document.getElementById('results').appendChild(resultsGlow);
  document.getElementById('show-btn').addEventListener('click', ()=>{ showResults = true; renderResults(); syncResultsGlow(); });
}

fetch('data/acc-setup-data.json')
  .then(r => {
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(json => { DATA = json; init(); })
  .catch(err => {
    const empty = document.getElementById('results-empty');
    empty.style.display = 'block';
    empty.textContent = 'Errore nel caricamento del dataset (' + err.message + '). Se stai aprendo il file direttamente dal filesystem, avvia un server statico locale invece di aprire index.html col doppio click.';
  });
