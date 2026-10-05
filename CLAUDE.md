# Assetto Setup — contesto del progetto

App web statica (HTML + CSS + JavaScript, nessun framework, nessun build step) che aiuta a diagnosticare e correggere l'assetto in **Assetto Corsa Competizione (ACC)**. Tutto il testo mostrato all'utente è **in italiano**.

## Avvio in locale

Serve un server statico, perché `script.js` carica il JSON con `fetch` (il doppio click su `index.html` non funziona):

```
python -m http.server 8000
```

poi apri http://localhost:8000 (su Windows il comando può essere `py -m http.server 8000`).

## File

- `index.html` — struttura della pagina (i passi del wizard).
- `style.css` — stile "liquid glass", tema scuro automatico.
- `script.js` — tutta la logica: stato, rendering, motore dei consigli.
- `Data/acc-setup-data.json` — **tutta la conoscenza** (consigli, piste, auto, gomme). Quasi ogni modifica di contenuto si fa qui, senza toccare il codice. Il file deve restare JSON valido.

Lo stato scelto dall'utente viene salvato nel browser (`localStorage`, chiave `acc-setup-state`).

## Modello dei dati

**Problemi** (`PROBLEMI` in `script.js`): sei.
- `sottosterzo_curva`, `sovrasterzo_curva` — usano `fasi_curva` (fase ingresso/apex/uscita) più la velocità di curva (lenta/veloce, soglia 145 km/h).
- `instabilita_frenata`, `instabile_sui_cordoli`, `fatica_cambio_direzione` — usano `sottocasi`: una domanda con 3-5 risposte. Attenzione: l'id `fatica_cambio_direzione` è storico, l'etichetta visibile è "Problemi a cambiare direzione" e la chiave dei dati è `sottocasi.cambio_direzione`.
- `temperatura_gomme` — modalità base e analisi avanzata (solo slick).

