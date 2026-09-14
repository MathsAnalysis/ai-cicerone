# AiCicerone — webapp

Riscrittura della demo `consegna-carlo/` (HTML/JS vanilla) in **Astro 7 + TypeScript + Preact + Tailwind 4**, con backend Node sullo stesso server:

- **GPS reale** con geofencing delle tappe (nessun servizio Google, nessuna chiave a pagamento).
- **Chat con la guida** su **IA locale** (Ollama) con accesso a internet per fondare le risposte (Wikipedia + SearXNG self-hosted).
- **Segnalazioni** inviate via email a `carlo4340@outlook.it` e `mario@aicicerone.com`.
- Pagine statiche prerenderizzate, un URL per destinazione e per tour (SEO: title, description, canonical, Open Graph, sitemap, JSON-LD `TouristTrip`).
- Pulsanti secondo la tavola Claude Design «AiCicerone Buttons»; classi in `src/styles/global.css`.

## Requisiti

- Node 22+ (sviluppo con Node 26).
- [Ollama](https://ollama.com) per l'IA locale: `ollama pull qwen3:8b` (≈5 GB; alternativa leggera `gemma3:4b`, più accurata `qwen3:14b` o `gemma3:12b`).
- Un server SMTP per le email (hosting, Outlook, Gmail con app password, Resend SMTP…).
- Facoltativo: [SearXNG](https://docs.searxng.org) per la ricerca web generale (senza, l'IA usa solo Wikipedia).

## Avvio in locale

```bash
cd aicicerone
npm install
cp .env.example .env      # impostare CHAT_MODEL, SMTP_URL, REPORT_FROM
ollama pull qwen3:8b
npm run dev               # http://localhost:4321
```

Da smartphone sulla stessa rete: `http://<ip>:4321` — ma **il GPS richiede HTTPS**; su `http://<ip>` parte solo la simulazione demo. Per provare il GPS vero: `npx astro dev --host` dietro un tunnel HTTPS, oppure lo stack Docker qui sotto con un dominio.

Test delle regole di arrivo GPS: `npm test`. Build di produzione: `npm run build && npm start`.

## Variabili d'ambiente

| Variabile | Cosa fa | Default |
|---|---|---|
| `LLM_URL` | Server Ollama (API nativa `/api/chat`) | `http://localhost:11434` |
| `CHAT_MODEL` | Modello Ollama | `qwen3:8b` |
| `SEARXNG_URL` | Istanza SearXNG (formato JSON abilitato) | vuoto = solo Wikipedia |
| `SMTP_URL` | `smtps://utente:password@host:465` (o `smtp://…:587`) | vuoto = segnalazioni rifiutate con 503 |
| `REPORT_FROM` | Mittente delle segnalazioni | `AiCicerone <no-reply@aicicerone.com>` |
| `REPORT_TO` | Destinatari, separati da virgola | `carlo4340@outlook.it,mario@aicicerone.com` |
| `HOST`, `PORT` | Bind del server Node | `0.0.0.0`, `4321` |

## Deploy su server proprio (Docker)

`docker-compose.yml` avvia tutto su una macchina: sito (Node), Ollama, SearXNG e Caddy (HTTPS automatico).

```bash
cp .env.example .env         # DOMAIN=tour.aicicerone.com, SMTP_URL=…, CHAT_MODEL=…
docker compose up -d --build # il servizio ollama-pull scarica il modello al primo avvio
```

Hardware: `qwen3:8b` gira su CPU con 8 GB di RAM liberi (lento) o su una GPU da 6 GB (fluido). Per NVIDIA scommentare il blocco `deploy` del servizio `ollama`. Su Mac Apple Silicon conviene Ollama nativo (`brew install ollama`) e `LLM_URL=http://host.docker.internal:11434`.

## Come funziona il GPS

`src/lib/geo.ts` (regole pure, testate) + `src/components/tour/useGps.ts` (browser):

- `watchPosition` ad alta precisione, `maximumAge: 0`; il fix arriva dal GNSS del telefono via sistema operativo. **Wake Lock** tiene lo schermo acceso: in background il browser non riceve posizioni.
- Arrivo a una tappa: la candidata è la **tappa più vicina in assoluto** (così due tappe a 30 m — Amenano e Pescheria — non si innescano a vicenda), non ancora incontrata, entro il suo raggio (`GEO.radius` = 40 m, per-tappa con il campo `r` in `src/data/tours.ts`), con precisione del fix ≤ 1,5 × raggio, confermata da **2 fix consecutivi**. Ordine non vincolante: si può arrivare alla 7 prima della 6; la notifica propone la tappa raggiunta.
- Sulla mappa: punto blu, cerchio di precisione, **percorso pedonale dalla posizione attuale alla tappa** (OSRM, ricalcolato ogni 80 m), inquadratura che segue utente + tappa. Sotto la mappa: distanza alla tappa e precisione («Prossima tappa a 120 m · GPS ±12 m»).
- Simulazione demo (per l'ufficio): parte solo se il GPS non produce un fix utile — permesso negato, nessun segnale, HTTPS assente, oppure utente **a più di 1 km da tutte le tappe**. Sul posto, con segnale, gli arrivi sono reali. Il pulsante «Incontra la tua guida» resta sempre disponibile.
- Limite del web: niente geofencing in background né notifiche di sistema → per il prodotto finale serve l'app nativa/Capacitor (vedi `consegna-carlo/NOTE-IMPLEMENTAZIONE.md` §6).

Mappa: **MapLibre GL JS** (open source, resa vettoriale, nessun token) su tile **OpenFreeMap** (dati OpenStreetMap, gratuite, senza registrazione, chiave o limiti; stile `liberty` con strade, nomi, punti d'interesse ed edifici a colori, self-hostabile) e **OSRM pubblico** per i percorsi a piedi (una richiesta per tutto il tour). Nessun servizio Google né Mapbox, nessun account. Dove manca WebGL2 (browser desktop con accelerazione grafica spenta) parte in automatico la mappa raster Leaflet su tile stradali Esri, senza chiave. Per l'offline-first: le stesse tile si scaricano come PMTiles per destinazione (OpenFreeMap le pubblica) e OSRM si self-hosta.

## Come funziona la chat con la guida

`POST /api/chat/` (`src/pages/api/chat.ts`):

1. Valida la richiesta (tour, guida, tappa, storico ≤ 12 turni); accetta solo richieste dallo stesso host; 30 richieste/min per IP.
2. **Recupera fonti da internet** per la domanda (`src/lib/retrieve.ts`): Wikipedia nella lingua del tour (3 voci, estratti) + SearXNG (4 risultati) se configurato, in parallelo, timeout 4 s.
3. Costruisce il system prompt (`src/lib/prompt.ts`): persona della guida, regole (brevità, niente invenzioni, cita la fonte), testi del tour come fonte primaria, stato del tour, fonti web.
4. Chiama Ollama in streaming (`think: false` per i modelli con ragionamento) e inoltra al client righe NDJSON `{sources}`, `{t}`, `{done}`. Sotto la risposta compaiono i link alle fonti usate.

Se Ollama non risponde, la chat mostra una risposta dimostrativa e lo segnala («Guida non collegata»). Il modello è intercambiabile (`CHAT_MODEL`): qualsiasi modello servito da Ollama.

## Segnalazioni

`POST /api/report/` (`src/pages/api/report.ts`): valida i campi, aggiunge posizione GPS, pagina, versione e data, invia via SMTP (nodemailer) a `REPORT_TO`. 5 invii/min per IP. Se l'email fallisce l'app avvisa e conserva il testo per riprovare. Ogni invio è anche loggato dal server (`{"kind":"report",…}`).

## Struttura

```
src/
  data/tours.ts          destinazioni, tour, tappe, guide, video, chat (unica fonte dei contenuti)
  i18n.ts                stringhe UI it/en
  styles/global.css      Tailwind: token di palette, pulsanti, marcatori, fogli, player
  layouts/Base.astro     head SEO, PWA, frame 440px
  pages/                 / (destinazioni) · /[dest]/ (tour) · /[dest]/[tour]/ (pagina tour)
  pages/api/             chat.ts · report.ts (runtime Node)
  components/tour/       isola Preact: TourApp → GuidePicker / ActiveTour (TourMap, Player, sheet, useGps)
  lib/                   geo (+test) · route · stops · chat · report · api · retrieve · prompt
public/                  favicon, manifest, robots, og.png, video/ (mp4 con i nomi di video/LEGGIMI.txt)
deploy/                  Caddyfile, settings SearXNG
design/buttons/          tavola Claude Design dei pulsanti (Main.dc.html)
```

Per aggiungere destinazioni, tour o tappe si lavora solo in `src/data/tours.ts`: le pagine e la sitemap si generano da lì.

## Cosa resta fuori (come nella demo)

Offline-first (tile e video in bundle), persistenza dello stato del tour, geofencing in background, sottotitoli e accessibilità: vedi `consegna-carlo/NOTE-IMPLEMENTAZIONE.md` §7, §8, §11.
