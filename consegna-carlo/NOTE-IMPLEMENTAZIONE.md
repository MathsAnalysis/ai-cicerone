# Note di implementazione per Carlo (CTO)
### Demo AiCicerone unificata — London & Sicily · aggiornato 02/09/2026

Per avvio, deploy, struttura di navigazione e taratura: `README.md`.
Qui c'è solo ciò che serve per portare la demo a prodotto.

---

## 1. Architettura

HTML/CSS/JS vanilla, quattro file: `index.html` (markup + stile), `tours-all.js` (dati), `i18n.js` (stringhe), `app-all.js` (logica). Stato tutto in memoria nell'oggetto `S`.

**Una sola applicazione per tutte le destinazioni.** È la modifica più importante rispetto alle versioni precedenti (conservate in `legacy/`): un solo codice, un solo set di endpoint da collegare, un solo i18n. Le tre gerarchie — destinazione → tour → guida → tappe — sono dati, non codice.

Dipendenze esterne, tutte da internalizzare in produzione:
- Leaflet 1.9.4 da unpkg
- tile Esri "World Light Gray Base" (senza chiave, **non contrattualizzati**)
- Google Fonts (Source Sans 3)
- routing pedonale da `routing.openstreetmap.de` (istanza OSRM pubblica)

Nessuna è accettabile in un'app offline-first: sono scelte da demo.

---

## 2. Video

Verticali 9:16 in `video/`, nomi nell'oggetto `VIDEOS` di `tours-all.js` (array per tour, indice = numero tappa; `siracusa_opt` per la tappa opzionale 8b).

Collegamento nel player: `openPlayer()` in `app-all.js` fa `vid.src = VIDEO_DIR + file(s)`; se il file manca resta il segnaposto con il nome atteso.

**Decisione da prendere presto: la matrice video × guida.** Ora c'è una guida attiva per tour, ma il prodotto ne prevede più di una per destinazione — su Londra la demo mostra già Holmes, Wilde e Fogg come "Soon". Le opzioni sono due:
- **file separato per guida** (`Ldn-01-guildhall-holmes.mp4`): massima qualità, costo di produzione moltiplicato per il numero di guide;
- **video comune + traccia audio per guida**: molto più economico in storage e produzione, ma il personaggio non compare in scena.

La scelta condiziona pipeline di produzione, dimensione del bundle offline e struttura del CDN. Da chiudere prima di scalare oltre le tre città.

Consigli tecnici: H.264 baseline per compatibilità iOS, profilo 720×1280 come default e 1080×1920 opzionale su Wi-Fi, `faststart` (moov atom in testa) per l'avvio immediato.

---

## 3. Dati

`tours-all.js` contiene tre oggetti che contano:

- **`DEST`** — le destinazioni: `lang` (lingua UI), `sub` (riga sotto il nome), `tours` (elenco di id), `pickEyebrow` / `pickTitle` (testata della schermata di scelta tour).
- **`TOURS`** — i tour. Ogni tappa: `{t, p, c:[lat,lng], d}`. Campi opzionali per tour: `soon` (card bloccata), `zones`, `transferBefore` + `transferTxt`, `optional`.
- **`VIDEOS`**, **`CHAT`**, **`CHIPS`**, **`REPLY`** — asset e testi della chat, per id di tour e di guida.

**Coordinate**: verificate dal committente per tutte e tre le città. Da ritarare solo se si aggiungono tappe o città (`taratura/`).

**Siracusa** ha la struttura più complessa, utile come riferimento: due zone (`zones`), avviso di transfer (`transferBefore: 9`) e **tappa opzionale 8b** (Santuario di Santa Lucia al Sepolcro), attiva di default e disattivabile dall'utente in fondo all'itinerario. Il video di 8b resta agganciato a `VIDEOS.siracusa_opt` (`sr-5b-sepolcro.mp4`): il collegamento passa dalla chiave, non dal numero, quindi la rinumerazione da 5b a 8b non ha toccato gli asset. Intestazione di zona e avviso sono emessi una sola volta, prima di 8b.

