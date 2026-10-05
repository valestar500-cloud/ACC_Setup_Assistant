# 🏁 Assetto Setup — Assistente ACC

Strumento diagnostico per il setup in **Assetto Corsa Competizione**: indichi cosa fa la macchina, su che pista, con quale auto e con che stile di guida, e ottieni una lista di azioni di setup **ordinate per priorità**, ciascuna con la quantità consigliata (lieve, media, decisa) — invece delle solite liste statiche "se sottosterza, fai X".
---
Live demo:
https://valestar500-cloud.github.io/ACC_Setup_Assistant/
---

## Cosa fa

**Problemi gestiti**
- **Sottosterzo** e **sovrasterzo in curva** — scegli la fase (ingresso, apex, uscita) e, se vuoi, curva lenta o veloce (soglia 145 km/h): ogni combinazione ha la sua lista.
- **Instabilità in frenata** — una domanda, quattro casi (frenata rettilinea, scalate, dossi, quando inizio a sterzare).
- **Instabile sui cordoli** — una domanda, cinque casi (salta, rimbalza, perde l'anteriore, perde il posteriore, tocca il fondo).
- **Problemi a cambiare direzione** — una domanda, tre casi.
- **Temperatura gomme** — modalità base (alta/bassa per ruota) e **analisi avanzata** per le slick: inserisci le tre temperature (O, M, I) di ogni gomma e ottieni diagnosi su distribuzione, temperatura assoluta e brake duct per asse.

**Contesto che cambia i consigli**
- **Piste** (13) — profilo aerodinamico, superficie, mix di curve, usura gomme, con un consiglio di base (es. "Consigliato: molle più morbide" sulle piste con cordoli aggressivi).
- **Auto** (32: 14 GT3, 7 GT2, 11 GT4) — layout del motore, carattere dell'auto, avvertenze specifiche, e **parametri non regolabili** su quella macchina (non vengono mostrati).
- **Preferenza di guida** — sottosterzante, neutro o sovrasterzante.

I consigli usano triangoli di attenzione colorati (rosso, arancione, giallo) per le priorità 1, 2 e 3.

## Come funziona

Tutta la conoscenza vive in [`data/acc-setup-data.json`](data/acc-setup-data.json); il motore in [`script.js`](script.js) la combina con pista, auto, velocità di curva e preferenza di guida. Per i dettagli sullo schema dei dati vedi [`CLAUDE.md`](CLAUDE.md).

HTML, CSS e JavaScript senza framework né build step; l'unica dipendenza esterna sono i Google Fonts.

## Eseguirlo in locale

Serve un piccolo server statico (il caricamento del JSON non funziona aprendo `index.html` col doppio click):

```bash
python -m http.server 8000
# poi apri http://localhost:8000
```

## Pubblicarlo con GitHub Pages

Nel repository: **Settings → Pages → Build and deployment → Deploy from a branch**, scegli il branch `main` e la cartella `/ (root)`. Dopo un minuto il sito è online all'indirizzo mostrato in quella pagina.

## Nota

Progetto amatoriale personale, non affiliato a Kunos Simulazioni. Priorità e quantità sono stime di buon senso basate su principi generali di setup e su prove personali in pista, da validare ulteriormente: non sono dati telemetrici ufficiali.

## Licenza

MIT — vedi [LICENSE](LICENSE).
