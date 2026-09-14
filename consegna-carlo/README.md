# AiCicerone — Demo unificata

Webapp statica mobile-first. Nessun build step, nessuna dipendenza NPM.
Una sola applicazione per tutte le destinazioni: **London** (inglese) e **Sicily** (italiano).

## Contenuto

| File | Cosa è |
|---|---|
| `index.html` | la demo — markup + tutto lo stile |
| `tours-all.js` | **dati**: destinazioni, tour, tappe, coordinate, nomi video, guide, testi chat |
| `i18n.js` | **stringhe UI** nelle due lingue (`it`, `en`) |
| `app-all.js` | logica: stato, mappa, routing, GPS, player, sheet |
| `video/` | i .mp4 verticali — nomi attesi in `video/LEGGIMI.txt` |
| `taratura/` | strumenti interni per correggere le coordinate sul campo |
| `legacy/` | i due demo separati precedenti (Sicilia, Londra) — archivio, non più mantenuti |
| `logo-aicicerone.png` | logo |
| `NOTE-IMPLEMENTAZIONE.md` | note tecniche: geofencing, offline-first, backend, debito tecnico |

## Avvio in locale

Serve un web server — non aprire `index.html` con doppio clic (i `.js` locali e la geolocalizzazione richiedono `http`/`https`).

```bash
cd consegna-carlo
python3 -m http.server 8080
# http://localhost:8080
```

Da smartphone sulla stessa rete: `http://<ip-della-macchina>:8080`.

## Deploy

Qualsiasi hosting statico (Netlify, Vercel, S3+CloudFront, Nginx): si carica la cartella così com'è.

**Serve HTTPS**: senza TLS `navigator.geolocation` è bloccato su Chrome e Safari mobile. `localhost` è considerato sicuro, un IP di rete no — su IP funziona solo la modalità simulazione.

**Attenzione alla cache** durante i test: dopo ogni aggiornamento serve un ricaricamento forzato, e la copia eventualmente aggiunta alla schermata Home va rimossa e riaggiunta.

## Struttura di navigazione

```
Destinazioni (EN)          London          Sicily
        │                     │               │
   scelta tour        Rebuilding London     Catania · Siracusa
        │             Westminster (soon)      │
   scelta guida            Wren + 3 soon    Bellini / Archimede
        │
   tour attivo: mappa · tappe · player · chat · segnalazioni
```

La lingua dell'interfaccia segue la destinazione (`DEST[x].lang` in `tours-all.js`) e viene applicata leggendo `i18n.js`. Per aggiungere una lingua: nuova chiave in `I18N` più il `lang` della destinazione.

Per aggiungere una destinazione o un tour basta lavorare in `tours-all.js`: `DEST` elenca le destinazioni e i loro tour, `TOURS` contiene i tour. Nessuna modifica ad `app-all.js`.

## Video

Verticali 9:16, nella cartella `video/`, con i nomi esatti elencati in `video/LEGGIMI.txt`. La corrispondenza nome ↔ tappa è nell'oggetto `VIDEOS` in `tours-all.js`: per rinominare un file basta cambiare la stringa lì.

Stato: **31 file siciliani già prodotti**, **8 londinesi da produrre** (`Ldn-01-guildhall.mp4` … `Ldn-08-bigben.mp4`).

Se un file manca, il player mostra un segnaposto con il nome atteso — utile per capire a colpo d'occhio cosa non è stato caricato. Si può anche **trascinare** un `.mp4` dentro il player per provarlo senza metterlo sul server.

## Provare il GPS senza essere sul posto

Nel tour attivo, pulsante **Attiva GPS / Enable GPS**: usa la geolocalizzazione reale e, se entro 7 secondi non arriva un fix utile, simula l'arrivo alla tappa corrente. Compare la notifica → "Incontra la guida" → player.

## Taratura delle coordinate

Vedi `taratura/LEGGIMI.txt`. Stato attuale: **Catania, Siracusa e Londra verificate** — coordinate fornite dal committente (Sicilia 30/08/2026, Londra 02/09/2026).

## iOS: schermo pieno

Su Safari la barra del browser riduce l'area del video. I meta per la modalità standalone sono già presenti: **Condividi → Aggiungi alla schermata Home**, poi si lancia da lì e parte senza barre. È uno degli argomenti per cui la versione finale deve essere app nativa, non solo web.

---
©2026 AiCicerone Ltd. — London, UK — Patent Pending — Demo version — info@aicicerone.com