**Durate dei tour** (`dur`): stime, non misure — 2′ di video + ~10′ di sosta per tappa + spostamenti a occhio. Vanno sostituite con la somma delle durate reali dei video più i tempi restituiti dal router.

---

## 4. Lingue

`i18n.js` espone `I18N.it` e `I18N.en` con le stesse chiavi. Nel markup ogni stringa è un `data-t="chiave"` (con `data-html="1"` dove serve HTML); `applyLang()` riempie tutto al cambio di destinazione. Le stringhe composte (es. "Tappa 3 di 16") sono costruite in `render()` da `stop` / `of` / `guide`.

**Niente stringhe hard-coded in `app-all.js`**: è la regola da mantenere quando aggiungerete francese e spagnolo. Restano fuori dal dizionario, per scelta, i testi redazionali (descrizioni tappe, bio guide, risposte chat), che vivono in `tours-all.js` insieme al contenuto della destinazione.

Terminologia decisa dal committente: in inglese **AI Living Guides**, in italiano **guida virtuale** (o semplicemente "la tua guida"). Da rispettare in ogni nuova stringa.

---

## 5. Percorso pedonale

`loadRoute()` chiama l'istanza OSRM pubblica con profilo `foot`, una richiesta per tratta, e disegna la geometria reale; in caso di errore ripiega sulla linea retta. Risultato in cache in memoria per tour.

In produzione: **istanza propria o servizio con SLA** (OSRM self-hosted, GraphHopper, Mapbox). L'endpoint pubblico OSM non ha garanzie di uptime né licenza commerciale, e ~30 richieste al primo caricamento non sono un pattern accettabile. La strada giusta è **precalcolare i percorsi in build** e spedirli come GeoJSON nel pacchetto destinazione: costo zero a runtime e funziona offline.

---

## 6. GPS — come è simulato e cosa serve davvero

Nella demo il pulsante GPS fa due cose insieme:
1. `navigator.geolocation.watchPosition()` reale, con `dist()` (haversine planare) e soglia **60 m** dalla tappa corrente → trigger arrivo;
2. **fallback simulazione**: se entro 7 secondi non arriva un fix utile, l'arrivo scatta comunque. È ciò che permette di mostrare la demo in ufficio.

**In produzione servono:**
- **geofencing nativo**, non `watchPosition` in foreground: iOS `CLCircularRegion`, Android `GeofencingClient`. Un browser in background non riceve fix — è la ragione principale per cui la versione finale deve essere nativa o Capacitor, non solo PWA.
- **raggio per tappa**, non fisso: 60 m vanno bene in Piazza Duomo, sono troppi in Via Crociferi (quattro chiese in 200 m) e troppo pochi nel Parco della Neapolis o sul South Bank.
- **isteresi e debounce**: uscita dal geofence a raggio maggiore dell'entrata, più un cooldown per non ri-triggerare la stessa tappa.
- **ordine non vincolante**: l'utente può arrivare alla 7 prima della 6. Ora si controlla solo la tappa corrente; la logica reale deve valutare tutte le tappe non viste e prendere la più vicina.
- **notifica di sistema** (non in-app) quando l'app è in background.
- **precisione in centro storico**: tra i palazzi di Ortigia o nella City l'errore supera facilmente i 30 m. Il pulsante manuale "Incontra la tua guida" deve restare sempre disponibile, come ora.

---

## 7. Offline-first

Il claim del prodotto è offline-first, la demo non lo è. Per la versione reale:

- **tile mappa**: pacchetto MBTiles/PMTiles per destinazione, pre-scaricato all'avvio del tour. I tile Esri usati qui non hanno contratto d'uso; i tile `tile.openstreetmap.org` sono stati scartati perché la tile usage policy OSM esclude le app distribuite e restituisce tile di blocco. In produzione: MapTiler, Stadia o Mapbox con chiave, oppure self-hosted.
- **video**: download del bundle destinazione su Wi-Fi prima della partenza, con gestione dello spazio (39 video verticali a 1080p sono ~1,5–2,5 GB: valutare 720p come default).
- **percorsi**: GeoJSON precalcolato nel bundle (§5).
- **stato tour** persistito su device (tappe viste, tappa corrente, guida e tour scelti): ora è in memoria e si perde al refresh.
- Leaflet e font serviti localmente, non da CDN.

