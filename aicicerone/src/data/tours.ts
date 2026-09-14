// Dati di destinazioni, tour e tappe. Generato da consegna-carlo/tours-all.js: modificare qui, non altrove.
export type Lang = "it" | "en";
export type Guide = { id: string; name: string; role: string; bio: string; init: string; soon?: boolean };
export type Stop = { t: string; p: string; c: [number, number]; d: string; r?: number };
export type OptionalStop = Stop & { after: number; label: string };
export type Tour = {
  name: string; city: string; region: string; dur: string; sub?: string; center: [number, number];
  guides: Guide[]; stops: Stop[]; soon?: boolean; zones?: Record<string, string>;
  transferBefore?: number; transferTxt?: string; optional?: OptionalStop; teaser?: string; by?: string;
};
export type Dest = { name: string; lang: Lang; sub: string; badge: string; tours: string[]; pickEyebrow: string; pickTitle: string };

export const DEST: Record<string, Dest> = {
  "london": {
    "name": "London",
    "lang": "en",
    "sub": "2 bespoke tours · English",
    "badge": "L",
    "tours": [
      "rebuilding",
      "westminster"
    ],
    "pickEyebrow": "Choose your bespoke tour in",
    "pickTitle": "London"
  },
  "sicily": {
    "name": "Sicily",
    "lang": "it",
    "sub": "2 città · 30 tappe · Italiano",
    "badge": "S",
    "tours": [
      "catania",
      "siracusa"
    ],
    "pickEyebrow": "Scegli il tuo tour in",
    "pickTitle": "Sicilia"
  }
};

