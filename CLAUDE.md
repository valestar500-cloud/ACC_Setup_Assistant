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
- `data/acc-auto-valori.json` — **bozza in compilazione** (non ancora letta dall'app): per ognuna delle 29 auto del dataset più la Lexus, per ogni parametro (nomi come sotto, per asse) `osservato_min`/`osservato_max` e `indici_distinti` ricavati dai setup pubblicati in github.com/Lon3035/ACC_Setups (indici = click del gioco, range solo **osservato**). Dove `compilato: true` (Ferrari 296, BMW M4 GT3, Audi R8 LMS EVO II, Porsche 992 GT3 R, compilate da Vale con i range del suo ACC, circa 1.9.5, più i valori comuni a tutte le GT3 o a tutte le auto: pressioni, precarico, potenza freni, pastiglie, brake duct) `indice_min`/`indice_max` sono il range **reale** dichiarato, con `unita` (`null` = senza unità, passo 1), `valore_a_indice_min`/`valore_a_indice_max` e `passo` (valore per click; `passo_assunto: true` se dedotto e non dichiarato, oggi nessuno; pressione 0,1 psi e precarico 10 Nm (28 click, coerenti con i setup) sono dichiarati; le molle hanno il passo arrotondato per difetto). **I dati di Vale si prendono per veri**: `incongruenza` segnala dove contraddicono i setup osservati o i conti, senza cambiare il valore (oggi: caster Ferrari e Porsche con passo 0,3 non divisibile e con indici osservati più alti, caster BMW 40 > 39, toe posteriore Ferrari 0-0,31 con indici osservati fino a 55, ammortizzatori veloci BMW 0-40 con indici osservati fino a 49 forse per le patch successive). `non_disponibile` = parametro assente su quel modello (tc2 BMW: nei setup compare comunque `tC2: 0`, indistinguibile da "spento"). Con `compilato: false` `indice_min`/`indice_max` restano quelli osservati. Mappa motore: indice 0 = mappa 1 (Porsche ancora da definire). Lo script che l'ha generata e la repo clonata non sono nel repository.
- `assets/` — loghi delle marche (`*.svg`/`*.png`) e `maschere/` (sagome ricavate dai loghi che non funzionano come maschera); `piste/<pista>/` (per ogni scheda pista: `sfondo.jpg`, `tracciato.svg` ); `bandiere/` (bandiere delle schede pista).

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

**Regole legate al carico aerodinamico della pista** (blocchi in cima al JSON, agiscono solo sulle priorità, mai sulle quantità):

- `regola_aero_pista` (`applicaRegolaAeroPista`): l'azione sull'ala che AGGIUNGE carico scende di un livello sulle piste a basso carico (`aero_livello` ≤ 2), quella che lo TOGLIE scende sulle piste ad alto carico (≥ 4).
- `regola_bumpstop_range_post_aero` (`applicaRegolaBumpstopAero`): con ala scarica (`aero_livello` ≤ 2) il bumpstop range posteriore serve alla stabilità. Sovrasterzo: l'azione che lo aumenta sale di una priorità (minimo 1) con nota breve. Sottosterzo: l'azione che lo riduce non sta sopra la priorità 2. Vale solo per le fasi elencate (`fasi`: oggi solo `uscita`, l'unica in cui l'azione `bump_stop_range_post` esiste), per i layout con `true` in `layout` (centrale e posteriore sì, **anteriore no**: Vale ha detto che vale "molto meno" ma non ha dato un valore) e solo con un'auto scelta. Piste ad alto carico: nessuna modifica. **Origine**: osservazione di Vale, non confermata dai dati della repo ACC_Setups (nessuna correlazione netta ala/range posteriore; vedi "Da fare") né da fonti online.
- Le note di superficie su ARB e ride height in `computeAdjusted` ("barre più morbide…", "ride height aumentata"…) compaiono solo se dicono la stessa cosa del consiglio (`direzione`); lo spostamento di score che le accompagna invece no. Per le molle non esistono note di questo tipo.
- `meta.principio_diagnosi` (banner "Prima di intervenire") dice anche che correggere una fase con un parametro può peggiorarne un'altra.

**`azioni_extra_velocita`** (dentro un problema di `fasi_curva`): azioni che entrano solo con una certa velocità di curva. Chiavi `bassa`, `alta` e `""` (stringa vuota = nessuna curva selezionata). Serve quando un parametro appare solo in certi contesti (es. ala posteriore e caster solo in curva veloce).

**Sottocasi**: `sottocasi[chiave][caso] = { label, azioni, priorita_parametri, [tecnica_guida: [...]], [spiegazione: "..."], [redirect: { testo, pulsante, problema, fase }] }`. `tecnica_guida` appare come riquadro con elenco prima dei consigli; `spiegazione` come paragrafo; `redirect` sostituisce i consigli con un messaggio e un pulsante che porta a un altro problema conservando auto/pista/preferenza.

**Auto**: `auto.note_specifiche[] = { auto, categoria (GT2|GT3|GT4), layout (anteriore|centrale|posteriore), aspirazione, nota, parametri_non_disponibili[], avvertenze[] }`.

- `parametri_non_disponibili` nasconde del tutto quel consiglio per quella macchina. `auto.non_disponibili_categoria` vale per l'intera categoria (GT2: `abs`).
- `avvertenze[]`: `{ quando, tipo, testo, parametri? }` con tipo `evita` / `verifica_prima` / `enfatizza` / `facoltativa`.
- Non esiste un "disponibile solo per questa auto": `splitter_ant` esiste solo sulla Mercedes-AMG GT3 EVO ed è escluso da tutte le altre.
- `auto.layout_motore.<layout>.priorita_azioni`: regole per layout motore (es. quantità del bumpstop range posteriore: media sulle anteriori, lieve sulle altre).

**Piste**: `{ nome, profilo_aero, superficie, mix_curve_dominante, usura_gomme, curve_direzione, senso_marcia, curve_sinistra, curve_destra, aero_livello, note, consigli_base[] }`. I quattro campi nuovi (dal foglio dati di Vale, fonti U/S/E in `meta.note_nuovi_campi_piste`): `aero_livello` 1-5 = quanto la pista chiede carico aerodinamico, uguale per GT2/GT3/GT4 (si mostra con 5 barrette nella scheda); `curve_sinistra`/`curve_destra` = numero di curve per lato (pillola "sinistra/destra"); `senso_marcia` (orario/antiorario) è solo nei dati, non ancora mostrato. Il motore usa ancora `profilo_aero` e `curve_direzione`: non sono ricalcolati dai campi nuovi. `consigli_base` produce la pillola "Consigliato: …" (oggi solo `{parametro:"assetto", valore:"più morbido"}` sulle 12 piste con cordoli aggressivi; le altre l'hanno vuoto).

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
- File in `assets/`: per ogni pista `assets/piste/<slug>/sfondo.jpg` (1280×720, ~150 KB) e `tracciato.svg` (sagoma bianca vettoriale). I file di partenza caricati a mano non si tengono nel repository (restano nella cronologia di git); lo slug è il nome della pista in minuscolo, senza accenti e con i trattini (`spa-francorchamps`). Le bandiere stanno a parte in `assets/bandiere/` (`spagna.png`, `regno-unito.svg` — contiene la Union Jack —, `ungheria.svg`, `usa.webp`, `germania.svg`, `sudafrica.svg`, `australia.webp`, `francia.webp`, `austria.webp`, `giappone.svg`, `olanda.svg`): in `INTERFACCE_PISTA` la bandiera è un array di 3 colori (strisce verticali: Italia, Belgio) oppure il percorso di un file in `assets/bandiere/`. `scuro` (0-0.5) è un velo extra sulle foto chiare perché il testo bianco si legga (Silverstone .22, Brands Hatch .22, Barcellona .2, Donington .2, Spa .08, Hungaroring .1, COTA .1, Imola .1, Kyalami .1, Laguna Seca .25, Indianapolis .2, Misano .15, Mount Panorama .15, Nürburgring GP .15, Paul Ricard .1, Oulton Park .2, Snetterton .15, Red Bull Ring 0, Suzuka .1, Valencia .15, Watkins Glen .12, Zandvoort .1, Zolder .1, Monza 0). `posizione` (opzionale) sposta la foto nella scheda (`--pista-pos`, default center): quella del Red Bull Ring è verticale, ritagliata in 3:2 attorno al toro e allineata a destra; Watkins Glen usa `left center` per tenere in vista la rete a sinistra. I tracciati di Suzuka, Valencia, Zandvoort e Zolder sono stati vettorializzati da immagini a bassa risoluzione (~400 px): vanno bene nel riquadro 170×104, ma se servono più grandi vanno rifatti dagli originali.
- **Pallino sul tracciato**: ogni `tracciato.svg` contiene, oltre alla linea bianca, un gruppo `.pallino` (due cerchi, pallino + alone) che segue un `<path id="percorso">` (linea centrale dello scheletro del tracciato, ricavata con skeletonize, ordinata e orientata col `senso_marcia` dei dati) con `animateMotion` SMIL: `dur` = secondi per giro (velocità costante ~95 px/s sullo schermo, quindi dur diverso per pista), `repeatCount` = 3 giri, `begin` = 0,9 s; il `dur` dell'elemento `<set>` deve essere dur×giri. `viewBox` allargato di 3 px per non tagliare il pallino. Con `prefers-reduced-motion` il pallino non compare. In `script.js` l'opzione `pallino: true` aggiunge `?giro=<ora>` all'immagine per far ripartire l'animazione a ogni selezione. Se si rifà un tracciato va rigenerato anche il pallino (gli strumenti non sono nel repository). Suzuka (incrocio a 8), Monza e Nürburgring 24h hanno giunzioni nello scheletro (il percorso le attraversa con una regola "dritto" e si chiude con il cammino più breve): controllare in pagina. Il Nürburgring 24h è disegnato più sottile delle altre piste (~1,5 px apparenti invece di 2,5) perché nella coda (due tratti vicinissimi) uno spessore maggiore unisce le linee e il pallino non trova la strada; il pallino fa avanti e indietro lungo un tratto della coda. I tracciati di Suzuka, Oulton Park, Donington Park e Nürburgring 24h sono stati rifatti dalle immagini pulite caricate da Vale (i gap della linea del via sono stati chiusi con un ponte tra gli estremi).
- **Procedura tracciato** (stile coerente): tenere solo il contorno principale (via bandierine, frecce, linee sottili dei box), ispessire fino a ~2,5 px apparenti nel riquadro 170×104 (misurati: Monza 2,27; Spa 2,75; Silverstone 2,49; Barcellona 2,57) e vettorializzare in SVG bianco `evenodd`. `.pc-tracciato` ha `max-height:104px`.
- Piste con scheda: Monza, Spa-Francorchamps, Silverstone, Barcelona-Catalunya, Brands Hatch, Donington Park, Hungaroring, Circuit of the Americas, Imola, Kyalami, Laguna Seca, Indianapolis (road course), Misano, Mount Panorama, Nürburgring 24h, Nürburgring GP, Paul Ricard, Red Bull Ring, Oulton Park, Snetterton, Suzuka, Valencia, Watkins Glen, Zandvoort, Zolder: tutte le 25 piste hanno la scheda (la vista normale resta nel codice come ripiego). Il precarico delle immagini avviene a pagina ferma (`requestIdleCallback`).
- Gli strumenti usati per preparare le immagini (Python con pillow, numpy, opencv, resvg-py in un ambiente temporaneo) **non sono nel repository**. L'ambiente di Claude non ha un browser: le modifiche visive vanno provate dall'utente e vanno dichiarate come non verificate.
- Diritti: foto con sponsor/marchi e loghi delle case sono dell'utente da verificare (sito pubblico).

## Schede personalizzate delle auto

- `INTERFACCE_AUTO` in `script.js`: righe `[regex sul nome, { sfondo, scuro?, zoom?, posizione?, bandiera }]`, la **prima che corrisponde vince** (per questo i casi specifici, come `Aston Martin.*GT4` e `Audi R8 LMS GT2`, stanno prima di quelli generici). `zoom` = % di `background-size` (>100; senza il campo la foto è alla grandezza normale), `posizione` = `--pista-pos` (orizzontale e verticale, es. `'30% 62%'`), `scuro` = velo 0-0.5. Foto in `assets/macchine/<marca>/`. Errore tipico: modificare la riga della GT4 invece di quella della GT3 della stessa marca.
- La **Lexus RC F GT3** è selezionabile (GT3, anteriore, aspirato V8 5.4L, `splitter_ant` non disponibile): dati da Lexus (2UR-GSE, oltre 500 CV, circa 1300 kg) e da Coach Dave Academy (punto debole: cordoli). La distribuzione dei pesi non è stata trovata, quindi **non** ha l'avvertenza "50:50" della BMW. Mancano il logo in `LOGHI_MARCHE` e gli altri parametri non regolabili (ABS, TC). Foto: `assets/macchine/Lexus/lexus gt3.jpg`.

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
- Gli strumenti di analisi (script Python sulla repo ACC_Setups) e la repo clonata stanno fuori dal repository (cartella temporanea). L'ambiente di Claude non ha né browser né node: le modifiche a `script.js` di questa sessione (regola bumpstop/ala, note direzionali, scheda Lexus) sono **non verificate in pagina**.
- `bump_stop_range_post` esiste come azione solo in **uscita** (sotto e sovrasterzo); in ingresso e apex è nelle scale ma non nelle azioni, quindi non compare. "Coasting" non è una fase dell'app.

## Da fare / in sospeso

- **Caricamento del setup dell'utente (JSON di ACC) — progetto in corso.** Il file (`Documents\Assetto Corsa Competizione\Setups\<auto>\<pista>\*.json`) contiene `carName` (id interno, es. `lamborghini_huracan_gt3_evo2`, serve una tabella nome interno → nome dell'app), `basicSetup` e `advancedSetup` con **indici di click** per ruota (ordine presumibilmente ant. sx, ant. dx, post. sx, post. dx: da verificare) e pochi valori fisici (`staticCamber` in gradi). Si legge nel browser con `FileReader`, senza caricare nulla su server. Piano: (1) leggere il file e preselezionare auto/pista, mappare i campi sui nostri nomi (nel JSON dei dati, non nel codice); (2) compilare `acc-auto-valori.json` (due estremi fisici per parametro, controllo di linearità con un terzo punto: se i gradini non sono uniformi serve un elenco di valori) e tradurre `lieve/media/decisa` in click o unità reali per auto (soglie da decidere con Vale, es. 1/2/3 click, o proporzione sul range per i parametri con molti click); (3) consigli tangibili: senza file "molle ant.: più morbide di 2 click (circa −30000 N/m)", con file "da 3 click (150000 N/m) a 1 click (123000 N/m)", parametro al limite → si passa al successivo nella scala; (4) opzionale, per ultimo: scaricare il setup corretto. Partire da una sola auto (Ferrari 296) per provare il flusso. Le condizioni (temperatura, bagnato) non sono nel file: restano input dell'utente.
- **Repo ACC_Setups** (github.com/Lon3035/ACC_Setups, pubblica, 1664 setup di 40 auto, anche di piloti forti come Fri3d0lf e OhneSpeed; nel nome del file ci sono sessione Q/R, temperatura, asciutto/bagnato): non copiare i file nel progetto né nel sito (setup di terzi, licenza da controllare). Possibile uso futuro: valori tipici per pista e condizione come secondo livello di consigli. Analisi fatta: nessuna correlazione affidabile tra ala posteriore e bumpstop range posteriore (pendenza mediana +0,66 a parità di pista, 5 auto su 12 nel verso atteso; il campione è sbilanciato, es. 128 setup su 212 della Huracán hanno ala 12). A Paul Ricard però i piloti scaricano molto l'ala e per 4 auto su 8 il range posteriore è sopra la loro media; a Monza no. Una conferma richiederebbe gli assetti base del gioco.
- **Piste a basso carico**: Paul Ricard è passato da `aero_livello` 3 a 2 (i piloti ci usano un'ala molto scarica). Spa è a 3 ma i piloti ci usano ala molto bassa: da rivedere con Vale. Estendere la regola bumpstop/ala all'apex richiede di creare l'azione e di scegliere direzione e quantità; il layout anteriore ha oggi la regola spenta.
- Sono state tolte da `acc-auto-valori.json` le auto della repo che non sono nel dataset (AMR V12, BMW M2 CS e M6, Ferrari 488 Challenge e 488 GT3 base, Jaguar G3, Gallardo Rex, McLaren 720S GT3 base, Nissan GT-R 2017, Porsche 991 GT3 R e 992 Cup). `porsche_991ii_gt3_r` e `porsche_992_gt3_r` puntano alla stessa voce "Porsche 911 GT3 R (991/992)": separarle se i range differiscono. `bump_stop_rebound_*` (da `bumpStopRateDn`) ha un nome provvisorio.
- Analisi avanzata gomme per le **Wet**: oggi mostra solo un messaggio di non disponibilità; la logica va ancora definita.
- **GT4**: solo la Maserati ha parametri non regolabili (ABS, TC); per le altre vanno indicati dall'utente. Idem la **Lamborghini Huracán Super Trofeo EVO2** (GT2) e le **GT3** (nessuna esclusione per singola auto).
- **Sovrasterzo**: manca ancora la durezza bumpstop (`bump_stop_ant`, `bump_stop_post`).
- **Gomme avanzate**: interna dominante + gomma troppo fredda crea un conflitto sul toe (la distribuzione dice di ridurlo, la temperatura assoluta di aumentarlo); oggi restano due blocchi separati.
- Nelle sezioni su cordoli può comparire anche la nota automatica "pista con cordoli aggressivi: sospensione prioritaria" (in `computeAdjusted`), ridondante lì.
- Piste: i consigli di base esistono solo per i cordoli aggressivi; per le piste lisce (Barcelona, Misano, Paul Ricard) serve ancora la verifica in pista.
- Lo sfondo di Monza (`assets/piste/monza/sfondo.jpg`) è provvisorio: ricavato dal mockup cancellando testo e disegni; sostituire con la foto originale senza scritte. Le sottocartelle `originali/` (compreso il mockup `assets/piste/monza/originali/interfaccia-monza.png`) e i loghi sostituiti da sagome (`bmw-791.svg`, `aston-martin.svg`, `bentley-logo.svg`, `ginetta.png`, `ktm.png`, `lamborghini.svg`, `ferrari.svg`) non sono usati dal sito.
- La bandiera di Silverstone (`assets/bandiere/regno-unito.svg`, caricata come "inghilterra") è la Union Jack, non la croce di San Giorgio.
- Idee discusse e non confermate: sezione "auto nervosa/imprecisa allo sterzo"; "ruota interna che si solleva in curva lenta".
