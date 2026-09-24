/* PP-Pingis konceptmockuper: riktig produktdata, hämtad ur web/data.js och butikens egna
   produktsidor (site/html/). Inga påhittade namn, priser eller spelmätvärden.
   Endast formatering är gjord: radbrytningar och tankstreck normaliserade, beskrivning kapad. */
window.PP_MOCK = {
  /* Riktiga butiksfakta ur sajtens egen kod och JSON-LD (web/js/app.js, site/html/). */
  shop: {
    name: "PP-Pingis",
    place: "Bordtennisbutik i Garphyttan, Örebro",
    street: "Hinnerssonsväg 9c, 719 40 Garphyttan",
    phone: "070-031 66 55",
    email: "info@pp-pingis.se",
    site: "https://pp-pingis.se/",
    freeShip: 1249,
    deliver: "Snabba leveranser inom 24 h",
    assembly: "Kvalitetsmontering i Garphyttan",
    club: "Är du med i en BTK? Kontakta oss för erbjudanden",
    total: 305
  },
  /* De tre förslagen. Används av navet i varje mockup och av presentationssidan,
     så inga länkar kan peka fel och ingen metadata kan glida isär. */
  variants: [
    {
      tag: "A", name: "Salen", file: "a-salen.html",
      dials: "ENERGY 1 / RHYTHM 2 / MOTION 1",
      idea: "Bläddra först",
      who: "Besökaren som vill läsa och jämföra i lugn takt, och som inte vet vad den söker.",
      palette: ["#f7f2e8", "#fffdf8", "#1a1712", "#1d4b3a"],
      paletteNote: "Varm ivory, djup tallgrön som enda accent",
      type: "Fraunces och Public Sans",
      typeNote: "Fraunces ger hantverksvärme, Public Sans är gjord för läsbarhet",
      shape: "Produkterna som rader med all text synlig, tunn linje mellan varje"
    },
    {
      tag: "B", name: "Labbet", file: "b-labbet.html",
      dials: "ENERGY 2 / RHYTHM 3 / MOTION 1",
      idea: "Sök först, läs mätvärden",
      who: "Spelaren som redan vet vad den vill ha och vill jämföra fart, kontroll och skruv.",
      palette: ["#12141a", "#1b1e26", "#f4f2ee", "#c9f24d"],
      paletteNote: "Grafit, mätgrön som enda accent, bara på staplar och köpknapp",
      type: "Archivo och IBM Plex Mono",
      typeNote: "Monospace för siffror gör avläsningen entydig",
      shape: "Sökfältet först, produkterna som täta rader med mätstaplar"
    },
    {
      tag: "C", name: "Turneringen", file: "c-turneringen.html",
      dials: "ENERGY 3 / RHYTHM 3 / MOTION 2",
      idea: "Välj nivå, få ett paket",
      who: "Den osäkra eller den som köper i present och behöver få besluten gjorda åt sig.",
      palette: ["#f8f7f3", "#123f74", "#0e1116", "#d92d20"],
      paletteNote: "Bordsblå som dominant fält, matchröd som enda accent",
      type: "Anton och Barlow",
      typeNote: "Anton ger turneringsaffischens röst, Barlow håller brödtexten lugn",
      shape: "Tre nivåingångar med riktiga paketpriser, produkterna som block"
    }
  ],
  products: [
 {
  "id": "32148",
  "name": "Donic stomme Original True Carbon Inner",
  "brand": "Donic",
  "price": 1129,
  "kind": "Stommar",
  "blurb": "Rekommenderas till offensiva spelare som söker pålitlig och jämn träff. En snabb, mellanhård 7 skiktsstomme med utmärkt kontroll och känsla.",
  "specs": {
   "Fart": "10-",
   "Kontroll": "8",
   "Vikt": "Ca. 85 g"
  },
  "imgs": [
   "p32148-0"
  ],
  "url": "https://pp-pingis.se/stommar/donic/donic-stomme-original-true-carbon-inner.html"
 },
 {
  "id": "68122",
  "name": "Yasaka stomme Extra Offensive 7 Power",
  "brand": "Yasaka",
  "price": 899,
  "kind": "Stommar",
  "blurb": "Yasaka:s EXTRA OFFENSIVE-stomme har varit en stor succe under flera år och uppskattats utav spelare världen över - med hjälp av den erfarenheten har Yasaka utvecklat en ny stomme för spelare som vill ha ett överlägset offensivt vapen: ett mycket hårt ytterfaner kombineras med ett medelhårt andra faner och ett mycker tunnt lager av kolfiber, mittenfaneret är utvalt och behandlat för att uppnå en perfekt hårdhet och tjocklek.",
  "specs": {
   "Fart": "10+",
   "Kontroll": "5-"
  },
  "imgs": [
   "p68122-0",
   "p68122-1",
   "p68122-2"
  ],
  "url": "https://pp-pingis.se/stommar/yasaka/yasaka-stomme-extra-offensive-7-power.html"
 },
 {
  "id": "32282",
  "name": "Donic gummi BlueGrip C1",
  "brand": "Donic",
  "price": 599,
  "kind": "Gummiplattor",
  "blurb": "Forehandgummi för offensiva spelare som söker fördel vid serve- och returspelet.",
  "specs": {
   "Fart": "11",
   "Kontroll": "5",
   "Skruv": "11++",
   "Hårdhet": "Hård+"
  },
  "imgs": [
   "p32282-0"
  ],
  "url": "https://pp-pingis.se/gummiplattor/donic/donic-gummi-bluegrip-c1.html"
 },
 {
  "id": "68226",
  "name": "Yasaka gummi Rakza Z",
  "brand": "Yasaka",
  "price": 579,
  "kind": "Gummiplattor",
  "blurb": "RAKZA Z är ett nytt tillskott i den mycket populära RAKZA-serien med YASAKA-gummin.",
  "specs": {
   "Fart": "10++",
   "Kontroll": "5",
   "Skruv": "10+++",
   "Hårdhet": "Hård"
  },
  "imgs": [
   "p68226-0"
  ],
  "url": "https://pp-pingis.se/gummiplattor/yasaka/yasaka-gummi-rakza-z.html"
 },
 {
  "id": "32101",
  "name": "Donic stomme Defplay Senso V3",
  "brand": "Donic",
  "price": 569,
  "kind": "Stommar",
  "blurb": "En klassisk def-stomme med stor yta och maximal dämpeffekt. Lätta fanér ger en vikt på endast 75 gram.",
  "specs": {
   "Fart": "5",
   "Kontroll": "10",
   "Vikt": "Ca. 75 gram"
  },
  "imgs": [
   "p32101-0"
  ],
  "url": "https://pp-pingis.se/stommar/donic/donic-stomme-defplay-senso-v3.html"
 },
 {
  "id": "32121",
  "name": "Donic stomme Waldner Senso Ultra Carbon",
  "brand": "Donic",
  "price": 749,
  "kind": "Stommar",
  "blurb": "En vidareutveckling av Waldner Senso Carbon, Waldners eget val i många år. Waldner Senso Ultra Carbon är en lätt och något snabbare carbonstomme, bl.a.",
  "specs": {
   "Fart": "9",
   "Kontroll": "8-",
   "Vikt": "Ca. 80 gram"
  },
  "imgs": [
   "p32121-0"
  ],
  "url": "https://pp-pingis.se/stommar/donic/donic-stomme-waldner-senso-ultra-carbon.html"
 },
 {
  "id": "68021",
  "name": "Yasaka startpaket Mattias Falk",
  "brand": "Yasaka",
  "price": 549,
  "kind": "Färdiga racketar",
  "blurb": "Startpaket som innehåller: Racket, racketfodral och bollar, för kommande och nyblivna tävlingsspelare. Racketfodral med plats för ett racket och bollar.",
  "specs": {
   "Fart": "8",
   "Kontroll": "7+",
   "Skruv": "8"
  },
  "imgs": [
   "p68021-0"
  ],
  "url": "https://pp-pingis.se/specialpaket/yasaka-startpaket-mattias-falk.html"
 },
 {
  "id": "68002",
  "name": "Yasaka fortsättningspaket",
  "brand": "Yasaka",
  "price": 699,
  "kind": "Färdiga racketar",
  "blurb": "Fortsättningspaket som innehåller: 1 st. stomme och 2 st. gummiplattor. Yasaka stomme 2040.",
  "specs": {
   "Fart": "6+",
   "Kontroll": "8",
   "Vikt": "Ca. 75 gram"
  },
  "imgs": [
   "p68002-0"
  ],
  "url": "https://pp-pingis.se/specialpaket/yasaka-fortsattningspaket.html"
 },
 {
  "id": "112245",
  "name": "GEWO Nybörjarpaket junior",
  "brand": "Gewo",
  "price": 499,
  "kind": "Färdiga racketar",
  "blurb": "Kraftfulla toppspinvariationer och exakta block- och motträffar.",
  "specs": {},
  "imgs": [
   "p112245-0",
   "p112245-1",
   "p112245-2"
  ],
  "url": "https://pp-pingis.se/specialpaket/gewo-junior-stomme-gummi.html"
 },
 {
  "id": "32615",
  "name": "Donic Polyball XXX P40+ 120-pack",
  "brand": "Donic",
  "price": 1799,
  "kind": "Bollar",
  "blurb": "DONICs nya plastboll P40 + *** är hårdare och ännu mer hållbar än sin föregångare DONIC 40+ ***.",
  "specs": {},
  "imgs": [
   "p32615-0",
   "p32615-1"
  ],
  "url": "https://pp-pingis.se/bollar/donic/donic-polyball-xxx-p40-120-pack.html"
 },
 {
  "id": "32702",
  "name": "Donic väska Seca",
  "brand": "Donic",
  "price": 729,
  "kind": "Väskor & fodral",
  "blurb": "Tävlingsväska med stort huvudfack, 2st stora ytterfack och fack med dragkedja på framsidan. 100% Polyester, Jacquard. Storlek: 70 x 32 x 32 cm",
  "specs": {},
  "imgs": [
   "p32702-0"
  ],
  "url": "https://pp-pingis.se/vaskor/donic/donic-vaska-seca.html"
 },
 {
  "id": "39202",
  "name": "Gewo domarbord inkl. skyddsfodral",
  "brand": "Gewo",
  "price": 999,
  "kind": "Tillbehör",
  "blurb": "Praktiskt ihopfällbart domarbord. Inklusive skyddsfodral för säker förvaring. Räkneverk ingår ej.",
  "specs": {},
  "imgs": [
   "p39202-0"
  ],
  "url": "https://pp-pingis.se/klubbtillbehor/gewo/gewo-domarbord-inkl-skyddsfodral.html"
 }
]
};