export const TOURS: Record<string, Tour> = {
  "rebuilding": {
    "name": "Rebuilding London",
    "city": "London",
    "region": "United Kingdom",
    "dur": "≈ 2h 30′ · estimate",
    "center": [
      51.5096,
      -0.1063
    ],
    "guides": [
      {
        "id": "wren",
        "name": "Sir Christopher Wren",
        "role": "AI Living Guide",
        "bio": "The architect who redrew the city after the Great Fire. He reads London in domes, sightlines and the stubbornness of stone.",
        "init": "W"
      },
      {
        "id": "holmes",
        "name": "Sherlock Holmes",
        "role": "AI Living Guide",
        "bio": "The same streets read as evidence: soot, brick and the traces people leave behind.",
        "init": "H",
        "soon": true
      },
      {
        "id": "wilde",
        "name": "Oscar Wilde",
        "role": "AI Living Guide",
        "bio": "London as a stage. Less about dates, more about the manners of the people who built it.",
        "init": "O",
        "soon": true
      },
      {
        "id": "fogg",
        "name": "Phileas Fogg",
        "role": "AI Living Guide",
        "bio": "The city as a departure point: clocks, timetables and the appetite for elsewhere.",
        "init": "F",
        "soon": true
      }
    ],
    "stops": [
      {
        "t": "Guildhall & the Roman Amphitheatre",
        "p": "Guildhall Yard, EC2V",
        "c": [
          51.51552,
          -0.0922
        ],
        "d": "Beneath the medieval hall lies the arena of Roman Londinium, its outline traced in dark stone across the yard above. Two cities, one footprint."
      },
      {
        "t": "St Bartholomew the Great",
        "p": "West Smithfield, EC1A",
        "c": [
          51.51903,
          -0.09992
        ],
        "d": "The oldest parish church in the City, founded 1123. The Great Fire never reached it, so this is London as it stood before I was asked to rebuild the rest."
      },
      {
        "t": "St Paul's Cathedral",
        "p": "St Paul's Churchyard, EC4M",
        "c": [
          51.51371,
          -0.0995
        ],
        "d": "Thirty-five years of my life. The dome had to be seen from the river and hold its own against the sky — everything else followed from that."
      },
      {
        "t": "Millennium Bridge",
        "p": "Thames crossing, Bankside",
        "c": [
          51.5095,
          -0.09846
        ],
        "d": "A line drawn between the cathedral and the far bank in the year 2000. The city still argues with the river, and still keeps crossing it."
      },
      {
        "t": "Tate Modern",
        "p": "Bankside, SE1",
        "c": [
          51.50758,
          -0.09938
        ],
        "d": "A power station turned gallery. London does not often demolish what it stops needing — it gives it another purpose."
      },
      {
        "t": "South Bank",
        "p": "Book market under Waterloo Bridge",
        "c": [
          51.50711,
          -0.11641
        ],
        "d": "Second-hand books laid out under the arches, whatever the weather. The stretch of river that belongs to no institution at all."
      },
      {
        "t": "London Eye",
        "p": "Riverside Building, SE1",
        "c": [
          51.50331,
          -0.11957
        ],
        "d": "For three centuries the dome was the highest thing here. Now the city is read from a slow wheel on the south bank — the same instinct, turning."
      },
      {
        "t": "Big Ben / Elizabeth Tower",
        "p": "Westminster, SW1A",
        "c": [
          51.50072,
          -0.12462
        ],
        "d": "The clock that set the country's time. This is where I leave you for today — the square ahead has its own story, and its own guide."
      }
    ],
    "sub": "8 stops · ≈ 2h 30′ · estimate"
  },
  "westminster": {
    "name": "Westminster: Parliament & the Abbey",
    "city": "London",
    "region": "United Kingdom",
    "dur": "≈ 2h · 7 stops",
    "soon": true,
    "teaser": "This is where I leave you for today. But this square, Parliament, Westminster Abbey, the seat of government itself, deserves its own telling, and its own guide. Join us for the next chapter of London's story.",
    "by": "Sir Christopher Wren, closing Rebuilding London",
    "center": [
      51.4995,
      -0.1248
    ],
    "guides": [],
    "stops": []
  },
  "catania": {
    "name": "Catania",
    "region": "Sicilia",
    "dur": "≈ 4h 15′ · stima",
    "center": [
      37.5036,
      15.0855
    ],
    "guides": [
      {
        "id": "bellini",
        "name": "Vincenzo Bellini",
        "role": "Guida virtuale",
        "bio": "Nato in questa città nel 1801. Racconta Catania come una partitura: le piazze in crescendo, la lava come basso continuo.",
        "init": "C"
      }
    ],
    "stops": [
      {
        "t": "Piazza Duomo",
        "p": "Cuore barocco, Patrimonio UNESCO",
        "c": [
          37.50259,
          15.0872
        ],
        "d": "Il salotto di pietra lavica e calcare bianco ricostruito dopo il terremoto del 1693. Al centro, l'elefante della Fontana dell'Elefante — u Liotru — con il suo obelisco."
      },
      {
        "t": "Badia di Sant'Agata",
        "p": "Via Vittorio Emanuele II 182",
        "c": [
          37.50286,
          15.08811
        ],
        "d": "La cupola di Giovan Battista Vaccarini vista dalla terrazza: da qui Catania si legge tutta, dal porto all'Etna."
      },
      {
        "t": "Museo Diocesano",
        "p": "Via Etnea 8",
        "c": [
          37.50205,
          15.08758
        ],
        "d": "Argenti, paramenti e le vare delle processioni agatine. Sotto, i resti delle Terme Achilliane di età romana."
      },
      {
        "t": "Fontana dell'Amenano",
        "p": "Piazza Duomo, lato sud",
        "c": [
          37.50209,
          15.08704
        ],
        "d": "Il fiume che scorre sotto la città riemerge qui per un istante: i catanesi la chiamano acqua a linzolu, acqua a lenzuolo."
      },
      {
        "t": "La Pescheria",
        "p": "Piazza Alonzo di Benedetto",
        "c": [
          37.50181,
          15.087
        ],
        "d": "Il mercato del pesce: voci, ghiaccio, spade aperte a metà. La Catania che non recita per i visitatori."
      },
      {
        "t": "Piazza Università",
        "p": "Via Etnea",
        "c": [
          37.50364,
          15.08716
        ],
        "d": "Il cortile del Siculorum Gymnasium, prima università di Sicilia (1434). I candelabri di bronzo raccontano quattro leggende cittadine."
      },
      {
        "t": "Teatro Massimo Bellini",
        "p": "Via Perrotta 12",
        "c": [
          37.50433,
          15.09051
        ],
        "d": "Inaugurato nel 1890 con la Norma. Il soffitto di Ernesto Bellandi mette in scena le quattro opere del compositore."
      },
      {
        "t": "Anfiteatro Romano",
        "p": "Piazza Stesicoro",
        "c": [
          37.50742,
          15.08569
        ],
        "d": "Ne vedi un morso: il resto dorme sotto la piazza e i palazzi. Poteva contenere più di quindicimila persone."
      },
      {
        "t": "Villa Bellini",
        "p": "Via Etnea",
        "c": [
          37.51078,
          15.08532
        ],
        "d": "Il giardino ottocentesco con il calendario floreale e le terrazze del Labirinto. Pausa d'ombra a metà percorso."
      },
      {
        "t": "Monastero dei Benedettini",
        "p": "Piazza Dante Alighieri 32",
        "c": [
          37.50369,
          15.08051
        ],
        "d": "Un monastero-città sommerso e ricostruito sulla colata del 1669. Oggi Dipartimento di Scienze Umanistiche."
      },
      {
        "t": "Biblioteca Ursino Recupero",
        "p": "Via Biblioteca 13",
        "c": [
          37.50483,
          15.07952
        ],
        "d": "La Sala Vaccarini: scaffali di noce, majoliche settecentesche sul pavimento, silenzio spesso."
      },
      {
        "t": "Via Crociferi",
        "p": "Da Piazza San Francesco",
        "c": [
          37.50409,
          15.08479
        ],
        "d": "Quattro chiese in duecento metri: la scenografia barocca più compatta della città, chiusa dall'Arco di San Benedetto."
      },
      {
        "t": "Chiesa di San Benedetto",
        "p": "Via Crociferi",
        "c": [
          37.50371,
          15.08468
        ],
        "d": "La Scalinata degli Angeli e, dentro, il ciclo di affreschi di Giovanni Tuccari. Le monache di clausura ascoltavano da sopra."
      },
      {
        "t": "Museo Belliniano",
        "p": "Piazza San Francesco d'Assisi 3",
        "c": [
          37.50269,
          15.08439
        ],
        "d": "La casa natale del compositore: spartiti autografi, clavicembali, la maschera funebre. La tappa più intima del tour."
      },
      {
        "t": "Teatro Romano e Odeon",
        "p": "Via Vittorio Emanuele II 266",
        "c": [
          37.5026,
          15.0837
        ],
        "d": "Marmi e pietra lavica sotto il livello delle case: la città antica affiora tra i cortili del quartiere."
      },
      {
        "t": "Castello Ursino",
        "p": "Piazza Federico di Svevia",
        "c": [
          37.49921,
          15.08455
        ],
        "d": "Fortezza di Federico II, un tempo sul mare: la lava del 1669 le ha portato via la costa. Ultima tappa."
      }
    ],
    "city": "Catania",
    "sub": "16 tappe · ≈ 4h 15′ · stima"
  },
  "siracusa": {
    "name": "Siracusa",
    "region": "Sicilia",
    "dur": "≈ 4h 15′ · due zone",
    "center": [
      37.0665,
      15.287
    ],
    "guides": [
      {
        "id": "archimede",
        "name": "Archimede",
        "role": "Guida virtuale",
        "bio": "Nato in questa città e qui morto. Misura Siracusa in leve, specchi e cerchi tracciati sulla sabbia.",
        "init": "A"
      }
    ],
    "zones": {
      "1": "Zona 1 — Ortigia",
      "9": "Zona 2 — Parco della Neapolis"
    },
    "transferBefore": 9,
    "transferTxt": "Cambio di zona: si lascia Ortigia verso il Parco Archeologico della Neapolis, 15–20 minuti a piedi. Lungo il tragitto la tappa opzionale 8b, poi il tour riprende all'ingresso del parco.",
    "stops": [
      {
        "t": "Ponte Umbertino",
        "p": "Ingresso a Ortigia",
        "c": [
          37.06475,
          15.29097
        ],
        "d": "Il passaggio dalla terraferma all'isola. Due ponti, un canale: Ortigia è sempre stata un'altra cosa rispetto al resto della città."
      },
      {
        "t": "Tempio di Apollo",
        "p": "Largo XXV Luglio",
        "c": [
          37.06391,
          15.29272
        ],
        "d": "Il più antico tempio dorico periptero di Sicilia, VI secolo a.C. Poi chiesa bizantina, moschea, chiesa normanna, caserma."
      },
      {
        "t": "Piazza Archimede",
        "p": "Fontana di Diana",
        "c": [
          37.06124,
          15.29369
        ],
        "d": "Il mito di Aretusa scolpito nell'acqua da Giulio Moschetti. Intorno, palazzi catalani e cortili aperti."
      },
      {
        "t": "Piazza Duomo",
        "p": "Duomo di Siracusa",
        "c": [
          37.05963,
          15.29316
        ],
        "d": "Il tempio di Atena non è stato demolito: è dentro la cattedrale. Le colonne doriche si vedono ancora nelle navate."
      },
      {
        "t": "Santa Lucia alla Badia",
        "p": "Piazza Duomo",
        "c": [
          37.05874,
          15.2933
        ],
        "d": "Facciata tardobarocca sulla piazza. La chiesa ha ospitato per anni il Caravaggio oggi al Sepolcro."
      },
      {
        "t": "Fonte Aretusa",
        "p": "Largo Aretusa",
        "c": [
          37.05734,
          15.29293
        ],
        "d": "Sorgente d'acqua dolce a un passo dal mare, con il papiro che vi cresce spontaneo. Il luogo della ninfa e del fiume Alfeo."
      },
      {
        "t": "Palazzo Bellomo",
        "p": "Galleria Regionale, Via Capodieci 16",
        "c": [
          37.05763,
          15.29449
        ],
        "d": "Qui è l'Annunciazione di Antonello da Messina (1474). Vale la sosta anche solo per quella tavola."
      },
      {
        "t": "Castello Maniace",
        "p": "Punta estrema di Ortigia",
        "c": [
          37.05345,
          15.29543
        ],
        "d": "Fortezza sveva sul mare aperto, sala ipostila e portale gotico. Fine della Zona 1."
      },
      {
        "t": "Teatro Greco",
        "p": "Parco della Neapolis",
        "c": [
          37.07564,
          15.27504
        ],
        "d": "Scavato nella roccia del colle Temenite. Eschilo vi mise in scena le sue tragedie: la cavea guarda ancora il porto."
      },
      {
        "t": "Orecchio di Dionisio",
        "p": "Latomia del Paradiso",
        "c": [
          37.07625,
          15.27563
        ],
        "d": "Ventitré metri di cava a forma di padiglione auricolare. Il nome è di Caravaggio, l'acustica è reale."
      },
      {
        "t": "Ara di Ierone II",
        "p": "Parco della Neapolis",
        "c": [
          37.0745,
          15.27689
        ],
        "d": "Il basamento dell'altare più grande del mondo greco: centonovantotto metri, per sacrifici da centinaia di capi."
      },
      {
        "t": "Anfiteatro Romano",
        "p": "Parco della Neapolis",
        "c": [
          37.07422,
          15.27859
        ],
        "d": "Età imperiale, in parte tagliato nella roccia. Al centro, la vasca per le macchine sceniche e i giochi d'acqua."
      },
      {
        "t": "Museo Paolo Orsi",
        "p": "Viale Teocrito 66",
        "c": [
          37.07586,
          15.28597
        ],
        "d": "Uno dei più importanti musei archeologici del Mediterraneo. Dalla preistoria siciliana alle colonie greche."
      },
      {
        "t": "Il luogo dell'assedio",
        "p": "Neapolis — morte di Archimede",
        "c": [
          37.07802,
          15.27971
        ],
        "d": "Plutarco racconta la morte di Archimede durante la presa romana del 212 a.C.; l'«Eureka» arriva da Vitruvio. Due tradizioni, dichiarate come tali."
      }
    ],
    "optional": {
      "after": 8,
      "t": "Santuario di Santa Lucia al Sepolcro",
      "p": "Borgata — lungo il tragitto verso la Neapolis",
      "c": [
        37.07298,
        15.29137
      ],
      "d": "Il «Seppellimento di Santa Lucia» di Caravaggio (1608). Tappa opzionale sulla strada che lascia Ortigia verso il Parco della Neapolis.",
      "label": "8b"
    },
    "city": "Siracusa",
    "sub": "15 tappe · ≈ 4h 15′ · due zone"
  }
};

