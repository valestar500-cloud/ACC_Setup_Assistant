# Assetto Setup — contesto del progetto

App web statica (HTML + CSS + JavaScript, nessun framework, nessun build step) che aiuta a diagnosticare e correggere l'assetto in **Assetto Corsa Competizione (ACC)**. Tutto il testo mostrato all'utente è **in italiano**.

## Avvio in locale

Serve un server statico, perché `script.js` carica il JSON con `fetch` (il doppio click su `index.html` non funziona):

```
python serve.py
```

poi apri http://localhost:8000 (su Windows il comando può essere `py serve.py`). `serve.py` è un server statico che non fa mettere i file in cache al browser, così ogni F5 mostra l'ultima versione; `python -m http.server 8000` funziona uguale ma il browser può tenere vecchie copie di CSS e JS (in quel caso ricarica con Ctrl+Shift+R).

## File

- `index.html` — struttura della pagina (i passi del wizard).
- `style.css` — stile "liquid glass", tema scuro automatico, animazioni.
- `script.js` — tutta la logica: stato, rendering, motore dei consigli, animazioni, loghi, schede delle piste.
- `data/acc-setup-data.json` — **tutta la conoscenza** (consigli, piste, auto, gomme). Quasi ogni modifica di contenuto si fa qui, senza toccare il codice. Il file deve restare JSON valido.
- `serve.py` — server locale senza cache (vedi sopra).
- `assets/` — loghi delle marche (`*.svg`/`*.png`) e `maschere/` (sagome ricavate dai loghi che non funzionano come maschera); `piste/<pista>/` (per ogni scheda pista: `sfondo.jpg`, `tracciato.svg` e una sottocartella `originali/` con i file caricati a mano, non usati dal sito); `bandiere/` (bandiere delle schede pista).

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

