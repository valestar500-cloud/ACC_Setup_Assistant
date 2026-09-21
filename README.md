# 🏁 Assetto Setup — Assistente ACC

Uno strumento diagnostico per il setup in **Assetto Corsa Competizione**: indichi cosa fa la macchina (sottosterzo, sovrasterzo, wheelspin, instabilità...), su che pista, con quale auto e con che stile di guida, e ottieni una lista di azioni di setup ordinate per priorità — invece delle solite liste statiche "se sottosterza, fai X".

**[→ Prova la demo](#)** https://valestar500-cloud.github.io/ACC_Setup_Assistant/

## Perché l'ho creato

Le guide di setup che si trovano online sono quasi sempre elenchi piatti: "se sottosterzi in ingresso, fai queste 5 cose", senza contesto su quale sia la più efficace, se abbia senso applicarla su quella pista o con quell'auto, o se convenga invece semplicemente adattare la guida. Questo progetto è un tentativo di trasformare quel tipo di conoscenza in un dataset strutturato e in un piccolo motore di regole che tiene conto di più variabili insieme.

## Come funziona

Tutta la conoscenza vive in [`data/acc-setup-data.json`](data/acc-setup-data.json): azioni di setup organizzate per fase della curva (ingresso/apex/uscita) e sintomo, ciascuna con una priorità (meccanico → aerodinamico → frenata/differenziale → rifinitura), un regime (meccanico/aerodinamico/trasversale) e un livello di intervento consigliato (lieve/media/decisa).

Il motore in [`script.js`](script.js) combina quell'azione base con tre livelli di contesto, senza duplicare dati:

- **Pista** — profilo aerodinamico e tipo di superficie spostano il peso tra azioni meccaniche e aerodinamiche.
- **Auto** — la tendenza naturale del layout del motore (anteriore/centrale/posteriore) alza o abbassa l'urgenza di un'azione se coincide col comportamento tipico dell'auto.
- **Preferenza di guida** — se preferisci un'auto più sovrasterzante o sottosterzante, l'intensità del consiglio si adatta di conseguenza.

Prima di mostrare le azioni, il tool ricorda sempre un principio: se il problema si presenta in una sola curva e non sistematicamente, spesso conviene adattare la guida invece di toccare l'assetto.

## Stack

HTML, CSS e JavaScript senza framework né build step — solo Google Fonts come dipendenza esterna. Il dataset è caricato via `fetch` da un file JSON separato, così i dati restano indipendenti dalla UI.

## Eseguirlo in locale

Serve un piccolo server statico (il `fetch` del JSON non funziona aprendo `index.html` col doppio click):

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Roadmap

- [ ] Motore di ricerca a parole chiave per domande libere sopra lo stesso dataset
- [ ] Espansione gradiale di piste e auto coperte
- [ ] Validazione di priorità e percentuali con test reali in pista

## Nota

Progetto amatoriale personale, non affiliato a Kunos Simulazioni. Priorità e percentuali sono stime di buon senso basate su principi generali di setup, da validare con test reali — non sono dati telemetrici ufficiali.

## Licenza

MIT — vedi [LICENSE](LICENSE).