**Azione** (l'unità di consiglio):
`{ id, parametro, direzione, testo, regime, priorita, percentuale_regolazione }`
- `direzione`: `aumenta` / `riduci` (per i casi particolari altri valori, usati solo come informazione: ciò che l'utente legge è `testo`).
- `regime`: `meccanico` / `aero` / `trasversale`; `priorita` (1-4) è la categoria di base, usata solo come ripiego quando non esiste una scala di priorità.
- `percentuale_regolazione`: `lieve` / `media` / `decisa`.
- Opzionali: `facoltativa_default` + `facoltativa_nota` (riga grigia "facoltativo" con spiegazione; usata per gli ammortizzatori lenti, che contano solo in transitorio), `nota_informativa` (nota grigia senza rendere l'azione facoltativa), `quantita_fissa` (la quantità non viene ridotta dal carattere dell'auto), `senza_percentuale` (voce di sola tecnica di guida, senza quantità né tag; il suo `parametro` è un segnaposto `__tecnica_...`).

**Nomi dei parametri**: suffisso `_ant` / `_post` per asse (`arb_ant`, `molle_post`, `bump_lento_ant`, `rebound_lento_post`…). La versione senza suffisso significa "sull'asse coinvolto" (`molle`, `bump_stop`, `bump_stop_range`, `ride_height`, `bump_veloce`, `rebound_veloce`). Convenzioni di vocabolario: `bump_stop_range_*` = bumpstop **range** (corsa), `bump_stop_*` = **durezza**/rate del bumpstop, `bump_lento_*`/`rebound_lento_*` = slow, `bump_veloce*`/`rebound_veloce*` = fast. Altri: `caster_ant`, `splitter_ant`, `ala_post`, `rake`, `toe_post`, `camber_ant`, `precarico_differenziale`, `brake_bias`, `abs`.

**Priorità e triangoli colorati**. I consigli sono raggruppati in "Priorità 1-4"; triangolo rosso/arancione/giallo per 1-3, nessun simbolo per la 4. La scala viene scelta in quest'ordine:
1. `meta.priorita_velocita_curva[sintomo][fase][bassa|alta]` — livelli con parametri `{parametro, percentuale}`: la quantità qui **sostituisce** quella base dell'azione. Ha la precedenza.
2. `fasi_curva[fase].problemi[sintomo].priorita_parametri` — livelli con semplici nomi di parametro.
3. `sottocasi[chiave][caso].priorita_parametri`.

Un parametro non elencato nella scala finisce a priorità 4. Se non esiste alcuna scala, il motore ripiega sul vecchio raggruppamento per categoria (campi `priorita` e `regime`).

**`azioni_extra_velocita`** (dentro un problema di `fasi_curva`): azioni che entrano solo con una certa velocità di curva. Chiavi `bassa`, `alta` e `""` (stringa vuota = nessuna curva selezionata). Serve quando un parametro appare solo in certi contesti (es. ala posteriore e caster solo in curva veloce).

**Sottocasi**: `sottocasi[chiave][caso] = { label, azioni, priorita_parametri, [tecnica_guida: [...]], [spiegazione: "..."], [redirect: { testo, pulsante, problema, fase }] }`. `tecnica_guida` appare come riquadro con elenco prima dei consigli; `spiegazione` come paragrafo; `redirect` sostituisce i consigli con un messaggio e un pulsante che porta a un altro problema conservando auto/pista/preferenza.

**Auto**: `auto.note_specifiche[] = { auto, categoria (GT2|GT3|GT4), layout (anteriore|centrale|posteriore), aspirazione, nota, parametri_non_disponibili[], avvertenze[] }`.
- `parametri_non_disponibili` nasconde del tutto quel consiglio per quella macchina. `auto.non_disponibili_categoria` vale per l'intera categoria (GT2: `abs`).
- `avvertenze[]`: `{ quando, tipo, testo, parametri? }` con tipo `evita` / `verifica_prima` / `enfatizza` / `facoltativa`.
- Non esiste un "disponibile solo per questa auto": `splitter_ant` esiste solo sulla Mercedes-AMG GT3 EVO ed è escluso da tutte le altre.
- `auto.layout_motore.<layout>.priorita_azioni`: regole per layout motore (es. quantità del bumpstop range posteriore: media sulle anteriori, lieve sulle altre).

**Piste**: `{ nome, profilo_aero, superficie, mix_curve_dominante, usura_gomme, curve_direzione, note, consigli_base[] }`. `consigli_base` produce il badge "Consigliato: …" (oggi solo "molle più morbide" sulle piste con cordoli aggressivi).

**Gomme avanzate**: `temperatura_gomme_avanzata` (soglie e testi) + `diagnosiZonaGomma` e `renderResultsGommeAvanzate` in `script.js`. Pressione e toe sono per singola ruota; il brake duct viene accorpato per asse ed è mostrato solo se entrambe le ruote dell'asse hanno la stessa tendenza.

## Come si lavora su questo progetto

- Chi sviluppa (Vale) dà priorità, quantità e direzioni, spesso come tabelle P1-P4. Non inventare valori: se qualcosa non è chiaro o sembra contraddittorio, **chiedere** prima di scrivere.
- Prima di scrivere nei dati un'affermazione tecnica (fisica dell'assetto, caratteristiche di un'auto o di una pista), verificarla su fonti affidabili.
- Riusare i nomi di parametro e di vocabolario già presenti nel dataset; non complicare lo schema se un meccanismo esistente basta.
- Dopo ogni modifica verificare che il JSON sia valido e provare le combinazioni toccate (e quelle vicine, per le regressioni).

## Cose da sapere (trappole)

- `render()` azzera `showResults`: dopo ogni cambio di selezione l'utente deve premere "Mostra i consigli". Gli input O/M/I delle gomme chiamano invece `renderResults()` direttamente, per aggiornare dal vivo.
- La quantità mostrata può scendere di un livello per il "carattere naturale" del layout motore o spostarsi con la preferenza di guida, salvo protezioni (regola di layout, scala di velocità, `quantita_fissa`).
- `escapeHtml` trasforma gli apostrofi in `&#39;`: se si cerca testo nell'HTML generato, tenerne conto.
- Residui non usati: `curve_lente` è vuoto (il ramo `def.curveLente` in `getBaseAzioni` non serve più) e `meta.priorita_problema` è vecchio.

## Da fare / in sospeso

- Analisi avanzata gomme per le **Wet**: oggi mostra solo un messaggio di non disponibilità; la logica va ancora definita.
- **GT4**: solo la Maserati ha parametri non regolabili (ABS, TC); per le altre vanno indicati dall'utente. Idem la **Lamborghini Huracán Super Trofeo EVO2** (GT2) e le **GT3** (nessuna esclusione per singola auto).
- **Sovrasterzo**: manca ancora la durezza bumpstop (`bump_stop_ant`, `bump_stop_post`).
- **Gomme avanzate**: interna dominante + gomma troppo fredda crea un conflitto sul toe (la distribuzione dice di ridurlo, la temperatura assoluta di aumentarlo); oggi restano due blocchi separati.
- Nelle sezioni su cordoli può comparire anche la nota automatica "pista con cordoli aggressivi: sospensione prioritaria" (in `computeAdjusted`), ridondante lì.
- Piste: i consigli di base esistono solo per i cordoli aggressivi; per le piste lisce (Barcelona, Misano, Paul Ricard) serve ancora la verifica in pista.
- Idee discusse e non confermate: sezione "auto nervosa/imprecisa allo sterzo"; "ruota interna che si solleva in curva lenta".