**Piste**: `{ nome, profilo_aero, superficie, mix_curve_dominante, usura_gomme, curve_direzione, note, consigli_base[] }`. `consigli_base` produce la pillola "Consigliato: …" (oggi solo `{parametro:"assetto", valore:"più morbido"}` sulle 12 piste con cordoli aggressivi; le altre l'hanno vuoto).

**Gomme avanzate**: `temperatura_gomme_avanzata` (soglie e testi) + `diagnosiZonaGomma` e `renderResultsGommeAvanzate` in `script.js`. Pressione e toe sono per singola ruota; il brake duct viene accorpato per asse ed è mostrato solo se entrambe le ruote dell'asse hanno la stessa tendenza.

## Interfaccia: colori, raggi, animazioni

- **Colori** (cima di `style.css`): `--accent` grafite (tema chiaro) / argento (scuro). `--luce` e `--luce-text` sono il colore dei bagliori (bottone attivo, "Mostra i consigli", bordo dei consigli): si cambiano solo lì. `--ok` è un verde fisso (gomma "ottima", riquadro "Tecnica di guida"). Rosso/arancione/giallo sono riservati alle priorità e a sotto/sovrasterzo: non usarli come accento.
- **Raggi**: `--radius` 20px (sezioni grandi, schede) e `--radius-sm` 12px (bottoni, riquadri). Si è provata una scala "stile iPhone" (raggi concentrici + `corner-shape: squircle`): su PC risultava meno tonda ed è stata annullata. Se si riprova: solo archi di cerchio, senza squircle.
- **Velocità**: ogni tempo passa da `--slow` (1.25, cioè +25%) in CSS e dalla costante `SLOW` in `script.js`: tenerli uguali. Tutto rispetta `prefers-reduced-motion`.
- **Bagliore dei bottoni**: un elemento `.choice-glow` per gruppo `.choices` (creato da `getGlow`, posizionato da `placeGlow`) scivola sul bottone `.active`. I bottoni si ricreano a ogni render, il glow no: non spostarlo mai nel DOM (perderebbe le transizioni). Colore per bottone da `data-glow` (Slick giallo, Wet azzurro) → `--glow-c`. Alta/Bassa delle gomme: `renderWheelGlows` con Web Animations (la griglia è ricreata a ogni render).
- **Passi che appaiono**: `.substep` + `.substep-inner` (altezza con grid 0fr→1fr), `setStepVisible`, `markEntering(step, ritardo)` (classe `.entering`, cascata dei bottoni con `--i`), `.collapse` per Slick/Wet (si apre con "Modifiche avanzate"). Chiusura più rapida dell'apertura.
- **Cascata con rimbalzo**: `.rv` (consigli, con ritardo iniziale) e `.dv` (descrizioni di pista/auto, schede pressioni) — `revealResults`, `revealInfo`, `cascadeIn`. Partono solo alla prima comparsa, non negli aggiornamenti dal vivo.
- **"Mostra i consigli"**: `syncResultsGlow` (elemento `.results-glow` dentro `#results`): la luce lascia il bottone, viaggia fino al pannello e diventa un bordo che poi pulsa e si spegne insieme alla fine della cascata; si richiama a fine `render()`, dopo il click e nel redirect. Il bottone diventa "vetro" (`.sent`) finché i consigli sono visibili.
- **"Pressioni e temperature di riferimento"**: cascata all'apertura; alla chiusura il click sul `summary` è intercettato per far uscire prima le schede.
- **Icone in maschera** (colore da `background-color`): variabili `--mask-sole`, `--mask-nuvola`, `--mask-sole-termometro`, `--mask-auto-scivola` per le schede pressioni e i bottoni Slick/Wet. Titoli delle schede pista in Michroma (Google Fonts).
- **Tendine** pista e auto in ordine alfabetico italiano (`ordinaPerNome`: accenti ignorati, numeri come numeri).

## Loghi delle marche (scheda dell'auto)

- `LOGHI_MARCHE` in `script.js`: `[regex sul nome dell'auto, file in assets/, {scala, top}?]`; `mostraLogoMarca` imposta `--logo-marca`, `--logo-scala`, `--logo-top` su `#car-info` (classe `con-logo`). Il logo è una **maschera** (conta solo l'alpha) grigio-trasparente, in alto a destra (`color-mix(var(--text) 18%)`, riquadro standard 88×72). Auto di una marca nuova → una riga in `LOGHI_MARCHE`.
- I loghi con fondo pieno o con colori che come maschera non funzionano hanno una sagoma in `assets/maschere/` (BMW, KTM, Ginetta, Lamborghini, Bentley, Aston Martin, Ferrari), ricavata dal contrasto (scuro = inchiostro; per Lamborghini l'oro). `assets/ktm.png` è in realtà un WebP opaco. Ford usa `mustang.png`.
- `scala`: 0.8 per i loghi che riempiono tutto il riquadro (BMW, Mercedes, Honda, Nissan, Ferrari, Maserati, Ginetta), 1.2-1.3 per quelli con margine vuoto nel file (Mustang, Chevrolet).

## Schede personalizzate delle piste

- `INTERFACCE_PISTA[nome pista] = { sfondo, tracciato, bandiera, scuro? }` in `script.js`; `htmlSchedaPista` costruisce la scheda, che **sostituisce** riquadro info + "Per questa pista" della vista normale (`renderPistaInfo` / `renderPistaHint`). Testi e attributi arrivano dal JSON (nota, aero/curve/superficie/usura, `testoSuggerimentoPista`, pillola da `consigli_base`). Layout unico: bandiera | tracciato / titolo (a tutta larghezza, `--n` = parola più lunga, unità `cqw`) / attributi / nota sbiadita / riquadro "Per questa pista".
- File in `assets/`: per ogni pista `assets/piste/<slug>/sfondo.jpg` (1280×720, ~150 KB) e `tracciato.svg` (sagoma bianca vettoriale), più `originali/` con i file di partenza; lo slug è il nome della pista in minuscolo, senza accenti e con i trattini (`spa-francorchamps`). Le bandiere stanno a parte in `assets/bandiere/` (`spagna.png` leggera + `spagna.svg` originale, `regno-unito.svg` — contiene la Union Jack —, `belgio.webp` solo di riferimento): in `INTERFACCE_PISTA` la bandiera è un array di 3 colori (strisce verticali: Italia, Belgio) oppure il percorso di un file in `assets/bandiere/`. `scuro` (0-0.5) è un velo extra sulle foto chiare perché il testo bianco si legga (Silverstone .22, Barcellona .2, Spa .08, Monza 0).
- **Procedura tracciato** (stile coerente): tenere solo il contorno principale (via bandierine, frecce, linee sottili dei box), ispessire fino a ~2,5 px apparenti nel riquadro 170×104 (misurati: Monza 2,27; Spa 2,75; Silverstone 2,49; Barcellona 2,57) e vettorializzare in SVG bianco `evenodd`. `.pc-tracciato` ha `max-height:104px`.
- Piste con scheda: Monza, Spa-Francorchamps, Silverstone, Barcelona-Catalunya. Le altre 21 usano la vista normale. Il precarico delle immagini avviene a pagina ferma (`requestIdleCallback`).
- Gli strumenti usati per preparare le immagini (Python con pillow, numpy, opencv, resvg-py in un ambiente temporaneo) **non sono nel repository**. L'ambiente di Claude non ha un browser: le modifiche visive vanno provate dall'utente e vanno dichiarate come non verificate.
- Diritti: foto con sponsor/marchi e loghi delle case sono dell'utente da verificare (sito pubblico).

## Branch e pubblicazione

- Gli esperimenti di interfaccia si fanno sul branch `interfaccia` (poi pull request in `main`). GitHub Pages pubblica `main` (modalità "da branch", cartella radice) e ne mostra uno solo alla volta.
- Se la pubblicazione resta "waiting", annullarla e rilanciarla da Actions (il token di Claude non può farlo). I browser tengono in cache CSS/JS: usare `serve.py` in locale, Ctrl+Shift+R online.

## Come si lavora su questo progetto

- Chi sviluppa (Vale) dà priorità, quantità e direzioni, spesso come tabelle P1-P4. Non inventare valori: se qualcosa non è chiaro o sembra contraddittorio, **chiedere** prima di scrivere.
- Prima di scrivere nei dati un'affermazione tecnica (fisica dell'assetto, caratteristiche di un'auto o di una pista), verificarla su fonti affidabili.
- Riusare i nomi di parametro e di vocabolario già presenti nel dataset; non complicare lo schema se un meccanismo esistente basta.
- Dopo ogni modifica verificare che il JSON sia valido e provare le combinazioni toccate (e quelle vicine, per le regressioni).

## Cose da sapere (trappole)

- `render()` azzera `showResults`: dopo ogni cambio di selezione l'utente deve premere "Mostra i consigli". Gli input O/M/I delle gomme chiamano invece `renderResults()` direttamente, per aggiornare dal vivo.
- La quantità mostrata può scendere di un livello per il "carattere naturale" del layout motore o spostarsi con la preferenza di guida, salvo protezioni (regola di layout, scala di velocità, `quantita_fissa`).
- `escapeHtml` trasforma gli apostrofi in `&#39;`: se si cerca testo nell'HTML generato, tenerne conto.
- `renderAutoSelect` aggiunge un nuovo ascoltatore `change` a ogni cambio di categoria (difetto noto, non corretto): le azioni sulla scelta dell'auto girano più volte.
- In `htmlSchedaPista` l'attributo `style` contiene `url('…')` con apici veri: non passarli da `escapeHtml` (diventano `&#39;`).
- Residui non usati: `curve_lente` è vuoto (il ramo `def.curveLente` in `getBaseAzioni` non serve più) e `meta.priorita_problema` è vecchio.

## Da fare / in sospeso

- Analisi avanzata gomme per le **Wet**: oggi mostra solo un messaggio di non disponibilità; la logica va ancora definita.
- **GT4**: solo la Maserati ha parametri non regolabili (ABS, TC); per le altre vanno indicati dall'utente. Idem la **Lamborghini Huracán Super Trofeo EVO2** (GT2) e le **GT3** (nessuna esclusione per singola auto).
- **Sovrasterzo**: manca ancora la durezza bumpstop (`bump_stop_ant`, `bump_stop_post`).
- **Gomme avanzate**: interna dominante + gomma troppo fredda crea un conflitto sul toe (la distribuzione dice di ridurlo, la temperatura assoluta di aumentarlo); oggi restano due blocchi separati.
- Nelle sezioni su cordoli può comparire anche la nota automatica "pista con cordoli aggressivi: sospensione prioritaria" (in `computeAdjusted`), ridondante lì.
- Piste: i consigli di base esistono solo per i cordoli aggressivi; per le piste lisce (Barcelona, Misano, Paul Ricard) serve ancora la verifica in pista.
- **Schede piste**: mancano le altre 21 (servono foto, tracciato e bandiera per ciascuna: Zandvoort, Nürburgring GP e 24h, Brands Hatch, Hungaroring, Misano, Paul Ricard, Zolder, Imola, Red Bull Ring, Valencia, Kyalami, Laguna Seca, Mount Panorama, Suzuka, Circuit of the Americas, Indianapolis, Watkins Glen, Donington, Oulton Park, Snetterton).
- Lo sfondo di Monza (`assets/piste/monza/sfondo.jpg`) è provvisorio: ricavato dal mockup cancellando testo e disegni; sostituire con la foto originale senza scritte. Le sottocartelle `originali/` (compreso il mockup `assets/piste/monza/originali/interfaccia-monza.png`) e i loghi sostituiti da sagome (`bmw-791.svg`, `aston-martin.svg`, `bentley-logo.svg`, `ginetta.png`, `ktm.png`, `lamborghini.svg`, `ferrari.svg`) non sono usati dal sito.
- La bandiera di Silverstone (`assets/bandiere/regno-unito.svg`, caricata come "inghilterra") è la Union Jack, non la croce di San Giorgio.
- Idee discusse e non confermate: sezione "auto nervosa/imprecisa allo sterzo"; "ruota interna che si solleva in curva lenta".