// nome file video per tour (indice = tappa - 1); chiave "<tour>_opt" per la tappa opzionale
export const VIDEOS: Record<string, string[] | string> = {
  "rebuilding": [
    "Ldn-01-guildhall",
    "Ldn-02-st-bartholomew",
    "Ldn-03-st-pauls",
    "Ldn-04-millennium",
    "Ldn-05-tate",
    "Ldn-06-southbank",
    "Ldn-07-london-eye",
    "Ldn-08-bigben"
  ],
  "catania": [
    "catania-01-piazza-duomo",
    "catania-02-Badia",
    "catania-03-Diocesano",
    "catania-04-Amenano",
    "catania-05-pescheria",
    "catania-06-Universita",
    "catania-07-teatrobellini",
    "catania-08-Stesicoro",
    "catania-09Villabellini",
    "catania-10-Monastero",
    "catania-11-BibliotecaUrsinoRecupero",
    "catania-12-viacrociferi",
    "catania-13-chiesa-sanbenedetto",
    "catania-14-Museo-Bellini",
    "catania-15-Teatro-greco-romano",
    "catania-16-Castello-Ursino"
  ],
  "siracusa": [
    "sr-01-ponte-umbertino",
    "sr-02-tempio-apollo",
    "sr-03-Piazza-Archimede",
    "sr-04-Duomo",
    "sr-05-SantaLucia-Badia",
    "sr-06-fonte-aretusa",
    "sr-07-Palazzo-Bellomo",
    "sr-08-castello-maniace",
    "sr-09-teatro-greco",
    "sr-10-Orecchio-Dionisio",
    "sr-11-Ara-Ierone",
    "sr-12anfiteatro-romano",
    "sr-13-Museo-PaoloOrsi",
    "sr-14-Assedio-Romano"
  ],
  "siracusa_opt": "sr-5b-sepolcro"
};