---

## 8. Player video

Comandi nativi disattivati, controlli custom dentro il frame: tap → play/pausa e barra di avanzamento trascinabile (pointer events con `setPointerCapture`), che sfumano dopo 2,2 s. `object-fit: contain` per non tagliare il 9:16. A fine video resta l'ultimo fotogramma con "Prossima tappa" / "Fine del tour · Vai alla mappa" e "Ascolta di nuovo".

Da fare in produzione: **preload del video successivo**, gestione dell'interruzione per chiamata in arrivo, sottotitoli (`<track>` WebVTT) — che sono anche il primo mattone dell'accessibilità.

---

## 9. Chat con la guida

Mockup: risposte pescate da `REPLY`, chip di domande suggerite per guida.

Per il collegamento reale: system prompt **per personaggio** con vincoli di voce ed epoca, più contesto iniettato = destinazione + tour + tappa corrente + tappe già viste + profilo utente + **lingua**. Due requisiti non negoziabili: **niente allucinazioni storiche** (grounding sui testi del tour, rifiuto esplicito quando il dato non c'è) e **latenza bassa** (streaming, con modalità degradata offline su FAQ locali).

---

## 10. Segnalazione discrepanze

Sheet con tappa preselezionata, tipologia e testo libero. Non invia nulla.

Backend minimo: endpoint che riceve `{dest, tourId, stopId, guideId, lang, type, text, coords, appVersion, timestamp}` in una coda di moderazione. Aggiungere **allegato foto** (è il caso d'uso più frequente: cartello, orario, chiusura) e **invio differito** se offline. È il canale di correzione dei contenuti generati: parte della pipeline editoriale, non del supporto clienti.

---

## 11. Accessibilità — assente in questa demo, da progettare

Non è nel pacchetto per scelta, ma è parte integrante del prodotto:
- **sordi/ipoudenti**: seconda traccia video con guida segnante LIS/BSL/ASL, sincronizzata sullo stesso trigger GPS; sottotitoli sempre disponibili. Serve un secondo asset per tappa.
- **ipovedenti**: audio spaziale + feedback aptico di prossimità (la Web Vibration API è troppo povera — altro argomento per il nativo).
- Base intanto: target touch ≥ 44 px (già rispettato), contrasto AA, `prefers-reduced-motion`, tutto navigabile da screen reader.

---

## 12. Debito tecnico noto

1. Tile Esri senza contratto d'uso — da sostituire con provider contrattualizzato o self-hosted (§7).
2. Nessuna persistenza di stato.
3. Routing su istanza pubblica senza SLA, calcolato a runtime (§5).
4. Durate dei tour stimate a mano (§3).
5. Nessuna gestione di errori e permessi negati sul GPS.
6. Video londinesi non ancora prodotti: 8 segnaposto attivi.
7. Le descrizioni delle tappe sono redazionali di prima stesura: da validare storicamente prima di qualsiasi uso pubblico.

---

## 13. Naming e stile — da rispettare nel codice e nella UI

- palette: bianco, `#2C5F8A`, `#B85C38`, `#E8E4DE`. **Mai navy + oro.**
- titoli Georgia, corpo Source Sans 3
- copy in stile "AiCicerone doesn't" / "AiCicerone non pretende"
- in inglese sempre **bespoke tour**, mai "itinerary"; le guide sono **AI Living Guides**
- in italiano **guida virtuale**, o semplicemente "la tua guida"; mai "video" nella copy rivolta all'utente
- piedino su ogni schermata: `©2026 AiCicerone Ltd. — London, UK — Patent Pending — Demo version` + `info@aicicerone.com`
