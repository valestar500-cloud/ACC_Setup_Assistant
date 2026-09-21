let DATA = null;

const PROBLEMI = [
  { id:'sottosterzo_curva', label:'Sottosterzo in curva', needsFase:true, sintomo:'sottosterzo' },
  { id:'sovrasterzo_curva', label:'Sovrasterzo in curva', needsFase:true, sintomo:'sovrasterzo' },
  { id:'instabilita_frenata', label:'Instabilità in frenata', needsFase:false, fase:'ingresso', sintomo:'instabilita_frenata' },
  { id:'wheelspin', label:'Pattinamento in trazione', needsFase:false, curveLente:'wheelspin' },
  { id:'auto_pigra_uscita', label:'Auto pigra in uscita', needsFase:false, curveLente:'auto_pigra_uscita' },
  { id:'instabile_sui_cordoli', label:'Instabile sui cordoli', needsFase:false, curveLente:'instabile_sui_cordoli' }
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
const LIVELLI = ['lieve','media','decisa'];

let state = { problema:null, fase:null, pista:'', auto:'', preferenza:'neutro' };

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

function renderChoices(container, items, selectedId, onPick){
  container.innerHTML = '';
  items.forEach(item=>{
    const b = el('button','choice-btn'+(item.id===selectedId?' active':''), item.label);
    b.type = 'button';
    b.addEventListener('click', ()=> onPick(item.id));
    container.appendChild(b);
  });
}

function renderProblemaChoices(){
  renderChoices(document.getElementById('problema-choices'), PROBLEMI, state.problema, id=>{
    state.problema = id;
    const def = PROBLEMI.find(p=>p.id===id);
    if(!def.needsFase) state.fase = def.fase || null;
    else if(!state.fase) state.fase = 'ingresso';
    saveState(); render();
  });
}
function renderFaseChoices(){
  renderChoices(document.getElementById('fase-choices'), FASI, state.fase, id=>{
    state.fase = id; saveState(); render();
  });
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
  sel.addEventListener('change', ()=>{ state.pista = sel.value; saveState(); render(); });
}
function renderAutoSelect(){
  const sel = document.getElementById('auto-select');
  sel.innerHTML = '';
  sel.appendChild(new Option('Non specificata',''));
  const og1 = document.createElement('optgroup'); og1.label = 'Auto specifiche';
  DATA.auto.note_specifiche.forEach(a=> og1.appendChild(new Option(a.auto, a.auto)));
  sel.appendChild(og1);
  const og2 = document.createElement('optgroup'); og2.label = 'Solo layout (generico)';
  og2.appendChild(new Option('Motore anteriore (generico)', '__layout_anteriore__'));
  og2.appendChild(new Option('Motore centrale (generico)', '__layout_centrale__'));
  og2.appendChild(new Option('Motore posteriore (generico)', '__layout_posteriore__'));
  sel.appendChild(og2);
  sel.value = state.auto || '';
  sel.addEventListener('change', ()=>{ state.auto = sel.value; saveState(); render(); });
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

function getBaseAzioni(){
  const def = PROBLEMI.find(p=>p.id===state.problema);
  if(!def) return { azioni:[], sintomo:null };
  if(def.curveLente){
    return { azioni: DATA.curve_lente[def.curveLente].azioni, sintomo:null };
  }
  const faseObj = DATA.fasi_curva.find(f=>f.fase===state.fase);
  if(!faseObj) return { azioni:[], sintomo:def.sintomo };
  const probObj = faseObj.problemi.find(p=>p.sintomo===def.sintomo);
  return { azioni: probObj ? probObj.azioni : [], sintomo: def.sintomo };
}

function computeAdjusted(azione, sintomo){
  const pista = state.pista ? DATA.piste.find(p=>p.nome===state.pista) : null;
  const autoInfo = getAutoInfo(state.auto);
  let score = azione.priorita;
  let levelShift = 0;
  const notes = [];

  if(pista){
    if(azione.regime==='aero'){
      if(pista.profilo_aero==='alto'){ score -= 0.4; notes.push('pista ad alto carico aerodinamico: leva prioritaria qui'); }
      if(pista.profilo_aero==='basso'){ score += 0.6; }
    }
    if(azione.regime==='meccanico'){
      if(pista.profilo_aero==='basso'){ score -= 0.2; }
      if(pista.superficie==='cordoli_aggressivi' && /bump|corsa_sospensione|ride_height/.test(azione.parametro)){
        score -= 0.4; notes.push('pista con cordoli aggressivi: sospensione prioritaria');
      }
    }
  }

  if(autoInfo && sintomo && (sintomo==='sottosterzo' || sintomo==='sovrasterzo')){
    if(isNaturalTendency(state.fase, sintomo, autoInfo.layout)){
      levelShift -= 1;
      notes.push("carattere naturale di un'auto a motore " + autoInfo.layout);
    }
  }

  if(state.preferenza && state.preferenza!=='neutro' && sintomo && (sintomo==='sottosterzo' || sintomo==='sovrasterzo')){
    const vuoleSovrasterzo = state.preferenza==='sovrasterzante';
    if(sintomo==='sottosterzo'){
      if(vuoleSovrasterzo){ levelShift += 1; notes.push('spinge verso la tua preferenza di guida'); }
      else { levelShift -= 1; notes.push('in linea con la tua preferenza di guida'); }
    } else {
      if(vuoleSovrasterzo){ levelShift -= 1; notes.push('in linea con la tua preferenza di guida'); }
      else { levelShift += 1; notes.push('spinge verso la tua preferenza di guida'); }
    }
  }

  const baseIdx = LIVELLI.indexOf(azione.percentuale_regolazione);
  const rawIdx = baseIdx + levelShift;
  const newIdx = Math.min(2, Math.max(0, rawIdx));
  const facoltativa = rawIdx < 0;

  return {
    score,
    percentuale: LIVELLI[newIdx],
    percentualeOriginale: LIVELLI[baseIdx],
    cambiata: newIdx !== baseIdx,
    facoltativa,
    notes
  };
}

function getTierInfo(){
  return {
    1: { title:'Bilanciamento meccanico', desc:DATA.meta.priorita["1"] },
    2: { title:'Bilanciamento aerodinamico', desc:DATA.meta.priorita["2"] },
    3: { title:'Frenata, differenziale, elettronica', desc:DATA.meta.priorita["3"] },
    4: { title:'Rifinitura', desc:DATA.meta.priorita["4"] }
  };
}

function renderResults(){
  const empty = document.getElementById('results-empty');
  const content = document.getElementById('results-content');
  if(!state.problema){
    empty.style.display='block'; content.style.display='none'; return;
  }
  const { azioni, sintomo } = getBaseAzioni();
  if(!azioni.length){
    empty.style.display='block'; content.style.display='none';
    empty.textContent = "Nessun dato disponibile per questa combinazione. Prova un'altra fase.";
    return;
  }
  empty.style.display='none'; content.style.display='block';

  const computed = azioni.map(a=> Object.assign({}, a, computeAdjusted(a, sintomo)));
  computed.sort((a,b)=> a.score - b.score);

  const tiers = {1:[],2:[],3:[],4:[]};
  computed.forEach(a=> tiers[a.priorita].push(a));
  const TIER_INFO = getTierInfo();

  let html = '';

  const chips = [];
  if(state.pista) chips.push(state.pista);
  const autoInfo = getAutoInfo(state.auto);
  if(autoInfo) chips.push(autoInfo.nome || ('Motore ' + autoInfo.layout));
  if(state.preferenza && state.preferenza!=='neutro') chips.push('Preferenza: ' + state.preferenza);
  if(chips.length){
    html += '<div class="context-chips">' + chips.map(c=>'<span class="chip">'+escapeHtml(c)+'</span>').join('') + '</div>';
  }

  html += '<div class="principio"><b>Prima di intervenire:</b> ' + escapeHtml(DATA.meta.principio_diagnosi) + '</div>';

  [1,2,3,4].forEach(t=>{
    if(!tiers[t].length) return;
    html += '<div class="tier"><h3 class="tier-title">'+TIER_INFO[t].title+'</h3><p class="tier-desc">'+escapeHtml(TIER_INFO[t].desc)+'</p>';
    tiers[t].forEach(a=>{
      html += '<div class="azione'+(a.facoltativa?' facoltativa':'')+'">';
      html += '  <div class="azione-main">';
      html += '    <div class="azione-testo">'+escapeHtml(a.testo)+'</div>';
      html += '    <div class="azione-meta">';
      html += '      <span class="tag">'+escapeHtml(a.parametro)+'</span>';
      if(sintomo==='sottosterzo' || sintomo==='sovrasterzo'){
        html += '      <span class="tag sym-'+sintomo+'">'+sintomo+'</span>';
      }
      html += '    </div>';
      if(a.notes.length){
        html += '    <div class="azione-note">'+escapeHtml(a.notes.join(' · '))+'</div>';
      }
      html += '  </div>';
      html += '  <div class="azione-perc">';
      if(a.cambiata){ html += '<span class="perc-old">'+a.percentualeOriginale+'</span>'; }
      html += '<span class="perc-'+a.percentuale+'">'+a.percentuale+'</span>';
      html += '  </div>';
      html += '</div>';
    });
    html += '</div>';
  });

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

function updateFaseVisibility(){
  const def = PROBLEMI.find(p=>p.id===state.problema);
  const step = document.getElementById('fase-step');
  if(def && def.needsFase){ step.classList.add('visible'); }
  else { step.classList.remove('visible'); }
}

function render(){
  renderProblemaChoices();
  updateFaseVisibility();
  renderFaseChoices();
  renderPreferenzaChoices();
  renderResults();
}

function init(){
  loadState();
  renderPistaSelect();
  renderAutoSelect();
  renderTyres();
  render();
  document.getElementById('show-btn').addEventListener('click', renderResults);
}

fetch('data/acc-setup-data.json')
  .then(r => {
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(json => { DATA = json; init(); })
  .catch(err => {
    document.getElementById('results-empty').textContent = 'Errore nel caricamento del dataset (' + err.message + '). Se stai aprendo il file direttamente dal filesystem, avvia un server statico locale invece di aprire index.html col doppio click.';
  });