export const CHAT: Record<string, string[]> = {
  "wren": [
    "I rebuilt fifty-two churches in this city and buried myself under one of them. Ask me about stone, fire, or what London refused to let me build."
  ],
  "bellini": [
    "Siamo a due passi da dove sono nato. Chiedimi della città, del barocco, di mio padre organista — o di cosa suonavano qui la sera."
  ],
  "archimede": [
    "Sono nato in questa città e qui sono morto. Chiedimi di leve, di specchi, del cerchio che stavo tracciando quando arrivò il soldato."
  ],
  "sawyer": [
    "Ehi! Io conto le cose: colonne, gradini, elefanti di pietra. Tu chiedi, io indago."
  ]
};
export const CHIPS: Record<string, string[]> = {
  "wren": [
    "Why is the dome that shape?",
    "What did the Fire destroy?",
    "What did London reject?",
    "How far to the next stop?"
  ],
  "bellini": [
    "Perché tutto questo barocco?",
    "Cosa si mangia qui vicino?",
    "Raccontami dell'Etna",
    "Quanto manca alla prossima tappa?"
  ],
  "archimede": [
    "Come funzionavano i tuoi specchi?",
    "Perché il tempio è dentro il Duomo?",
    "È vero l'«Eureka»?",
    "Quanto manca alla prossima tappa?"
  ],
  "sawyer": [
    "Un indovinello su questa tappa",
    "Cosa devo cercare qui?",
    "Chi era il capo qui?",
    "Quanto manca?"
  ]
};
export const REPLY: Record<string, string[]> = {
  "wren": [
    "The Fire of 1666 cleared four-fifths of the walled city in four days. What you walk through is not old London — it is the answer to that fire.",
    "I proposed straight avenues and open squares. The city refused: property lines were older than my drawings, and they won. London is medieval underneath and Georgian on the surface.",
    "AiCicerone doesn't pretend to be infallible. If a date or a name looks wrong to you, use «Report a discrepancy» and the editorial team will check it."
  ],
  "bellini": [
    "Il terremoto del 1693 rase tutto al suolo. Ciò che vedi non è vecchio: è una città ricostruita in un unico slancio, in pietra lavica e calcare, come un'opera scritta di getto.",
    "La lava e il mare hanno deciso questa città più di qualunque architetto. Guarda i colori: nero sotto, bianco sopra.",
    "Su questo AiCicerone non improvvisa: se un dato ti sembra sbagliato, usa «Segnala eventuali discrepanze» e la redazione lo verifica."
  ],
  "archimede": [
    "Dammi una leva e un punto d'appoggio: il resto è geometria. Gli specchi ustori sono tradizione tarda, non li trovi nelle fonti a me contemporanee.",
    "Questa città era la più ricca del Mediterraneo greco. Quello che vedi in rovina era pieno di gente, di acqua, di rumore.",
    "Se qualcosa non ti torna, segnalalo: AiCicerone non finge certezze che non ha."
  ],
  "sawyer": [
    "Conta le colonne prima di girare l'angolo: te ne chiedo il numero alla prossima tappa.",
    "Qui è passata gente con le corone e gente con i secchi. Le seconde hanno costruito tutto.",
    "Se trovi un errore, segnalalo: anche gli esploratori tengono un diario di bordo."
  ]
};
