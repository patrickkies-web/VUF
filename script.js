var DIENSTGRADE = ['PKin', 'PK', 'POKin', 'POK', 'PHKin', 'PHK', 'KAin', 'KA'];
var current = 0;
var streifenwagen = [];
var swCounter = 0;
var idCounter = 0;
var dragSrc = null;
var branch = null; // 'strasse' | 'parkplatz'
var selectedSections = [];
var touchData = { active: false, srcId: null, swId: null, overItem: null };
var today = new Date().toISOString().split('T')[0];
var GT_STREETS = null; // { name: { plz, stadt, ortsteil } | null }
var autoOrtsteil = '';
var fahrzeugSpuren = [];
var fzCounter = 0;
var fzNummernMax = 2;
var fzCurrentIdx = null;
var fzSelectedNum = null;

var KAROSSERIE_EINZELN = [
  {
    label: 'Fahrzeugfront',
    rows: [
      ['Motorhaube'],
      ['Frontscheibe'],
      ['A-Säule links', 'A-Säule rechts'],
      ['Scheinwerfer links', 'Scheinwerfer rechts'],
      ['Kotflügel vorne links', 'Kotflügel vorne rechts'],
      ['Frontschürze links', 'Frontschürze Mitte', 'Frontschürze rechts'],
      ['Nebelscheinwerfer links', 'Nebelscheinwerfer rechts']
    ]
  },
  {
    label: 'Fahrzeugmitte',
    rows: [
      ['Dach'],
      ['Außenspiegel links', 'Außenspiegel rechts'],
      ['Vordertür links', 'Vordertür rechts'],
      ['Seitenscheibe vorne links', 'Seitenscheibe vorne rechts'],
      ['B-Säule links', 'B-Säule rechts'],
      ['Hintertür links', 'Hintertür rechts'],
      ['Seitenscheibe hinten links', 'Seitenscheibe hinten rechts'],
      ['C-Säule links', 'C-Säule rechts'],
      ['Schweller links', 'Schweller rechts'],
      ['Radlauf vorne links', 'Radlauf vorne rechts'],
      ['Felge vorne links', 'Felge vorne rechts'],
      ['Radlauf hinten links', 'Radlauf hinten rechts'],
      ['Felge hinten links', 'Felge hinten rechts'],
      ['Unterfahrschutz']
    ]
  },
  {
    label: 'Fahrzeugheck',
    rows: [
      ['Heckklappe / Kofferraumdeckel'],
      ['Heckscheibe'],
      ['Rückleuchte links', 'Rückleuchte rechts'],
      ['Kotflügel / Heckseitenblech links', 'Kotflügel / Heckseitenblech rechts'],
      ['Heckschürze links', 'Heckschürze Mitte', 'Heckschürze rechts']
    ]
  }
];

var SECTION_DEFS = {
  allgemeines: {
    label: 'Allgemeines', desc: 'Besatzung, Einsatzanlass, Datum & Melder', icon: '👥',
    getSlides: function() { return ['slide-0', 'slide-1', 'slide-2', 'slide-3']; }
  },
  oertlichkeit: {
    label: 'Örtlichkeit', desc: 'Unfallort – Straße oder Parkplatz', icon: '📍',
    getSlides: function() {
      if (!branch) return ['slide-uo-typ'];
      if (branch === 'strasse') return ['slide-uo-typ', 'slide-uo-s1'];
      return ['slide-uo-typ', 'slide-uo-p1', 'slide-uo-p2'];
    }
  },
  verhaeltnisse: {
    label: 'Verkehrsverhältnisse', desc: 'Fahrbahn, Tempo, Licht, Wetter & Sicht', icon: '🌦',
    getSlides: function() {
      var slides = [];
      if (selectedSections.indexOf('oertlichkeit') === -1) {
        slides.push('slide-uo-typ'); // Typ (Straße/Parkplatz) muss bekannt sein
      }
      if (!branch || branch !== 'strasse') return slides;
      return slides.concat(['slide-uo-s1b', 'slide-uo-s2', 'slide-uo-s3', 'slide-uo-s4', 'slide-uo-s4b', 'slide-uo-s5']);
    }
  },
  spuren: {
    label: 'Spurenlage', desc: 'Spuren & Teile an der Örtlichkeit', icon: '🔍',
    getSlides: function() { return ['slide-uo-spuren']; }
  },
  fahrzeug: {
    label: 'Fahrzeugschäden', desc: 'Schadensbild & Fahrzeugdaten', icon: '🚗',
    getSlides: function() {
      var fzDetailSlides = [];
      var fzAbschluss = [];
      if (fzCurrentIdx !== null && fahrzeugSpuren[fzCurrentIdx]) {
        var n = fahrzeugSpuren[fzCurrentIdx].selectedTeile.length;
        for (var i = 0; i < n; i++) fzDetailSlides.push('slide-fz-detail-' + i);
        if (n > 0) fzAbschluss = ['slide-fz-abschluss'];
      }
      return ['slide-fz-nummer', 'slide-fz-picker'].concat(fzDetailSlides).concat(fzAbschluss);
    }
  },
  schilderungen: {
    label: 'Schilderungen', desc: 'Zeugenaussagen & Angaben', icon: '💬',
    getSlides: function() {
      var slides = [];
      if (selectedSections.indexOf('allgemeines') === -1) {
        slides.push('slide-0'); // Besatzung für Beamten-Auswahl erforderlich
      }
      slides.push('slide-schilderungen', 'slide-schilderungen-umstaende');
      var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null;
      var umst = s ? (s.umstaende || []) : [];
      var hasAlk = umst.indexOf('alkohol') !== -1 || umst.indexOf('alkohol-btm') !== -1;
      var hasBtm = umst.indexOf('btm') !== -1 || umst.indexOf('alkohol-btm') !== -1;
      var hasVerletzt = umst.indexOf('leicht-verletzt') !== -1;
      if (hasVerletzt) slides.push('slide-schilderungen-verletzung');
      if (hasAlk || hasBtm) slides.push('slide-schilderungen-auffaelligkeiten', 'slide-schilderungen-anweisungen');
      if (hasAlk) slides.push('slide-schilderungen-alkohol-test');
      if (hasBtm) slides.push('slide-schilderungen-btm-test');
      slides.push('slide-schilderungen-angaben', 'slide-schilderungen-overview');
      return slides;
    }
  },
  massnahmen: {
    label: 'Maßnahmen', desc: 'Unfallmitteilungen, Bescheinigungen & Sonstiges', icon: '📋',
    getSlides: function() { return ['slide-massnahmen']; }
  },
  psychkg: {
    label: 'Maßnahmen nach PsychKG', desc: 'Sozialpsychiatrischer Dienst, ärztliches Zeugnis & zwangsweise Unterbringung', icon: '🏥',
    getSlides: function() { return ['slide-psychkg', 'slide-psychkg-spd', 'slide-psychkg-transport']; }
  },
  haftbefehl: {
    label: 'Haftbefehl', desc: 'Vollstreckung eines Strafbefehls / Haftbefehls', icon: '⚖️',
    getSlides: function() { return ['slide-haftbefehl']; }
  },
  blutprobe: {
    label: 'Blutprobe', desc: 'Anordnung (Richtervorbehalt/Polizei) & ärztliche Blutentnahme', icon: '🩸',
    getSlides: function() { return ['slide-blutprobe-anordnung', 'slide-blutprobe-entnahme']; }
  },
  vermisst: {
    label: 'Vermisste Person', desc: 'Fragenkatalog & Kurzübersicht zur vermissten Person', icon: '🔎',
    getSlides: function() { return ['slide-vermisst-1', 'slide-vermisst-2', 'slide-vermisst-3']; }
  },
  anzeige: {
    label: 'Anzeigenaufnahme auf der Wache', desc: 'Strafanzeige – Sachverhalt & Schilderungen der erschienenen Personen', icon: '📝',
    getSlides: function() {
      var slides = [];
      if (selectedSections.indexOf('allgemeines') === -1) slides.push('slide-0');
      slides.push('slide-anzeige-intro', 'slide-anzeige-was', 'slide-anzeige-schild', 'slide-anzeige-angaben', 'slide-anzeige-overview');
      return slides;
    }
  }
};

var LEITFAEDEN = {
  strasse:   { label: 'VUF Straße',            sections: ['allgemeines','oertlichkeit','verhaeltnisse','spuren','fahrzeug','schilderungen','massnahmen'] },
  parkplatz: { label: 'VUF Parkplatz',          sections: ['allgemeines','oertlichkeit','spuren','fahrzeug','schilderungen','massnahmen'] },
  anzeige:   { label: 'Anzeige auf der Wache',  sections: ['allgemeines','anzeige','massnahmen'] }
};

var UMSTAENDE_DEFS = [
  { v: 'kein-deutsch',    label: 'Sprach nur gebrochen Deutsch' },
  { v: 'alkohol',         label: 'Stand unter Alkoholeinfluss' },
  { v: 'btm',             label: 'Stand unter Betäubungsmitteleinfluss' },
  { v: 'alkohol-btm',     label: 'Stand unter Alkohol- und BtM-Einfluss' },
  { v: 'leicht-verletzt', label: 'War leicht verletzt, benötigte keinen RTW' }
];

var AUFFAELLIGKEITEN = [
  { category: '1 · Augen & Pupillen', items: [
    { v: 'au-01', label: 'gerötete Bindehäute' },
    { v: 'au-02', label: 'glasige Augen' },
    { v: 'au-03', label: 'wässrige Augen' },
    { v: 'au-04', label: 'trockene Augen' },
    { v: 'au-05', label: 'müde wirkende Augen' },
    { v: 'au-06', label: 'halb geschlossene Augenlider' },
    { v: 'au-07', label: 'starrer Blick' },
    { v: 'au-08', label: 'auffällig unruhiger Blick' },
    { v: 'au-09', label: 'Lidflattern' },
    { v: 'au-10', label: 'häufiges Blinzeln' },
    { v: 'au-11', label: 'auffällig geweitete Pupillen' },
    { v: 'au-12', label: 'auffällig verengte Pupillen' },
    { v: 'au-13', label: 'unterschiedlich große Pupillen' },
    { v: 'au-14', label: 'träge Pupillenreaktion' },
    { v: 'au-15', label: 'verzögerte Lichtreaktion' },
    { v: 'au-16', label: 'fehlende erkennbare Pupillenreaktion' },
    { v: 'au-17', label: 'unkontrollierte Augenbewegungen' },
    { v: 'au-18', label: 'Schwierigkeiten, Blickkontakt zu halten' }
  ]},
  { category: '2 · Sprache & Aussprache', items: [
    { v: 'sp-01', label: 'verwaschene Aussprache' },
    { v: 'sp-02', label: 'lallende Aussprache' },
    { v: 'sp-03', label: 'undeutliche Aussprache' },
    { v: 'sp-04', label: 'verlangsamte Sprache' },
    { v: 'sp-05', label: 'auffällig schnelle Sprache' },
    { v: 'sp-06', label: 'sehr leise Sprache' },
    { v: 'sp-07', label: 'sehr laute Sprache' },
    { v: 'sp-08', label: 'stockende Sprache' },
    { v: 'sp-09', label: 'sprunghafte Sprache' },
    { v: 'sp-10', label: 'zusammenhanglose Äußerungen' },
    { v: 'sp-11', label: 'Wortfindungsstörungen' },
    { v: 'sp-12', label: 'wiederholende Äußerungen' },
    { v: 'sp-13', label: 'unpassende Antworten' },
    { v: 'sp-14', label: 'verzögerte Reaktion auf Ansprache' },
    { v: 'sp-15', label: 'schwer verständliche Äußerungen' }
  ]},
  { category: '3 · Gang, Stand & Gleichgewicht', items: [
    { v: 'gs-01', label: 'schwankender Gang' },
    { v: 'gs-02', label: 'Taumelgang' },
    { v: 'gs-03', label: 'unsicherer Gang' },
    { v: 'gs-04', label: 'breitbeiniger Gang' },
    { v: 'gs-05', label: 'unsicherer Stand' },
    { v: 'gs-06', label: 'breitbeiniger Stand' },
    { v: 'gs-07', label: 'Festhalten an Gegenständen erforderlich' },
    { v: 'gs-08', label: 'Stolpern' },
    { v: 'gs-09', label: 'Wegknicken der Beine' },
    { v: 'gs-10', label: 'unsicheres Aufstehen' },
    { v: 'gs-11', label: 'unsicheres Hinsetzen' },
    { v: 'gs-12', label: 'Gleichgewichtsstörungen' },
    { v: 'gs-13', label: 'Schwierigkeiten beim Richtungswechsel' },
    { v: 'gs-14', label: 'verlangsamte Bewegungsabläufe' },
    { v: 'gs-15', label: 'auffällig hastige Bewegungen' }
  ]},
  { category: '4 · Koordination & Motorik', items: [
    { v: 'ko-01', label: 'motorische Unsicherheit' },
    { v: 'ko-02', label: 'Koordinationsstörungen' },
    { v: 'ko-03', label: 'fahrige Bewegungen' },
    { v: 'ko-04', label: 'unruhige Hände' },
    { v: 'ko-05', label: 'zitternde Hände' },
    { v: 'ko-06', label: 'Zittern am gesamten Körper' },
    { v: 'ko-07', label: 'Schwierigkeiten beim Greifen' },
    { v: 'ko-08', label: 'Schwierigkeiten beim Festhalten von Gegenständen' },
    { v: 'ko-09', label: 'Gegenstände fallen lassen' },
    { v: 'ko-10', label: 'auffällige Feinmotorikstörungen' },
    { v: 'ko-11', label: 'unkontrollierte Bewegungen' },
    { v: 'ko-12', label: 'Muskelzuckungen' },
    { v: 'ko-13', label: 'Kiefermahlen' },
    { v: 'ko-14', label: 'auffällige Kaubewegungen' },
    { v: 'ko-15', label: 'nestelnde Bewegungen' },
    { v: 'ko-16', label: 'verlangsamte Reaktionsfähigkeit' },
    { v: 'ko-17', label: 'übersteigerte Reaktionsfähigkeit' }
  ]},
  { category: '5 · Bewusstsein & Orientierung', items: [
    { v: 'bo-01', label: 'benommen wirkend' },
    { v: 'bo-02', label: 'schläfrig wirkend' },
    { v: 'bo-03', label: 'sediert wirkend' },
    { v: 'bo-04', label: 'schwer ansprechbar' },
    { v: 'bo-05', label: 'kurzzeitig nicht ansprechbar' },
    { v: 'bo-06', label: 'wechselnde Wachheit' },
    { v: 'bo-07', label: 'Abdriften im Gespräch' },
    { v: 'bo-08', label: 'verzögerte Auffassungsgabe' },
    { v: 'bo-09', label: 'zeitlich desorientiert' },
    { v: 'bo-10', label: 'örtlich desorientiert' },
    { v: 'bo-11', label: 'situativ desorientiert' },
    { v: 'bo-12', label: 'zur eigenen Person desorientiert' },
    { v: 'bo-13', label: 'Erinnerungslücken angegeben' },
    { v: 'bo-14', label: 'Erinnerungslücken erkennbar' },
    { v: 'bo-15', label: 'eingeschränkte Konzentrationsfähigkeit' },
    { v: 'bo-16', label: 'reduzierte Aufmerksamkeit' },
    { v: 'bo-17', label: 'verwirrter Eindruck' }
  ]},
  { category: '6 · Verhalten & psychischer Eindruck', items: [
    { v: 've-01', label: 'aggressives Auftreten' },
    { v: 've-02', label: 'gereiztes Auftreten' },
    { v: 've-03', label: 'distanzloses Verhalten' },
    { v: 've-04', label: 'enthemmtes Verhalten' },
    { v: 've-05', label: 'euphorisches Verhalten' },
    { v: 've-06', label: 'ausgelassenes Verhalten' },
    { v: 've-07', label: 'apathisches Verhalten' },
    { v: 've-08', label: 'auffällige Stimmungsschwankungen' },
    { v: 've-09', label: 'fehlende Einsichtsfähigkeit' },
    { v: 've-10', label: 'fehlende Kooperationsbereitschaft' },
    { v: 've-11', label: 'übersteigerte Gesprächigkeit' },
    { v: 've-12', label: 'auffällige Nervosität' },
    { v: 've-13', label: 'innere Unruhe' },
    { v: 've-14', label: 'sprunghafte Gedankenführung' },
    { v: 've-15', label: 'paranoide Äußerungen' },
    { v: 've-16', label: 'ängstliches Verhalten' },
    { v: 've-17', label: 'panikartiges Verhalten' },
    { v: 've-18', label: 'halluzinatorisch wirkendes Verhalten' },
    { v: 've-19', label: 'realitätsverkennende Äußerungen' },
    { v: 've-20', label: 'weinerliches Verhalten' },
    { v: 've-21', label: 'unangemessenes Lachen' },
    { v: 've-22', label: 'unangemessene Aggression' },
    { v: 've-23', label: 'widersprüchliche Angaben' },
    { v: 've-24', label: 'auffällige Risikobereitschaft' }
  ]},
  { category: '7 · Geruch', items: [
    { v: 'ge-01', label: 'Atemalkohol wahrnehmbar' },
    { v: 'ge-02', label: 'deutlicher Atemalkoholgeruch' },
    { v: 'ge-03', label: 'Cannabisgeruch wahrnehmbar' },
    { v: 'ge-04', label: 'Cannabisgeruch an Kleidung' },
    { v: 'ge-05', label: 'Cannabisgeruch aus Fahrzeug / Wohnung / Raum' },
    { v: 'ge-06', label: 'chemischer Geruch' },
    { v: 'ge-07', label: 'lösungsmittelartiger Geruch' },
    { v: 'ge-08', label: 'süßlicher Atemgeruch' },
    { v: 'ge-09', label: 'ungewöhnlicher Körpergeruch' },
    { v: 'ge-10', label: 'Erbrochenengeruch' },
    { v: 'ge-11', label: 'kein auffälliger Geruch wahrnehmbar' }
  ]},
  { category: '8 · Äußeres Erscheinungsbild', items: [
    { v: 'ae-01', label: 'gerötetes Gesicht' },
    { v: 'ae-02', label: 'blasse Gesichtsfarbe' },
    { v: 'ae-03', label: 'fahle Gesichtsfarbe' },
    { v: 'ae-04', label: 'eingefallener Gesichtsausdruck' },
    { v: 'ae-05', label: 'auffällig müdes Erscheinungsbild' },
    { v: 'ae-06', label: 'ungepflegtes Erscheinungsbild' },
    { v: 'ae-07', label: 'der Witterung nicht angepasste Kleidung' },
    { v: 'ae-08', label: 'durchnässte Kleidung' },
    { v: 'ae-09', label: 'verschmutzte Kleidung' },
    { v: 'ae-10', label: 'beschädigte Kleidung' },
    { v: 'ae-11', label: 'erhöhte Schweißbildung' },
    { v: 'ae-12', label: 'kalter Schweiß' },
    { v: 'ae-13', label: 'trockene Lippen' },
    { v: 'ae-14', label: 'trockener Mund' },
    { v: 'ae-15', label: 'vermehrter Speichelfluss' },
    { v: 'ae-16', label: 'Übelkeit' },
    { v: 'ae-17', label: 'Erbrechen' },
    { v: 'ae-18', label: 'Nasenrötung' },
    { v: 'ae-19', label: 'Reizungen im Nasenbereich' },
    { v: 'ae-20', label: 'häufiges Reiben an Nase oder Gesicht' },
    { v: 'ae-21', label: 'sichtbare Einstichstellen' },
    { v: 'ae-22', label: 'frische Hautrötungen' },
    { v: 'ae-23', label: 'Kratzspuren' },
    { v: 'ae-24', label: 'auffällige Verletzungen' },
    { v: 'ae-25', label: 'Blutungen' },
    { v: 'ae-26', label: 'auffällige Körperhaltung' }
  ]}
];

var STOFFGRUPPEN = [
  { v: 'BZD',  label: 'BZD (Benzodiazepine)' },
  { v: 'AMP',  label: 'AMP (Amphetamine)' },
  { v: 'MOR',  label: 'MOR (Morphin / Opiate)' },
  { v: 'THC',  label: 'THC (Cannabis)' },
  { v: 'COC',  label: 'COC (Kokain)' },
  { v: 'MDMA', label: 'MDMA (Ecstasy)' },
  { v: 'MET',  label: 'MET (Methamphetamin)' }
];

var ANGABEN_VORLAGEN = [
  {
    v: 'vuf',
    label: 'VUF · Fahrzeug abgestellt',
    desc: 'Fahrzeug wurde abgestellt – bei Rückkehr beschädigt vorgefunden'
  },
  {
    v: 'frei',
    label: 'Freitext',
    desc: 'Angaben in eigenen Worten frei formulieren'
  }
];

var ROLLEN_MAP = {
  zeuge:  { disp: 'der Zeuge',               dativ: 'dem Zeugen',               btyp: 'zeuge', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  zeugin: { disp: 'die Zeugin',              dativ: 'der Zeugin',               btyp: 'zeuge', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  },
  ub01m:  { disp: 'der Unfallbeteiligte 01', dativ: 'dem Unfallbeteiligten 01', btyp: 'zeuge', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  ub01w:  { disp: 'die Unfallbeteiligte 01', dativ: 'der Unfallbeteiligten 01', btyp: 'zeuge', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  },
  ub02m:  { disp: 'der Unfallbeteiligte 02', dativ: 'dem Unfallbeteiligten 02', btyp: 'zeuge', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  ub02w:  { disp: 'die Unfallbeteiligte 02', dativ: 'der Unfallbeteiligten 02', btyp: 'zeuge', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  },
  beschm: { disp: 'der Beschuldigte',        dativ: 'dem Beschuldigten',        btyp: 'besch', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  beschw: { disp: 'die Beschuldigte',        dativ: 'der Beschuldigten',        btyp: 'besch', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  },
  geschm: { disp: 'der Geschädigte',         dativ: 'dem Geschädigten',         btyp: 'zeuge', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  geschw: { disp: 'die Geschädigte',         dativ: 'der Geschädigten',         btyp: 'zeuge', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  }
};

var schilderungen = [];
var schildCounter = 0;
var schildCurrentIdx = null;
var massnahmenData = {
  unfallmitteilungen: false,
  unfallDigitalRollen: [], unfallDigitalUhrzeit: '', unfallDigitalNwKennung: '',
  bescheinigungen: [], bescheinigungenUhrzeit: '', bescheinigungenNwKennung: '',
  kunoSperrung: false,
  sachfahndung: false,
  lichtbilder: false,
  dokumente: false, dokumenteRollen: [], dokumenteBeamterGender: 'm',
  bescheinigungAusgehaendigt: [],
  weiterfahrtUntersagt: [],
  entsorgungVerzicht: [], entsorgungGegenstaende: '',
  gefaehrderanspracheRolle: 'beschm', gefaehrderanspracheKomp: [], gefaehrderanspracheHg: false
};
var psychkgData = { verhaltensText: '', personRolle: '', anlass: '', orgTyp: '', mitGender: 'm', mitName: '', arztGender: 'm', arztName: '', transport: '', begleitung: null };
var haftbefehlData = {
  personRolle: 'betroffm',
  hbForm: 'Strafbefehl',
  gericht: 'Amtsgerichts Gütersloh',
  hbDatum: '',
  hbAz: '',
  rkSeit: '',
  tagessaetze: '',
  tagessatzBetrag: '',
  ersatzTage: '',
  useEventTime: true,
  kontrolleUhrzeit: '',
  zielort: 'ZPG Gütersloh'
};
var anzeigeIntro = { datum: '', uhrzeit: '', name: '', rolle: '', was: '' };
var anzeigePersonen = [];
var anzeigeCounter = 0;
var anzeigeCurrentIdx = null;

function getActiveSlides() {
  var slides = [];
  var ORDER = ['allgemeines','oertlichkeit','verhaeltnisse','spuren','fahrzeug','schilderungen','blutprobe','vermisst','massnahmen','psychkg','haftbefehl','anzeige'];
  ORDER.forEach(function(key) {
    if (selectedSections.indexOf(key) === -1) return;
    var def = SECTION_DEFS[key];
    if (!def) return;
    def.getSlides().forEach(function(id) {
      if (slides.indexOf(id) === -1) slides.push(id);
    });
  });
  return slides.length > 0 ? slides : ['slide-0'];
}

// Touch drag
document.addEventListener('touchmove', function (e) {
  if (!touchData.active) return;
  e.preventDefault();
  var touch = e.touches[0];
  var els = document.querySelectorAll('.besatzung-item:not(.dragging)');
  var newOver = null;
  els.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) newOver = el;
  });
  if (touchData.overItem && touchData.overItem !== newOver) touchData.overItem.classList.remove('drag-over');
  if (newOver) { newOver.classList.add('drag-over'); touchData.overItem = newOver; }
}, { passive: false });

document.addEventListener('touchend', function () {
  if (!touchData.active) return;
  var srcItem = document.querySelector('.besatzung-item.dragging');
  if (srcItem) srcItem.classList.remove('dragging');
  if (touchData.overItem) {
    touchData.overItem.classList.remove('drag-over');
    var sw = streifenwagen.find(function(s) { return s.id === touchData.swId; });
    if (sw) {
      var fi = sw.besatzung.findIndex(function(x) { return x.id === touchData.srcId; });
      var ti = sw.besatzung.findIndex(function(x) { return x.id === parseInt(touchData.overItem.dataset.bid); });
      if (fi !== ti && fi !== -1 && ti !== -1) {
        var moved = sw.besatzung.splice(fi, 1)[0];
        sw.besatzung.splice(ti, 0, moved);
        renderStreifenwagen();
      }
    }
  }
  touchData.active = false; touchData.srcId = null; touchData.swId = null; touchData.overItem = null;
});

// Init
document.getElementById('datum').value = today;
document.getElementById('btnAddSW').onclick = addStreifenwagen;
document.getElementById('btnNext0').onclick = nextSlide;
document.getElementById('btnNext1').onclick = nextSlide;
document.getElementById('btnNext2').onclick = nextSlide;
document.getElementById('btnNext3').onclick = nextSlide;
document.getElementById('btnUoS1').onclick = nextSlide;
document.getElementById('btnUoS1b').onclick = nextSlide;
document.getElementById('btnUoS2').onclick = nextSlide;
document.getElementById('btnUoS3').onclick = nextSlide;
document.getElementById('btnUoS4').onclick = nextSlide;
document.getElementById('btnUoS4b').onclick = nextSlide;
document.getElementById('btnUoS5').onclick = nextSlide;
document.getElementById('btnUoP1').onclick = nextSlide;
document.getElementById('btnUoP2').onclick = nextSlide;
document.getElementById('btnUoSpuren').onclick = nextSlide;
document.getElementById('btnGenerateSchilderungen').onclick = nextSlide;
document.getElementById('btnGenerateUmstaende').onclick = nextSlide;
document.getElementById('btnGenerateVerletzung').onclick = nextSlide;
document.getElementById('btnGenerateAuffaelligkeiten').onclick = nextSlide;
document.getElementById('btnGenerateAnweisungen').onclick = nextSlide;
document.getElementById('btnGenerateAlkoholTest').onclick = nextSlide;
document.getElementById('btnGenerateBtmTest').onclick = nextSlide;
document.getElementById('btnGenerateAngaben').onclick = nextSlide;
document.getElementById('btnGenerateMassnahmen').onclick = nextSlide;
document.getElementById('btnPsychKGWeiter1').onclick = nextSlide;
document.getElementById('btnPsychKGWeiter2').onclick = nextSlide;
document.getElementById('btnGeneratePsychKG').onclick = nextSlide;
document.getElementById('btnGenerateHaftbefehl').onclick = nextSlide;
document.getElementById('btnBlutprobeAnordnung').onclick = nextSlide;
document.getElementById('btnBlutprobeEntnahme').onclick = nextSlide;
document.getElementById('btnVermisst1').onclick = nextSlide;
document.getElementById('btnVermisst2').onclick = nextSlide;
document.getElementById('btnVermisst3').onclick = nextSlide;

document.getElementById('btnAuffCustomAdd').onclick = function() {
  var inp = document.getElementById('auffCustomInput');
  var val = inp.value.trim(); if (!val) return;
  var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null; if (!s) return;
  if (!s.auffCustom) s.auffCustom = [];
  s.auffCustom.push(val); inp.value = '';
  renderAuffCustomList(); inp.focus();
};
document.getElementById('auffCustomInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAuffCustomAdd').click(); }
});
document.getElementById('btnAddWeiterePerson').onclick = function() { addSchilderung(); jumpToSlide('slide-schilderungen'); };
document.getElementById('btnErstelleBericht').onclick = nextSlide;
document.getElementById('btnAnzeigeIntroWeiter').onclick = nextSlide;
document.getElementById('btnAnzeigeWasWeiter').onclick = nextSlide;
document.getElementById('btnAnzeigeSchlWeiter').onclick = nextSlide;
document.getElementById('btnAnzeigeAngabenWeiter').onclick = nextSlide;
document.getElementById('btnAnzeigeWeiterePerson').onclick = function() { addAnzeigePerson(); jumpToSlide('slide-anzeige-schild'); };
document.getElementById('btnAnzeigeErstelleBericht').onclick = nextSlide;
document.getElementById('btnBack').onclick = prevSlide;
document.getElementById('btnCopy').onclick = copyText;
document.getElementById('btnReset').onclick = resetAll;
document.getElementById('btnLocate').onclick = function () { ermittleStandort('haupt'); };
document.getElementById('btnLocatePk').onclick = function () { ermittleStandort('pk'); };

document.getElementById('nachtragenCheck').onchange = function () {
  document.getElementById('timeFields').classList.toggle('hidden', this.checked);
};

document.getElementById('keineSpurenCheck').onchange = function () {
  document.getElementById('spurenFields').classList.toggle('hidden', this.checked);
};

document.getElementById('einsatzanlass').oninput = function () {
  document.querySelectorAll('[data-text]').forEach(function (b) {
    b.classList.toggle('active', b.dataset.text === this.value);
  }, this);
};

// Einsatzanlass-Chips (data-text)
document.querySelectorAll('[data-text]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.getElementById('einsatzanlass').value = this.dataset.text;
    document.querySelectorAll('[data-text]').forEach(function (b) { b.classList.remove('active'); });
    this.classList.add('active');
    var wrap = this.closest('.suggestions');
    if (wrap) wrap.classList.add('has-selection');
  });
});

// Generische Chip-Gruppen (data-group)
document.querySelectorAll('[data-group]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var group = this.dataset.group;
    document.querySelectorAll('[data-group="' + group + '"]').forEach(function (b) { b.classList.remove('active'); });
    this.classList.add('active');
    var wrap = this.closest('.suggestions');
    if (wrap) wrap.classList.remove('chip-error');
    if (group === 'uo-typ') {
      branch = this.dataset.value;
      nextSlide();
    }
  });
});

// Speed chips (data-speed)
document.querySelectorAll('[data-speed]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var speed = this.dataset.speed;
    document.getElementById('uo-tempo').value = speed;
    document.getElementById('uo-tempo').classList.remove('field-error');
    document.querySelectorAll('[data-speed]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.speed === speed);
    });
    var grundWrap = document.querySelector('.suggestions[data-required-if="uo-tempo"]');
    if (grundWrap) grundWrap.classList.remove('chip-error');
  });
});

document.getElementById('uo-tempo').addEventListener('input', function () {
  var val = this.value.trim();
  document.querySelectorAll('[data-speed]').forEach(function (b) {
    b.classList.toggle('active', b.dataset.speed === val);
  });
  if (!val) {
    var grundWrap = document.querySelector('.suggestions[data-required-if="uo-tempo"]');
    if (grundWrap) grundWrap.classList.remove('chip-error');
  }
});

function dismissStart() {
  if (!selectedSections.length) return;
  render();
  var s = document.getElementById('screen-start');
  s.classList.add('dismissed');
  s.addEventListener('transitionend', function () { s.style.display = 'none'; }, { once: true });
}
document.getElementById('btnStart').onclick = function () { dismissStart(); };

function renderLibrary() {
  var cont = document.getElementById('libraryBausteins');
  if (!cont) return;
  cont.innerHTML = '';
  var ORDER = ['allgemeines','oertlichkeit','verhaeltnisse','spuren','fahrzeug','schilderungen','blutprobe','vermisst','massnahmen','psychkg','haftbefehl','anzeige'];
  ORDER.forEach(function(key) {
    var def = SECTION_DEFS[key];
    var isOn = selectedSections.indexOf(key) !== -1;

    // Compute dependency notes
    var depNote = '';
    if (key === 'schilderungen' && isOn && selectedSections.indexOf('allgemeines') === -1) {
      depNote = '+ Besatzung wird automatisch abgefragt';
    }
    if (key === 'anzeige' && isOn && selectedSections.indexOf('allgemeines') === -1) {
      depNote = '+ Besatzung wird automatisch abgefragt';
    }
    if (key === 'verhaeltnisse' && isOn && selectedSections.indexOf('oertlichkeit') === -1) {
      depNote = 'Örtlichkeit wird automatisch vorangestellt';
    }

    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'baustein-card' + (isOn ? ' selected' : '');
    card.innerHTML =
      '<span class="baustein-icon">' + def.icon + '</span>' +
      '<div class="baustein-text">' +
        '<span class="baustein-label">' + def.label + '</span>' +
        '<span class="baustein-desc">' + def.desc + '</span>' +
        (depNote ? '<span class="baustein-dep">' + depNote + '</span>' : '') +
      '</div>' +
      '<span class="baustein-check">' + (isOn ? '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</span>';
    card.onclick = function() {
      var idx = selectedSections.indexOf(key);
      if (idx !== -1) selectedSections.splice(idx, 1);
      else selectedSections.push(key);
      renderLibrary();
    };
    cont.appendChild(card);
  });
  document.getElementById('btnStart').disabled = selectedSections.length === 0;
}

document.getElementById('btnPresetStrasse').onclick = function() {
  selectedSections = LEITFAEDEN.strasse.sections.slice();
  renderLibrary();
};
document.getElementById('btnPresetParkplatz').onclick = function() {
  selectedSections = LEITFAEDEN.parkplatz.sections.slice();
  renderLibrary();
};

addStreifenwagen();
renderLibrary();
render();
ladeGueterslohStrassen();

// ── Dev-Skip-Button ─────────────────────────────────────────
document.querySelectorAll('.btn-next').forEach(function (btn) {
  var skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'btn-dev-skip';
  skip.textContent = 'DEV ▶';
  skip.onclick = skipSlide;
  btn.parentNode.insertBefore(skip, btn.nextSibling);
});

// ── Besatzung ──────────────────────────────────────────────

function addStreifenwagen() {
  swCounter++;
  var swId = swCounter;
  streifenwagen.push({ id: swId, besatzung: [] });
  addBesatzungMember(swId);
}

function addBesatzungMember(swId) {
  var sw = streifenwagen.find(function(s) { return s.id === swId; });
  if (!sw) return;
  idCounter++;
  sw.besatzung.push({ id: idCounter, name: '', grad: 'POK' });
  renderStreifenwagen();
  setTimeout(function() {
    var inputs = document.querySelectorAll('.b-name');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }, 50);
}

function removeBesatzungMember(swId, memberId) {
  var sw = streifenwagen.find(function(s) { return s.id === swId; });
  if (!sw) return;
  sw.besatzung = sw.besatzung.filter(function(b) { return b.id !== memberId; });
  renderStreifenwagen();
}

function removeStreifenwagen(swId) {
  streifenwagen = streifenwagen.filter(function(s) { return s.id !== swId; });
  renderStreifenwagen();
}

function renderStreifenwagen() {
  var cont = document.getElementById('streifenwagenList');
  if (!cont) return;
  cont.innerHTML = '';

  streifenwagen.forEach(function(sw, swIdx) {
    var card = document.createElement('div');
    card.className = 'sw-card';

    var hdr = document.createElement('div'); hdr.className = 'sw-header';
    var title = document.createElement('div'); title.className = 'sw-title';
    title.textContent = 'Streifenwagen ' + (swIdx + 1);
    hdr.appendChild(title);
    if (streifenwagen.length > 1) {
      var rmSw = document.createElement('button'); rmSw.type = 'button'; rmSw.className = 'btn-remove';
      rmSw.innerHTML = '&times;';
      (function(id) { rmSw.onclick = function() { removeStreifenwagen(id); }; })(sw.id);
      hdr.appendChild(rmSw);
    }
    card.appendChild(hdr);

    var body = document.createElement('div'); body.className = 'sw-body';

    var memberList = document.createElement('div'); memberList.className = 'besatzung-list';

    sw.besatzung.forEach(function(b) {
      var item = document.createElement('div');
      item.className = 'besatzung-item';
      item.draggable = true;
      item.dataset.bid = b.id;
      item.dataset.swid = sw.id;

      var handle = document.createElement('div'); handle.className = 'drag-handle';
      handle.innerHTML = '<span></span><span></span><span></span>';
      handle.addEventListener('touchstart', function(e) {
        touchData.active = true; touchData.srcId = b.id; touchData.swId = sw.id; touchData.overItem = null;
        item.classList.add('dragging'); e.preventDefault();
      }, { passive: false });
      item.appendChild(handle);

      var fields = document.createElement('div'); fields.className = 'besatzung-fields';

      var sel = document.createElement('select'); sel.className = 'field-select';
      DIENSTGRADE.forEach(function(g) {
        var o = document.createElement('option'); o.value = g; o.textContent = g;
        if (g === b.grad) o.selected = true; sel.appendChild(o);
      });
      sel.onchange = function() { b.grad = this.value; };
      fields.appendChild(sel);

      var ni = document.createElement('input'); ni.type = 'text'; ni.className = 'field-input b-name';
      ni.placeholder = 'Nachname'; ni.value = b.name; ni.dataset.bid = b.id;
      ni.oninput = function() { b.name = this.value; };
      fields.appendChild(ni);

      item.appendChild(fields);

      var rb = document.createElement('button'); rb.className = 'btn-remove'; rb.innerHTML = '&times;'; rb.title = 'Entfernen';
      (function(sid, bid) { rb.onclick = function() { removeBesatzungMember(sid, bid); }; })(sw.id, b.id);
      item.appendChild(rb);

      item.addEventListener('dragstart', function(e) {
        dragSrc = item; item.dataset.dragswid = sw.id;
        setTimeout(function() { item.classList.add('dragging'); }, 0);
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', function() {
        item.classList.remove('dragging');
        memberList.querySelectorAll('.besatzung-item').forEach(function(el) { el.classList.remove('drag-over'); });
      });
      item.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (item !== dragSrc && item.dataset.swid === dragSrc.dataset.swid) {
          memberList.querySelectorAll('.besatzung-item').forEach(function(el) { el.classList.remove('drag-over'); });
          item.classList.add('drag-over');
        }
      });
      item.addEventListener('drop', function(e) {
        e.preventDefault();
        if (dragSrc && dragSrc !== item && item.dataset.swid === dragSrc.dataset.swid) {
          var fi = sw.besatzung.findIndex(function(x) { return x.id === parseInt(dragSrc.dataset.bid); });
          var ti = sw.besatzung.findIndex(function(x) { return x.id === b.id; });
          if (fi !== -1 && ti !== -1 && fi !== ti) {
            var moved = sw.besatzung.splice(fi, 1)[0];
            sw.besatzung.splice(ti, 0, moved);
            renderStreifenwagen();
          }
        }
      });

      memberList.appendChild(item);
    });

    body.appendChild(memberList);

    if (sw.besatzung.length >= 2) {
      var hint = document.createElement('div'); hint.className = 'drag-hint';
      hint.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg> Reihenfolge per Ziehen ändern';
      body.appendChild(hint);
    }

    var addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.className = 'btn-add';
    addBtn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Besatzungsmitglied hinzufügen';
    (function(id) { addBtn.onclick = function() { addBesatzungMember(id); }; })(sw.id);
    body.appendChild(addBtn);

    card.appendChild(body);
    cont.appendChild(card);
  });
}

// ── Navigation ─────────────────────────────────────────────

function nextSlide() {
  var slides = getActiveSlides();
  var slideId = slides[current];
  var slideEl = document.getElementById(slideId);
  if (slideEl) {
    var groups = {};
    slideEl.querySelectorAll('[data-group]').forEach(function (b) { groups[b.dataset.group] = true; });
    var missing = false;
    Object.keys(groups).forEach(function (g) {
      var wrap = slideEl.querySelector('.suggestions:has([data-group="' + g + '"])') ||
        (function() {
          var btn = slideEl.querySelector('[data-group="' + g + '"]');
          return btn ? btn.closest('.suggestions') : null;
        })();
      // Skip validation when dependency field is empty
      var requiredIf = wrap ? wrap.dataset.requiredIf : null;
      if (requiredIf) {
        var depEl = document.getElementById(requiredIf);
        if (!depEl || !depEl.value.trim()) {
          if (wrap) wrap.classList.remove('chip-error');
          return;
        }
      }
      var hasActive = !!slideEl.querySelector('[data-group="' + g + '"].active');
      if (!hasActive) {
        missing = true;
        if (wrap) { wrap.classList.add('chip-error'); }
      } else {
        if (wrap) { wrap.classList.remove('chip-error'); }
      }
    });
    slideEl.querySelectorAll('[data-required]').forEach(function (inp) {
      if (!inp.value.trim()) {
        missing = true;
        inp.classList.add('field-error');
      } else {
        inp.classList.remove('field-error');
      }
    });
    if (missing) return;
  }
  if (current < slides.length - 1) { current++; render(); }
  else { generateResult(); }
}

// Clear field-error as soon as the user starts typing
document.addEventListener('input', function (e) {
  if (e.target.classList && e.target.classList.contains('field-error')) {
    e.target.classList.remove('field-error');
  }
});

function prevSlide() {
  if (current > 0) { current--; render(); }
}

function skipSlide() {
  var slides = getActiveSlides();
  if (current < slides.length - 1) { current++; render(); }
  else generateResult();
}

function render() {
  buildFzDetailSlides();
  var slides = getActiveSlides();
  var TOTAL = slides.length;

  document.querySelectorAll('.slide:not(#slide-result)').forEach(function (s) {
    s.classList.remove('active', 'exit-left');
  });
  slides.forEach(function (id, i) {
    var s = document.getElementById(id);
    if (!s) return;
    if (i === current) { s.classList.add('active'); s.scrollTop = 0; }
    else if (i < current) s.classList.add('exit-left');
  });
  document.getElementById('slide-result').classList.remove('active', 'exit-left');

  document.getElementById('progress').style.width = ((current + 1) / TOTAL * 100) + '%';
  document.getElementById('stepCounter').textContent =
    ('0' + (current + 1)).slice(-2) + ' / ' + ('0' + TOTAL).slice(-2);
  document.getElementById('btnBack').disabled = (current === 0);

  var dots = document.getElementById('dots');
  dots.innerHTML = '';
  for (var i = 0; i < TOTAL; i++) {
    var d = document.createElement('div');
    d.className = 'dot' + (i === current ? ' active' : i < current ? ' done' : '');
    dots.appendChild(d);
  }

  if (slides[current] === 'slide-uo-s1') {
    updateUoAdresseChips();
    var ot = document.getElementById('uo-ortsteil');
    if (!ot.value && autoOrtsteil) ot.value = autoOrtsteil;
  }
  if (slides[current] === 'slide-uo-p1') updateAdresseVorschlaege();
  if (slides[current] === 'slide-fz-nummer') renderFzNummer();
  if (slides[current] === 'slide-fz-picker') renderFzPicker();
  if (slides[current] && slides[current].indexOf('slide-fz-detail-') === 0) {
    renderFzDetail(parseInt(slides[current].replace('slide-fz-detail-', ''), 10));
  }
  if (slides[current] === 'slide-fz-abschluss') renderFzAbschluss();
  if (slides[current] === 'slide-schilderungen') {
    if (schilderungen.length === 0) addSchilderung();
    renderSchilderungen();
  }
  if (slides[current] === 'slide-schilderungen-umstaende') renderSchilderungenUmstaende();
  if (slides[current] === 'slide-schilderungen-verletzung') renderSchilderungenVerletzung();
  if (slides[current] === 'slide-schilderungen-auffaelligkeiten') renderSchilderungenAuffaelligkeiten();
  if (slides[current] === 'slide-schilderungen-anweisungen') renderSchilderungenAnweisungen();
  if (slides[current] === 'slide-schilderungen-alkohol-test') renderSchilderungenAlkoholTest();
  if (slides[current] === 'slide-schilderungen-btm-test') renderSchilderungenBtmTest();
  if (slides[current] === 'slide-schilderungen-angaben') renderSchilderungenAngaben();
  if (slides[current] === 'slide-schilderungen-overview') renderSchilderungenOverview();
  if (slides[current] === 'slide-massnahmen') renderMassnahmen();
  if (slides[current] === 'slide-psychkg') renderPsychKG();
  if (slides[current] === 'slide-psychkg-spd') renderPsychKGSpd();
  if (slides[current] === 'slide-psychkg-transport') renderPsychKGTransport();
  if (slides[current] === 'slide-haftbefehl') renderHaftbefehl();
  if (slides[current] === 'slide-0') renderStreifenwagen();
  if (slides[current] === 'slide-blutprobe-anordnung') renderBlutprobeAnordnung();
  if (slides[current] === 'slide-blutprobe-entnahme') renderBlutprobeEntnahme();
  if (slides[current] === 'slide-vermisst-1') renderVermisst1();
  if (slides[current] === 'slide-vermisst-2') renderVermisst2();
  if (slides[current] === 'slide-vermisst-3') renderVermisst3();
  if (slides[current] === 'slide-anzeige-intro') renderAnzeigeIntro();
  if (slides[current] === 'slide-anzeige-was') renderAnzeigeWas();
  if (slides[current] === 'slide-anzeige-schild') {
    if (anzeigePersonen.length === 0) addAnzeigePerson();
    renderAnzeigeSchild();
  }
  if (slides[current] === 'slide-anzeige-angaben') renderAnzeigeAngaben();
  if (slides[current] === 'slide-anzeige-overview') renderAnzeigeOverview();
  var activeSlideEl = document.getElementById(slides[current]);
  if (activeSlideEl) injectOrUpdatePreview(activeSlideEl, slides[current]);
}

// ── Einsatzanlass-Vorschau ──────────────────────────────────

function buildErsterSatz(anlass) {
  var nachtr = document.getElementById('nachtragenCheck').checked;
  var datum = document.getElementById('datum').value;
  var uhrzeit = document.getElementById('uhrzeit').value;
  var datumStr = '[Datum]';
  if (datum) {
    var d = new Date(datum + 'T00:00:00');
    datumStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  var uhrStr = nachtr ? '[nachzutragen]' : (uhrzeit || '[Uhrzeit]');
  var besStr, verb;
  if (streifenwagen.length === 0) {
    besStr = '[Besatzung]'; verb = 'erhielt';
  } else if (streifenwagen.length === 1) {
    var crew = streifenwagen[0].besatzung
      .filter(function(b) { return b.name && b.name.trim(); })
      .map(function(b) { return (b.grad ? b.grad + ' ' : '') + b.name.trim(); });
    besStr = crew.length ? crew.join(' / ') : '[Besatzung]';
    verb = 'erhielt';
  } else {
    var swTexts = streifenwagen.map(function(sw, i) {
      var crew = sw.besatzung
        .filter(function(b) { return b.name && b.name.trim(); })
        .map(function(b) { return (b.grad ? b.grad + ' ' : '') + b.name.trim(); });
      return crew.length ? crew.join(' / ') : '[Besatzung ' + (i+1) + ']';
    });
    besStr = swTexts.join(' sowie ');
    verb = 'erhielten';
  }
  return 'Am ' + datumStr + ', um ' + uhrStr + ' Uhr, ' + verb + ' die Streifenwagenbesatzung' +
    (streifenwagen.length > 1 ? 'en' : '') + ' ' + besStr + ' folgenden Einsatz: ' + (anlass || '…') + '.';
}

function updateUoAdresseChips() {
  var chips = document.getElementById('uo-adresse-chips');
  if (!chips) return;
  chips.innerHTML = '';
  var strasse = document.getElementById('strasse').value;
  var hausnummer = document.getElementById('hausnummer').value;
  var strasseVoll = strasse + (hausnummer ? ' ' + hausnummer : '');
  var options = [];
  if (strasseVoll) options.push({ label: strasseVoll, s: strasse, nr: hausnummer });
  if (strasse && hausnummer) options.push({ label: strasse, s: strasse, nr: '' });
  options.forEach(function (opt) {
    var btn = document.createElement('button');
    btn.className = 'btn-suggestion';
    btn.type = 'button';
    btn.textContent = opt.label;
    btn.addEventListener('click', function () {
      document.getElementById('uo-strasse').value = opt.s;
      document.getElementById('uo-hausnummer').value = opt.nr;
      if (autoOrtsteil) document.getElementById('uo-ortsteil').value = autoOrtsteil;
      else if (opt.s) fuelleUoOrtsteil(opt.s, true);
    });
    chips.appendChild(btn);
  });
}

function fuelleUoOrtsteil(name, tryNominatim) {
  var hit = GT_STREETS ? GT_STREETS[name] : null;
  if (hit && hit.ortsteil) {
    document.getElementById('uo-ortsteil').value = hit.ortsteil;
    return;
  }
  if (autoOrtsteil && document.getElementById('strasse').value.trim() === name) {
    document.getElementById('uo-ortsteil').value = autoOrtsteil;
    return;
  }
  if (!tryNominatim) return;
  fetch('https://nominatim.openstreetmap.org/search?' +
    'street=' + encodeURIComponent(name) +
    '&city=G%C3%BCtersloh&format=json&addressdetails=1&limit=1&countrycodes=de&accept-language=de')
    .then(function (r) { return r.json(); })
    .then(function (results) {
      if (!results.length) return;
      var a = results[0].address || {};
      var ortsteil = a.suburb || a.quarter || a.neighbourhood || '';
      if (ortsteil) document.getElementById('uo-ortsteil').value = ortsteil;
      if (GT_STREETS && name in GT_STREETS && GT_STREETS[name]) GT_STREETS[name].ortsteil = ortsteil;
    })
    .catch(function () {});
}

(function () {
  var input = document.getElementById('uo-strasse');
  if (!input) return;
  input.addEventListener('input', function () {
    var name = this.value.trim();
    if (!name) { document.getElementById('uo-ortsteil').value = ''; return; }
    fuelleUoOrtsteil(name, false);
  });
  input.addEventListener('blur', function () {
    var name = this.value.trim();
    if (name) fuelleUoOrtsteil(name, true);
  });
}());

function updateAdresseVorschlaege() {
  var chips = document.getElementById('adresse-chips');
  if (!chips) return;
  chips.innerHTML = '';
  var strasse = document.getElementById('strasse').value;
  var hausnummer = document.getElementById('hausnummer').value;
  var plz = document.getElementById('plz').value;
  var stadt = document.getElementById('stadt').value;
  var strasseVoll = strasse + (hausnummer ? ' ' + hausnummer : '');
  var options = [];
  if (strasseVoll) options.push(strasseVoll);
  if (strasse && strasse !== strasseVoll) options.push(strasse);
  options.forEach(function (val) {
    var btn = document.createElement('button');
    btn.className = 'btn-suggestion';
    btn.type = 'button';
    btn.textContent = val;
    btn.addEventListener('click', function () {
      document.getElementById('pk-adresse').value = val;
    });
    chips.appendChild(btn);
  });
}

function getSlidePreviewText(slideId) {
  var s1ids = ['slide-0','slide-1','slide-2','slide-3'];
  if (s1ids.indexOf(slideId) !== -1) {
    return buildErsterSatz(document.getElementById('einsatzanlass').value || '');
  }
  if (slideId === 'slide-uo-typ' || slideId === 'slide-uo-s1' || slideId === 'slide-uo-p1' || slideId === 'slide-uo-p2') {
    return generateOertlichkeitText() || '';
  }
  if (slideId === 'slide-uo-s1b' || slideId === 'slide-uo-s2' || slideId === 'slide-uo-s3' ||
      slideId === 'slide-uo-s4'  || slideId === 'slide-uo-s4b' || slideId === 'slide-uo-s5') {
    return generateVerkehrsText() || '';
  }
  if (slideId === 'slide-uo-spuren') {
    var st = spurenText(); return st ? st.replace(/^\n+/, '') : '';
  }
  if (slideId.indexOf('slide-fz-') === 0) return generateFahrzeugText() || '';
  if (slideId === 'slide-schilderungen' || slideId === 'slide-schilderungen-umstaende') return generateSchilderungenText() || '';
  return '';
}

function injectOrUpdatePreview(slideEl, slideId) {
  var text = getSlidePreviewText(slideId);
  if (!text) return;
  var strip = slideEl.querySelector('.preview-strip');
  if (!strip) {
    strip = document.createElement('details');
    strip.className = 'preview-strip';
    var summary = document.createElement('summary');
    summary.className = 'preview-toggle';
    summary.textContent = 'Vorschau';
    strip.appendChild(summary);
    var body = document.createElement('div');
    body.className = 'preview-body';
    strip.appendChild(body);
    var insertBefore = null;
    for (var i = slideEl.children.length - 1; i >= 0; i--) {
      var child = slideEl.children[i];
      if (!child.classList.contains('preview-strip') &&
          child.querySelector && (
            child.querySelector('.btn-next') ||
            child.querySelector('.btn-det-next') ||
            child.querySelector('.btn-det-back') ||
            child.classList.contains('btn-next') ||
            child.classList.contains('btn-det-next')
          )) {
        insertBefore = child; break;
      }
    }
    slideEl.insertBefore(strip, insertBefore || null);
  }
  var bodyEl = strip.querySelector('.preview-body');
  if (bodyEl) bodyEl.textContent = text;
}

// ── GPS-Standort ────────────────────────────────────────────

function ermittleStandort(target) {
  var btnId = target === 'pk' ? 'btnLocatePk' : 'btnLocate';
  var btn = document.getElementById(btnId);
  var svgHtml = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Standort ermitteln';
  if (!navigator.geolocation) { alert('GPS nicht verfügbar'); return; }
  btn.textContent = 'Wird ermittelt…';
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(function (pos) {
    fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' +
      pos.coords.latitude + '&lon=' + pos.coords.longitude + '&accept-language=de')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var a = data.address || {};
        var nr = a.house_number ? ' ' + a.house_number : '';
        if (target === 'pk') {
          document.getElementById('pk-adresse').value = (a.road || '') + nr;
        } else {
          document.getElementById('strasse').value = a.road || '';
          document.getElementById('hausnummer').value = a.house_number || '';
          document.getElementById('plz').value = a.postcode || '';
          document.getElementById('stadt').value = a.city || a.town || a.village || a.municipality || '';
        }
        btn.textContent = 'Standort ermittelt ✓';
        btn.disabled = false;
        setTimeout(function () { btn.innerHTML = svgHtml; }, 3000);
      })
      .catch(function () {
        btn.innerHTML = svgHtml;
        btn.disabled = false;
      });
  }, function () {
    btn.innerHTML = svgHtml;
    btn.disabled = false;
    alert('GPS-Zugriff wurde verweigert.');
  }, { timeout: 10000 });
}

// ── Straßen-Autocomplete (Gütersloh) ────────────────────────

(function () {
  var input = document.getElementById('strasse');
  var dd = document.getElementById('strassen-dropdown');

  function closeDropdown() {
    dd.classList.remove('open');
    dd.innerHTML = '';
  }

  function selectStreet(name) {
    input.value = name;
    closeDropdown();
    var hit = GT_STREETS ? GT_STREETS[name] : null;
    if (hit) fuelleAdressfelder(hit);
    else strasseDetailLaden(name);
    setTimeout(function () { document.getElementById('hausnummer').focus(); }, 50);
  }

  function openDropdown(matches) {
    dd.innerHTML = '';
    matches.forEach(function (name) {
      var item = document.createElement('div');
      item.className = 'street-dropdown-item';
      item.textContent = name;
      item.addEventListener('mousedown', function (e) { e.preventDefault(); selectStreet(name); });
      item.addEventListener('touchstart', function (e) { e.preventDefault(); selectStreet(name); }, { passive: false });
      dd.appendChild(item);
    });
    dd.classList.add('open');
  }

  input.addEventListener('input', function () {
    var q = this.value.trim();
    if (q.length < 2) { closeDropdown(); return; }
    if (GT_STREETS === null) {
      dd.innerHTML = '<div class="street-dropdown-item street-dropdown-hint">Straßen werden geladen …</div>';
      dd.classList.add('open');
      return;
    }
    var qLow = q.toLowerCase();
    var matches = Object.keys(GT_STREETS)
      .filter(function (n) {
        var low = n.toLowerCase();
        return low.startsWith(qLow) || low.indexOf(' ' + qLow) !== -1;
      })
      .sort()
      .slice(0, 12);
    if (matches.length) openDropdown(matches); else closeDropdown();
  });

  input.addEventListener('blur', function () {
    setTimeout(closeDropdown, 150);
  });
}());

function fuelleAdressfelder(data) {
  if (!data) return;
  if (data.plz) document.getElementById('plz').value = data.plz;
  if (data.stadt) document.getElementById('stadt').value = data.stadt;
  if (data.ortsteil) autoOrtsteil = data.ortsteil;
}

function strasseDetailLaden(name) {
  fetch('https://nominatim.openstreetmap.org/search?' +
    'street=' + encodeURIComponent(name) +
    '&city=G%C3%BCtersloh&format=json&addressdetails=1&limit=1&countrycodes=de&accept-language=de')
    .then(function (r) { return r.json(); })
    .then(function (results) {
      if (!results.length) return;
      var a = results[0].address || {};
      var data = {
        plz: a.postcode || '',
        stadt: a.city || a.town || a.village || 'Gütersloh',
        ortsteil: a.suburb || a.quarter || a.neighbourhood || ''
      };
      if (GT_STREETS) GT_STREETS[name] = data;
      fuelleAdressfelder(data);
    })
    .catch(function () {});
}

function ladeGueterslohStrassen() {
  try {
    var cached = localStorage.getItem('gt_streets_v2');
    if (cached) {
      var obj = JSON.parse(cached);
      if (obj.ts && Date.now() - obj.ts < 7 * 24 * 3600 * 1000 && Object.keys(obj.data).length > 0) {
        GT_STREETS = obj.data;
        return;
      }
    }
  } catch (e) {}

  var q = '[out:json][timeout:25];area[name="Gütersloh"]["admin_level"="8"]->.gt;way["highway"]["name"](area.gt);out tags;';
  var endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter'
  ];

  function tryEndpoint(i) {
    if (i >= endpoints.length) { GT_STREETS = {}; return; }
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 12000);
    fetch(endpoints[i], { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: controller.signal })
      .then(function (r) { clearTimeout(timer); return r.json(); })
      .then(function (data) {
        var names = {};
        data.elements.forEach(function (el) {
          var name = el.tags && el.tags.name;
          if (name) names[name] = null;
        });
        GT_STREETS = Object.keys(names).length > 0 ? names : {};
        if (Object.keys(names).length > 0) {
          try { localStorage.setItem('gt_streets_v2', JSON.stringify({ ts: Date.now(), data: names })); } catch (e) {}
        }
      })
      .catch(function () { clearTimeout(timer); tryEndpoint(i + 1); });
  }

  tryEndpoint(0);
}

// ── Chip-Wert lesen ─────────────────────────────────────────

function getChipValue(group) {
  var active = document.querySelector('[data-group="' + group + '"].active');
  return active ? active.dataset.value : null;
}

// ── Fahrzeugspuren (slide-basiert) ──────────────────────────

function mkTeilDetail() {
  return { schadensart: [], schadensartFrei: '', verlauf: '', von: '', bis: '', lackanhaftungen: null, farbe: '', pergamintute: null, spurfix: null };
}

function buildFzDetailSlides() {
  document.querySelectorAll('[id^="slide-fz-detail-"]').forEach(function (el) {
    el.parentNode.removeChild(el);
  });
  if (fzCurrentIdx === null || !fahrzeugSpuren[fzCurrentIdx]) return;
  var fz = fahrzeugSpuren[fzCurrentIdx];
  var anchor = document.getElementById('slide-schilderungen');
  fz.selectedTeile.forEach(function (teilName, i) {
    var slide = document.createElement('div');
    slide.className = 'slide';
    slide.id = 'slide-fz-detail-' + i;
    anchor.parentNode.insertBefore(slide, anchor);
  });
}

function jumpToSlide(id) {
  buildFzDetailSlides();
  var slides = getActiveSlides();
  var idx = slides.indexOf(id);
  if (idx !== -1) { current = idx; render(); }
}

function startFahrzeugErfassen() {
  if (!fzSelectedNum) return;
  var existingIdx = -1;
  for (var i = 0; i < fahrzeugSpuren.length; i++) {
    if (fahrzeugSpuren[i].zugehoerigkeit === fzSelectedNum) { existingIdx = i; break; }
  }
  if (existingIdx !== -1) {
    fzCurrentIdx = existingIdx;
  } else {
    fzCounter++;
    fahrzeugSpuren.push({ id: fzCounter, zugehoerigkeit: fzSelectedNum, selectedTeile: [], teileDetails: {}, aufgrundText: null, wert: '', lichtbilder: null });
    fzCurrentIdx = fahrzeugSpuren.length - 1;
  }
  nextSlide();
}

function renderFzNummer() {
  var cont = document.getElementById('fz-nummer-content');
  if (!cont) return;
  cont.innerHTML = '';
  var doneNums = fahrzeugSpuren.map(function (fz) { return fz.zugehoerigkeit; });

  var numRow = document.createElement('div');
  numRow.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:28px;';
  for (var n = 1; n <= fzNummernMax; n++) {
    var numStr = n < 10 ? '0' + n : '' + n;
    var isDone = doneNums.indexOf(numStr) !== -1;
    var isSelected = fzSelectedNum === numStr;
    var cls = 'btn-fz-num' + (isDone ? ' done' : '') + (isSelected ? ' selected' : '');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = cls; btn.textContent = numStr;
    (function (ns) { btn.onclick = function () { fzSelectedNum = ns; renderFzNummer(); }; })(numStr);
    numRow.appendChild(btn);
  }
  var addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn-fz-num add'; addBtn.textContent = '+';
  addBtn.onclick = function () { fzNummernMax++; renderFzNummer(); };
  numRow.appendChild(addBtn);
  cont.appendChild(numRow);

  var erfassenBtn = document.createElement('button');
  erfassenBtn.type = 'button'; erfassenBtn.className = 'btn-det-next';
  if (!fzSelectedNum) {
    erfassenBtn.textContent = 'Ordnungsnummer wählen';
    erfassenBtn.disabled = true; erfassenBtn.style.opacity = '0.4'; erfassenBtn.style.cursor = 'default';
  } else {
    var isDoneSelected = doneNums.indexOf(fzSelectedNum) !== -1;
    erfassenBtn.textContent = isDoneSelected ? 'Fahrzeug ' + fzSelectedNum + ' bearbeiten →' : 'Fahrzeug ' + fzSelectedNum + ' erfassen →';
    erfassenBtn.onclick = startFahrzeugErfassen;
  }
  cont.appendChild(erfassenBtn);

  if (fahrzeugSpuren.length > 0) {
    var fzSlides = getActiveSlides();
    var afterFzSlide = null;
    for (var k = fzSlides.length - 1; k >= 0; k--) {
      if (fzSlides[k].indexOf('slide-fz-') === 0) { afterFzSlide = fzSlides[k + 1] || null; break; }
    }
    var skipBtn = document.createElement('button');
    skipBtn.type = 'button'; skipBtn.className = 'btn-det-back'; skipBtn.style.marginTop = '14px';
    if (afterFzSlide) {
      skipBtn.textContent = afterFzSlide === 'slide-schilderungen' ? 'Zu den Schilderungen →' : 'Weiter →';
      skipBtn.onclick = function () { fzCurrentIdx = null; jumpToSlide(afterFzSlide); };
    } else {
      skipBtn.textContent = 'Bericht erstellen →';
      skipBtn.onclick = function () { fzCurrentIdx = null; generateResult(); };
    }
    cont.appendChild(skipBtn);
  }
}

function renderFzPicker() {
  var cont = document.getElementById('fz-picker-content');
  if (!cont) return;
  cont.innerHTML = '';
  if (fzCurrentIdx === null || !fahrzeugSpuren[fzCurrentIdx]) return;
  var fz = fahrzeugSpuren[fzCurrentIdx];
  var titleEl = document.getElementById('fz-picker-title');
  if (titleEl) titleEl.innerHTML = 'Fahrzeug <strong>' + fz.zugehoerigkeit + '</strong>';

  KAROSSERIE_EINZELN.forEach(function (bereich) {
    var catWrap = document.createElement('div');
    catWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:14px;';
    var catLbl = document.createElement('div');
    catLbl.className = 'fz-category-label'; catLbl.textContent = bereich.label;
    catWrap.appendChild(catLbl);
    bereich.rows.forEach(function (row) {
      var rowEl = document.createElement('div');
      rowEl.style.cssText = 'display:grid;grid-template-columns:repeat(' + row.length + ',1fr);gap:6px;';
      row.forEach(function (teilName) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-part-chip' + (fz.selectedTeile.indexOf(teilName) !== -1 ? ' active' : '');
        btn.textContent = teilName;
        btn.onclick = (function (t) { return function () {
          var i = fz.selectedTeile.indexOf(t);
          if (i !== -1) { fz.selectedTeile.splice(i, 1); delete fz.teileDetails[t]; }
          else { fz.selectedTeile.push(t); if (!fz.teileDetails[t]) fz.teileDetails[t] = mkTeilDetail(); }
          renderFzPicker();
        }; })(teilName);
        rowEl.appendChild(btn);
      });
      catWrap.appendChild(rowEl);
    });
    cont.appendChild(catWrap);
  });

  var nParts = fz.selectedTeile.length;
  var detailBtn = document.createElement('button');
  detailBtn.type = 'button'; detailBtn.className = 'btn-det-next'; detailBtn.style.marginTop = '8px';
  if (nParts === 0) {
    detailBtn.textContent = 'Bitte Teile auswählen';
    detailBtn.disabled = true; detailBtn.style.opacity = '0.4'; detailBtn.style.cursor = 'default';
  } else {
    detailBtn.textContent = 'Details erfassen (' + nParts + ' Teil' + (nParts !== 1 ? 'e' : '') + ') →';
    detailBtn.onclick = function () {
      buildFzDetailSlides();
      var slides = getActiveSlides();
      var pickerIdx = slides.indexOf('slide-fz-picker');
      if (pickerIdx !== -1 && pickerIdx < slides.length - 1) { current = pickerIdx + 1; render(); }
    };
  }
  cont.appendChild(detailBtn);
}

function renderFzDetail(idx) {
  var slideId = 'slide-fz-detail-' + idx;
  var slide = document.getElementById(slideId);
  if (!slide || fzCurrentIdx === null || !fahrzeugSpuren[fzCurrentIdx]) return;
  slide.innerHTML = '';
  var fz = fahrzeugSpuren[fzCurrentIdx];
  var parts = fz.selectedTeile;
  var teilName = parts[idx];
  if (!teilName) return;
  var detail = fz.teileDetails[teilName] || (fz.teileDetails[teilName] = mkTeilDetail());
  var isLast = (idx === parts.length - 1);

  function mkGroup(lbl, content) {
    var g = document.createElement('div');
    g.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    if (lbl) { var l = document.createElement('div'); l.className = 'input-label'; l.textContent = lbl; g.appendChild(l); }
    if (content) g.appendChild(content);
    return g;
  }
  function mkChipRow(options, cur, onChange) {
    var sugg = document.createElement('div'); sugg.className = 'suggestions';
    options.forEach(function (o) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn-suggestion' + (cur === o.v ? ' active' : ''); btn.textContent = o.label;
      btn.onclick = function () { onChange(o.v); renderFzDetail(idx); };
      sugg.appendChild(btn);
    });
    return sugg;
  }

  // Progress header
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;flex-direction:column;gap:5px;margin-bottom:16px;';
  var progMeta = document.createElement('div');
  progMeta.style.cssText = 'font-size:12px;color:var(--muted);';
  progMeta.textContent = 'Fahrzeug ' + fz.zugehoerigkeit + ' · Teil ' + (idx + 1) + ' von ' + parts.length;
  var progBar = document.createElement('div');
  progBar.style.cssText = 'height:4px;border-radius:2px;background:var(--border);overflow:hidden;';
  var progFill = document.createElement('div');
  progFill.style.cssText = 'height:100%;border-radius:2px;background:var(--accent);width:' + Math.round((idx + 1) / parts.length * 100) + '%;transition:width .3s;';
  progBar.appendChild(progFill);
  var partTitle = document.createElement('div');
  partTitle.className = 'question-text'; partTitle.style.marginTop = '2px'; partTitle.textContent = teilName;
  hdr.appendChild(progMeta); hdr.appendChild(progBar); hdr.appendChild(partTitle);
  slide.appendChild(hdr);

  // Copy from previous
  if (idx > 0) {
    var prevName = parts[idx - 1];
    var copyBtn = document.createElement('button');
    copyBtn.type = 'button'; copyBtn.className = 'btn-copy';
    copyBtn.textContent = '↩ Von "' + prevName + '" übernehmen';
    copyBtn.onclick = (function (t, p) { return function () {
      fz.teileDetails[t] = JSON.parse(JSON.stringify(fz.teileDetails[p]));
      renderFzDetail(idx);
    }; })(teilName, prevName);
    slide.appendChild(copyBtn);
  }

  var form = document.createElement('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:16px;';
  if (!Array.isArray(detail.schadensart)) detail.schadensart = [];
  var schadensOpts = ['Kratzer / Lackabrieb', 'Deformierung des Fahrzeugteils', 'Delle', 'Beule'];
  var schadensSection = document.createElement('div');
  schadensSection.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  var schadensLblRow = document.createElement('div');
  schadensLblRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
  var schadensLbl = document.createElement('div'); schadensLbl.className = 'input-label'; schadensLbl.textContent = 'Art der Beschädigung';
  var schadensHint = document.createElement('span'); schadensHint.style.cssText = 'font-size:11px;color:var(--muted);'; schadensHint.textContent = 'Mehrauswahl möglich';
  schadensLblRow.appendChild(schadensLbl); schadensLblRow.appendChild(schadensHint);
  var schadensChips = document.createElement('div'); schadensChips.className = 'suggestions';
  schadensOpts.forEach(function (o) {
    var btn = document.createElement('button'); btn.type = 'button';
    btn.className = 'btn-suggestion' + (detail.schadensart.indexOf(o) !== -1 ? ' active' : ''); btn.textContent = o;
    btn.onclick = (function (opt) { return function () {
      var i = detail.schadensart.indexOf(opt);
      if (i !== -1) detail.schadensart.splice(i, 1); else detail.schadensart.push(opt);
      renderFzDetail(idx);
    }; })(o);
    schadensChips.appendChild(btn);
  });
  var schadensFreiInp = document.createElement('input');
  schadensFreiInp.type = 'text'; schadensFreiInp.className = 'field-input';
  schadensFreiInp.placeholder = 'Sonstiges …'; schadensFreiInp.value = detail.schadensartFrei || '';
  schadensFreiInp.oninput = function () { detail.schadensartFrei = this.value; };
  schadensSection.appendChild(schadensLblRow); schadensSection.appendChild(schadensChips); schadensSection.appendChild(schadensFreiInp);
  form.appendChild(schadensSection);

  var hasSchadensart = detail.schadensart.length > 0 || !!detail.schadensartFrei;
  if (hasSchadensart) {
    form.appendChild(mkGroup('Verlauf', mkChipRow(
      [{v:'punktuell',label:'punktuell'},{v:'horizontal',label:'horizontal'},{v:'vertikal',label:'vertikal'}],
      detail.verlauf, function (v) { detail.verlauf = v; }
    )));
    if (detail.verlauf) {
      var hoehe = document.createElement('div'); hoehe.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
      function mkMiniInput(ph, val, onChange) {
        var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'field-input';
        inp.style.cssText = 'width:70px;padding:10px 12px;font-size:15px;'; inp.placeholder = ph; inp.value = val;
        inp.oninput = function () { onChange(this.value); }; return inp;
      }
      function lbl2(t) { var s = document.createElement('span'); s.className = 'input-label'; s.style.cssText = 'margin:0;white-space:nowrap;'; s.textContent = t; return s; }
      hoehe.appendChild(lbl2('Anstoßhöhe'));
      hoehe.appendChild(mkMiniInput('von', detail.von, function (v) { detail.von = v; }));
      hoehe.appendChild(lbl2('–'));
      hoehe.appendChild(mkMiniInput('bis', detail.bis, function (v) { detail.bis = v; }));
      hoehe.appendChild(lbl2('cm'));
      form.appendChild(mkGroup(null, hoehe));
      form.appendChild(mkGroup('Lackanhaftungen vorhanden?', mkChipRow(
        [{v:'ja',label:'Ja'},{v:'nein',label:'Nein'}], detail.lackanhaftungen, function (v) { detail.lackanhaftungen = v; }
      )));
      if (detail.lackanhaftungen === 'ja') {
        var farbeInp = document.createElement('input'); farbeInp.type = 'text'; farbeInp.className = 'field-input';
        farbeInp.placeholder = 'z.B. weißer'; farbeInp.value = detail.farbe;
        farbeInp.oninput = function () { detail.farbe = this.value; };
        form.appendChild(mkGroup('Farbe des Lackabriebs', farbeInp));
        form.appendChild(mkGroup('Pergamintütchen genutzt?', mkChipRow(
          [{v:'ja',label:'Ja'},{v:'nein',label:'Nein'}], detail.pergamintute, function (v) { detail.pergamintute = v; }
        )));
        form.appendChild(mkGroup('SPURFIX-Folie genutzt?', mkChipRow(
          [{v:'ja',label:'Ja'},{v:'nein',label:'Nein'}], detail.spurfix, function (v) { detail.spurfix = v; }
        )));
      }
    }
  }
  slide.appendChild(form);

  var nav = document.createElement('div'); nav.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;';
  var backBtn = document.createElement('button'); backBtn.type = 'button'; backBtn.className = 'btn-det-back'; backBtn.textContent = '← Teile';
  backBtn.onclick = function () { var slides = getActiveSlides(); var pi = slides.indexOf('slide-fz-picker'); if (pi !== -1) { current = pi; render(); } };
  nav.appendChild(backBtn);
  if (idx > 0) {
    var prevBtn = document.createElement('button'); prevBtn.type = 'button'; prevBtn.className = 'btn-det-back';
    prevBtn.textContent = '← ' + parts[idx - 1]; prevBtn.onclick = function () { current--; render(); };
    nav.appendChild(prevBtn);
  }
  var nextBtn = document.createElement('button'); nextBtn.type = 'button'; nextBtn.className = 'btn-det-next';
  nextBtn.textContent = isLast ? 'Weiter →' : parts[idx + 1] + ' →';
  nextBtn.onclick = function () { current++; render(); };
  nav.appendChild(nextBtn);
  slide.appendChild(nav);
}

function renderFzAbschluss() {
  if (fzCurrentIdx === null || !fahrzeugSpuren[fzCurrentIdx]) return;
  var fz = fahrzeugSpuren[fzCurrentIdx];
  var titleEl = document.getElementById('fz-abschluss-title');
  if (titleEl) titleEl.innerHTML = 'Fahrzeug <strong>' + fz.zugehoerigkeit + '</strong>';
  var cont = document.getElementById('fz-abschluss-content');
  if (!cont) return;
  cont.innerHTML = '';

  function mkGroup(lbl, content) {
    var g = document.createElement('div'); g.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    if (lbl) { var l = document.createElement('div'); l.className = 'input-label'; l.textContent = lbl; g.appendChild(l); }
    if (content) g.appendChild(content);
    return g;
  }
  function mkChipRow(options, cur, onChange) {
    var sugg = document.createElement('div'); sugg.className = 'suggestions';
    options.forEach(function (o) {
      var btn = document.createElement('button'); btn.type = 'button';
      btn.className = 'btn-suggestion' + (cur === o.v ? ' active' : ''); btn.textContent = o.label;
      btn.onclick = function () { onChange(o.v); renderFzAbschluss(); };
      sugg.appendChild(btn);
    });
    return sugg;
  }

  var aufgrundGroup = document.createElement('div'); aufgrundGroup.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  var aufgrundLblRow = document.createElement('div'); aufgrundLblRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
  var aufgrundLbl = document.createElement('div'); aufgrundLbl.className = 'input-label'; aufgrundLbl.textContent = '"Aufgrund ..."-Satz einfügen?';
  var infoBtn = document.createElement('button'); infoBtn.type = 'button'; infoBtn.className = 'btn-info'; infoBtn.textContent = 'ⓘ';
  var infoBox = document.createElement('div'); infoBox.className = 'info-box'; infoBox.style.display = 'none';
  infoBox.textContent = 'Aufgrund der festgestellten äußeren Beschädigungen können verdeckte Schäden, insbesondere an Trägerstrukturen, Befestigungspunkten, Verformungselementen nicht ausgeschlossen werden.';
  infoBtn.onclick = function () { infoBox.style.display = infoBox.style.display === 'none' ? '' : 'none'; };
  aufgrundLblRow.appendChild(aufgrundLbl); aufgrundLblRow.appendChild(infoBtn);
  aufgrundGroup.appendChild(aufgrundLblRow); aufgrundGroup.appendChild(infoBox);
  aufgrundGroup.appendChild(mkChipRow([{v:'ja',label:'Ja'},{v:'nein',label:'Nein'}], fz.aufgrundText, function (v) { fz.aufgrundText = v; }));
  cont.appendChild(aufgrundGroup);

  var wertInp = document.createElement('input'); wertInp.type = 'text'; wertInp.className = 'field-input';
  wertInp.placeholder = 'z.B. 1.500'; wertInp.value = fz.wert; wertInp.oninput = function () { fz.wert = this.value; };
  cont.appendChild(mkGroup('Schadenshöhe ca. (€) – geschätzt', wertInp));
  cont.appendChild(mkGroup('Lichtbilder gefertigt?', mkChipRow([{v:'ja',label:'Ja'},{v:'nein',label:'Nein'}], fz.lichtbilder, function (v) { fz.lichtbilder = v; })));

  var nav = document.createElement('div'); nav.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;';
  var backBtn = document.createElement('button'); backBtn.type = 'button'; backBtn.className = 'btn-det-back';
  backBtn.textContent = '← Zurück'; backBtn.onclick = function () { current--; render(); };
  nav.appendChild(backBtn);
  var fertigBtn = document.createElement('button'); fertigBtn.type = 'button'; fertigBtn.className = 'btn-det-next';
  fertigBtn.textContent = 'Fertig →';
  fertigBtn.onclick = function () { fzCurrentIdx = null; fzSelectedNum = null; jumpToSlide('slide-fz-nummer'); };
  nav.appendChild(fertigBtn);
  cont.appendChild(nav);
}

function renderFahrzeugSpuren_REMOVED() {
  // replaced by slide-based renderFzNummer / renderFzPicker / renderFzDetail
  fahrzeugSpuren.forEach(function (fz, idx) {
    var card = document.createElement('div');
    card.className = 'fz-card';

    function mkGroup(lbl, content) {
      var g = document.createElement('div');
      g.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      if (lbl) {
        var l = document.createElement('div');
        l.className = 'input-label';
        l.textContent = lbl;
        g.appendChild(l);
      }
      if (content) g.appendChild(content);
      return g;
    }

    function mkChipRow(options, cur, onChange) {
      var sugg = document.createElement('div');
      sugg.className = 'suggestions';
      options.forEach(function (o) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-suggestion' + (cur === o.v ? ' active' : '');
        btn.textContent = o.label;
        btn.onclick = function () { onChange(o.v); renderFahrzeugSpuren(); };
        sugg.appendChild(btn);
      });
      return sugg;
    }

    // ── Header ──
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    var ttl = document.createElement('div');
    ttl.className = 'input-label';
    ttl.style.cssText = 'font-weight:700;font-size:15px;margin:0;';
    ttl.textContent = 'Fahrzeug ' + (idx + 1) + (fz.zugehoerigkeit ? ' · ' + fz.zugehoerigkeit : '');
    var rb = document.createElement('button');
    rb.className = 'btn-remove';
    rb.type = 'button';
    rb.innerHTML = '&times;';
    (function (id) { rb.onclick = function () { removeFahrzeugSpur(id); }; })(fz.id);
    hdr.appendChild(ttl); hdr.appendChild(rb);
    card.appendChild(hdr);

    if (fz.phase === 'number-select') {
      // ──────── NUMMER WÄHLEN ────────
      var numWrap = document.createElement('div');
      numWrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

      var numLbl = document.createElement('div');
      numLbl.className = 'input-label';
      numLbl.textContent = 'Welche Fahrzeugnummer?';
      numWrap.appendChild(numLbl);

      var numRow = document.createElement('div');
      numRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
      for (var n = 1; n <= fzNummernMax; n++) {
        var numStr = n < 10 ? '0' + n : '' + n;
        var numBtn = document.createElement('button');
        numBtn.type = 'button';
        numBtn.className = 'btn-suggestion' + (fz.zugehoerigkeit === numStr ? ' active' : '');
        numBtn.textContent = numStr;
        numBtn.onclick = (function (v, fzRef) { return function () { fzRef.zugehoerigkeit = v; renderFahrzeugSpuren(); }; })(numStr, fz);
        numRow.appendChild(numBtn);
      }
      var addNumBtn = document.createElement('button');
      addNumBtn.type = 'button';
      addNumBtn.className = 'btn-suggestion';
      addNumBtn.textContent = '+';
      addNumBtn.style.cssText = 'font-weight:700;border-style:dashed;min-width:52px;';
      addNumBtn.onclick = function () { fzNummernMax++; renderFahrzeugSpuren(); };
      numRow.appendChild(addNumBtn);
      numWrap.appendChild(numRow);

      var weiterBtn = document.createElement('button');
      weiterBtn.type = 'button';
      weiterBtn.className = 'btn-det-next';
      if (!fz.zugehoerigkeit) {
        weiterBtn.textContent = 'Nummer wählen';
        weiterBtn.disabled = true;
        weiterBtn.style.cssText = 'opacity:0.4;cursor:default;';
      } else {
        weiterBtn.textContent = 'Weiter →';
        weiterBtn.onclick = (function (fzRef) { return function () { fzRef.phase = 'picker-einzeln'; renderFahrzeugSpuren(); }; })(fz);
      }
      numWrap.appendChild(weiterBtn);
      card.appendChild(numWrap);

    } else if (fz.phase === 'picker-einzeln') {
      // ──────── TEILE PICKER ────────
      var pickerWrap = document.createElement('div');
      pickerWrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

      var backNumBtn = document.createElement('button');
      backNumBtn.type = 'button';
      backNumBtn.className = 'btn-det-back';
      backNumBtn.textContent = '← Nummer ändern';
      backNumBtn.onclick = (function (fzRef) { return function () { fzRef.phase = 'number-select'; renderFahrzeugSpuren(); }; })(fz);
      pickerWrap.appendChild(backNumBtn);

      var pickerLbl = document.createElement('div');
      pickerLbl.className = 'input-label';
      pickerLbl.textContent = 'Welche Fahrzeugteile sind beschädigt?';
      pickerWrap.appendChild(pickerLbl);

      KAROSSERIE_EINZELN.forEach(function (bereich) {
        var catWrap = document.createElement('div');
        catWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
        var catLbl = document.createElement('div');
        catLbl.className = 'fz-category-label';
        catLbl.textContent = bereich.label;
        catWrap.appendChild(catLbl);
        var catRows = document.createElement('div');
        catRows.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
        bereich.rows.forEach(function (row) {
          var rowEl = document.createElement('div');
          rowEl.style.cssText = 'display:grid;grid-template-columns:repeat(' + row.length + ',1fr);gap:6px;';
          row.forEach(function (teilName) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-part-chip' + (fz.selectedTeile.indexOf(teilName) !== -1 ? ' active' : '');
            btn.textContent = teilName;
            btn.onclick = (function (t, fzRef) { return function () {
              var i = fzRef.selectedTeile.indexOf(t);
              if (i !== -1) { fzRef.selectedTeile.splice(i, 1); delete fzRef.teileDetails[t]; }
              else { fzRef.selectedTeile.push(t); if (!fzRef.teileDetails[t]) fzRef.teileDetails[t] = mkTeilDetail(); }
              renderFahrzeugSpuren();
            }; })(teilName, fz);
            rowEl.appendChild(btn);
          });
          catRows.appendChild(rowEl);
        });
        catWrap.appendChild(catRows);
        pickerWrap.appendChild(catWrap);
      });

      var nParts = fz.selectedTeile.length;
      var detailBtn = document.createElement('button');
      detailBtn.type = 'button';
      detailBtn.className = 'btn-det-next';
      detailBtn.style.marginTop = '4px';
      if (nParts === 0) {
        detailBtn.textContent = 'Bitte Teile auswählen';
        detailBtn.disabled = true;
        detailBtn.style.cssText = 'opacity:0.4;cursor:default;margin-top:4px;';
      } else {
        detailBtn.textContent = 'Details erfassen (' + nParts + ' Teil' + (nParts !== 1 ? 'e' : '') + ') →';
        detailBtn.onclick = (function (fzRef) { return function () { fzRef.phase = 'detail'; fzRef.detailStep = 0; renderFahrzeugSpuren(); }; })(fz);
      }
      pickerWrap.appendChild(detailBtn);
      card.appendChild(pickerWrap);

    } else {
      // ──────── DETAIL PHASE ────────
      var step = fz.detailStep;
      var parts = fz.selectedTeile;
      var teilName = parts[step];
      var detail = fz.teileDetails[teilName] || (fz.teileDetails[teilName] = mkTeilDetail());

      // Progress bar
      var progWrap = document.createElement('div');
      progWrap.style.cssText = 'display:flex;flex-direction:column;gap:5px;';
      var progMeta = document.createElement('div');
      progMeta.style.cssText = 'font-size:12px;color:var(--muted);';
      progMeta.textContent = 'Teil ' + (step + 1) + ' von ' + parts.length;
      var progBar = document.createElement('div');
      progBar.style.cssText = 'height:4px;border-radius:2px;background:var(--border);overflow:hidden;';
      var progFill = document.createElement('div');
      progFill.style.cssText = 'height:100%;border-radius:2px;background:var(--accent);width:' + Math.round((step + 1) / parts.length * 100) + '%;transition:width .3s;';
      progBar.appendChild(progFill);
      var progTitel = document.createElement('div');
      progTitel.className = 'input-label';
      progTitel.style.cssText = 'font-weight:700;font-size:16px;margin:2px 0 0;';
      progTitel.textContent = teilName;
      progWrap.appendChild(progMeta);
      progWrap.appendChild(progBar);
      progWrap.appendChild(progTitel);
      card.appendChild(progWrap);

      // Copy-from-previous
      if (step > 0) {
        var prevName = parts[step - 1];
        var copyPrevBtn = document.createElement('button');
        copyPrevBtn.type = 'button';
        copyPrevBtn.className = 'btn-copy';
        copyPrevBtn.textContent = '↩ Von "' + prevName + '" übernehmen';
        copyPrevBtn.onclick = (function (fzRef, tName, pName) { return function () {
          var src = fzRef.teileDetails[pName];
          fzRef.teileDetails[tName] = JSON.parse(JSON.stringify(src));
          renderFahrzeugSpuren();
        }; })(fz, teilName, prevName);
        card.appendChild(copyPrevBtn);
      }

      // Detail form
      var form = document.createElement('div');
      form.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

      // Art der Beschädigung (multi)
      if (!Array.isArray(detail.schadensart)) detail.schadensart = [];
      var schadensOpts = ['Kratzer / Lackabrieb', 'Deformierung des Fahrzeugteils', 'Delle', 'Beule'];
      var schadensSection = document.createElement('div');
      schadensSection.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var schadensLblRow = document.createElement('div');
      schadensLblRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
      var schadensLbl = document.createElement('div');
      schadensLbl.className = 'input-label';
      schadensLbl.textContent = 'Art der Beschädigung';
      var schadensHint = document.createElement('span');
      schadensHint.style.cssText = 'font-size:11px;color:var(--muted);';
      schadensHint.textContent = 'Mehrauswahl möglich';
      schadensLblRow.appendChild(schadensLbl);
      schadensLblRow.appendChild(schadensHint);
      var schadensChips = document.createElement('div');
      schadensChips.className = 'suggestions';
      schadensOpts.forEach(function (o) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-suggestion' + (detail.schadensart.indexOf(o) !== -1 ? ' active' : '');
        btn.textContent = o;
        btn.onclick = (function (opt) { return function () {
          var i = detail.schadensart.indexOf(opt);
          if (i !== -1) { detail.schadensart.splice(i, 1); } else { detail.schadensart.push(opt); }
          renderFahrzeugSpuren();
        }; })(o);
        schadensChips.appendChild(btn);
      });
      var schadensFreiInp = document.createElement('input');
      schadensFreiInp.type = 'text'; schadensFreiInp.className = 'field-input';
      schadensFreiInp.placeholder = 'Sonstiges …';
      schadensFreiInp.value = detail.schadensartFrei || '';
      schadensFreiInp.oninput = function () { detail.schadensartFrei = this.value; };
      schadensSection.appendChild(schadensLblRow);
      schadensSection.appendChild(schadensChips);
      schadensSection.appendChild(schadensFreiInp);
      form.appendChild(schadensSection);

      var hasSchadensart = detail.schadensart.length > 0 || !!detail.schadensartFrei;
      if (hasSchadensart) {
        form.appendChild(mkGroup('Verlauf', mkChipRow(
          [{ v: 'punktuell', label: 'punktuell' }, { v: 'horizontal', label: 'horizontal' }, { v: 'vertikal', label: 'vertikal' }],
          detail.verlauf,
          function (v) { detail.verlauf = v; }
        )));

        if (detail.verlauf) {
          var hoehe = document.createElement('div');
          hoehe.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
          function mkMiniInput(ph, val, onChange) {
            var inp = document.createElement('input');
            inp.type = 'text'; inp.className = 'field-input';
            inp.style.cssText = 'width:70px;padding:10px 12px;font-size:15px;';
            inp.placeholder = ph; inp.value = val;
            inp.oninput = function () { onChange(this.value); };
            return inp;
          }
          function lbl2(t) {
            var s = document.createElement('span');
            s.className = 'input-label';
            s.style.cssText = 'margin:0;white-space:nowrap;';
            s.textContent = t; return s;
          }
          hoehe.appendChild(lbl2('Anstoßhöhe'));
          hoehe.appendChild(mkMiniInput('von', detail.von, function (v) { detail.von = v; }));
          hoehe.appendChild(lbl2('–'));
          hoehe.appendChild(mkMiniInput('bis', detail.bis, function (v) { detail.bis = v; }));
          hoehe.appendChild(lbl2('cm'));
          form.appendChild(mkGroup(null, hoehe));

          form.appendChild(mkGroup('Lackanhaftungen vorhanden?', mkChipRow(
            [{ v: 'ja', label: 'Ja' }, { v: 'nein', label: 'Nein' }],
            detail.lackanhaftungen,
            function (v) { detail.lackanhaftungen = v; }
          )));

          if (detail.lackanhaftungen === 'ja') {
            var farbeInp = document.createElement('input');
            farbeInp.type = 'text'; farbeInp.className = 'field-input';
            farbeInp.placeholder = 'z.B. weißer'; farbeInp.value = detail.farbe;
            farbeInp.oninput = function () { detail.farbe = this.value; };
            form.appendChild(mkGroup('Farbe des Lackabriebs', farbeInp));

            form.appendChild(mkGroup('Pergamintütchen genutzt?', mkChipRow(
              [{ v: 'ja', label: 'Ja' }, { v: 'nein', label: 'Nein' }],
              detail.pergamintute,
              function (v) { detail.pergamintute = v; }
            )));

            form.appendChild(mkGroup('SPURFIX-Folie genutzt?', mkChipRow(
              [{ v: 'ja', label: 'Ja' }, { v: 'nein', label: 'Nein' }],
              detail.spurfix,
              function (v) { detail.spurfix = v; }
            )));
          }
        }
      }
      card.appendChild(form);

      // Navigation
      var nav = document.createElement('div');
      nav.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

      var backPickerBtn = document.createElement('button');
      backPickerBtn.type = 'button';
      backPickerBtn.className = 'btn-det-back';
      backPickerBtn.textContent = '← Teile bearbeiten';
      (function (fzRef) { backPickerBtn.onclick = function () { fzRef.phase = 'picker-einzeln'; renderFahrzeugSpuren(); }; })(fz);
      nav.appendChild(backPickerBtn);

      if (step > 0) {
        var prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'btn-det-back';
        prevBtn.textContent = '← ' + parts[step - 1];
        (function (fzRef) { prevBtn.onclick = function () { fzRef.detailStep--; renderFahrzeugSpuren(); }; })(fz);
        nav.appendChild(prevBtn);
      }

      if (step < parts.length - 1) {
        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'btn-det-next';
        nextBtn.textContent = parts[step + 1] + ' →';
        (function (fzRef) { nextBtn.onclick = function () { fzRef.detailStep++; renderFahrzeugSpuren(); }; })(fz);
        nav.appendChild(nextBtn);
      }

      card.appendChild(nav);

      // Separator + Fahrzeug-weite Felder
      var sep = document.createElement('hr');
      sep.style.cssText = 'border:none;border-top:1px solid var(--border);margin:4px 0;';
      card.appendChild(sep);

      // Aufgrund-Satz
      var aufgrundGroup = document.createElement('div');
      aufgrundGroup.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      var aufgrundLblRow = document.createElement('div');
      aufgrundLblRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
      var aufgrundLbl = document.createElement('div');
      aufgrundLbl.className = 'input-label';
      aufgrundLbl.textContent = '"Aufgrund ..."-Satz einfügen?';
      var infoBtn = document.createElement('button');
      infoBtn.type = 'button';
      infoBtn.className = 'btn-info';
      infoBtn.textContent = 'ⓘ';
      var infoBox = document.createElement('div');
      infoBox.className = 'info-box';
      infoBox.style.display = 'none';
      infoBox.textContent = 'Aufgrund der festgestellten äußeren Beschädigungen können verdeckte Schäden, insbesondere an Trägerstrukturen, Befestigungspunkten, Verformungselementen nicht ausgeschlossen werden.';
      infoBtn.onclick = function () { infoBox.style.display = infoBox.style.display === 'none' ? '' : 'none'; };
      aufgrundLblRow.appendChild(aufgrundLbl);
      aufgrundLblRow.appendChild(infoBtn);
      aufgrundGroup.appendChild(aufgrundLblRow);
      aufgrundGroup.appendChild(infoBox);
      aufgrundGroup.appendChild(mkChipRow(
        [{ v: 'ja', label: 'Ja' }, { v: 'nein', label: 'Nein' }],
        fz.aufgrundText,
        function (v) { fz.aufgrundText = v; }
      ));
      card.appendChild(aufgrundGroup);

      var wertInp = document.createElement('input');
      wertInp.type = 'text'; wertInp.className = 'field-input';
      wertInp.placeholder = 'z.B. 1.500'; wertInp.value = fz.wert;
      wertInp.oninput = function () { fz.wert = this.value; };
      card.appendChild(mkGroup('Schadenshöhe ca. (€) – geschätzt', wertInp));

      card.appendChild(mkGroup('Lichtbilder gefertigt?', mkChipRow(
        [{ v: 'ja', label: 'Ja' }, { v: 'nein', label: 'Nein' }],
        fz.lichtbilder,
        function (v) { fz.lichtbilder = v; }
      )));
    }

    list.appendChild(card);
  });
}

function generateFahrzeugText() {
  if (!fahrzeugSpuren.length) return '';
  var verlaufMap = {
    'punktuell': 'punktuelle Beschädigung',
    'horizontal': 'horizontaler Verlauf',
    'vertikal': 'vertikaler Verlauf'
  };
  return fahrzeugSpuren.map(function (fz) {
    var zu = fz.zugehoerigkeit || '[Zugehörigkeit]';
    var lines = [];
    lines.push('Am Fahrzeug ' + zu + ' zeigten sich folgende unfallbedingte Beschädigungen/Spuren an folgenden Fahrzeugteilen:');

    (fz.selectedTeile || []).forEach(function (teilName) {
      var detail = fz.teileDetails[teilName] || {};
      var verlaufText = detail.verlauf ? (verlaufMap[detail.verlauf] || detail.verlauf) : '[Verlauf]';
      var vonBis = '';
      if (detail.von && detail.bis) vonBis = detail.von + ' bis ' + detail.bis + ' cm';
      else if (detail.von) vonBis = 'ab ' + detail.von + ' cm';
      else if (detail.bis) vonBis = 'bis ' + detail.bis + ' cm';
      else vonBis = '[Höhe] cm';
      var saArr = Array.isArray(detail.schadensart) ? detail.schadensart.slice() : (detail.schadensart ? [detail.schadensart] : []);
      if (detail.schadensartFrei) saArr.push(detail.schadensartFrei);
      var sa = saArr.length ? ' (' + saArr.join(', ') + ')' : '';
      lines.push('    - ' + teilName + sa + ': ' + verlaufText + ' – Anstoßhöhe: ' + vonBis);
      if (detail.lackanhaftungen === 'ja') {
        var farbe = detail.farbe ? detail.farbe + ' ' : '';
        lines.push('An dieser Stelle konnte ' + farbe + 'Lackaufrieb festgestellt werden.');
        if (detail.pergamintute === 'ja') {
          lines.push('Der Lack wurde abgetragen und in einer Pergamintüte gesichert (liegt dem Vorgang bei).');
        }
        if (detail.spurfix === 'ja') {
          lines.push('Für ermittlungstaktische Zwecke wurde eine Spurensicherungsfolie auf der Stelle aufgetragen und im Anschluss gesichert (SPURFIX-Folie).');
        }
      }
    });

    if (fz.aufgrundText === 'ja') {
      lines.push('Aufgrund der festgestellten äußeren Beschädigungen können verdeckte Schäden, insbesondere an Trägerstrukturen, Befestigungspunkten, Verformungselementen nicht ausgeschlossen werden.');
    }

    if (fz.wert) {
      lines.push('Die Höhe der sichtbaren Beschädigungen wird auf ca. ' + fz.wert + ' € geschätzt.');
    }

    if (fz.lichtbilder === 'ja') {
      lines.push('Es wurden Lichtbilder gefertigt, welche dem Vorgang digital beigefügt werden.');
    }

    return lines.join('\n');
  }).join('\n\n');
}

// ── Bericht generieren ──────────────────────────────────────

function collectFragments() {
  var frags = [];
  ['strasse', 'hausnummer', 'plz', 'stadt', 'uo-strasse', 'uo-hausnummer', 'uo-ortsteil', 'uo-tempo', 'uhrzeit'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el && el.value && el.value.trim()) frags.push(el.value.trim());
  });
  document.querySelectorAll('[data-group].active').forEach(function (b) {
    var t = b.textContent.trim();
    if (t.length > 1 && t !== '—') frags.push(t);
  });
  streifenwagen.forEach(function(sw) { sw.besatzung.forEach(function(b) { if (b.name) frags.push(b.name); }); });
  if (frags.length < 4) frags = frags.concat(['BPOL', 'GTH', '33330', 'VUF', 'BERICHT', 'PROTOKOLL']);
  return frags;
}

function runGenerateAnimation(frags, done) {
  var overlay = document.getElementById('genOverlay');
  var canvas = document.getElementById('genCanvas');
  var statusEl = document.getElementById('genStatus');
  var fragLayer = document.getElementById('genFragLayer');
  var radarWrap = document.getElementById('genRadarWrap');

  fragLayer.innerHTML = '';
  radarWrap.querySelectorAll('.gen-particle,.gen-ring').forEach(function (el) { el.remove(); });
  statusEl.textContent = '';
  statusEl.style.color = '';

  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'all';

  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, R = 100;
  var radarStart = null, radarDur = 2000, burstFired = false;

  // Typewriter
  var statusStr = 'BERICHT WIRD GENERIERT';
  var sIdx = 0;
  var sTimer = setInterval(function () {
    statusEl.textContent = statusStr.slice(0, sIdx) + (sIdx < statusStr.length ? '▌' : '');
    if (sIdx < statusStr.length) { sIdx++; } else {
      clearInterval(sTimer);
      var blink = true;
      overlay._blink = setInterval(function () {
        statusEl.textContent = statusStr + (blink ? '▌' : ' ');
        blink = !blink;
      }, 530);
    }
  }, 55);

  // Fragment spawner
  var fIdx = 0;
  var fTimer = setInterval(function () {
    var el = document.createElement('span');
    el.className = 'gen-frag';
    el.textContent = frags[fIdx % frags.length];
    fIdx++;
    var side = (Math.random() * 4) | 0;
    var lx, ly, dx, dy;
    if (side === 0) { lx = 5 + Math.random() * 85; ly = -3; dx = (Math.random() - .5) * 60; dy = 110; }
    else if (side === 1) { lx = 103; ly = 5 + Math.random() * 85; dx = -115; dy = (Math.random() - .5) * 60; }
    else if (side === 2) { lx = 5 + Math.random() * 85; ly = 103; dx = (Math.random() - .5) * 60; dy = -115; }
    else { lx = -3; ly = 5 + Math.random() * 85; dx = 115; dy = (Math.random() - .5) * 60; }
    el.style.left = lx + 'vw'; el.style.top = ly + 'vh';
    el.style.setProperty('--dx', dx + 'vw');
    el.style.setProperty('--dy', dy + 'vh');
    fragLayer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1750);
  }, 200);

  function drawFrame(ts) {
    if (!radarStart) radarStart = ts;
    var p = Math.min((ts - radarStart) / radarDur, 1);
    var angle = p * Math.PI * 2 - Math.PI / 2;

    ctx.clearRect(0, 0, W, H);

    // BG radial glow
    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 40);
    bg.addColorStop(0, 'rgba(74,158,255,.07)'); bg.addColorStop(1, 'rgba(74,158,255,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Rings
    [.33, .66, 1].forEach(function (f) {
      ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
      ctx.strokeStyle = f === 1 ? 'rgba(74,158,255,.45)' : 'rgba(74,158,255,.15)';
      ctx.lineWidth = f === 1 ? 1.5 : 1; ctx.stroke();
    });

    // Crosshairs
    ctx.save(); ctx.setLineDash([3, 9]); ctx.strokeStyle = 'rgba(74,158,255,.18)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R - 14, cy); ctx.lineTo(cx + R + 14, cy);
    ctx.moveTo(cx, cy - R - 14); ctx.lineTo(cx, cy + R + 14);
    ctx.stroke(); ctx.restore();

    // Sweep sector trail
    for (var i = 0; i < 45; i++) {
      var frac = i / 45;
      var a1 = angle - Math.PI * .8 * (1 - frac);
      var a2 = angle - Math.PI * .8 * (1 - (i + 1) / 45);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a1, a2);
      ctx.fillStyle = 'rgba(74,158,255,' + (.2 * frac * frac) + ')'; ctx.fill();
    }

    // Sweep line
    ctx.save(); ctx.shadowColor = '#4a9eff'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * (R + 10), cy + Math.sin(angle) * (R + 10));
    ctx.strokeStyle = '#4a9eff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

    // Tip glow dot
    ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();

    // Tick marks
    for (var j = 0; j < 36; j++) {
      var ta = (j / 36) * Math.PI * 2 - Math.PI / 2;
      var maj = j % 9 === 0;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ta) * (R - (maj ? 10 : 5)), cy + Math.sin(ta) * (R - (maj ? 10 : 5)));
      ctx.lineTo(cx + Math.cos(ta) * (R + 3), cy + Math.sin(ta) * (R + 3));
      ctx.strokeStyle = maj ? 'rgba(74,158,255,.65)' : 'rgba(74,158,255,.22)';
      ctx.lineWidth = maj ? 1.5 : 1; ctx.stroke();
    }

    // Center dot
    ctx.save(); ctx.shadowColor = '#4a9eff'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4a9eff'; ctx.fill(); ctx.restore();

    if (p >= 1 && !burstFired) {
      burstFired = true;
      clearInterval(fTimer); clearInterval(sTimer);
      if (overlay._blink) clearInterval(overlay._blink);
      statusEl.style.color = '#10b981';
      statusEl.textContent = 'BERICHT FERTIG ▌';

      // Burst ring
      var ring = document.createElement('div');
      ring.className = 'gen-ring';
      ring.style.cssText = 'position:absolute;width:220px;height:220px;left:20px;top:20px;';
      radarWrap.appendChild(ring);

      // Burst particles
      for (var k = 0; k < 24; k++) {
        var pa = (k / 24) * Math.PI * 2;
        var pd = 80 + Math.random() * 55;
        var pp = document.createElement('div');
        pp.className = 'gen-particle';
        pp.style.cssText = 'position:absolute;left:' + (cx - 2) + 'px;top:' + (cy - 2) + 'px;';
        pp.style.setProperty('--dx', Math.cos(pa) * pd + 'px');
        pp.style.setProperty('--dy', Math.sin(pa) * pd + 'px');
        radarWrap.appendChild(pp);
      }

      setTimeout(function () {
        overlay.style.transition = 'opacity 0.55s ease';
        overlay.style.opacity = '0';
        setTimeout(function () {
          overlay.style.pointerEvents = 'none';
          overlay.style.transition = '';
          overlay.style.opacity = '';
          fragLayer.innerHTML = '';
          done();
        }, 560);
      }, 750);
      return;
    }

    if (p < 1) requestAnimationFrame(drawFrame);
  }

  setTimeout(function () { requestAnimationFrame(drawFrame); }, 350);
}

// ── Schilderungen ────────────────────────────────────────────

function getBesatzungLabels() {
  var all = [];
  streifenwagen.forEach(function(sw) {
    sw.besatzung.forEach(function(b) {
      if (b.name && b.name.trim()) all.push((b.grad ? b.grad + ' ' : '') + b.name.trim());
    });
  });
  return all;
}

function getUnfallOrtVorfill() {
  if (branch === 'strasse') {
    var s = document.getElementById('uo-strasse').value;
    var h = document.getElementById('uo-hausnummer').value;
    return s ? 'in der ' + s + (h ? ' ' + h : '') : '';
  }
  if (branch === 'parkplatz') {
    var pk = document.getElementById('pk-adresse').value;
    return pk ? 'auf dem Parkplatz ' + pk : '';
  }
  return '';
}

function addSchilderung() {
  schildCounter++;
  schilderungen.push({
    id: schildCounter,
    name: '',
    rolle: '',
    belehrender: '',
    gegenueber: '',
    umstaende: [],
    auffaelligkeiten: [],
    auffCustom: [],
    anweisungsFolge: null,
    aatDurchgefuehrt: null,
    aatWert: '',
    aatUhrzeit: '',
    btmTestDurchgefuehrt: null,
    btmTestMethode: null,
    btmTestErgebnis: null,
    btmTestUhrzeit: '',
    btmStoffgruppen: [],
    verletzungText: '',
    verletzungRtw: null,
    modus: '',
    abstelltDatum: document.getElementById('datum').value || '',
    abstelltUhrzeit: '',
    abstelltOrt: getUnfallOrtVorfill(),
    rueckDatum: '',
    rueckUhrzeit: '',
    zwischenzeit: null,
    zwischenzeitText: '',
    freitext: ''
  });
  schildCurrentIdx = schilderungen.length - 1;
}

function renderSchilderungen() {
  var list = document.getElementById('schilderungList');
  if (!list) return;
  list.innerHTML = '';
  if (schildCurrentIdx === null || !schilderungen[schildCurrentIdx]) return;
  var s = schilderungen[schildCurrentIdx];
  var officers = getBesatzungLabels();

  var card = document.createElement('div');
  card.className = 'schild-card';

  // Name
  var nameInp = document.createElement('input');
  nameInp.type = 'text'; nameInp.className = 'field-input schild-name-inp';
  nameInp.placeholder = 'Name der Person (optional)'; nameInp.value = s.name || '';
  nameInp.oninput = function() { s.name = this.value; };
  card.appendChild(nameInp);

  // Rolle
  var rolleWrap = document.createElement('div'); rolleWrap.style.marginTop = '10px';
  var rolleLabel = document.createElement('div');
  rolleLabel.className = 'input-label'; rolleLabel.textContent = 'Rolle';
  rolleWrap.appendChild(rolleLabel);
  var rolleChips = document.createElement('div'); rolleChips.className = 'suggestions';
  [{ v:'zeuge',  label:'Zeuge' },{ v:'zeugin', label:'Zeugin' },
   { v:'ub01m',  label:'UB 01 (m)' },{ v:'ub01w',  label:'UB 01 (w)' },
   { v:'ub02m',  label:'UB 02 (m)' },{ v:'ub02w',  label:'UB 02 (w)' },
   { v:'beschm', label:'Beschuldigter' },{ v:'beschw', label:'Beschuldigte' }
  ].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.rolle === opt.v ? ' active' : '');
    rolleChips.appendChild(btn);
  });
  rolleWrap.appendChild(rolleChips);
  card.appendChild(rolleWrap);

  // Belehrender (pre-rendered, hidden if no rolle)
  var belWrap = document.createElement('div');
  belWrap.style.marginTop = '10px'; belWrap.style.display = s.rolle ? '' : 'none';
  var belLabel = document.createElement('div');
  belLabel.className = 'input-label'; belLabel.textContent = 'Belehrung durch';
  belWrap.appendChild(belLabel);
  var belChips = document.createElement('div'); belChips.className = 'suggestions';
  if (!officers.length) {
    var note = document.createElement('div'); note.className = 'schild-note';
    note.innerHTML = '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> Besatzung auf Seite 1 eintragen.';
    belChips.appendChild(note);
  } else {
    officers.forEach(function(name) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.v = name; btn.textContent = name;
      btn.className = 'btn-suggestion' + (s.belehrender === name ? ' active' : '');
      belChips.appendChild(btn);
    });
  }
  belWrap.appendChild(belChips);
  card.appendChild(belWrap);

  // Gegenüber (pre-rendered, hidden if no belehrender)
  var gegWrap = document.createElement('div');
  gegWrap.style.marginTop = '10px'; gegWrap.style.display = s.belehrender ? '' : 'none';
  var gegLabel = document.createElement('div');
  gegLabel.className = 'input-label'; gegLabel.textContent = 'Geäußert gegenüber';
  gegWrap.appendChild(gegLabel);
  var gegChips = document.createElement('div'); gegChips.className = 'suggestions';
  officers.forEach(function(name) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = name; btn.textContent = name;
    btn.className = 'btn-suggestion' + (s.gegenueber === name ? ' active' : '');
    gegChips.appendChild(btn);
  });
  gegWrap.appendChild(gegChips);
  card.appendChild(gegWrap);

  // Wire handlers — only toggle classes, no re-render
  rolleChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.rolle = btn.dataset.v;
    rolleChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    belWrap.style.display = '';
  });

  belChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.belehrender = btn.dataset.v;
    belChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    if (!s.gegenueber) {
      s.gegenueber = btn.dataset.v;
      gegChips.querySelectorAll('.btn-suggestion').forEach(function(b) {
        b.classList.toggle('active', b.dataset.v === s.gegenueber);
      });
    }
    gegWrap.style.display = '';
  });

  gegChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.gegenueber = btn.dataset.v;
    gegChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });

  list.appendChild(card);

  requestAnimationFrame(function() {
    var inp = list.querySelector('.schild-name-inp');
    if (inp && !inp.value) inp.focus();
  });
}

function renderSchilderungenUmstaende() {
  var cont = document.getElementById('umstaendeList');
  if (!cont) return;
  cont.innerHTML = '';

  if (schildCurrentIdx === null || !schilderungen[schildCurrentIdx]) {
    var note = document.createElement('div');
    note.className = 'schild-note'; note.style.marginBottom = '12px';
    note.textContent = 'Keine Person eingetragen.';
    cont.appendChild(note); return;
  }

  var s = schilderungen[schildCurrentIdx];
  var rm = ROLLEN_MAP[s.rolle];
  var personLbl = document.createElement('div'); personLbl.className = 'input-label';
  personLbl.style.marginBottom = '8px';
  personLbl.textContent = (s.name || ('Person ' + (schildCurrentIdx + 1))) + (rm ? ' – ' + rm.disp : '');
  cont.appendChild(personLbl);

  var chips = document.createElement('div'); chips.className = 'suggestions umst-chips';
  UMSTAENDE_DEFS.forEach(function(def) {
    var isOn = s.umstaende && s.umstaende.indexOf(def.v) !== -1;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = def.v; btn.textContent = def.label;
    btn.className = 'btn-suggestion' + (isOn ? ' active' : '');
    chips.appendChild(btn);
  });

  chips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    var v = btn.dataset.v;
    if (!s.umstaende) s.umstaende = [];
    var i = s.umstaende.indexOf(v);
    if (i !== -1) { s.umstaende.splice(i, 1); btn.classList.remove('active'); }
    else          { s.umstaende.push(v);       btn.classList.add('active'); }
  });

  cont.appendChild(chips);
}

function buildAngabenBody(s) {
  var rm = ROLLEN_MAP[s.rolle]; if (!rm) return '';
  var dispCap = rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1);
  if (s.modus === 'vuf') {
    var datum = formatDateDE(s.abstelltDatum) || '[Datum]';
    var uzeit = s.abstelltUhrzeit || '[Uhrzeit]';
    var ort   = s.abstelltOrt || '[Ort]';
    var rueck = s.rueckUhrzeit || '[Uhrzeit]';
    var rueckDat = s.rueckDatum ? formatDateDE(s.rueckDatum) : '';
    var rueckZeit = (rueckDat ? 'am ' + rueckDat + ' gegen ' + rueck + ' Uhr' : 'gegen ' + rueck + ' Uhr');
    var body = rm.er + ' habe ' + rm.sein + ' Fahrzeug am ' + datum + ' gegen ' + uzeit + ' Uhr ' + ort + ' abgestellt. Bei ' + rm.seiner + ' Rückkehr ' + rueckZeit + ' habe ' + rm.erLow + ' ' + rm.sein + ' Fahrzeug beschädigt vorgefunden.\n' + dispCap + ' geht davon aus, dass es in diesem Zeitraum zu einem Verkehrsunfall gekommen ist, bei welchem ' + rm.sein + ' Fahrzeug beschädigt wurde.';
    if (s.zwischenzeit === 'ja' && s.zwischenzeitText) {
      body += ' In der Zwischenzeit habe ' + rm.erLow + ' folgendes festgestellt: ' + s.zwischenzeitText;
    } else {
      body += ' Weitere Feststellungen in der Zwischenzeit habe ' + rm.erLow + ' nicht gemacht.';
    }
    return body;
  }
  if (s.modus === 'frei') return s.freitext || '[Keine Angaben]';
  return '';
}

function buildAngabenText(s) {
  var rm = ROLLEN_MAP[s.rolle]; if (!rm) return '';
  var bel = s.belehrender || '[Beamter/Beamtin]';
  var geg = s.gegenueber || '[Beamter/Beamtin]';
  var belTyp = rm.btyp === 'besch' ? 'Beschuldigtenbelehrung' : 'zeugenschaftlicher Belehrung';
  var intro = 'Nach erfolgter ' + belTyp + ' durch ' + bel + ' machte ' + rm.disp + ' gegenüber ' + geg + ' sinngemäß folgende Angaben:';
  var body = buildAngabenBody(s);
  return intro + '\n\n' + (body || '[Keine Angaben erfasst]');
}

function renderSchilderungenAngaben() {
  var cont = document.getElementById('angabenList');
  if (!cont) return;
  cont.innerHTML = '';

  var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null;
  if (!s) return;

  var rm = ROLLEN_MAP[s.rolle];
  var personLbl = document.createElement('div'); personLbl.className = 'input-label';
  personLbl.style.marginBottom = '12px';
  personLbl.textContent = (s.name || ('Person ' + (schildCurrentIdx + 1))) + (rm ? ' – ' + rm.disp : '');
  cont.appendChild(personLbl);

  // ── Vorlagen-Picker ──────────────────────────────────────────
  var curVorlage = ANGABEN_VORLAGEN.find(function(v) { return v.v === s.modus; }) || null;

  var picker = document.createElement('details');
  picker.className = 'vorlage-picker';
  if (!s.modus) picker.open = true; // open by default if nothing selected yet

  var summary = document.createElement('summary');
  summary.className = 'vorlage-picker-summary';
  var summaryLabel = document.createElement('span'); summaryLabel.className = 'vp-label';
  summaryLabel.textContent = curVorlage ? curVorlage.label : 'Vorlage wählen …';
  var chevron = document.createElement('span'); chevron.className = 'vp-chevron';
  chevron.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  summary.appendChild(summaryLabel);
  summary.appendChild(chevron);
  picker.appendChild(summary);

  var pickerBody = document.createElement('div'); pickerBody.className = 'vorlage-picker-body';
  ANGABEN_VORLAGEN.forEach(function(vorlage) {
    var item = document.createElement('button');
    item.type = 'button'; item.className = 'vorlage-picker-item' + (s.modus === vorlage.v ? ' active' : '');
    var lbl = document.createElement('span'); lbl.className = 'vpi-label'; lbl.textContent = vorlage.label;
    var desc = document.createElement('span'); desc.className = 'vpi-desc'; desc.textContent = vorlage.desc;
    item.appendChild(lbl); item.appendChild(desc);
    item.addEventListener('click', function() {
      s.modus = vorlage.v;
      summaryLabel.textContent = vorlage.label;
      pickerBody.querySelectorAll('.vorlage-picker-item').forEach(function(b) { b.classList.toggle('active', b === item); });
      picker.open = false;
      vufWrap.style.display = s.modus === 'vuf' ? '' : 'none';
      freiWrap.style.display = s.modus === 'frei' ? '' : 'none';
      refreshPreview();
    });
    pickerBody.appendChild(item);
  });
  picker.appendChild(pickerBody);
  cont.appendChild(picker);

  // ── Live-Vorschau ────────────────────────────────────────────
  var prevBox = document.createElement('div'); prevBox.className = 'preview-box';
  prevBox.style.marginTop = '14px';
  function refreshPreview() {
    var body = buildAngabenBody(s);
    prevBox.textContent = '…sinngemäß folgende Angaben:\n\n' + (body || '[Keine Angaben erfasst]');
  }
  refreshPreview();

  // ── VUF-Formular ─────────────────────────────────────────────
  var vufWrap = document.createElement('div');
  vufWrap.style.display = s.modus === 'vuf' ? '' : 'none';
  vufWrap.style.marginTop = '14px';

  function addField(label, placeholder, value, onInput, type) {
    var wrap = document.createElement('div'); wrap.style.marginBottom = '10px';
    var lbl = document.createElement('div'); lbl.className = 'input-label';
    lbl.style.marginBottom = '4px'; lbl.textContent = label;
    wrap.appendChild(lbl);
    var inp = document.createElement('input');
    inp.type = type || 'text'; inp.className = 'field-input';
    inp.placeholder = placeholder; inp.value = value || '';
    inp.oninput = function() { onInput(this.value); refreshPreview(); };
    wrap.appendChild(inp);
    return wrap;
  }

  vufWrap.appendChild(addField('Datum abgestellt', 'TT.MM.JJJJ', s.abstelltDatum, function(v) { s.abstelltDatum = v; }, 'date'));
  vufWrap.appendChild(addField('Uhrzeit abgestellt', 'z. B. 20:30', s.abstelltUhrzeit, function(v) { s.abstelltUhrzeit = v; }));
  vufWrap.appendChild(addField('Ort abgestellt', 'z. B. in der Hauptstraße', s.abstelltOrt, function(v) { s.abstelltOrt = v; }));
  vufWrap.appendChild(addField('Rückkehr-/Feststell-Datum', 'TT.MM.JJJJ', s.rueckDatum, function(v) { s.rueckDatum = v; }, 'date'));
  vufWrap.appendChild(addField('Rückkehr-Uhrzeit', 'z. B. 22:00', s.rueckUhrzeit, function(v) { s.rueckUhrzeit = v; }));

  var zwLbl = document.createElement('div'); zwLbl.className = 'input-label';
  zwLbl.style.marginBottom = '6px'; zwLbl.textContent = 'Feststellungen in der Zwischenzeit?';
  vufWrap.appendChild(zwLbl);

  var zwChips = document.createElement('div'); zwChips.className = 'suggestions';
  var zwTextWrap = document.createElement('div');
  zwTextWrap.style.display = s.zwischenzeit === 'ja' ? '' : 'none';
  zwTextWrap.style.marginTop = '8px';
  var zwInp = document.createElement('input');
  zwInp.type = 'text'; zwInp.className = 'field-input';
  zwInp.placeholder = 'Was wurde festgestellt…';
  zwInp.value = s.zwischenzeitText || '';
  zwInp.oninput = function() { s.zwischenzeitText = this.value; refreshPreview(); };
  zwTextWrap.appendChild(zwInp);

  [{ v: 'nein', label: 'Nein' }, { v: 'ja', label: 'Ja' }].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.zwischenzeit === opt.v ? ' active' : '');
    zwChips.appendChild(btn);
  });
  zwChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.zwischenzeit = btn.dataset.v;
    zwChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.toggle('active', b.dataset.v === s.zwischenzeit); });
    zwTextWrap.style.display = s.zwischenzeit === 'ja' ? '' : 'none';
    refreshPreview();
  });
  vufWrap.appendChild(zwChips);
  vufWrap.appendChild(zwTextWrap);
  cont.appendChild(vufWrap);

  // ── Freitext ─────────────────────────────────────────────────
  var freiWrap = document.createElement('div');
  freiWrap.style.display = s.modus === 'frei' ? '' : 'none';
  freiWrap.style.marginTop = '14px';
  var freiArea = document.createElement('textarea');
  freiArea.className = 'field-input'; freiArea.rows = 5;
  freiArea.style.width = '100%'; freiArea.style.resize = 'vertical';
  freiArea.placeholder = 'Angaben der Person in eigenen Worten…';
  freiArea.value = s.freitext || '';
  freiArea.oninput = function() { s.freitext = this.value; refreshPreview(); };
  freiWrap.appendChild(freiArea);
  cont.appendChild(freiWrap);

  cont.appendChild(prevBox);
}

function buildVerletzungText(s) {
  var rm = ROLLEN_MAP[s.rolle]; if (!rm) return '';
  var dispCap = rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1);
  var text = s.verletzungText || '[Verletzungsbeschreibung]';
  var akkus = rm.erLow === 'er' ? 'ihn' : 'sie';
  if (s.verletzungRtw === 'kein-rtw') {
    return dispCap + ' wies vor Ort ' + text + ' auf. ' + rm.er + ' gab an, keinen Rettungswagen zu benötigen und sich bei Bedarf selbstständig in ärztliche Behandlung begeben zu wollen. ' + rm.er + ' wurde darauf hingewiesen, dass die Möglichkeit besteht, sich ein ärztliches Zeugnis von den Verletzungen erstellen zu lassen.';
  }
  if (s.verletzungRtw === 'rtw') {
    return dispCap + ' wies vor Ort ' + text + ' auf. Für ' + akkus + ' wurde ein Rettungswagen angefordert und ' + rm.erLow + ' der medizinischen Versorgung übergeben.';
  }
  return dispCap + ' wies vor Ort ' + text + ' auf.';
}

function renderSchilderungenVerletzung() {
  var cont = document.getElementById('verletzungList');
  if (!cont) return;
  cont.innerHTML = '';

  var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null;
  if (!s) return;

  var rm = ROLLEN_MAP[s.rolle];
  var personLbl = document.createElement('div'); personLbl.className = 'input-label';
  personLbl.style.marginBottom = '8px';
  personLbl.textContent = (s.name || ('Person ' + (schildCurrentIdx + 1))) + (rm ? ' – ' + rm.disp : '');
  cont.appendChild(personLbl);

  // RTW chips
  var rtwLabel = document.createElement('div'); rtwLabel.className = 'input-label';
  rtwLabel.style.marginBottom = '6px'; rtwLabel.textContent = 'Rettungswagen';
  cont.appendChild(rtwLabel);

  var rtwChips = document.createElement('div'); rtwChips.className = 'suggestions';
  [{ v: 'kein-rtw', label: 'Kein RTW benötigt' }, { v: 'rtw', label: 'RTW angefordert' }].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.verletzungRtw === opt.v ? ' active' : '');
    rtwChips.appendChild(btn);
  });

  var prevBox = document.createElement('div');
  prevBox.className = 'verletzung-preview schild-preview-box';
  prevBox.textContent = buildVerletzungText(s);

  rtwChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.verletzungRtw = btn.dataset.v;
    rtwChips.querySelectorAll('.btn-suggestion').forEach(function(b) {
      b.classList.toggle('active', b.dataset.v === s.verletzungRtw);
    });
    prevBox.textContent = buildVerletzungText(s);
  });
  cont.appendChild(rtwChips);

  // Injury text input
  var injLabel = document.createElement('div'); injLabel.className = 'input-label';
  injLabel.style.marginTop = '14px'; injLabel.style.marginBottom = '4px';
  injLabel.textContent = 'Verletzungen';
  cont.appendChild(injLabel);

  var injHint = document.createElement('div');
  injHint.style.cssText = 'font-size:12px;color:var(--c-muted);margin-bottom:6px;';
  injHint.textContent = 'z. B. eine Rissquetschwunde an der Stirn';
  cont.appendChild(injHint);

  var injInp = document.createElement('input');
  injInp.type = 'text'; injInp.className = 'field-input';
  injInp.placeholder = 'Verletzungsbeschreibung…';
  injInp.value = s.verletzungText || '';
  injInp.oninput = function() { s.verletzungText = this.value; prevBox.textContent = buildVerletzungText(s); };
  cont.appendChild(injInp);

  // Live preview
  prevBox.style.cssText = 'margin-top:14px;font-size:13px;color:var(--c-text);background:var(--c-surface,#f5f5f7);border-radius:10px;padding:12px 14px;white-space:pre-wrap;line-height:1.5;';
  cont.appendChild(prevBox);
}

function renderSchilderungenOverview() {
  var cont = document.getElementById('schilderungenOverviewList');
  if (!cont) return;
  cont.innerHTML = '';

  schilderungen.forEach(function(s, idx) {
    var rm = ROLLEN_MAP[s.rolle];
    var isComplete = !!(s.rolle && s.belehrender);
    var card = document.createElement('div');
    card.className = 'schild-overview-card' + (isComplete ? ' complete' : '');

    var nameEl = document.createElement('div'); nameEl.className = 'schild-ov-name';
    nameEl.textContent = s.name || ('Person ' + (idx + 1));
    card.appendChild(nameEl);

    var rolleEl = document.createElement('div'); rolleEl.className = 'schild-ov-rolle';
    rolleEl.textContent = rm ? rm.disp.replace(/^(der|die) /, '') : 'Keine Rolle gewählt';
    card.appendChild(rolleEl);

    if (isComplete) {
      var badge = document.createElement('div'); badge.className = 'schild-ov-badge';
      badge.textContent = '✓ Erfasst';
      card.appendChild(badge);
    }

    cont.appendChild(card);
  });
}

function renderAuffaelligkeitenSlide(defs, s, field, containerId) {
  var cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = '';
  if (!s) return;

  defs.forEach(function(cat) {
    var catLbl = document.createElement('div'); catLbl.className = 'input-label';
    catLbl.style.marginBottom = '6px'; catLbl.textContent = cat.category;
    cont.appendChild(catLbl);

    var chips = document.createElement('div'); chips.className = 'suggestions';
    chips.style.marginBottom = '14px';
    cat.items.forEach(function(item) {
      var isOn = s[field] && s[field].indexOf(item.v) !== -1;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.v = item.v; btn.textContent = item.label;
      btn.className = 'btn-suggestion' + (isOn ? ' active' : '');
      chips.appendChild(btn);
    });
    chips.addEventListener('click', function(e) {
      var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
      var v = btn.dataset.v;
      if (!s[field]) s[field] = [];
      var i = s[field].indexOf(v);
      if (i !== -1) { s[field].splice(i, 1); btn.classList.remove('active'); }
      else          { s[field].push(v);       btn.classList.add('active'); }
    });
    cont.appendChild(chips);
  });
}

function renderSchilderungenAuffaelligkeiten() {
  var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null;
  renderAuffaelligkeitenSlide(AUFFAELLIGKEITEN, s, 'auffaelligkeiten', 'auffaelligkeitenList');
  renderAuffCustomList();
}

function renderSchilderungenAnweisungen() {
  var cont = document.getElementById('anweisungenList');
  if (!cont) return;
  cont.innerHTML = '';
  var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null;
  if (!s) return;
  var rm = ROLLEN_MAP[s.rolle];
  var dispText = rm ? rm.disp : 'die Person';

  var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.style.marginBottom = '8px';
  lbl.textContent = 'Konnte ' + dispText + ' den dienstlichen Anweisungen folgen?';
  cont.appendChild(lbl);

  var chips = document.createElement('div'); chips.className = 'suggestions';
  [
    { v: 'eingeschraenkt', label: 'Nur eingeschränkt' },
    { v: 'konnte-folgen',  label: 'Konnte folgen' }
  ].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.anweisungsFolge === opt.v ? ' active' : '');
    chips.appendChild(btn);
  });

  chips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.anweisungsFolge = btn.dataset.v;
    chips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });

  cont.appendChild(chips);
}

function renderAuffCustomList() {
  var cont = document.getElementById('auffCustomList');
  if (!cont) return;
  cont.innerHTML = '';
  var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null;
  if (!s || !s.auffCustom || !s.auffCustom.length) return;
  var chips = document.createElement('div'); chips.className = 'suggestions'; chips.style.marginTop = '4px';
  s.auffCustom.forEach(function(val, i) {
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-suggestion active';
    btn.innerHTML = val + ' <span style="opacity:0.55;margin-left:4px">&times;</span>';
    btn.onclick = (function(idx) { return function() { s.auffCustom.splice(idx, 1); renderAuffCustomList(); }; })(i);
    chips.appendChild(btn);
  });
  cont.appendChild(chips);
}

function renderSchilderungenAlkoholTest() {
  var cont = document.getElementById('alkTestList');
  if (!cont) return;
  cont.innerHTML = '';
  var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null;
  if (!s) return;

  var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.style.marginBottom = '8px';
  lbl.textContent = 'Wurde ein freiwilliger Atemalkoholtest durchgeführt?';
  cont.appendChild(lbl);

  var aatChips = document.createElement('div'); aatChips.className = 'suggestions';
  [{ v: 'ja', label: 'Ja, durchgeführt' }, { v: 'abgelehnt', label: 'Von Person abgelehnt' }].forEach(function(opt) {
    var btn = document.createElement('button'); btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.aatDurchgefuehrt === opt.v ? ' active' : '');
    aatChips.appendChild(btn);
  });
  cont.appendChild(aatChips);

  var detailWrap = document.createElement('div');
  detailWrap.style.marginTop = '16px'; detailWrap.style.display = s.aatDurchgefuehrt === 'ja' ? '' : 'none';

  var wertLbl = document.createElement('div'); wertLbl.className = 'input-label'; wertLbl.textContent = 'Atemalkohol (mg/l)';
  detailWrap.appendChild(wertLbl);
  var wertInp = document.createElement('input'); wertInp.type = 'number'; wertInp.step = '0.001'; wertInp.min = '0';
  wertInp.className = 'field-input'; wertInp.placeholder = 'z.B. 0.25'; wertInp.value = s.aatWert || '';
  wertInp.oninput = function() { s.aatWert = this.value; };
  detailWrap.appendChild(wertInp);

  var zeitLbl = document.createElement('div'); zeitLbl.className = 'input-label'; zeitLbl.style.marginTop = '10px';
  zeitLbl.textContent = 'Uhrzeit des Tests';
  detailWrap.appendChild(zeitLbl);
  var zeitInp = document.createElement('input'); zeitInp.type = 'time'; zeitInp.className = 'field-input';
  zeitInp.value = s.aatUhrzeit || ''; zeitInp.oninput = function() { s.aatUhrzeit = this.value; };
  detailWrap.appendChild(zeitInp);

  cont.appendChild(detailWrap);

  aatChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.aatDurchgefuehrt = btn.dataset.v;
    aatChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    detailWrap.style.display = s.aatDurchgefuehrt === 'ja' ? '' : 'none';
  });
}

function renderSchilderungenBtmTest() {
  var cont = document.getElementById('btmTestList');
  if (!cont) return;
  cont.innerHTML = '';
  var s = schildCurrentIdx !== null ? schilderungen[schildCurrentIdx] : null;
  if (!s) return;

  var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.style.marginBottom = '8px';
  lbl.textContent = 'Wurde ein freiwilliger Drogenvortest durchgeführt?';
  cont.appendChild(lbl);

  var testChips = document.createElement('div'); testChips.className = 'suggestions';
  [{ v: 'ja', label: 'Ja, durchgeführt' }, { v: 'abgelehnt', label: 'Von Person abgelehnt' }].forEach(function(opt) {
    var btn = document.createElement('button'); btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.btmTestDurchgefuehrt === opt.v ? ' active' : '');
    testChips.appendChild(btn);
  });
  cont.appendChild(testChips);

  var detailWrap = document.createElement('div');
  detailWrap.style.marginTop = '16px'; detailWrap.style.display = s.btmTestDurchgefuehrt === 'ja' ? '' : 'none';

  var uhrLbl = document.createElement('div'); uhrLbl.className = 'input-label'; uhrLbl.style.marginBottom = '4px'; uhrLbl.textContent = 'Uhrzeit des Tests';
  detailWrap.appendChild(uhrLbl);
  var uhrInp = document.createElement('input');
  uhrInp.type = 'text'; uhrInp.className = 'field-input';
  uhrInp.placeholder = 'z. B. 21:45'; uhrInp.value = s.btmTestUhrzeit || '';
  uhrInp.oninput = function() { s.btmTestUhrzeit = this.value; };
  uhrInp.style.marginBottom = '12px';
  detailWrap.appendChild(uhrInp);

  var methLbl = document.createElement('div'); methLbl.className = 'input-label'; methLbl.textContent = 'Testmethode';
  detailWrap.appendChild(methLbl);
  var methChips = document.createElement('div'); methChips.className = 'suggestions';
  [{ v: 'urin', label: 'Urin' }, { v: 'speichel', label: 'Speichel' }].forEach(function(opt) {
    var btn = document.createElement('button'); btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.btmTestMethode === opt.v ? ' active' : '');
    methChips.appendChild(btn);
  });
  detailWrap.appendChild(methChips);

  var ergLbl = document.createElement('div'); ergLbl.className = 'input-label'; ergLbl.style.marginTop = '12px'; ergLbl.textContent = 'Ergebnis';
  detailWrap.appendChild(ergLbl);
  var ergChips = document.createElement('div'); ergChips.className = 'suggestions';
  [{ v: 'positiv', label: 'Positiv' }, { v: 'negativ', label: 'Negativ' }].forEach(function(opt) {
    var btn = document.createElement('button'); btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.btmTestErgebnis === opt.v ? ' active' : '');
    ergChips.appendChild(btn);
  });
  detailWrap.appendChild(ergChips);

  var sgWrap = document.createElement('div');
  sgWrap.style.marginTop = '12px'; sgWrap.style.display = s.btmTestErgebnis === 'positiv' ? '' : 'none';
  var sgLbl = document.createElement('div'); sgLbl.className = 'input-label'; sgLbl.style.marginBottom = '6px';
  sgLbl.textContent = 'Positive Stoffgruppen';
  sgWrap.appendChild(sgLbl);
  var sgChips = document.createElement('div'); sgChips.className = 'suggestions';
  STOFFGRUPPEN.forEach(function(sg) {
    var isOn = s.btmStoffgruppen && s.btmStoffgruppen.indexOf(sg.v) !== -1;
    var btn = document.createElement('button'); btn.type = 'button'; btn.dataset.v = sg.v; btn.textContent = sg.label;
    btn.className = 'btn-suggestion' + (isOn ? ' active' : '');
    sgChips.appendChild(btn);
  });
  sgChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    var v = btn.dataset.v;
    if (!s.btmStoffgruppen) s.btmStoffgruppen = [];
    var i = s.btmStoffgruppen.indexOf(v);
    if (i !== -1) { s.btmStoffgruppen.splice(i, 1); btn.classList.remove('active'); }
    else          { s.btmStoffgruppen.push(v);       btn.classList.add('active'); }
  });
  sgWrap.appendChild(sgChips);
  detailWrap.appendChild(sgWrap);
  cont.appendChild(detailWrap);

  testChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.btmTestDurchgefuehrt = btn.dataset.v;
    testChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    detailWrap.style.display = s.btmTestDurchgefuehrt === 'ja' ? '' : 'none';
  });

  methChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.btmTestMethode = btn.dataset.v;
    methChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });

  ergChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.btmTestErgebnis = btn.dataset.v;
    ergChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    sgWrap.style.display = s.btmTestErgebnis === 'positiv' ? '' : 'none';
  });
}

function getAuffaelligkeitenLabels(defs, selected) {
  var labels = [];
  defs.forEach(function(cat) {
    cat.items.forEach(function(item) {
      if (selected.indexOf(item.v) !== -1) labels.push(item.label);
    });
  });
  return labels;
}

function formatDateDE(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso;
}

var ROLLE_KURZ = {
  zeuge: 'Zeuge', zeugin: 'Zeugin',
  ub01m: 'Unfallbeteiligter 01', ub01w: 'Unfallbeteiligte 01',
  ub02m: 'Unfallbeteiligter 02', ub02w: 'Unfallbeteiligte 02',
  beschm: 'Beschuldigter', beschw: 'Beschuldigte',
  geschm: 'Geschädigter', geschw: 'Geschädigte'
};
function rolleRef(rolle, name) {
  var k = ROLLE_KURZ[rolle] || 'Person';
  return name && name.trim() ? k + ' ' + name.trim() : k;
}

function schilderungenPersonList() {
  return schilderungen.map(function (s) {
    var rm = ROLLEN_MAP[s.rolle];
    if (!rm) return null;
    var text = buildSchilderungBlock(s, rm);
    return { ref: rolleRef(s.rolle, s.name), text: text };
  }).filter(Boolean);
}

function generateSchilderungenText() {
  return schilderungenPersonList().map(function (p) { return p.text; })
    .filter(function (t) { return t && t.trim(); }).join('\n\n');
}

function buildSchilderungBlock(s, rm) {
  {
    var bel = s.belehrender || '[Beamter/Beamtin]';
    var geg = s.gegenueber || '[Beamter/Beamtin]';
    var belTyp = rm.btyp === 'besch' ? 'Beschuldigtenbelehrung' : 'zeugenschaftlicher Belehrung';

    var parts = [];

    var dispCap = rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1);

    var umst2 = s.umstaende || [];
    if (umst2.indexOf('leicht-verletzt') !== -1) {
      var verlText = buildVerletzungText(s);
      if (verlText) parts.push(verlText);
    }

    var auffLabels = getAuffaelligkeitenLabels(AUFFAELLIGKEITEN, s.auffaelligkeiten || []).concat(s.auffCustom || []);
    var istAlk = umst2.indexOf('alkohol') !== -1 || umst2.indexOf('alkohol-btm') !== -1;
    var istBtm = umst2.indexOf('btm') !== -1 || umst2.indexOf('alkohol-btm') !== -1;

    if (auffLabels.length > 0) {
      var schluss, abschluss;
      if (istAlk && istBtm) {
        schluss  = 'den Schluss auf einen vorangegangenen Alkohol- und Betäubungsmittelkonsum zu';
        abschluss = 'Die Gesamtheit der Beobachtungen stellte sich als kombiniertes alkohol- und drogentypisches Erscheinungsbild dar.';
      } else if (istBtm) {
        schluss  = 'den Schluss auf einen vorangegangenen Betäubungsmittelkonsum zu';
        abschluss = 'Die Gesamtheit der Beobachtungen stellte sich als drogentypisches Erscheinungsbild dar.';
      } else {
        schluss  = 'den Schluss auf einen vorangegangenen Alkoholkonsum zu';
        abschluss = 'Die Gesamtheit der Beobachtungen stellte sich als alkoholtypisches Erscheinungsbild dar.';
      }
      parts.push('Die bei ' + rm.dativ + ' wahrgenommenen körperlichen und verhaltensbezogenen Auffälligkeiten ließen in ihrer Gesamtheit ' + schluss + '. Festgestellt wurden hierbei insbesondere:\n' +
        auffLabels.map(function(l) { return '– ' + l; }).join('\n') + '\n' +
        abschluss);
    }

    if (s.anweisungsFolge) {
      var akkus = rm.erLow === 'er' ? 'ihn' : 'sie';
      if (s.anweisungsFolge === 'eingeschraenkt') {
        parts.push('Im Rahmen der polizeilichen Ansprache zeigte sich ' + rm.disp + ' nur eingeschränkt aufnahme- und reaktionsfähig. Den an ' + akkus + ' gerichteten Fragen, Hinweisen und dienstlichen Anweisungen konnte ' + rm.erLow + ' augenscheinlich nicht durchgehend folgen.');
      } else if (s.anweisungsFolge === 'konnte-folgen') {
        parts.push('Trotz der festgestellten körperlichen und verhaltensbezogenen Auffälligkeiten konnte ' + rm.erLow + ' den an ' + akkus + ' gerichteten Fragen, Hinweisen und dienstlichen Anweisungen dem äußeren Eindruck nach folgen.');
      }
    }

    if (s.aatDurchgefuehrt === 'ja' && s.aatWert) {
      var uhrPfx = s.aatUhrzeit ? 'Der um ' + s.aatUhrzeit + ' Uhr durchgeführte Test' : 'Der durchgeführte Test';
      parts.push(dispCap + ' erklärte sich mit der Durchführung eines freiwilligen Atemalkoholtests einverstanden. ' + uhrPfx + ' ergab einen Atemalkoholwert von ' + s.aatWert.replace('.', ',') + ' mg/l.');
    } else if (s.aatDurchgefuehrt === 'abgelehnt') {
      parts.push(dispCap + ' lehnte die Durchführung eines freiwilligen Atemalkoholtests ab.');
    }

    if (s.btmTestDurchgefuehrt === 'ja') {
      var meth = s.btmTestMethode === 'speichel' ? 'Speichel' : 'Urin';
      var intro2 = dispCap + ' erklärte sich mit der Durchführung eines freiwilligen Drogenvortests mittels ' + meth + ' einverstanden.';
      var btmUhrPfx = s.btmTestUhrzeit ? 'Der um ' + s.btmTestUhrzeit + ' Uhr durchgeführte Test' : 'Der durchgeführte Test';
      if (s.btmTestErgebnis === 'positiv' && s.btmStoffgruppen && s.btmStoffgruppen.length) {
        parts.push(intro2 + ' ' + btmUhrPfx + ' reagierte positiv auf folgende Stoffgruppen: ' + s.btmStoffgruppen.join(', ') + '.');
      } else if (s.btmTestErgebnis === 'positiv') {
        parts.push(intro2 + ' ' + btmUhrPfx + ' reagierte positiv.');
      } else if (s.btmTestErgebnis === 'negativ') {
        parts.push(intro2 + ' ' + btmUhrPfx + ' verlief negativ.');
      } else {
        parts.push(intro2);
      }
    } else if (s.btmTestDurchgefuehrt === 'abgelehnt') {
      parts.push(dispCap + ' lehnte die Durchführung eines freiwilligen Drogenvortests ab.');
    }

    parts.push(buildAngabenText(s));
    return parts.join('\n\n');
  }
}

function buildAktenzeichen(uhrzeit, nwKennung) {
  var datum = document.getElementById('datum').value; // YYYY-MM-DD
  var uhr = (uhrzeit !== undefined ? uhrzeit : massnahmenData.bescheinigungenUhrzeit) || '';
  var nw = ((nwKennung !== undefined ? nwKennung : massnahmenData.bescheinigungenNwKennung) || '').toUpperCase();
  var datePart = '';
  if (datum) {
    var dp = datum.split('-');
    if (dp.length === 3) datePart = dp[0].slice(-2) + dp[1] + dp[2];
  }
  var timePart = uhr ? uhr.replace(':', '') : '';
  return (datePart || 'JJMMTT') + '-' + (timePart || 'HHMM') + '-' + (nw || 'XXXXXX');
}

function buildBescheinigungsEmail(rolle) {
  var rm = ROLLEN_MAP[rolle];
  if (!rm) return '';
  var personName = '';
  for (var i = 0; i < schilderungen.length; i++) {
    if (schilderungen[i].rolle === rolle && schilderungen[i].name) {
      personName = schilderungen[i].name.trim();
      break;
    }
  }
  if (!personName && typeof anzeigePersonen !== 'undefined') {
    for (var j = 0; j < anzeigePersonen.length; j++) {
      if (anzeigePersonen[j].rolle === rolle && anzeigePersonen[j].name) {
        personName = anzeigePersonen[j].name.trim();
        break;
      }
    }
  }
  var isFemale = ['zeugin', 'ub01w', 'ub02w', 'beschw', 'geschw'].indexOf(rolle) !== -1;
  var anrede = isFemale
    ? 'Sehr geehrte Frau' + (personName ? ' ' + personName : '')
    : 'Sehr geehrter Herr' + (personName ? ' ' + personName : '');
  var az = buildAktenzeichen();
  return anrede + ',\n\n' +
    'anbei befindet sich das versprochene Dokument. Auf dem Dokument ist das Aktenzeichen verzeichnet, unter welchem die Vorgangsbearbeitung erfolgen wird (' + az + ').\n\n' +
    'Sollten Sie Fragen haben, besteht die Möglichkeit, diese den Mitarbeitenden der Polizeiwache Gütersloh zu stellen (05241 869 0). Bitte halten Sie dafür das Aktenzeichen bereit.\n\n' +
    'Sollten Sie beabsichtigen, Akteneinsicht anzufordern, wenden Sie sich bitte an den zuständigen Sachbearbeiter des Kommissariats. Dessen Durchwahl können Sie ebenfalls erfragen (05241 869 [Durchwahl]).\n\n' +
    'Mit freundlichen Grüßen';
}

function findPersonName(rolle) {
  for (var i = 0; i < schilderungen.length; i++) {
    if (schilderungen[i].rolle === rolle && schilderungen[i].name) return schilderungen[i].name.trim();
  }
  if (typeof anzeigePersonen !== 'undefined') {
    for (var j = 0; j < anzeigePersonen.length; j++) {
      if (anzeigePersonen[j].rolle === rolle && anzeigePersonen[j].name) return anzeigePersonen[j].name.trim();
    }
  }
  return '';
}

function buildUnfallDigitalEmail(rolle) {
  var rm = ROLLEN_MAP[rolle];
  if (!rm) return '';
  var personName = findPersonName(rolle);
  var isFemale = ['zeugin', 'ub01w', 'ub02w', 'beschw', 'geschw'].indexOf(rolle) !== -1;
  var anrede = isFemale
    ? 'Sehr geehrte Frau' + (personName ? ' ' + personName : '')
    : 'Sehr geehrter Herr' + (personName ? ' ' + personName : '');
  var az = buildAktenzeichen(massnahmenData.unfallDigitalUhrzeit, massnahmenData.unfallDigitalNwKennung);
  return anrede + ',\n\n' +
    'anbei erhalten Sie die Unfallmitteilung zu dem gemeldeten Verkehrsunfall in digitaler Form. Auf dem Dokument ist das Aktenzeichen verzeichnet, unter welchem die Vorgangsbearbeitung erfolgen wird (' + az + ').\n\n' +
    'Sollten Sie Fragen haben, besteht die Möglichkeit, diese den Mitarbeitenden der Polizeiwache Gütersloh zu stellen (05241 869 0). Bitte halten Sie dafür das Aktenzeichen bereit.\n\n' +
    'Mit freundlichen Grüßen';
}

function copyToClipboard(text, btn) {
  function onSuccess() {
    var orig = btn.innerHTML;
    btn.textContent = '✓ Kopiert';
    btn.classList.add('copied');
    setTimeout(function() { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(function() { copyFallback(text, btn, onSuccess); });
  } else {
    copyFallback(text, btn, onSuccess);
  }
}
function copyFallback(text, btn, cb) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); cb(); } catch(e) {}
  document.body.removeChild(ta);
}

function generateMassnahmenText() {
  var parts = [];
  if (massnahmenData.unfallmitteilungen) {
    parts.push('Den Unfallbeteiligten wurden vor Ort jeweils eine Durchschrift der Unfallmitteilung ausgehändigt.');
  }
  massnahmenData.unfallDigitalRollen.forEach(function(rolle) {
    var rm = ROLLEN_MAP[rolle]; if (!rm) return;
    var dativCap = rm.dativ.charAt(0).toUpperCase() + rm.dativ.slice(1);
    var az = buildAktenzeichen(massnahmenData.unfallDigitalUhrzeit, massnahmenData.unfallDigitalNwKennung);
    parts.push(dativCap + ' wurde die Unfallmitteilung in digitaler Form per E-Mail übersandt (Az.: ' + az + ').');
  });
  massnahmenData.bescheinigungen.forEach(function(rolle) {
    var rm = ROLLEN_MAP[rolle]; if (!rm) return;
    var dativCap = rm.dativ.charAt(0).toUpperCase() + rm.dativ.slice(1);
    var az = buildAktenzeichen();
    parts.push(dativCap + ' wurde eine Bescheinigung über die Erstattung einer Anzeige per E-Mail übersandt (Az.: ' + az + ').');
  });
  if (massnahmenData.kunoSperrung) {
    parts.push('Es wurde eine KUNO-Sperrung eingeleitet. Die Person wurde über das Vorgehen sowie die zeitlich befristete Sperrung hingewiesen.');
  }
  if (massnahmenData.sachfahndung) {
    parts.push('Eine entsprechende Sachfahndung wurde eingeleitet.');
  }
  if (massnahmenData.lichtbilder) {
    parts.push('Sachdienliche Lichtbilder wurden gefertigt und liegen dem Vorgang digital bei.');
  }
  massnahmenData.dokumenteRollen.forEach(function(rolleKey) {
    var rm = ROLLEN_MAP[rolleKey]; if (!rm) return;
    var nomCap = rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1);
    var beamter = massnahmenData.dokumenteBeamterGender === 'w'
      ? 'der aufnehmenden Beamtin'
      : 'dem aufnehmenden Beamten';
    parts.push(nomCap + ' händigte ' + beamter + ' sachdienliche Dokumente aus, welche eingescannt und digital beigefügt wurden.');
  });
  massnahmenData.bescheinigungAusgehaendigt.forEach(function(rolleKey) {
    var rm = ROLLEN_MAP[rolleKey]; if (!rm) return;
    var dativCap = rm.dativ.charAt(0).toUpperCase() + rm.dativ.slice(1);
    parts.push(dativCap + ' wurde eine Bescheinigung über die Erstattung einer Anzeige ausgehändigt.');
  });
  massnahmenData.weiterfahrtUntersagt.forEach(function(rolleKey) {
    var rm = ROLLEN_MAP[rolleKey]; if (!rm) return;
    var dativCap = rm.dativ.charAt(0).toUpperCase() + rm.dativ.slice(1);
    var nomCap = rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1);
    parts.push(
      dativCap + ' wurde ausdrücklich und unmissverständlich untersagt, bis zum Erreichen der vollständigen Nüchternheit ein Fahrzeug im öffentlichen Straßenverkehr zu führen. ' +
      rm.er + ' wurde darüber belehrt, dass das Führen eines Kraftfahrzeugs unter der Wirkung von Alkohol bzw. berauschenden Mitteln eine Straftat gemäß § 316 StGB darstellt und eine gleichwohl angetretene Fahrt ein weiteres Strafverfahren nach sich zieht. ' +
      nomCap + ' bestätigte, die Belehrung verstanden zu haben.'
    );
  });
  massnahmenData.entsorgungVerzicht.forEach(function(rolleKey) {
    var rm = ROLLEN_MAP[rolleKey]; if (!rm) return;
    var nomCap = rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1);
    var gg = massnahmenData.entsorgungGegenstaende && massnahmenData.entsorgungGegenstaende.trim()
      ? 'die folgenden Gegenstände (' + massnahmenData.entsorgungGegenstaende.trim() + ')'
      : 'die betreffenden Gegenstände';
    parts.push(
      nomCap + ' gab gegenüber den eingesetzten Beamten ' + gg + ' freiwillig heraus und erklärte ausdrücklich und unmissverständlich, ' + rm.sein + ' Eigentum sowie den Gewahrsam an diesen Gegenständen vollständig und unwiderruflich aufzugeben (Eigentumsverzicht gemäß § 959 BGB). ' +
      rm.er + ' stimmte einer Entsorgung bzw. Vernichtung durch die Polizei ausdrücklich zu und verzichtete auf jegliche Ansprüche, insbesondere auf Herausgabe, Verwahrung und Schadensersatz. Die Erklärung erfolgte freiwillig und außergerichtlich; ' + rm.disp + ' bestätigte, den Inhalt und die Tragweite verstanden zu haben.'
    );
  });
  if (massnahmenData.gefaehrderanspracheKomp.length > 0 || massnahmenData.gefaehrderanspracheHg) {
    var grm = ROLLEN_MAP[massnahmenData.gefaehrderanspracheRolle] || ROLLEN_MAP.beschm;
    var erLow = grm.erLow;                                   // er | sie
    var ihm = grm.erLow === 'er' ? 'ihm' : 'ihr';            // dativ (klein)
    var K = massnahmenData.gefaehrderanspracheKomp;
    function hasK(v) { return K.indexOf(v) !== -1; }
    var g = ['Bei ' + grm.dativ + ' wurde eine Gefährderansprache durchgeführt.'];

    // Block A: konfrontiert / Tatvorwurf (Nominativ, kombinierbar)
    var aParts = [];
    if (hasK('ermittlungsstand')) aParts.push('mit dem polizeilichen Ermittlungs- und Erkenntnisstand konfrontiert');
    if (hasK('tatvorwurf'))       aParts.push('auf den konkreten Tatvorwurf hingewiesen');
    if (aParts.length) g.push('Dabei wurde ' + erLow + ' ' + aParts.join(' und ') + '.');

    // Block B: Null Toleranz
    if (hasK('nulltoleranz')) g.push('Es wurde verdeutlicht, dass das von ' + ihm + ' gezeigte Verhalten ernst genommen sowie konsequent strafrechtlich verfolgt wird (Null Toleranz – die Polizei wird mit gebotener Härte (weitere) Straftaten verhindern).');

    // Block C: die beiden "erklärt"-Punkte zusammengefasst
    var cParts = [];
    if (hasK('verschriftlicht'))    cParts.push('dass eine Gefährderansprache verschriftlicht wird und der Akte beiliegt');
    if (hasK('strafverschaerfend')) cParts.push('dass sich weitere strafbare Handlungen strafverschärfend auswirken können');
    if (cParts.length) g.push((g.length > 1 ? 'Ferner' : 'Dabei') + ' wurde ' + ihm + ' erklärt, ' + cParts.join(' sowie ') + '.');

    // Block D: HG
    if (massnahmenData.gefaehrderanspracheHg) g.push((g.length > 1 ? 'Darüber hinaus' : 'Dabei') + ' wurde ' + ihm + ' das Vorgehen der Polizei bei dem Vorliegen einer Häuslichen Gewalt aufgezeigt und ein 10-tägiges Rückkehrverbot ausgesprochen (samt Androhung polizeilicher Folgemaßnahmen, wie freiheitsentziehende Maßnahmen).');

    parts.push(g.join(' '));
  }
  return parts.join('\n\n');
}

function renderMassnahmen() {
  var cont = document.getElementById('massnahmenList');
  if (!cont) return;
  cont.innerHTML = '';

  // ── Unfallmitteilungen ──────────────────────────────────────
  var umBtn = document.createElement('button');
  umBtn.type = 'button';
  umBtn.className = 'massnahme-btn' + (massnahmenData.unfallmitteilungen ? ' active' : '');
  umBtn.innerHTML =
    '<span class="mb-check"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>' +
    '<span class="mb-label">Unfallmitteilungen ausgehändigt</span>';
  umBtn.onclick = function() {
    massnahmenData.unfallmitteilungen = !massnahmenData.unfallmitteilungen;
    umBtn.classList.toggle('active', massnahmenData.unfallmitteilungen);
  };
  cont.appendChild(umBtn);

  // ── Unfallmitteilungen digital (per E-Mail) ─────────────────
  var udWrap = document.createElement('div');
  var udActive = function() { return massnahmenData.unfallDigitalRollen.length > 0; };
  var udBtn = document.createElement('button');
  udBtn.type = 'button';
  udBtn.className = 'massnahme-btn' + (udActive() ? ' active open' : '');
  udBtn.innerHTML =
    '<span class="mb-check"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>' +
    '<span class="mb-label">Unfallmitteilung digital (per E-Mail)</span>' +
    '<span class="mb-chevron"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>';
  var udDetail = document.createElement('div');
  udDetail.className = 'massnahme-sub';
  udDetail.style.display = (udActive() || massnahmenData.unfallDigitalUhrzeit || massnahmenData.unfallDigitalNwKennung) ? '' : 'none';

  // AZ-Felder
  var udAzRow = document.createElement('div'); udAzRow.className = 'besch-az-row';
  var udUhrWrap = document.createElement('div'); udUhrWrap.className = 'besch-az-field';
  var udUhrLbl = document.createElement('label'); udUhrLbl.textContent = 'Uhrzeit für Aktenzeichen';
  var udUhrInp = document.createElement('input'); udUhrInp.type = 'time'; udUhrInp.className = 'field-input';
  udUhrInp.value = massnahmenData.unfallDigitalUhrzeit;
  udUhrInp.addEventListener('input', function() { massnahmenData.unfallDigitalUhrzeit = this.value; refreshUdPreviews(); });
  var udUeb = document.createElement('button'); udUeb.type = 'button'; udUeb.className = 'az-uebernehmen-btn';
  udUeb.textContent = '↑ Aus Einsatzdaten übernehmen';
  udUeb.onclick = function() {
    var src = document.getElementById('uhrzeit');
    if (src && src.value) { massnahmenData.unfallDigitalUhrzeit = src.value; udUhrInp.value = src.value; refreshUdPreviews(); }
  };
  udUhrWrap.appendChild(udUhrLbl); udUhrWrap.appendChild(udUhrInp); udUhrWrap.appendChild(udUeb);
  udAzRow.appendChild(udUhrWrap);
  var udNwWrap = document.createElement('div'); udNwWrap.className = 'besch-az-field';
  var udNwLbl = document.createElement('label'); udNwLbl.textContent = 'NW-Kennung (6 Zeichen)';
  var udNwInp = document.createElement('input'); udNwInp.type = 'text'; udNwInp.className = 'field-input';
  udNwInp.maxLength = 6; udNwInp.placeholder = 'z.B. GT0001'; udNwInp.style.textTransform = 'uppercase';
  udNwInp.value = massnahmenData.unfallDigitalNwKennung;
  udNwInp.addEventListener('input', function() { massnahmenData.unfallDigitalNwKennung = this.value.toUpperCase(); refreshUdPreviews(); });
  udNwWrap.appendChild(udNwLbl); udNwWrap.appendChild(udNwInp);
  udAzRow.appendChild(udNwWrap);
  udDetail.appendChild(udAzRow);

  // AZ-Vorschau
  var udAzPrev = document.createElement('div'); udAzPrev.className = 'az-preview-wrap';
  var udAzPrevLbl = document.createElement('span'); udAzPrevLbl.className = 'az-preview-label'; udAzPrevLbl.textContent = 'Aktenzeichen: ';
  var udAzPrevVal = document.createElement('span'); udAzPrevVal.className = 'az-preview-val';
  udAzPrevVal.textContent = buildAktenzeichen(massnahmenData.unfallDigitalUhrzeit, massnahmenData.unfallDigitalNwKennung);
  udAzPrev.appendChild(udAzPrevLbl); udAzPrev.appendChild(udAzPrevVal);
  udDetail.appendChild(udAzPrev);

  // Person(en)
  var udRolleLbl = document.createElement('div'); udRolleLbl.className = 'input-label'; udRolleLbl.style.cssText = 'margin-top:14px;margin-bottom:6px';
  udRolleLbl.textContent = 'Empfänger (Unfallbeteiligte)';
  udDetail.appendChild(udRolleLbl);
  var udChips = document.createElement('div'); udChips.className = 'suggestions';
  [
    { v: 'ub01m', label: 'UB 01 (m)' }, { v: 'ub01w', label: 'UB 01 (w)' },
    { v: 'ub02m', label: 'UB 02 (m)' }, { v: 'ub02w', label: 'UB 02 (w)' },
    { v: 'beschm', label: 'Beschuldigter' }, { v: 'beschw', label: 'Beschuldigte' },
    { v: 'zeuge', label: 'Zeuge' }, { v: 'zeugin', label: 'Zeugin' }
  ].forEach(function(opt) {
    var b = document.createElement('button');
    b.type = 'button'; b.dataset.v = opt.v; b.textContent = opt.label;
    b.className = 'btn-suggestion' + (massnahmenData.unfallDigitalRollen.indexOf(opt.v) !== -1 ? ' active' : '');
    b.addEventListener('click', function() {
      var i = massnahmenData.unfallDigitalRollen.indexOf(opt.v);
      if (i !== -1) { massnahmenData.unfallDigitalRollen.splice(i, 1); b.classList.remove('active'); }
      else          { massnahmenData.unfallDigitalRollen.push(opt.v);  b.classList.add('active'); }
      udBtn.classList.toggle('active', udActive());
      refreshUdPreviews();
    });
    udChips.appendChild(b);
  });
  udDetail.appendChild(udChips);

  // E-Mail-Vorschauen
  var udPreviews = document.createElement('div'); udPreviews.className = 'email-previews-wrap';
  udDetail.appendChild(udPreviews);

  function refreshUdPreviews() {
    udAzPrevVal.textContent = buildAktenzeichen(massnahmenData.unfallDigitalUhrzeit, massnahmenData.unfallDigitalNwKennung);
    udPreviews.innerHTML = '';
    massnahmenData.unfallDigitalRollen.forEach(function(rolle) {
      var rm = ROLLEN_MAP[rolle]; if (!rm) return;
      var emailText = buildUnfallDigitalEmail(rolle);
      var card = document.createElement('div'); card.className = 'email-preview-card';
      var hdr = document.createElement('div'); hdr.className = 'email-preview-hdr';
      var title = document.createElement('span'); title.textContent = rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1);
      var copyBtn = document.createElement('button'); copyBtn.type = 'button'; copyBtn.className = 'btn-copy-email';
      copyBtn.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Kopieren';
      (function(et, cb) { cb.addEventListener('click', function() { copyToClipboard(et, cb); }); }(emailText, copyBtn));
      hdr.appendChild(title); hdr.appendChild(copyBtn);
      var body = document.createElement('div'); body.className = 'email-preview-body'; body.textContent = emailText;
      card.appendChild(hdr); card.appendChild(body);
      udPreviews.appendChild(card);
    });
  }
  refreshUdPreviews();

  udBtn.onclick = function() {
    var isOpen = udDetail.style.display !== 'none';
    udDetail.style.display = isOpen ? 'none' : '';
    udBtn.classList.toggle('open', !isOpen);
    if (!isOpen) udBtn.classList.add('active');
    else if (!udActive()) udBtn.classList.remove('active');
  };
  udWrap.appendChild(udBtn); udWrap.appendChild(udDetail);
  cont.appendChild(udWrap);

  // ── Bescheinigung per E-Mail ────────────────────────────────
  var bescWrap = document.createElement('div');

  var bescBtn = document.createElement('button');
  bescBtn.type = 'button';
  bescBtn.className = 'massnahme-btn' + (massnahmenData.bescheinigungen.length > 0 ? ' active' : '');
  bescBtn.innerHTML =
    '<span class="mb-check"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>' +
    '<span class="mb-label">Bescheinigung über Anzeigeerstattung per E-Mail</span>' +
    '<span class="mb-chevron"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>';

  var bescDetail = document.createElement('div');
  bescDetail.className = 'massnahme-sub';
  var panelOpen = massnahmenData.bescheinigungen.length > 0 || !!(massnahmenData.bescheinigungenUhrzeit || massnahmenData.bescheinigungenNwKennung);
  bescDetail.style.display = panelOpen ? '' : 'none';
  if (panelOpen) { bescBtn.classList.add('open'); bescBtn.classList.add('active'); }

  // ── AZ-Felder ──
  var azRow = document.createElement('div');
  azRow.className = 'besch-az-row';

  var azUhrWrap = document.createElement('div');
  azUhrWrap.className = 'besch-az-field';
  var azUhrLbl = document.createElement('label');
  azUhrLbl.textContent = 'Uhrzeit für Aktenzeichen';
  var azUhrInp = document.createElement('input');
  azUhrInp.type = 'time';
  azUhrInp.className = 'field-input';
  azUhrInp.value = massnahmenData.bescheinigungenUhrzeit;
  azUhrInp.addEventListener('input', function() {
    massnahmenData.bescheinigungenUhrzeit = this.value;
    refreshEmailPreviews();
  });
  var azUebernehmen = document.createElement('button');
  azUebernehmen.type = 'button';
  azUebernehmen.className = 'az-uebernehmen-btn';
  azUebernehmen.textContent = '↑ Aus Einsatzdaten übernehmen';
  azUebernehmen.onclick = function() {
    var src = document.getElementById('uhrzeit');
    if (src && src.value) {
      massnahmenData.bescheinigungenUhrzeit = src.value;
      azUhrInp.value = src.value;
      refreshEmailPreviews();
    }
  };
  azUhrWrap.appendChild(azUhrLbl);
  azUhrWrap.appendChild(azUhrInp);
  azUhrWrap.appendChild(azUebernehmen);
  azRow.appendChild(azUhrWrap);

  var nwWrap = document.createElement('div');
  nwWrap.className = 'besch-az-field';
  var nwLbl = document.createElement('label');
  nwLbl.textContent = 'NW-Kennung (6 Zeichen)';
  var nwInp = document.createElement('input');
  nwInp.type = 'text';
  nwInp.className = 'field-input';
  nwInp.maxLength = 6;
  nwInp.placeholder = 'z.B. GT0001';
  nwInp.style.textTransform = 'uppercase';
  nwInp.value = massnahmenData.bescheinigungenNwKennung;
  nwInp.addEventListener('input', function() {
    massnahmenData.bescheinigungenNwKennung = this.value.toUpperCase();
    refreshEmailPreviews();
  });
  nwWrap.appendChild(nwLbl);
  nwWrap.appendChild(nwInp);
  azRow.appendChild(nwWrap);

  bescDetail.appendChild(azRow);

  // ── AZ-Vorschau ──
  var azPreviewWrap = document.createElement('div');
  azPreviewWrap.className = 'az-preview-wrap';
  var azPreviewLabel = document.createElement('span');
  azPreviewLabel.className = 'az-preview-label';
  azPreviewLabel.textContent = 'Aktenzeichen: ';
  var azPreviewVal = document.createElement('span');
  azPreviewVal.className = 'az-preview-val';
  azPreviewVal.textContent = buildAktenzeichen();
  azPreviewWrap.appendChild(azPreviewLabel);
  azPreviewWrap.appendChild(azPreviewVal);
  bescDetail.appendChild(azPreviewWrap);

  // ── Person(en) ──
  var rolleLabel = document.createElement('div');
  rolleLabel.className = 'input-label';
  rolleLabel.style.cssText = 'margin-top:14px;margin-bottom:6px';
  rolleLabel.textContent = 'Person(en)';
  bescDetail.appendChild(rolleLabel);

  var rolleChips = document.createElement('div');
  rolleChips.className = 'suggestions';
  [
    { v: 'geschm', label: 'Geschädigter' },
    { v: 'geschw', label: 'Geschädigte'  },
    { v: 'zeuge',  label: 'Zeuge'         },
    { v: 'zeugin', label: 'Zeugin'        },
    { v: 'ub01m',  label: 'UB 01 (m)'    },
    { v: 'ub01w',  label: 'UB 01 (w)'    },
    { v: 'ub02m',  label: 'UB 02 (m)'    },
    { v: 'ub02w',  label: 'UB 02 (w)'    },
    { v: 'beschm', label: 'Beschuldigter' },
    { v: 'beschw', label: 'Beschuldigte'  }
  ].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (massnahmenData.bescheinigungen.indexOf(opt.v) !== -1 ? ' active' : '');
    rolleChips.appendChild(btn);
  });
  rolleChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    var v = btn.dataset.v;
    var i = massnahmenData.bescheinigungen.indexOf(v);
    if (i !== -1) { massnahmenData.bescheinigungen.splice(i, 1); btn.classList.remove('active'); }
    else          { massnahmenData.bescheinigungen.push(v);       btn.classList.add('active'); }
    bescBtn.classList.toggle('active', massnahmenData.bescheinigungen.length > 0);
    refreshEmailPreviews();
  });
  bescDetail.appendChild(rolleChips);

  // ── E-Mail-Vorschauen ──
  var emailPreviews = document.createElement('div');
  emailPreviews.className = 'email-previews-wrap';
  bescDetail.appendChild(emailPreviews);

  function refreshEmailPreviews() {
    azPreviewVal.textContent = buildAktenzeichen();
    emailPreviews.innerHTML = '';
    massnahmenData.bescheinigungen.forEach(function(rolle) {
      var rm = ROLLEN_MAP[rolle]; if (!rm) return;
      var emailText = buildBescheinigungsEmail(rolle);
      var card = document.createElement('div');
      card.className = 'email-preview-card';
      var hdr = document.createElement('div');
      hdr.className = 'email-preview-hdr';
      var title = document.createElement('span');
      title.textContent = (rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1));
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn-copy-email';
      copyBtn.innerHTML =
        '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
        '<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Kopieren';
      (function(et, cb) {
        cb.addEventListener('click', function() { copyToClipboard(et, cb); });
      }(emailText, copyBtn));
      hdr.appendChild(title);
      hdr.appendChild(copyBtn);
      var body = document.createElement('div');
      body.className = 'email-preview-body';
      body.textContent = emailText;
      card.appendChild(hdr);
      card.appendChild(body);
      emailPreviews.appendChild(card);
    });
  }
  refreshEmailPreviews();

  bescBtn.onclick = function() {
    var isOpen = bescDetail.style.display !== 'none';
    bescDetail.style.display = isOpen ? 'none' : '';
    bescBtn.classList.toggle('open', !isOpen);
    if (!isOpen) {
      bescBtn.classList.add('active');
    } else if (massnahmenData.bescheinigungen.length === 0) {
      bescBtn.classList.remove('active');
    }
  };
  bescWrap.appendChild(bescBtn);
  bescWrap.appendChild(bescDetail);
  cont.appendChild(bescWrap);

  // ── KUNO-Sperrung ────────────────────────────────────────────
  var kunoBtn = document.createElement('button');
  kunoBtn.type = 'button';
  kunoBtn.className = 'massnahme-btn' + (massnahmenData.kunoSperrung ? ' active' : '');
  kunoBtn.innerHTML =
    '<span class="mb-check"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>' +
    '<span class="mb-label">KUNO-Sperrung eingeleitet</span>';
  kunoBtn.onclick = function() {
    massnahmenData.kunoSperrung = !massnahmenData.kunoSperrung;
    kunoBtn.classList.toggle('active', massnahmenData.kunoSperrung);
  };
  cont.appendChild(kunoBtn);

  // ── Sachfahndung ─────────────────────────────────────────────
  var sachBtn = document.createElement('button');
  sachBtn.type = 'button';
  sachBtn.className = 'massnahme-btn' + (massnahmenData.sachfahndung ? ' active' : '');
  sachBtn.innerHTML =
    '<span class="mb-check"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>' +
    '<span class="mb-label">Sachfahndung eingeleitet</span>';
  sachBtn.onclick = function() {
    massnahmenData.sachfahndung = !massnahmenData.sachfahndung;
    sachBtn.classList.toggle('active', massnahmenData.sachfahndung);
  };
  cont.appendChild(sachBtn);

  // ── Lichtbilder ──────────────────────────────────────────────
  var lichtBtn = document.createElement('button');
  lichtBtn.type = 'button';
  lichtBtn.className = 'massnahme-btn' + (massnahmenData.lichtbilder ? ' active' : '');
  lichtBtn.innerHTML =
    '<span class="mb-check"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>' +
    '<span class="mb-label">Lichtbilder gefertigt</span>';
  lichtBtn.onclick = function() {
    massnahmenData.lichtbilder = !massnahmenData.lichtbilder;
    lichtBtn.classList.toggle('active', massnahmenData.lichtbilder);
  };
  cont.appendChild(lichtBtn);

  // ── Dokumente ausgehändigt ───────────────────────────────────
  var dokWrap = document.createElement('div');
  var dokBtn = document.createElement('button');
  dokBtn.type = 'button';
  dokBtn.className = 'massnahme-btn' + (massnahmenData.dokumenteRollen.length > 0 ? ' active open' : '');
  dokBtn.innerHTML =
    '<span class="mb-check"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>' +
    '<span class="mb-label">Sachdienliche Dokumente ausgehändigt</span>' +
    '<span class="mb-chevron"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>';

  var dokDetail = document.createElement('div');
  dokDetail.className = 'massnahme-sub';
  dokDetail.style.display = massnahmenData.dokumenteRollen.length > 0 ? '' : 'none';

  // Rolle
  var dokRolleLbl = document.createElement('div'); dokRolleLbl.className = 'input-label'; dokRolleLbl.style.marginBottom = '6px';
  dokRolleLbl.textContent = 'Wer hat Dokumente ausgehändigt?';
  dokDetail.appendChild(dokRolleLbl);

  var dokRolleChips = document.createElement('div'); dokRolleChips.className = 'suggestions'; dokRolleChips.style.marginBottom = '10px';
  [{ v:'geschm', label:'Geschädigter' }, { v:'geschw', label:'Geschädigte' },
   { v:'zeuge',  label:'Zeuge' },        { v:'zeugin', label:'Zeugin' },
   { v:'beschm', label:'Beschuldigter'}, { v:'beschw', label:'Beschuldigte'}
  ].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (massnahmenData.dokumenteRollen.indexOf(opt.v) !== -1 ? ' active' : '');
    btn.addEventListener('click', function() {
      var idx = massnahmenData.dokumenteRollen.indexOf(opt.v);
      if (idx !== -1) { massnahmenData.dokumenteRollen.splice(idx, 1); btn.classList.remove('active'); }
      else            { massnahmenData.dokumenteRollen.push(opt.v);    btn.classList.add('active'); }
      dokBtn.classList.toggle('active', massnahmenData.dokumenteRollen.length > 0);
    });
    dokRolleChips.appendChild(btn);
  });
  dokDetail.appendChild(dokRolleChips);

  // Aufnehmende/r Beamter/Beamtin
  var dokBeamterLbl = document.createElement('div'); dokBeamterLbl.className = 'input-label'; dokBeamterLbl.style.marginBottom = '6px';
  dokBeamterLbl.textContent = 'Aufnehmende/r Beamter/Beamtin';
  dokDetail.appendChild(dokBeamterLbl);
  var dokBeamterChips = document.createElement('div'); dokBeamterChips.className = 'suggestions';
  [{ v:'m', label:'Beamter (m)' }, { v:'w', label:'Beamtin (w)' }].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (massnahmenData.dokumenteBeamterGender === opt.v ? ' active' : '');
    btn.addEventListener('click', function() {
      massnahmenData.dokumenteBeamterGender = opt.v;
      dokBeamterChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
    dokBeamterChips.appendChild(btn);
  });
  dokDetail.appendChild(dokBeamterChips);

  dokBtn.onclick = function() {
    var isOpen = dokDetail.style.display !== 'none';
    dokDetail.style.display = isOpen ? 'none' : '';
    dokBtn.classList.toggle('open', !isOpen);
    if (!isOpen) dokBtn.classList.add('active');
    else if (massnahmenData.dokumenteRollen.length === 0) dokBtn.classList.remove('active');
  };
  dokWrap.appendChild(dokBtn);
  dokWrap.appendChild(dokDetail);
  cont.appendChild(dokWrap);

  // ── Wiederverwendbare Maßnahme mit Personenauswahl ──────────
  var MASSN_ICON_CHECK = '<span class="mb-check"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>';
  var MASSN_ICON_CHEV = '<span class="mb-chevron"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>';
  var MASSN_ROLLEN = [
    { v: 'geschm', label: 'Geschädigter' }, { v: 'geschw', label: 'Geschädigte' },
    { v: 'zeuge',  label: 'Zeuge' },        { v: 'zeugin', label: 'Zeugin' },
    { v: 'beschm', label: 'Beschuldigter' },{ v: 'beschw', label: 'Beschuldigte' }
  ];
  function massnahmeRolleMeasure(labelText, arr, frageText) {
    var wrap = document.createElement('div');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'massnahme-btn' + (arr.length > 0 ? ' active open' : '');
    btn.innerHTML = MASSN_ICON_CHECK + '<span class="mb-label">' + labelText + '</span>' + MASSN_ICON_CHEV;
    var detail = document.createElement('div');
    detail.className = 'massnahme-sub';
    detail.style.display = arr.length > 0 ? '' : 'none';
    var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.style.marginBottom = '6px';
    lbl.textContent = frageText || 'Person(en)';
    detail.appendChild(lbl);
    var chips = document.createElement('div'); chips.className = 'suggestions';
    MASSN_ROLLEN.forEach(function(opt) {
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.v = opt.v; b.textContent = opt.label;
      b.className = 'btn-suggestion' + (arr.indexOf(opt.v) !== -1 ? ' active' : '');
      b.addEventListener('click', function() {
        var i = arr.indexOf(opt.v);
        if (i !== -1) { arr.splice(i, 1); b.classList.remove('active'); }
        else          { arr.push(opt.v);   b.classList.add('active'); }
        btn.classList.toggle('active', arr.length > 0);
      });
      chips.appendChild(b);
    });
    detail.appendChild(chips);
    btn.onclick = function() {
      var isOpen = detail.style.display !== 'none';
      detail.style.display = isOpen ? 'none' : '';
      btn.classList.toggle('open', !isOpen);
      if (!isOpen) btn.classList.add('active');
      else if (arr.length === 0) btn.classList.remove('active');
    };
    wrap.appendChild(btn); wrap.appendChild(detail);
    return wrap;
  }

  cont.appendChild(massnahmeRolleMeasure(
    'Bescheinigung über Anzeigeerstattung ausgehändigt',
    massnahmenData.bescheinigungAusgehaendigt,
    'Wem wurde die Bescheinigung ausgehändigt?'
  ));
  cont.appendChild(massnahmeRolleMeasure(
    'Weiterfahrt bis zur Ausnüchterung untersagt',
    massnahmenData.weiterfahrtUntersagt,
    'Wem wurde die Weiterfahrt untersagt?'
  ));

  // ── Eigentums-/Gewahrsamsverzicht zur Entsorgung ────────────
  var entArr = massnahmenData.entsorgungVerzicht;
  var entWrap = document.createElement('div');
  var entBtn = document.createElement('button');
  entBtn.type = 'button';
  entBtn.className = 'massnahme-btn' + (entArr.length > 0 ? ' active open' : '');
  entBtn.innerHTML = MASSN_ICON_CHECK + '<span class="mb-label">Eigentums-/Gewahrsamsverzicht zur Entsorgung</span>' + MASSN_ICON_CHEV;
  var entDetail = document.createElement('div');
  entDetail.className = 'massnahme-sub';
  entDetail.style.display = entArr.length > 0 ? '' : 'none';

  var entLbl = document.createElement('div'); entLbl.className = 'input-label'; entLbl.style.marginBottom = '6px';
  entLbl.textContent = 'Wer verzichtet auf Eigentum/Gewahrsam?';
  entDetail.appendChild(entLbl);
  var entChips = document.createElement('div'); entChips.className = 'suggestions';
  MASSN_ROLLEN.forEach(function(opt) {
    var b = document.createElement('button');
    b.type = 'button'; b.dataset.v = opt.v; b.textContent = opt.label;
    b.className = 'btn-suggestion' + (entArr.indexOf(opt.v) !== -1 ? ' active' : '');
    b.addEventListener('click', function() {
      var i = entArr.indexOf(opt.v);
      if (i !== -1) { entArr.splice(i, 1); b.classList.remove('active'); }
      else          { entArr.push(opt.v);   b.classList.add('active'); }
      entBtn.classList.toggle('active', entArr.length > 0);
    });
    entChips.appendChild(b);
  });
  entDetail.appendChild(entChips);

  var ggLbl = document.createElement('div'); ggLbl.className = 'input-label'; ggLbl.style.cssText = 'margin-top:14px;margin-bottom:6px';
  ggLbl.textContent = 'Gegenstände (optional)';
  entDetail.appendChild(ggLbl);
  var ggInp = document.createElement('input');
  ggInp.type = 'text'; ggInp.className = 'field-input';
  ggInp.placeholder = 'z.B. eine Konsumeinheit Marihuana, eine Glaspfeife';
  ggInp.value = massnahmenData.entsorgungGegenstaende;
  ggInp.addEventListener('input', function() { massnahmenData.entsorgungGegenstaende = this.value; });
  entDetail.appendChild(ggInp);

  entBtn.onclick = function() {
    var isOpen = entDetail.style.display !== 'none';
    entDetail.style.display = isOpen ? 'none' : '';
    entBtn.classList.toggle('open', !isOpen);
    if (!isOpen) entBtn.classList.add('active');
    else if (entArr.length === 0) entBtn.classList.remove('active');
  };
  entWrap.appendChild(entBtn); entWrap.appendChild(entDetail);
  cont.appendChild(entWrap);

  // ── Gefährderansprache ──────────────────────────────────────
  var gaActive = function() { return massnahmenData.gefaehrderanspracheKomp.length > 0 || massnahmenData.gefaehrderanspracheHg; };
  var gaWrap = document.createElement('div');
  var gaBtn = document.createElement('button');
  gaBtn.type = 'button';
  gaBtn.className = 'massnahme-btn' + (gaActive() ? ' active open' : '');
  gaBtn.innerHTML = MASSN_ICON_CHECK + '<span class="mb-label">Gefährderansprache durchgeführt</span>' + MASSN_ICON_CHEV;
  var gaDetail = document.createElement('div');
  gaDetail.className = 'massnahme-sub';
  gaDetail.style.display = gaActive() ? '' : 'none';

  // Person
  var gaPersLbl = document.createElement('div'); gaPersLbl.className = 'input-label'; gaPersLbl.style.marginBottom = '6px';
  gaPersLbl.textContent = 'Bei wem?';
  gaDetail.appendChild(gaPersLbl);
  var gaPersChips = document.createElement('div'); gaPersChips.className = 'suggestions';
  [{ v: 'beschm', label: 'Beschuldigter' }, { v: 'beschw', label: 'Beschuldigte' }].forEach(function(opt) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = opt.label;
    b.className = 'btn-suggestion' + (massnahmenData.gefaehrderanspracheRolle === opt.v ? ' active' : '');
    b.addEventListener('click', function() {
      massnahmenData.gefaehrderanspracheRolle = opt.v;
      gaPersChips.querySelectorAll('.btn-suggestion').forEach(function(x) { x.classList.remove('active'); });
      b.classList.add('active');
    });
    gaPersChips.appendChild(b);
  });
  gaDetail.appendChild(gaPersChips);

  // Inhalte
  var gaKompLbl = document.createElement('div'); gaKompLbl.className = 'input-label'; gaKompLbl.style.cssText = 'margin-top:14px;margin-bottom:6px';
  gaKompLbl.textContent = 'Inhalte der Ansprache';
  gaDetail.appendChild(gaKompLbl);
  var gaKompChips = document.createElement('div'); gaKompChips.className = 'suggestions';
  [
    { v: 'ermittlungsstand',   label: 'Ermittlungs-/Erkenntnisstand' },
    { v: 'tatvorwurf',         label: 'konkreter Tatvorwurf' },
    { v: 'nulltoleranz',       label: 'Null Toleranz' },
    { v: 'verschriftlicht',    label: 'wird verschriftlicht' },
    { v: 'strafverschaerfend', label: 'strafverschärfend' }
  ].forEach(function(opt) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = opt.label;
    b.className = 'btn-suggestion' + (massnahmenData.gefaehrderanspracheKomp.indexOf(opt.v) !== -1 ? ' active' : '');
    b.addEventListener('click', function() {
      var i = massnahmenData.gefaehrderanspracheKomp.indexOf(opt.v);
      if (i !== -1) { massnahmenData.gefaehrderanspracheKomp.splice(i, 1); b.classList.remove('active'); }
      else          { massnahmenData.gefaehrderanspracheKomp.push(opt.v);  b.classList.add('active'); }
      gaBtn.classList.toggle('active', gaActive());
    });
    gaKompChips.appendChild(b);
  });
  gaDetail.appendChild(gaKompChips);

  // Bei Häuslicher Gewalt
  var gaHgLbl = document.createElement('div'); gaHgLbl.className = 'input-label'; gaHgLbl.style.cssText = 'margin-top:14px;margin-bottom:6px';
  gaHgLbl.textContent = 'Bei Häuslicher Gewalt';
  gaDetail.appendChild(gaHgLbl);
  var gaHgChips = document.createElement('div'); gaHgChips.className = 'suggestions';
  var gaHgBtn = document.createElement('button');
  gaHgBtn.type = 'button'; gaHgBtn.textContent = '10-tägiges Rückkehrverbot ausgesprochen';
  gaHgBtn.className = 'btn-suggestion' + (massnahmenData.gefaehrderanspracheHg ? ' active' : '');
  gaHgBtn.addEventListener('click', function() {
    massnahmenData.gefaehrderanspracheHg = !massnahmenData.gefaehrderanspracheHg;
    gaHgBtn.classList.toggle('active', massnahmenData.gefaehrderanspracheHg);
    gaBtn.classList.toggle('active', gaActive());
  });
  gaHgChips.appendChild(gaHgBtn);
  gaDetail.appendChild(gaHgChips);

  gaBtn.onclick = function() {
    var isOpen = gaDetail.style.display !== 'none';
    gaDetail.style.display = isOpen ? 'none' : '';
    gaBtn.classList.toggle('open', !isOpen);
    if (!isOpen) gaBtn.classList.add('active');
    else if (!gaActive()) gaBtn.classList.remove('active');
  };
  gaWrap.appendChild(gaBtn); gaWrap.appendChild(gaDetail);
  cont.appendChild(gaWrap);
}

// ── PsychKG ────────────────────────────────────────────────────────────────

var PSYCHKG_PERSON_MAP = {
  beschm:   { nom: 'Der Beschuldigte',  gen: 'des Beschuldigten',  dat: 'dem Beschuldigten'  },
  beschw:   { nom: 'Die Beschuldigte',  gen: 'der Beschuldigten',  dat: 'der Beschuldigten'  },
  betroffm: { nom: 'Der Betroffene',    gen: 'des Betroffenen',    dat: 'dem Betroffenen'    },
  betroffw: { nom: 'Die Betroffene',    gen: 'der Betroffenen',    dat: 'der Betroffenen'    }
};

var PSYCHKG_ORGS = {
  ordnungsamt: { nom: 'das Ordnungsamt',                   gen: 'Ordnungsamtes',                  art: 'des' },
  feuerwehr:   { nom: 'die Feuerwehr',                     gen: 'Feuerwehr',                      art: 'der' },
  spd:         { nom: 'den Sozialpsychiatrischen Dienst',  gen: 'Sozialpsychiatrischen Dienstes', art: 'des' }
};

function generatePsychKGText() {
  var p = psychkgData;
  var pm  = PSYCHKG_PERSON_MAP[p.personRolle] || { nom: '[Person]', gen: '[Person (Genitiv)]', dat: '[Person (Dativ)]' };
  var org = PSYCHKG_ORGS[p.orgTyp];
  var orgNom   = org ? org.nom : '[Behörde]';
  var mitAnrede = p.mitGender === 'w' ? 'Frau' : 'Herr';
  var mitRolle  = p.mitGender === 'w' ? 'Mitarbeiterin' : 'Mitarbeiter';
  var mitName   = p.mitName  || '[Name]';
  var mitLabel  = mitAnrede + ' ' + mitName + ' (' + mitRolle + (org ? ' ' + org.art + ' ' + org.gen : '') + ')';
  var anlass    = p.anlass   || '[Gefährdungssituation]';
  var ARZT_FORMS = {
    m:  { anrede: 'den Arzt',                durch: 'den Arzt',                nameLbl: 'des Arztes'                },
    w:  { anrede: 'die Ärztin',              durch: 'die Ärztin',              nameLbl: 'der Ärztin'                },
    bm: { anrede: 'den Bereitschaftsarzt',   durch: 'den Bereitschaftsarzt',   nameLbl: 'des Bereitschaftsarztes'   },
    bw: { anrede: 'die Bereitschaftsärztin', durch: 'die Bereitschaftsärztin', nameLbl: 'der Bereitschaftsärztin'   }
  };
  var af = ARZT_FORMS[p.arztGender] || ARZT_FORMS.m;
  var arztAnrede = af.anrede;
  var arztDurch  = af.durch;
  var arztName  = p.arztName  || '[Name Sozialpsychiatrischer Dienst]';
  var transport = p.transport || '[KTW/RTW]';

  var lines = [];
  if (p.verhaltensText && p.verhaltensText.trim()) lines.push(p.verhaltensText.trim());
  lines.push(
    'Aufgrund der benannten Verhaltensweise ' + pm.gen + ', welche augenscheinlich krankheitsbedingt ist, ist auszugehen, dass ein schadenstiftendes Ereignis unmittelbar bevorsteht bzw. sein Eintritt jederzeit zu erwarten ist (hier: ' + anlass + '). Dabei handelt es sich um bedeutende Rechtsgüter.'
  );
  lines.push(
    'Aus diesem Grund wurde ' + orgNom + ' hinzugezogen. ' + mitLabel + ' bestellte ' + arztAnrede + ' (Sozialpsychiatrischer Dienst) ' + arztName + '. Beide machten sich ein umfangreiches Bild von ' + pm.dat + ', woraufhin durch ' + arztDurch + ' ein entsprechendes ärztliches Zeugnis erstellt wurde.'
  );
  lines.push(mitAnrede + ' ' + mitName + ' stellte einen Antrag auf eine zwangsweise Unterbringung in ein psychiatrisches Fachkrankenhaus.');
  lines.push(pm.nom + ' wurde daraufhin mit einem ' + transport + ' in die psychiatrische Abteilung des LWL-Klinikums transportiert.');
  if (p.begleitung === true) {
    lines.push('Der Transport wurde von den eingesetzten Beamten begleitet.');
  } else if (p.begleitung === false) {
    lines.push('Eine Begleitung durch die eingesetzten Beamten wurde von den beteiligten Kräften nicht als erforderlich angesehen.');
  }
  return lines.join('\n\n');
}

// ── Slide 1: Verhaltensauffälligkeit + Person + Gefährdung ──
function renderPsychKG() {
  var cont = document.getElementById('psychkgContent');
  if (!cont) return;
  cont.innerHTML = '';
  var p = psychkgData;

  // Verhaltensbeschreibung – große Textarea
  var taHint = document.createElement('div');
  taHint.className = 'input-label';
  taHint.style.cssText = 'margin-bottom:8px;line-height:1.5;color:var(--muted)';
  taHint.textContent = 'Notiere, durch welches Verhalten die Person aufgefallen ist und was zur Prüfung nach dem PsychKG geführt hat.';
  var ta = document.createElement('textarea');
  ta.className = 'field-input field-textarea psychkg-ta';
  ta.placeholder = 'z.B. Die Person befand sich auf der Fahrbahn und reagierte nicht auf Ansprache. Sie schien desorientiert und äußerte, Stimmen zu hören …';
  ta.value = p.verhaltensText;
  ta.addEventListener('input', function() { p.verhaltensText = this.value; });
  cont.appendChild(taHint);
  cont.appendChild(ta);

  // Trennlinie
  var hr = document.createElement('hr'); hr.className = 'psychkg-divider';
  cont.appendChild(hr);

  // Person
  var personLbl = document.createElement('div');
  personLbl.className = 'input-label'; personLbl.style.margin = '14px 0 6px';
  personLbl.textContent = 'Betroffene Person';
  var personRow = document.createElement('div'); personRow.className = 'suggestions';
  [
    { v: 'beschm',   label: 'Beschuldigter (m)' },
    { v: 'beschw',   label: 'Beschuldigte (f)'  },
    { v: 'betroffm', label: 'Betroffener (m)'   },
    { v: 'betroffw', label: 'Betroffene (f)'    }
  ].forEach(function(o) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = o.label;
    btn.className = 'btn-suggestion' + (p.personRolle === o.v ? ' active' : '');
    btn.addEventListener('click', function() {
      p.personRolle = o.v;
      personRow.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
    personRow.appendChild(btn);
  });
  cont.appendChild(personLbl);
  cont.appendChild(personRow);

  // Gefährdung
  var gefLbl = document.createElement('div');
  gefLbl.className = 'input-label'; gefLbl.style.margin = '14px 0 6px';
  gefLbl.textContent = 'Gefährdungssituation';
  var gefChips = document.createElement('div'); gefChips.className = 'suggestions';
  [
    { v: 'Verletzung der eigenen Person',                        label: 'Verletzung eigene Person'  },
    { v: 'Verletzung von Außenstehenden',                        label: 'Verletzung Außenstehender' },
    { v: 'Verletzung der eigenen Person und von Außenstehenden', label: 'Eigen- & Fremdgefährdung'  }
  ].forEach(function(o) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = o.label;
    btn.className = 'btn-suggestion' + (p.anlass === o.v ? ' active' : '');
    btn.addEventListener('click', function() {
      p.anlass = o.v;
      gefChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
    gefChips.appendChild(btn);
  });
  cont.appendChild(gefLbl);
  cont.appendChild(gefChips);
}

// ── Slide 2: Hinzugezogene Stelle + SPD-Arzt ──
function renderPsychKGSpd() {
  var cont = document.getElementById('psychkgSpdContent');
  if (!cont) return;
  cont.innerHTML = '';
  var p = psychkgData;

  function lbl(text, mt) {
    var el = document.createElement('div');
    el.className = 'input-label'; el.textContent = text;
    el.style.cssText = 'margin-bottom:8px' + (mt ? ';margin-top:' + mt : '');
    return el;
  }
  function bigInp(placeholder, val, setter) {
    var inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'field-input psychkg-name-inp';
    inp.placeholder = placeholder; inp.value = val || '';
    inp.addEventListener('input', function() { setter(this.value); });
    return inp;
  }
  function chipRow(opts, getter, setter, onChange) {
    var row = document.createElement('div'); row.className = 'suggestions'; row.style.marginBottom = '12px';
    opts.forEach(function(o) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = o.label;
      btn.className = 'btn-suggestion' + (getter() === o.v ? ' active' : '');
      btn.addEventListener('click', function() {
        setter(o.v);
        row.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (onChange) onChange();
      });
      row.appendChild(btn);
    });
    return row;
  }

  // ── Hinzugezogene Behörde ──────────────────────────────
  cont.appendChild(lbl('Hinzugezogene Stelle'));
  cont.appendChild(chipRow(
    [
      { v: 'ordnungsamt', label: 'Ordnungsamt' },
      { v: 'feuerwehr',   label: 'Feuerwehr'   }
    ],
    function() { return p.orgTyp; },
    function(v) { p.orgTyp = v; }
  ));

  // Mitarbeiter Geschlecht
  cont.appendChild(lbl('Mitarbeiter/-in', '4px'));
  cont.appendChild(chipRow(
    [{ v: 'm', label: 'Herr (m)' }, { v: 'w', label: 'Frau (w)' }],
    function() { return p.mitGender; },
    function(v) { p.mitGender = v; }
  ));

  // Mitarbeiter Name
  cont.appendChild(lbl('Name Mitarbeiter/-in', '4px'));
  cont.appendChild(bigInp('z.B. Mustermann', p.mitName, function(v) { p.mitName = v; }));

  // Trennlinie
  var hr = document.createElement('hr'); hr.className = 'psychkg-divider';
  cont.appendChild(hr);

  // ── Ärztliche Fachkraft (Sozialpsychiatrischer Dienst) ────
  cont.appendChild(lbl('Ärztliche Fachkraft (Sozialpsychiatrischer Dienst)'));
  var ARZT_FORMS_UI = {
    m:  'des Arztes', w: 'der Ärztin', bm: 'des Bereitschaftsarztes', bw: 'der Bereitschaftsärztin'
  };
  var arztRow = chipRow(
    [
      { v: 'm',  label: 'Arzt (m)'               },
      { v: 'w',  label: 'Ärztin (f)'              },
      { v: 'bm', label: 'Bereitschaftsarzt (m)'   },
      { v: 'bw', label: 'Bereitschaftsärztin (f)' }
    ],
    function() { return p.arztGender; },
    function(v) { p.arztGender = v; arztNameLbl.textContent = 'Name ' + (ARZT_FORMS_UI[v] || 'des Arztes'); }
  );
  cont.appendChild(arztRow);

  var arztNameLbl = lbl('Name ' + (ARZT_FORMS_UI[p.arztGender] || 'des Arztes'), '4px');
  cont.appendChild(arztNameLbl);
  cont.appendChild(bigInp('z.B. Dr. Mustermann', p.arztName, function(v) { p.arztName = v; }));
}

// ── Slide 3: Transport + Begleitung + Vorschau ──
function renderPsychKGTransport() {
  var cont = document.getElementById('psychkgTransportContent');
  if (!cont) return;
  cont.innerHTML = '';
  var p = psychkgData;

  function field(labelText, el) {
    var w = document.createElement('div'); w.style.marginBottom = '16px';
    var l = document.createElement('div'); l.className = 'input-label'; l.style.marginBottom = '8px';
    l.textContent = labelText; w.appendChild(l); w.appendChild(el); return w;
  }
  function chipRow(opts, getter, setter, onChange) {
    var row = document.createElement('div'); row.className = 'suggestions';
    opts.forEach(function(o) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = o.label;
      btn.className = 'btn-suggestion' + (getter() === o.v ? ' active' : '');
      btn.addEventListener('click', function() {
        setter(o.v);
        row.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (onChange) onChange();
      });
      row.appendChild(btn);
    });
    return row;
  }

  cont.appendChild(field('Transportmittel', chipRow(
    [{ v: 'KTW', label: 'KTW' }, { v: 'RTW', label: 'RTW' }],
    function() { return p.transport; },
    function(v) { p.transport = v; },
    null
  )));
  cont.appendChild(field('Begleitung durch eingesetzte Beamte', chipRow(
    [
      { v: 'nein', label: 'Nicht erforderlich' },
      { v: 'ja',   label: 'Transport begleitet' }
    ],
    function() { return p.begleitung === true ? 'ja' : p.begleitung === false ? 'nein' : ''; },
    function(v) { p.begleitung = (v === 'ja'); },
    null
  )));
}

// ── Haftbefehl ────────────────────────────────────────────────────────────

var HAFTBEFEHL_PERSON_MAP = {
  betroffm: { akk: 'den Betroffenen',    nom: 'Der Betroffene',    pron: 'er' },
  betroffw: { akk: 'die Betroffene',     nom: 'Die Betroffene',    pron: 'sie' },
  beschm:   { akk: 'den Beschuldigten',  nom: 'Der Beschuldigte',  pron: 'er' },
  beschw:   { akk: 'die Beschuldigte',   nom: 'Die Beschuldigte',  pron: 'sie' }
};

function generateHaftbefehlText() {
  var p = haftbefehlData;
  var pm = HAFTBEFEHL_PERSON_MAP[p.personRolle] || { akk: '[Person]', nom: '[Person]', pron: 'er/sie' };
  var form    = p.hbForm   || 'Strafbefehl';
  var gericht = p.gericht  || '[Gericht]';
  var hbDate  = p.hbDatum  ? formatDateDE(p.hbDatum)  : '[Datum HB]';
  var az      = p.hbAz     || '[Az.]';
  var rkDate  = p.rkSeit   ? formatDateDE(p.rkSeit)   : '[Datum RK]';
  var ts      = p.tagessaetze   || '[XX]';
  var tsBetrag = p.tagessatzBetrag || '[XX,XX]';
  var efTage  = p.ersatzTage   || '[XX]';
  var ziel    = p.zielort  || 'ZPG Gütersloh';

  var datEl = document.getElementById('datum');
  var datumStr = datEl && datEl.value ? formatDateDE(datEl.value) : '[Datum]';
  var uhrStr   = p.kontrolleUhrzeit || '[Uhrzeit]';

  var formGen = form.slice(-1) === 's' ? form : form + 's'; // simple genitive
  var lines = [];
  lines.push(
    'Gegen ' + pm.akk + ' besteht ein Haftbefehl in Form eines ' + formGen + ' ' + gericht + ' vom ' + hbDate + ', Az.: ' + az + ', rechtskräftig seit ' + rkDate + '.'
  );
  lines.push(
    'Angesetzt ist eine Geldstrafe von ' + ts + ' Tagessätzen zu je ' + tsBetrag + ' Euro bzw. einer zu verbüßenden Ersatzfreiheitsstrafe von ' + efTage + ' Tagen.'
  );
  lines.push(
    pm.nom + ' wurde am ' + datumStr + ', um ' + uhrStr + ' Uhr kontrolliert. Im Anschluss wurde ' + pm.pron + ' zum ' + ziel + ' transportiert und aufgrund des bestehenden Haftbefehls festgenommen.'
  );
  return lines.join('\n\n');
}

function renderHaftbefehl() {
  var cont = document.getElementById('haftbefehlContent');
  if (!cont) return;
  cont.innerHTML = '';
  var p = haftbefehlData;

  function field(labelText, el) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '16px';
    var lbl = document.createElement('div');
    lbl.className = 'input-label'; lbl.style.marginBottom = '6px';
    lbl.textContent = labelText;
    wrap.appendChild(lbl);
    wrap.appendChild(el);
    return wrap;
  }

  function chips(opts, getter, setter) {
    var row = document.createElement('div');
    row.className = 'suggestions';
    opts.forEach(function(o) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = o.label;
      btn.className = 'btn-suggestion' + (getter() === o.v ? ' active' : '');
      btn.addEventListener('click', function() {
        setter(o.v);
        row.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        refreshPreview();
      });
      row.appendChild(btn);
    });
    return row;
  }

  function textInp(placeholder, val, setter, type) {
    var inp = document.createElement('input');
    inp.type = type || 'text'; inp.className = 'field-input';
    inp.placeholder = placeholder; inp.value = val || '';
    inp.addEventListener('input', function() { setter(this.value); refreshPreview(); });
    return inp;
  }

  // Person
  cont.appendChild(field('Betroffene Person', chips(
    [
      { v: 'betroffm', label: 'Betroffener (m)' },
      { v: 'betroffw', label: 'Betroffene (f)'  },
      { v: 'beschm',   label: 'Beschuldigter (m)' },
      { v: 'beschw',   label: 'Beschuldigte (f)'  }
    ],
    function() { return p.personRolle; },
    function(v) { p.personRolle = v; }
  )));

  // HB-Form
  cont.appendChild(field('Art des Haftbefehls', chips(
    [
      { v: 'Strafbefehl',              label: 'Strafbefehl'              },
      { v: 'Vollstreckungshaftbefehl', label: 'Vollstreckungshaftbefehl' }
    ],
    function() { return p.hbForm; },
    function(v) { p.hbForm = v; }
  )));

  // Gericht
  cont.appendChild(field('Ausstellendes Gericht (Genitiv)', textInp('z.B. Amtsgerichts Gütersloh', p.gericht, function(v) { p.gericht = v; })));

  // Datum + AZ nebeneinander
  var row1 = document.createElement('div');
  row1.className = 'besch-az-row'; row1.style.marginBottom = '16px';
  var datWrap = document.createElement('div'); datWrap.className = 'besch-az-field';
  var datLbl = document.createElement('label'); datLbl.textContent = 'Datum des Haftbefehls';
  var datInp = document.createElement('input'); datInp.type = 'date'; datInp.className = 'field-input';
  datInp.value = p.hbDatum;
  datInp.addEventListener('input', function() { p.hbDatum = this.value; refreshPreview(); });
  datWrap.appendChild(datLbl); datWrap.appendChild(datInp);
  var azWrap = document.createElement('div'); azWrap.className = 'besch-az-field';
  var azLbl = document.createElement('label'); azLbl.textContent = 'Aktenzeichen';
  var azInp = document.createElement('input'); azInp.type = 'text'; azInp.className = 'field-input';
  azInp.placeholder = 'z.B. 3DS903/25'; azInp.value = p.hbAz;
  azInp.addEventListener('input', function() { p.hbAz = this.value; refreshPreview(); });
  azWrap.appendChild(azLbl); azWrap.appendChild(azInp);
  row1.appendChild(datWrap); row1.appendChild(azWrap);
  cont.appendChild(row1);

  // Rechtskräftig seit
  cont.appendChild(field('Rechtskräftig seit', textInp('', p.rkSeit, function(v) { p.rkSeit = v; }, 'date')));

  // Geldstrafe-Zeile
  var row2 = document.createElement('div');
  row2.className = 'besch-az-row'; row2.style.marginBottom = '16px';
  var tsWrap = document.createElement('div'); tsWrap.className = 'besch-az-field';
  var tsLbl = document.createElement('label'); tsLbl.textContent = 'Tagessätze (Anzahl)';
  var tsInp = document.createElement('input'); tsInp.type = 'number'; tsInp.className = 'field-input';
  tsInp.placeholder = '60'; tsInp.min = '1'; tsInp.value = p.tagessaetze;
  tsInp.addEventListener('input', function() { p.tagessaetze = this.value; refreshPreview(); });
  tsWrap.appendChild(tsLbl); tsWrap.appendChild(tsInp);
  var tbWrap = document.createElement('div'); tbWrap.className = 'besch-az-field';
  var tbLbl = document.createElement('label'); tbLbl.textContent = 'je Tagessatz (€)';
  var tbInp = document.createElement('input'); tbInp.type = 'text'; tbInp.className = 'field-input';
  tbInp.placeholder = '15,00'; tbInp.value = p.tagessatzBetrag;
  tbInp.addEventListener('input', function() { p.tagessatzBetrag = this.value; refreshPreview(); });
  tbWrap.appendChild(tbLbl); tbWrap.appendChild(tbInp);
  row2.appendChild(tsWrap); row2.appendChild(tbWrap);
  cont.appendChild(row2);

  // Ersatzfreiheitsstrafe
  cont.appendChild(field('Ersatzfreiheitsstrafe (Tage)', textInp('30', p.ersatzTage, function(v) { p.ersatzTage = v; }, 'number')));

  // Kontrollzeit
  var ktWrap = document.createElement('div'); ktWrap.style.marginBottom = '16px';
  var ktLbl = document.createElement('div'); ktLbl.className = 'input-label'; ktLbl.style.marginBottom = '6px';
  ktLbl.textContent = 'Uhrzeit der Kontrolle';
  ktWrap.appendChild(ktLbl);
  // Ort aus Allgemeines anzeigen wenn verfügbar
  if (selectedSections.indexOf('allgemeines') !== -1) {
    var strEl = document.getElementById('strasse');
    var hnEl  = document.getElementById('hausnummer');
    var plzEl = document.getElementById('plz');
    var stEl  = document.getElementById('stadt');
    var ortParts = [];
    if (strEl && strEl.value) ortParts.push(strEl.value + (hnEl && hnEl.value ? ' ' + hnEl.value : ''));
    if (plzEl && plzEl.value) ortParts.push(plzEl.value);
    if (stEl  && stEl.value)  ortParts.push(stEl.value);
    if (ortParts.length) {
      var ortHint = document.createElement('div');
      ortHint.className = 'hb-ort-hint';
      ortHint.textContent = '📍 ' + ortParts.join(', ');
      ktWrap.appendChild(ortHint);
    }
  }
  var ktInp = document.createElement('input');
  ktInp.type = 'time'; ktInp.className = 'field-input'; ktInp.style.marginTop = '6px';
  ktInp.value = p.kontrolleUhrzeit;
  ktInp.addEventListener('input', function() { p.kontrolleUhrzeit = this.value; refreshPreview(); });
  ktWrap.appendChild(ktInp);
  cont.appendChild(ktWrap);

  // Zielort
  cont.appendChild(field('Zielort nach Festnahme', textInp('z.B. ZPG Gütersloh', p.zielort, function(v) { p.zielort = v; })));

  function refreshPreview() {}
}

// ── Blutprobe ───────────────────────────────────────────────

var BP_ROLLEN = {
  betroffm: { nom: 'Der Betroffene',    dat: 'dem Betroffenen',    akk: 'den Betroffenen' },
  betroffw: { nom: 'Die Betroffene',    dat: 'der Betroffenen',    akk: 'die Betroffene'  },
  beschm:   { nom: 'Der Beschuldigte',  dat: 'dem Beschuldigten',  akk: 'den Beschuldigten' },
  beschw:   { nom: 'Die Beschuldigte',  dat: 'der Beschuldigten',  akk: 'die Beschuldigte'  }
};

var BP_ORTE = {
  klinikum:  { name: 'Klinikum Gütersloh',      zu: 'in das Klinikum Gütersloh',      in: 'im Klinikum Gütersloh' },
  elisabeth: { name: 'St. Elisabeth Hospital',  zu: 'in das St. Elisabeth Hospital',  in: 'im St. Elisabeth Hospital' },
  pwgt:      { name: 'Polizeiwache Gütersloh',  zu: 'zur Polizeiwache Gütersloh',      in: 'in der Polizeiwache Gütersloh' }
};

var blutprobeData = {
  anordnungPolizei: '',          // 'ja' | 'nein'
  // Polizei-Anordnung
  beamterId: '',
  polDatum: '', polUhrzeit: '',
  // Richtervorbehalt
  staGeschlecht: 'Staatsanwalt', staName: '', staDatum: '', staUhrzeit: '',
  richterGeschlecht: 'Richter',  richterName: '', richterDatum: '', richterUhrzeit: '',
  // gemeinsam
  rolle: 'beschm',
  ort: 'klinikum',
  transportKm: '',
  // Blutprobe
  arztName: '', blutDatum: '',
  entnahmen: [ { uhrzeit: '', venuelen: [ { nummer: '' } ] } ]
};

function bpBeamte() {
  var list = [];
  streifenwagen.forEach(function(sw) {
    sw.besatzung.forEach(function(b) {
      if (b.name && b.name.trim()) list.push({ id: String(b.id), label: (b.grad ? b.grad + ' ' : '') + b.name.trim() });
    });
  });
  return list;
}

// gemeinsame Render-Helfer
function bpField(labelText, el) {
  var wrap = document.createElement('div'); wrap.style.marginBottom = '16px';
  var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.style.marginBottom = '6px';
  lbl.textContent = labelText;
  wrap.appendChild(lbl); wrap.appendChild(el); return wrap;
}
function bpChips(opts, getter, setter) {
  var row = document.createElement('div'); row.className = 'suggestions';
  opts.forEach(function(o) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = o.label;
    btn.className = 'btn-suggestion' + (getter() === o.v ? ' active' : '');
    btn.addEventListener('click', function() {
      setter(o.v);
      row.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
    row.appendChild(btn);
  });
  return row;
}
function bpTextInp(placeholder, val, setter, type) {
  var inp = document.createElement('input');
  inp.type = type || 'text'; inp.className = 'field-input';
  inp.placeholder = placeholder; inp.value = val || '';
  inp.addEventListener('input', function() { setter(this.value); });
  return inp;
}
function bpTwoCol(l1, el1, l2, el2) {
  var row = document.createElement('div'); row.className = 'besch-az-row'; row.style.marginBottom = '16px';
  [[l1, el1], [l2, el2]].forEach(function(pair) {
    var w = document.createElement('div'); w.className = 'besch-az-field';
    var lb = document.createElement('label'); lb.textContent = pair[0];
    w.appendChild(lb); w.appendChild(pair[1]); row.appendChild(w);
  });
  return row;
}
function bpDate(val, setter) { return bpTextInp('', val, setter, 'date'); }
function bpTime(val, setter) { return bpTextInp('', val, setter, 'time'); }

function renderBlutprobeAnordnung() {
  var cont = document.getElementById('blutprobeAnordnungContent');
  if (!cont) return;
  cont.innerHTML = '';
  var p = blutprobeData;

  // Rolle
  cont.appendChild(bpField('Um wen handelt es sich?', bpChips(
    [
      { v: 'beschm',   label: 'Beschuldigter' },
      { v: 'beschw',   label: 'Beschuldigte' },
      { v: 'betroffm', label: 'Betroffener' },
      { v: 'betroffw', label: 'Betroffene' }
    ],
    function() { return p.rolle; }, function(v) { p.rolle = v; }
  )));

  // Anordnungskompetenz
  cont.appendChild(bpField('Liegt die Anordnungskompetenz bei der Polizei?', bpChips(
    [ { v: 'ja', label: 'Ja (Polizei)' }, { v: 'nein', label: 'Nein (Richtervorbehalt)' } ],
    function() { return p.anordnungPolizei; },
    function(v) { p.anordnungPolizei = v; renderBlutprobeAnordnung(); }
  )));

  if (p.anordnungPolizei === 'ja') {
    var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.style.marginBottom = '6px';
    lbl.textContent = 'Eingesetzte Beamte';
    cont.appendChild(lbl);
    var hint = document.createElement('div');
    hint.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:10px';
    hint.textContent = 'Geteilt mit dem Abschnitt „Allgemeines". Markiere, wer die Blutprobe angeordnet hat.';
    cont.appendChild(hint);

    var members = [];
    streifenwagen.forEach(function(sw) { sw.besatzung.forEach(function(b) { members.push({ sw: sw, b: b }); }); });

    members.forEach(function(m, mi) {
      var card = document.createElement('div');
      card.style.cssText = 'border:1.5px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px';

      // Zeile 1: Dienstgrad + Nachname + Entfernen
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center';

      var gsel = document.createElement('select'); gsel.className = 'field-select';
      gsel.style.cssText = 'flex:0 0 88px';
      DIENSTGRADE.forEach(function(g) {
        var o = document.createElement('option'); o.value = g; o.textContent = g;
        if (g === m.b.grad) o.selected = true; gsel.appendChild(o);
      });
      gsel.addEventListener('change', function() { m.b.grad = this.value; });
      row.appendChild(gsel);

      var ni = document.createElement('input'); ni.type = 'text'; ni.className = 'field-input'; ni.style.flex = '1';
      ni.placeholder = 'Nachname'; ni.value = m.b.name;
      ni.addEventListener('input', function() { m.b.name = this.value; });
      row.appendChild(ni);

      if (members.length > 1) {
        var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'btn-add-custom'; rm.textContent = '−';
        rm.title = 'Beamten entfernen';
        rm.addEventListener('click', function() {
          m.sw.besatzung = m.sw.besatzung.filter(function(x) { return x.id !== m.b.id; });
          if (p.beamterId === String(m.b.id)) p.beamterId = '';
          renderBlutprobeAnordnung();
        });
        row.appendChild(rm);
      }
      card.appendChild(row);

      // Zeile 2: als anordnenden Beamten markieren
      var isSel = p.beamterId === String(m.b.id);
      var pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'btn-suggestion' + (isSel ? ' active' : '');
      pick.textContent = isSel ? '✓ hat die Blutprobe angeordnet' : 'als anordnenden Beamten wählen';
      pick.style.cssText = 'margin-top:8px;width:100%';
      pick.addEventListener('click', function() {
        p.beamterId = isSel ? '' : String(m.b.id);
        renderBlutprobeAnordnung();
      });
      card.appendChild(pick);

      cont.appendChild(card);
    });

    var addB = document.createElement('button'); addB.type = 'button'; addB.className = 'btn-add'; addB.style.marginBottom = '16px';
    addB.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Beamten hinzufügen';
    addB.addEventListener('click', function() {
      var sw = streifenwagen[0];
      if (!sw) { addStreifenwagen(); sw = streifenwagen[0]; }
      idCounter++;
      sw.besatzung.push({ id: idCounter, name: '', grad: 'POK' });
      renderBlutprobeAnordnung();
    });
    cont.appendChild(addB);

    cont.appendChild(bpTwoCol('Datum der Anordnung', bpDate(p.polDatum, function(v) { p.polDatum = v; }),
                              'Uhrzeit', bpTime(p.polUhrzeit, function(v) { p.polUhrzeit = v; })));
  } else if (p.anordnungPolizei === 'nein') {
    // Staatsanwaltschaft (Bereitschaftsdienst)
    var sep1 = document.createElement('div'); sep1.className = 'input-label';
    sep1.style.cssText = 'margin:4px 0 10px;opacity:.8;font-weight:600';
    sep1.textContent = 'Staatsanwaltschaft (Bereitschaftsdienst StA Bielefeld)';
    cont.appendChild(sep1);
    cont.appendChild(bpField('Funktion', bpChips(
      [ { v: 'Staatsanwalt', label: 'Staatsanwalt' }, { v: 'Staatsanwältin', label: 'Staatsanwältin' } ],
      function() { return p.staGeschlecht; }, function(v) { p.staGeschlecht = v; }
    )));
    cont.appendChild(bpField('Name', bpTextInp('z.B. Müller', p.staName, function(v) { p.staName = v; })));
    cont.appendChild(bpTwoCol('Datum', bpDate(p.staDatum, function(v) { p.staDatum = v; }),
                              'Uhrzeit', bpTime(p.staUhrzeit, function(v) { p.staUhrzeit = v; })));

    // Richter (AG Bielefeld / Konzentrationsgericht)
    var sep2 = document.createElement('div'); sep2.className = 'input-label';
    sep2.style.cssText = 'margin:18px 0 10px;opacity:.8;font-weight:600';
    sep2.textContent = 'AG Bielefeld (Konzentrationsgericht)';
    cont.appendChild(sep2);
    cont.appendChild(bpField('Funktion', bpChips(
      [ { v: 'Richter', label: 'Richter' }, { v: 'Richterin', label: 'Richterin' } ],
      function() { return p.richterGeschlecht; }, function(v) { p.richterGeschlecht = v; }
    )));
    cont.appendChild(bpField('Name', bpTextInp('z.B. Schmitz', p.richterName, function(v) { p.richterName = v; })));
    cont.appendChild(bpTwoCol('Datum', bpDate(p.richterDatum, function(v) { p.richterDatum = v; }),
                              'Uhrzeit', bpTime(p.richterUhrzeit, function(v) { p.richterUhrzeit = v; })));
  }
}

function renderBlutprobeEntnahme() {
  var cont = document.getElementById('blutprobeEntnahmeContent');
  if (!cont) return;
  cont.innerHTML = '';
  var p = blutprobeData;

  // Ort der Blutprobe
  cont.appendChild(bpField('Wo wurde die Blutprobe durchgeführt?', bpChips(
    [
      { v: 'klinikum',  label: 'Klinikum Gütersloh' },
      { v: 'elisabeth', label: 'St. Elisabeth Hospital' },
      { v: 'pwgt',      label: 'Polizeiwache Gütersloh' }
    ],
    function() { return p.ort; }, function(v) { p.ort = v; }
  )));

  cont.appendChild(bpField('Transportstrecke (km)', bpTextInp('z.B. 6', p.transportKm, function(v) { p.transportKm = v; }, 'number')));

  cont.appendChild(bpField('Arzt / Ärztin (Name)', bpTextInp('z.B. Dr. Weber', p.arztName, function(v) { p.arztName = v; })));
  cont.appendChild(bpField('Datum der Blutentnahme', bpDate(p.blutDatum, function(v) { p.blutDatum = v; })));

  // Blutentnahmen (mehrere)
  var sep = document.createElement('div'); sep.className = 'input-label';
  sep.style.cssText = 'margin:6px 0 10px;opacity:.8;font-weight:600';
  sep.textContent = 'Blutentnahmen';
  cont.appendChild(sep);

  if (!p.entnahmen.length) p.entnahmen.push({ uhrzeit: '', venuelen: [ { nummer: '' } ] });

  p.entnahmen.forEach(function(en, ei) {
    var card = document.createElement('div');
    card.style.cssText = 'border:1.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px';
    var title = document.createElement('div'); title.className = 'input-label';
    title.style.margin = '0'; title.textContent = 'Blutentnahme ' + (ei + 1);
    head.appendChild(title);
    if (p.entnahmen.length > 1) {
      var delEn = document.createElement('button');
      delEn.type = 'button'; delEn.className = 'btn-add-custom'; delEn.textContent = '−';
      delEn.title = 'Blutentnahme entfernen';
      delEn.addEventListener('click', function() { p.entnahmen.splice(ei, 1); renderBlutprobeEntnahme(); });
      head.appendChild(delEn);
    }
    card.appendChild(head);

    // Uhrzeit
    var uhrWrap = document.createElement('div'); uhrWrap.style.marginBottom = '12px';
    var uhrLbl = document.createElement('div'); uhrLbl.className = 'input-label'; uhrLbl.style.marginBottom = '6px';
    uhrLbl.textContent = 'Uhrzeit';
    var uhrInp = document.createElement('input'); uhrInp.type = 'time'; uhrInp.className = 'field-input';
    uhrInp.value = en.uhrzeit;
    uhrInp.addEventListener('input', function() { en.uhrzeit = this.value; });
    uhrWrap.appendChild(uhrLbl); uhrWrap.appendChild(uhrInp);
    card.appendChild(uhrWrap);

    // Venülen
    var venLbl = document.createElement('div'); venLbl.className = 'input-label'; venLbl.style.marginBottom = '6px';
    venLbl.textContent = 'Venülen (je eigene Nummer)';
    card.appendChild(venLbl);

    if (!en.venuelen.length) en.venuelen.push({ nummer: '' });
    en.venuelen.forEach(function(ven, vi) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px';
      var nr = document.createElement('span');
      nr.style.cssText = 'font-size:13px;color:var(--muted);min-width:74px';
      nr.textContent = (vi + 1) + '. Venüle';
      var numInp = document.createElement('input');
      numInp.type = 'text'; numInp.className = 'field-input'; numInp.style.flex = '1';
      numInp.placeholder = 'Venülnummer'; numInp.value = ven.nummer;
      numInp.addEventListener('input', function() { ven.nummer = this.value; });
      row.appendChild(nr); row.appendChild(numInp);
      if (en.venuelen.length > 1) {
        var delV = document.createElement('button');
        delV.type = 'button'; delV.className = 'btn-add-custom'; delV.textContent = '−';
        delV.addEventListener('click', function() { en.venuelen.splice(vi, 1); renderBlutprobeEntnahme(); });
        row.appendChild(delV);
      }
      card.appendChild(row);
    });

    var addVen = document.createElement('button');
    addVen.type = 'button'; addVen.className = 'btn-add'; addVen.style.marginTop = '2px';
    addVen.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Venüle hinzufügen';
    addVen.addEventListener('click', function() { en.venuelen.push({ nummer: '' }); renderBlutprobeEntnahme(); });
    card.appendChild(addVen);

    cont.appendChild(card);
  });

  var addEn = document.createElement('button');
  addEn.type = 'button'; addEn.className = 'btn-add';
  addEn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Blutentnahme hinzufügen';
  addEn.addEventListener('click', function() { p.entnahmen.push({ uhrzeit: '', venuelen: [ { nummer: '' } ] }); renderBlutprobeEntnahme(); });
  cont.appendChild(addEn);
}

function generateBlutprobeAnordnungText() {
  var p = blutprobeData;
  var r = BP_ROLLEN[p.rolle] || BP_ROLLEN.beschm;
  var lines = [];

  if (p.anordnungPolizei === 'ja') {
    var beamte = bpBeamte();
    var b = beamte.filter(function(x) { return x.id === p.beamterId; })[0];
    var beamterStr = b ? b.label : '[Beamter]';
    var dat = p.polDatum ? formatDateDE(p.polDatum) : '[Datum]';
    var uhr = p.polUhrzeit || '[Uhrzeit]';
    lines.push('Am ' + dat + ', um ' + uhr + ' Uhr ordnete ' + beamterStr + ' die Entnahme einer Blutprobe bei ' + r.dat + ' an.');
  } else if (p.anordnungPolizei === 'nein') {
    var staRel = p.staGeschlecht === 'Staatsanwältin' ? 'welche' : 'welcher';
    var staName = p.staName || '[Name]';
    var staDat = p.staDatum ? formatDateDE(p.staDatum) : '[Datum]';
    var staUhr = p.staUhrzeit || '[Uhrzeit]';
    lines.push('Am ' + staDat + ', um ' + staUhr + ' Uhr wurde von ' + p.staGeschlecht + ' ' + staName +
      ' (' + p.staGeschlecht + ' beim Bereitschaftsdienst der StA Bielefeld) das AG Bielefeld (Konzentrationsgericht) erreicht, ' +
      staRel + ' einen Antrag auf Anordnung einer Blutprobe bei ' + r.dat + ' stellte.');

    var riRel = p.richterGeschlecht === 'Richterin' ? 'welche' : 'welcher';
    var riName = p.richterName || '[Name]';
    var riDat = p.richterDatum ? formatDateDE(p.richterDatum) : '[Datum]';
    var riUhr = p.richterUhrzeit || '[Uhrzeit]';
    lines.push('Am ' + riDat + ', um ' + riUhr + ' Uhr wurde sodann ' + riName + ', ' + p.richterGeschlecht +
      ' des AG Bielefeld erreicht, ' + riRel + ' die Blutprobe bei ' + r.dat + ' anordnete.');
  } else {
    lines.push('[Anordnungskompetenz noch nicht erfasst.]');
  }

  // Transport zum Ort der Blutprobe
  var ort = BP_ORTE[p.ort] || BP_ORTE.klinikum;
  var kmStr = p.transportKm ? ' (Transportstrecke: ' + p.transportKm + ' km)' : '';
  lines.push('Zum Zwecke der Blutprobe wurde ' + r.nom.charAt(0).toLowerCase() + r.nom.slice(1) + ' ' + ort.zu + ' verbracht' + kmStr + '.');

  return lines.join('\n\n');
}

function generateBlutprobeEntnahmeText() {
  var p = blutprobeData;
  var ort = BP_ORTE[p.ort] || BP_ORTE.klinikum;
  var arzt = p.arztName || '[Name]';
  var dat = p.blutDatum ? formatDateDE(p.blutDatum) : '[Datum]';
  var lines = [];

  lines.push('Die ärztliche Blutentnahme, durchgeführt von ' + arzt + ', erfolgte am ' + dat +
    ', zu den unten benannten Uhrzeiten, ' + ort.in + '.');
  lines.push('Anzahl der Blutentnahmen: ' + p.entnahmen.length);

  p.entnahmen.forEach(function(en, ei) {
    var uhr = en.uhrzeit || '[Uhrzeit]';
    var block = 'Blutentnahme ' + (ei + 1) + ' (' + uhr + ' Uhr):\n' +
      'Bei der Blutentnahme wurden folgende Venülen befüllt:';
    en.venuelen.forEach(function(ven, vi) {
      block += '\n' + (vi + 1) + '. Venülnummer: ' + (ven.nummer || '[Nummer]');
    });
    lines.push(block);
  });

  return lines.join('\n\n');
}

// ── Vermisste Person ────────────────────────────────────────

var VM_STATUR    = ['zierlich', 'schlank', 'normal', 'athletisch', 'kräftig', 'korpulent'];
var VM_HAARFARBE = ['blond', 'dunkelblond', 'braun', 'dunkelbraun', 'schwarz', 'rot', 'grau', 'weiß', 'grau meliert', 'kein Haar / Glatze'];
var VM_HAARLAENGE = ['kein Haar / Glatze', 'sehr kurz', 'kurz', 'mittellang', 'lang', 'sehr lang'];

var vermisstData = {
  melderName: '', melderGeburtsdatum: '', melderErreichbarkeit: '', melderRolle: '',
  zuletztDatum: '', zuletztUhrzeit: '',
  richtung: '', fortbewegung: '', fortbewegungZuFuss: '',
  pkwZugriff: '', pkwBeschreibung: '', pkwKennzeichen: '', pkwVorOrt: '',
  andFzZugriff: '', andFzBeschreibung: '', andFzKennzeichen: '', andFzVorOrt: '',
  krankheiten: '', krankheitenWelche: '',
  medikamente: '', medikamenteLebenswichtig: '', medikamenteWelche: '', medikamenteEingenommen: '',
  suizidGeaeussert: '', suizidWann: '', suizidWelche: '', suizidBehandlung: '', suizidAktuell: '',
  statur: '', groesse: '', haarfarbe: '', haarlaenge: '', auffaelligkeiten: '', bekleidung: '',
  handy: '', handyNummer: '',
  aufenthaltsorte: [], freunde: [],
  fotos: '', bereitsVermisst: '', bereitsWo: '', vergleichsmaterial: ''
};

var VM_JN  = [{ v: 'ja', label: 'Ja' }, { v: 'nein', label: 'Nein' }];
var VM_JNU = [{ v: 'ja', label: 'Ja' }, { v: 'nein', label: 'Nein' }, { v: 'unbekannt', label: 'Unbekannt' }];

function vmField(labelText, el) {
  var wrap = document.createElement('div'); wrap.style.marginBottom = '16px';
  var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.style.marginBottom = '6px';
  lbl.textContent = labelText;
  wrap.appendChild(lbl); wrap.appendChild(el); return wrap;
}
function vmChips(opts, get, set, rerender) {
  var row = document.createElement('div'); row.className = 'suggestions';
  opts.forEach(function(o) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = o.label;
    b.className = 'btn-suggestion' + (get() === o.v ? ' active' : '');
    b.addEventListener('click', function() {
      set(get() === o.v ? '' : o.v);
      if (rerender) { rerender(); return; }
      row.querySelectorAll('.btn-suggestion').forEach(function(x) { x.classList.remove('active'); });
      if (get() === o.v) b.classList.add('active');
    });
    row.appendChild(b);
  });
  return row;
}
function vmInput(ph, val, set, type) {
  var inp = document.createElement('input');
  inp.type = type || 'text'; inp.className = 'field-input'; inp.placeholder = ph; inp.value = val || '';
  inp.addEventListener('input', function() { set(this.value); });
  return inp;
}
function vmArea(ph, val, set) {
  var ta = document.createElement('textarea'); ta.className = 'field-input field-textarea';
  ta.placeholder = ph; ta.value = val || '';
  ta.addEventListener('input', function() { set(this.value); });
  return ta;
}
function vmSelect(opts, get, set) {
  var sel = document.createElement('select'); sel.className = 'field-input';
  var o0 = document.createElement('option'); o0.value = ''; o0.textContent = '– bitte wählen –'; sel.appendChild(o0);
  opts.forEach(function(v) {
    var o = document.createElement('option'); o.value = v; o.textContent = v;
    if (get() === v) o.selected = true; sel.appendChild(o);
  });
  sel.addEventListener('change', function() { set(this.value); });
  return sel;
}
function vmTwoCol(l1, e1, l2, e2) {
  var row = document.createElement('div'); row.className = 'besch-az-row'; row.style.marginBottom = '16px';
  [[l1, e1], [l2, e2]].forEach(function(p) {
    var w = document.createElement('div'); w.className = 'besch-az-field';
    var lb = document.createElement('label'); lb.textContent = p[0];
    w.appendChild(lb); w.appendChild(p[1]); row.appendChild(w);
  });
  return row;
}
function vmAddableList(arr, placeholder, rerender, addLabel) {
  var wrap = document.createElement('div');
  if (!arr.length) arr.push('');
  arr.forEach(function(val, idx) {
    var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px';
    var inp = document.createElement('input'); inp.type = 'text'; inp.className = 'field-input'; inp.style.flex = '1';
    inp.placeholder = placeholder; inp.value = val;
    inp.addEventListener('input', function() { arr[idx] = this.value; });
    row.appendChild(inp);
    if (arr.length > 1) {
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn-add-custom'; del.textContent = '−';
      del.addEventListener('click', function() { arr.splice(idx, 1); rerender(); });
      row.appendChild(del);
    }
    wrap.appendChild(row);
  });
  var add = document.createElement('button'); add.type = 'button'; add.className = 'btn-add';
  add.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> ' + addLabel;
  add.addEventListener('click', function() { arr.push(''); rerender(); });
  wrap.appendChild(add);
  return wrap;
}
function vmSep(text) {
  var s = document.createElement('div'); s.className = 'input-label';
  s.style.cssText = 'margin:6px 0 10px;opacity:.8;font-weight:600'; s.textContent = text;
  return s;
}

function renderVermisst1() {
  var cont = document.getElementById('vermisst1Content'); if (!cont) return;
  cont.innerHTML = ''; var d = vermisstData;

  cont.appendChild(vmSep('Anzeigenerstatter'));
  cont.appendChild(vmField('Name', vmInput('Vor- und Nachname', d.melderName, function(v) { d.melderName = v; })));
  cont.appendChild(vmField('Rolle zur vermissten Person', vmInput('z.B. Mutter, Ehemann, Freund', d.melderRolle, function(v) { d.melderRolle = v; })));
  cont.appendChild(vmTwoCol(
    'Geburtsdatum', vmInput('', d.melderGeburtsdatum, function(v) { d.melderGeburtsdatum = v; }, 'date'),
    'Erreichbarkeit / Tel.', vmInput('z.B. 0151 …', d.melderErreichbarkeit, function(v) { d.melderErreichbarkeit = v; })
  ));

  cont.appendChild(vmSep('Sichtung'));
  cont.appendChild(vmTwoCol(
    'Zuletzt gesehen – Datum', vmInput('', d.zuletztDatum, function(v) { d.zuletztDatum = v; }, 'date'),
    'Uhrzeit', vmInput('', d.zuletztUhrzeit, function(v) { d.zuletztUhrzeit = v; }, 'time')
  ));

  cont.appendChild(vmField('Entfernte sich in Richtung', vmInput('z.B. Innenstadt / Bahnhof', d.richtung, function(v) { d.richtung = v; })));
  cont.appendChild(vmField('Fortbewegung (womit?)', vmChips(
    [{ v: 'zu Fuß', label: 'zu Fuß' }, { v: 'mit dem Fahrrad', label: 'Fahrrad' }, { v: 'mit dem Pkw', label: 'Pkw' },
     { v: 'mit öffentlichen Verkehrsmitteln', label: 'ÖPNV' }, { v: 'unbekannt', label: 'unbekannt' }],
    function() { return d.fortbewegung; }, function(v) { d.fortbewegung = v; }, renderVermisst1
  )));
  if (d.fortbewegung === 'zu Fuß') {
    cont.appendChild(vmField('Zu Fuß – Mobilität?', vmChips(
      [{ v: 'gut zu Fuß', label: 'gut zu Fuß' }, { v: 'normal', label: 'normal' }, { v: 'nicht gut zu Fuß', label: 'nicht gut zu Fuß' }],
      function() { return d.fortbewegungZuFuss; }, function(v) { d.fortbewegungZuFuss = v; }
    )));
  }

  cont.appendChild(vmSep('Zugriff auf Pkw'));
  cont.appendChild(vmField('Zugriff auf einen Pkw?', vmChips(VM_JN,
    function() { return d.pkwZugriff; }, function(v) { d.pkwZugriff = v; }, renderVermisst1)));
  if (d.pkwZugriff === 'ja') {
    cont.appendChild(vmField('Pkw-Beschreibung', vmInput('z.B. VW Golf, schwarz', d.pkwBeschreibung, function(v) { d.pkwBeschreibung = v; })));
    cont.appendChild(vmField('Kennzeichen', vmInput('z.B. GT-AB 123', d.pkwKennzeichen, function(v) { d.pkwKennzeichen = v; })));
    cont.appendChild(vmField('Fahrzeug noch vor Ort?', vmChips(VM_JNU,
      function() { return d.pkwVorOrt; }, function(v) { d.pkwVorOrt = v; })));
  }

  cont.appendChild(vmSep('Zugriff auf andere Fahrzeuge'));
  cont.appendChild(vmField('Zugriff auf andere Fahrzeuge?', vmChips(VM_JN,
    function() { return d.andFzZugriff; }, function(v) { d.andFzZugriff = v; }, renderVermisst1)));
  if (d.andFzZugriff === 'ja') {
    cont.appendChild(vmField('Beschreibung', vmInput('z.B. Motorrad, rot', d.andFzBeschreibung, function(v) { d.andFzBeschreibung = v; })));
    cont.appendChild(vmField('Kennzeichen', vmInput('z.B. GT-CD 456', d.andFzKennzeichen, function(v) { d.andFzKennzeichen = v; })));
    cont.appendChild(vmField('Fahrzeug noch vor Ort?', vmChips(VM_JNU,
      function() { return d.andFzVorOrt; }, function(v) { d.andFzVorOrt = v; })));
  }
}

function renderVermisst2() {
  var cont = document.getElementById('vermisst2Content'); if (!cont) return;
  cont.innerHTML = ''; var d = vermisstData;

  cont.appendChild(vmField('Krankheiten bekannt?', vmChips(VM_JNU,
    function() { return d.krankheiten; }, function(v) { d.krankheiten = v; }, renderVermisst2)));
  if (d.krankheiten === 'ja') {
    cont.appendChild(vmField('Welche Krankheiten?', vmInput('z.B. Diabetes, Epilepsie', d.krankheitenWelche, function(v) { d.krankheitenWelche = v; })));
  }

  cont.appendChild(vmSep('Medikamente'));
  cont.appendChild(vmField('Auf Medikamente angewiesen?', vmChips(VM_JNU,
    function() { return d.medikamente; }, function(v) { d.medikamente = v; }, renderVermisst2)));
  if (d.medikamente === 'ja') {
    cont.appendChild(vmField('Sind diese lebenswichtig?', vmChips(VM_JN,
      function() { return d.medikamenteLebenswichtig; }, function(v) { d.medikamenteLebenswichtig = v; })));
    cont.appendChild(vmField('Welche Medikamente?', vmInput('z.B. Insulin, Marcumar', d.medikamenteWelche, function(v) { d.medikamenteWelche = v; })));
    cont.appendChild(vmField('Hinweise auf Einnahme am heutigen Tag?', vmChips(
      [{ v: 'eingenommen', label: 'eingenommen' }, { v: 'nicht eingenommen', label: 'nicht eingenommen' }, { v: 'keine Hinweise', label: 'keine Hinweise' }],
      function() { return d.medikamenteEingenommen; }, function(v) { d.medikamenteEingenommen = v; })));
  }

  cont.appendChild(vmSep('Suizidalität'));
  cont.appendChild(vmField('Suizidale Gedanken geäußert?', vmChips(VM_JN,
    function() { return d.suizidGeaeussert; }, function(v) { d.suizidGeaeussert = v; }, renderVermisst2)));
  if (d.suizidGeaeussert === 'ja') {
    cont.appendChild(vmField('Wann geäußert?', vmInput('z.B. vor 2 Wochen', d.suizidWann, function(v) { d.suizidWann = v; })));
    cont.appendChild(vmField('Welche Äußerungen / Art?', vmInput('kurze Beschreibung', d.suizidWelche, function(v) { d.suizidWelche = v; })));
    cont.appendChild(vmField('In Behandlung?', vmChips(VM_JN, function() { return d.suizidBehandlung; }, function(v) { d.suizidBehandlung = v; })));
    cont.appendChild(vmField('Aktuell geäußert?', vmChips(VM_JN, function() { return d.suizidAktuell; }, function(v) { d.suizidAktuell = v; })));
  }

  cont.appendChild(vmSep('Erscheinungsbild'));
  cont.appendChild(vmField('Statur', vmSelect(VM_STATUR, function() { return d.statur; }, function(v) { d.statur = v; })));
  cont.appendChild(vmField('Größe (cm)', vmInput('z.B. 180', d.groesse, function(v) { d.groesse = v; }, 'number')));
  cont.appendChild(vmField('Haarfarbe', vmSelect(VM_HAARFARBE, function() { return d.haarfarbe; }, function(v) { d.haarfarbe = v; })));
  cont.appendChild(vmField('Haarlänge', vmSelect(VM_HAARLAENGE, function() { return d.haarlaenge; }, function(v) { d.haarlaenge = v; })));
  cont.appendChild(vmField('Auffälligkeiten (Narben, Gesichtsbehaarung, Brille …)', vmArea('freie Beschreibung', d.auffaelligkeiten, function(v) { d.auffaelligkeiten = v; })));
  cont.appendChild(vmField('Bekleidung', vmArea('freie Beschreibung', d.bekleidung, function(v) { d.bekleidung = v; })));
}

function renderVermisst3() {
  var cont = document.getElementById('vermisst3Content'); if (!cont) return;
  cont.innerHTML = ''; var d = vermisstData;

  cont.appendChild(vmField('Handy mitgeführt?', vmChips(VM_JN,
    function() { return d.handy; }, function(v) { d.handy = v; }, renderVermisst3)));
  if (d.handy === 'ja') {
    cont.appendChild(vmField('Telefonnummer', vmInput('z.B. 0151 …', d.handyNummer, function(v) { d.handyNummer = v; })));
  }

  cont.appendChild(vmField('Bekannte Aufenthaltsorte (Stichpunkte)', vmAddableList(d.aufenthaltsorte, 'z.B. Stammkneipe „…“', renderVermisst3, 'Aufenthaltsort hinzufügen')));
  cont.appendChild(vmField('Freunde als Anlaufadressen', vmAddableList(d.freunde, 'Name / Anschrift', renderVermisst3, 'Anlaufadresse hinzufügen')));

  cont.appendChild(vmSep('Sonstiges'));
  var fotosWrap = document.createElement('div'); fotosWrap.style.marginBottom = '16px';
  var fLbl = document.createElement('div'); fLbl.className = 'input-label'; fLbl.style.marginBottom = '6px'; fLbl.textContent = 'Fotos verfügbar?';
  fotosWrap.appendChild(fLbl);
  fotosWrap.appendChild(vmChips(VM_JN, function() { return d.fotos; }, function(v) { d.fotos = v; }, renderVermisst3));
  if (d.fotos === 'ja') {
    var hint = document.createElement('div'); hint.className = 'hb-ort-hint'; hint.style.marginTop = '8px';
    hint.textContent = 'ℹ️ Fotos bitte in Teamwire einstellen (wird im Text vermerkt).';
    fotosWrap.appendChild(hint);
  }
  cont.appendChild(fotosWrap);

  cont.appendChild(vmField('Schon einmal vermisst gewesen?', vmChips(VM_JN,
    function() { return d.bereitsVermisst; }, function(v) { d.bereitsVermisst = v; }, renderVermisst3)));
  if (d.bereitsVermisst === 'ja') {
    cont.appendChild(vmField('Wo damals angetroffen?', vmInput('z.B. bei Freunden in …', d.bereitsWo, function(v) { d.bereitsWo = v; })));
  }

  cont.appendChild(vmField('Vergleichsmaterial für Suchmaßnahmen (Mantrailer) verfügbar?', vmChips(VM_JN,
    function() { return d.vergleichsmaterial; }, function(v) { d.vergleichsmaterial = v; })));
}

function generateVermisstText() {
  var d = vermisstData;
  var out = [];
  function jnu(v) { return v === 'ja' ? 'ja' : v === 'nein' ? 'nein' : v === 'unbekannt' ? 'unbekannt' : ''; }
  function vorOrt(v) { return v === 'ja' ? 'noch vor Ort' : v === 'nein' ? 'nicht mehr vor Ort' : v === 'unbekannt' ? 'Verbleib unbekannt' : ''; }
  function group(title, fn) {
    var lines = [];
    fn(function(label, val) { if (val && String(val).trim()) lines.push('   -  ' + label + ': ' + String(val).trim()); });
    if (lines.length) out.push(title.toUpperCase() + '\n' + lines.join('\n'));
  }

  group('Anzeigenerstatter', function(add) {
    var nm = d.melderName || '';
    if (d.melderRolle) nm += (nm ? ' ' : '') + '(' + d.melderRolle + ')';
    add('Name', nm);
    add('Geburtsdatum', d.melderGeburtsdatum ? formatDateDE(d.melderGeburtsdatum) : '');
    add('Erreichbarkeit', d.melderErreichbarkeit);
  });

  group('Sichtung', function(add) {
    var zg = [];
    if (d.zuletztDatum) zg.push(formatDateDE(d.zuletztDatum));
    if (d.zuletztUhrzeit) zg.push(d.zuletztUhrzeit + ' Uhr');
    add('Zuletzt gesehen', zg.join(', '));

    var ri = d.richtung || '';
    if (d.fortbewegung) {
      var fb = d.fortbewegung;
      if (d.fortbewegung === 'zu Fuß' && d.fortbewegungZuFuss) fb += ', ' + d.fortbewegungZuFuss;
      ri += (ri ? ' ' : '') + '(' + fb + ')';
    }
    add('Entfernte sich in Richtung', ri);

    if (d.pkwZugriff === 'ja') {
      var pk = [d.pkwBeschreibung, d.pkwKennzeichen].filter(Boolean).join(', ');
      var vo = vorOrt(d.pkwVorOrt);
      add('Zugriff auf Pkw', 'ja' + (pk ? ' – ' + pk : '') + (vo ? ' (' + vo + ')' : ''));
    } else if (d.pkwZugriff) { add('Zugriff auf Pkw', jnu(d.pkwZugriff)); }

    if (d.andFzZugriff === 'ja') {
      var af = [d.andFzBeschreibung, d.andFzKennzeichen].filter(Boolean).join(', ');
      var avo = vorOrt(d.andFzVorOrt);
      add('Zugriff auf andere Fahrzeuge', 'ja' + (af ? ' – ' + af : '') + (avo ? ' (' + avo + ')' : ''));
    } else if (d.andFzZugriff) { add('Zugriff auf andere Fahrzeuge', jnu(d.andFzZugriff)); }
  });

  group('Gesundheit', function(add) {
    if (d.krankheiten === 'ja') add('Krankheiten bekannt', 'ja' + (d.krankheitenWelche ? ' – ' + d.krankheitenWelche : ''));
    else if (d.krankheiten) add('Krankheiten bekannt', jnu(d.krankheiten));

    if (d.medikamente === 'ja') {
      var mdet = [];
      if (d.medikamenteLebenswichtig) mdet.push(d.medikamenteLebenswichtig === 'ja' ? 'lebenswichtig' : 'nicht lebenswichtig');
      if (d.medikamenteWelche) mdet.push('Art: ' + d.medikamenteWelche);
      if (d.medikamenteEingenommen) mdet.push('heute: ' + d.medikamenteEingenommen);
      add('Auf Medikamente angewiesen', 'ja' + (mdet.length ? ' – ' + mdet.join('; ') : ''));
    } else if (d.medikamente) { add('Auf Medikamente angewiesen', jnu(d.medikamente)); }

    if (d.suizidGeaeussert === 'ja') {
      var det = [];
      if (d.suizidWann) det.push('wann: ' + d.suizidWann);
      if (d.suizidWelche) det.push('Art: ' + d.suizidWelche);
      if (d.suizidBehandlung) det.push('in Behandlung: ' + jnu(d.suizidBehandlung));
      if (d.suizidAktuell) det.push('aktuell geäußert: ' + jnu(d.suizidAktuell));
      add('Suizidale Äußerungen', 'ja' + (det.length ? ' – ' + det.join('; ') : ''));
    } else if (d.suizidGeaeussert) { add('Suizidale Äußerungen', jnu(d.suizidGeaeussert)); }
  });

  group('Erscheinungsbild', function(add) {
    add('Statur', d.statur);
    add('Größe', d.groesse ? (/^\d+$/.test(String(d.groesse).trim()) ? d.groesse + ' cm' : d.groesse) : '');
    add('Haarfarbe', d.haarfarbe);
    add('Haarlänge', d.haarlaenge);
    add('Auffälligkeiten', d.auffaelligkeiten);
    add('Bekleidung', d.bekleidung);
  });

  group('Umfeld & Kontakt', function(add) {
    if (d.handy === 'ja') add('Handy', 'ja' + (d.handyNummer ? ' – ' + d.handyNummer : ''));
    else if (d.handy) add('Handy', jnu(d.handy));

    var orte = (d.aufenthaltsorte || []).map(function(x) { return (x || '').trim(); }).filter(Boolean);
    if (orte.length) add('Bekannte Aufenthaltsorte', orte.join('; '));
    var fr = (d.freunde || []).map(function(x) { return (x || '').trim(); }).filter(Boolean);
    if (fr.length) add('Freunde / Anlaufadressen', fr.join('; '));

    if (d.fotos === 'ja') add('Fotos verfügbar', 'ja – in Teamwire eingestellt');
    else if (d.fotos) add('Fotos verfügbar', jnu(d.fotos));

    if (d.bereitsVermisst === 'ja') add('Bereits vermisst gewesen', 'ja' + (d.bereitsWo ? ' – angetroffen: ' + d.bereitsWo : ''));
    else if (d.bereitsVermisst) add('Bereits vermisst gewesen', jnu(d.bereitsVermisst));

    if (d.vergleichsmaterial) add('Vergleichsmaterial (Mantrailer)', jnu(d.vergleichsmaterial));
  });

  return out.join('\n\n');
}

// ── Anzeigenaufnahme auf der Wache ──────────────────────────

function addAnzeigePerson() {
  anzeigeCounter++;
  anzeigePersonen.push({ id: anzeigeCounter, name: '', rolle: '', zvr: false, belehrender: '', gegenueber: '', ausweisdokument: null, freitext: '', strafantrag: null });
  anzeigeCurrentIdx = anzeigePersonen.length - 1;
}

function buildAnzeigeEinleitungSatz(was) {
  var d = anzeigeIntro;
  var datum = d.datum ? formatDateDE(d.datum) : '[Datum]';
  var uhr   = d.uhrzeit || '[Uhrzeit]';
  var rm    = ROLLEN_MAP[d.rolle];
  var werStr = rm ? (rm.disp + (d.name ? ' ' + d.name : '')) : (d.name || '[erschienene Person]');
  return 'Am ' + datum + ', um ' + uhr + ' Uhr, erschien ' + werStr + ' auf der Polizeiwache Gütersloh und zeigte folgenden Sachverhalt an: ' + (was || '[Sachverhalt]') + '.';
}

function renderAnzeigeIntro() {
  var cont = document.getElementById('anzeigeIntroList');
  if (!cont) return;
  cont.innerHTML = '';
  var d = anzeigeIntro;

  function row(label, el) {
    var wrap = document.createElement('div'); wrap.style.marginBottom = '14px';
    var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.textContent = label;
    wrap.appendChild(lbl); wrap.appendChild(el); cont.appendChild(wrap);
  }

  var datInp = document.createElement('input');
  datInp.type = 'date'; datInp.className = 'field-input'; datInp.value = d.datum || '';
  datInp.oninput = function() { d.datum = this.value; };
  row('Datum', datInp);

  var uhrInp = document.createElement('input');
  uhrInp.type = 'time'; uhrInp.className = 'field-input'; uhrInp.value = d.uhrzeit || '';
  uhrInp.oninput = function() { d.uhrzeit = this.value; };
  row('Uhrzeit', uhrInp);

  var nameInp = document.createElement('input');
  nameInp.type = 'text'; nameInp.className = 'field-input'; nameInp.value = d.name || '';
  nameInp.placeholder = 'Name der erschienenen Person';
  nameInp.oninput = function() { d.name = this.value; };
  row('Name', nameInp);

  var rolleLbl = document.createElement('div'); rolleLbl.className = 'input-label'; rolleLbl.textContent = 'Rolle';
  cont.appendChild(rolleLbl);
  var rolleChips = document.createElement('div'); rolleChips.className = 'suggestions'; rolleChips.style.marginTop = '4px';
  [{ v:'geschm', label:'Geschädigter' }, { v:'geschw', label:'Geschädigte' },
   { v:'zeuge',  label:'Zeuge' },        { v:'zeugin', label:'Zeugin' }
  ].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (d.rolle === opt.v ? ' active' : '');
    rolleChips.appendChild(btn);
  });
  rolleChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    d.rolle = btn.dataset.v;
    rolleChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });
  cont.appendChild(rolleChips);
}

function renderAnzeigeWas() {
  var cont = document.getElementById('anzeigeWasList');
  if (!cont) return;
  cont.innerHTML = '';
  var d = anzeigeIntro;

  var previewBox = document.createElement('div');
  previewBox.className = 'anzeige-satz-preview';
  previewBox.textContent = buildAnzeigeEinleitungSatz(d.was);
  cont.appendChild(previewBox);

  var lbl = document.createElement('div'); lbl.className = 'input-label'; lbl.style.marginTop = '16px'; lbl.textContent = 'Anzeigeinhalt';
  cont.appendChild(lbl);

  var ta = document.createElement('textarea');
  ta.className = 'field-input field-textarea psychkg-ta'; ta.style.marginTop = '6px';
  ta.placeholder = 'Bitte vervollständigen …';
  ta.value = d.was || '';
  ta.oninput = function() {
    d.was = this.value;
    previewBox.textContent = buildAnzeigeEinleitungSatz(d.was);
  };
  cont.appendChild(ta);
  requestAnimationFrame(function() { ta.focus(); });
}

function renderAnzeigeSchild() {
  var list = document.getElementById('anzeigeSchlList');
  if (!list) return;
  list.innerHTML = '';
  if (anzeigeCurrentIdx === null || !anzeigePersonen[anzeigeCurrentIdx]) return;
  var s = anzeigePersonen[anzeigeCurrentIdx];
  var officers = getBesatzungLabels();
  var card = document.createElement('div'); card.className = 'schild-card';

  var nameInp = document.createElement('input');
  nameInp.type = 'text'; nameInp.className = 'field-input schild-name-inp';
  nameInp.placeholder = 'Name der Person (optional)'; nameInp.value = s.name || '';
  nameInp.oninput = function() { s.name = this.value; };
  card.appendChild(nameInp);

  var rolleWrap = document.createElement('div'); rolleWrap.style.marginTop = '10px';
  var rolleLabel = document.createElement('div'); rolleLabel.className = 'input-label'; rolleLabel.textContent = 'Rolle';
  rolleWrap.appendChild(rolleLabel);
  var rolleChips = document.createElement('div'); rolleChips.className = 'suggestions';
  [{ v:'geschm', label:'Geschädigter' }, { v:'geschw', label:'Geschädigte' },
   { v:'zeuge',  label:'Zeuge' },        { v:'zeugin', label:'Zeugin' }
  ].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = opt.v; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.rolle === opt.v ? ' active' : '');
    rolleChips.appendChild(btn);
  });
  rolleWrap.appendChild(rolleChips);
  card.appendChild(rolleWrap);

  var zvrWrap = document.createElement('div');
  zvrWrap.style.marginTop = '10px'; zvrWrap.style.display = s.rolle ? '' : 'none';
  var zvrLabel = document.createElement('div'); zvrLabel.className = 'input-label'; zvrLabel.textContent = 'Besonderer Hinweis';
  zvrWrap.appendChild(zvrLabel);
  var zvrChips = document.createElement('div'); zvrChips.className = 'suggestions'; zvrChips.style.marginTop = '4px';
  [{ v: true, label: 'mit Zeugnisverweigerungsrecht' }, { v: false, label: 'ohne' }].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.zvr === opt.v ? ' active' : '');
    btn.addEventListener('click', function() {
      s.zvr = opt.v;
      zvrChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      belWrap.style.display = '';
    });
    zvrChips.appendChild(btn);
  });
  zvrWrap.appendChild(zvrChips);
  card.appendChild(zvrWrap);

  var belWrap = document.createElement('div');
  belWrap.style.marginTop = '10px'; belWrap.style.display = s.rolle ? '' : 'none';
  var belLabel = document.createElement('div'); belLabel.className = 'input-label'; belLabel.textContent = 'Belehrung durch';
  belWrap.appendChild(belLabel);
  var belChips = document.createElement('div'); belChips.className = 'suggestions';
  if (!officers.length) {
    var note = document.createElement('div'); note.className = 'schild-note';
    note.innerHTML = '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> Besatzung auf Seite 1 eintragen.';
    belChips.appendChild(note);
  } else {
    officers.forEach(function(name) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.v = name; btn.textContent = name;
      btn.className = 'btn-suggestion' + (s.belehrender === name ? ' active' : '');
      belChips.appendChild(btn);
    });
  }
  belWrap.appendChild(belChips);
  card.appendChild(belWrap);

  var gegWrap = document.createElement('div');
  gegWrap.style.marginTop = '10px'; gegWrap.style.display = s.belehrender ? '' : 'none';
  var gegLabel = document.createElement('div'); gegLabel.className = 'input-label'; gegLabel.textContent = 'Geäußert gegenüber';
  gegWrap.appendChild(gegLabel);
  var gegChips = document.createElement('div'); gegChips.className = 'suggestions';
  officers.forEach(function(name) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.v = name; btn.textContent = name;
    btn.className = 'btn-suggestion' + (s.gegenueber === name ? ' active' : '');
    gegChips.appendChild(btn);
  });
  gegWrap.appendChild(gegChips);
  card.appendChild(gegWrap);

  rolleChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.rolle = btn.dataset.v;
    rolleChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    zvrWrap.style.display = '';
    belWrap.style.display = '';
  });
  belChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.belehrender = btn.dataset.v;
    belChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    if (!s.gegenueber) {
      s.gegenueber = btn.dataset.v;
      gegChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.toggle('active', b.dataset.v === s.gegenueber); });
    }
    gegWrap.style.display = '';
  });
  gegChips.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-suggestion'); if (!btn) return;
    s.gegenueber = btn.dataset.v;
    gegChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });

  list.appendChild(card);
  requestAnimationFrame(function() { var inp = list.querySelector('.schild-name-inp'); if (inp && !inp.value) inp.focus(); });
}

function renderAnzeigeAngaben() {
  var cont = document.getElementById('anzeigeAngabenList');
  if (!cont) return;
  cont.innerHTML = '';
  var s = anzeigeCurrentIdx !== null ? anzeigePersonen[anzeigeCurrentIdx] : null;
  if (!s) return;
  var rm = ROLLEN_MAP[s.rolle];
  var bel = s.belehrender || '[Beamter/Beamtin]';
  var geg = s.gegenueber  || '[Beamter/Beamtin]';
  var belTyp = rm && rm.btyp === 'besch' ? 'Beschuldigtenbelehrung' : 'zeugenschaftlicher Belehrung';
  var zvrZusatz = s.zvr ? ', mit besonderem Hinweis auf das Zeugnisverweigerungsrecht,' : '';

  var personLbl = document.createElement('div'); personLbl.className = 'input-label';
  personLbl.style.marginBottom = '8px';
  personLbl.textContent = (s.name || ('Person ' + (anzeigeCurrentIdx + 1))) + (rm ? ' – ' + rm.disp : '');
  cont.appendChild(personLbl);

  var intro = document.createElement('div'); intro.className = 'schild-note'; intro.style.marginBottom = '10px';
  intro.textContent = 'Nach erfolgter ' + belTyp + zvrZusatz + ' durch ' + bel + ' machte ' + (rm ? rm.disp : '[Person]') + ' gegenüber ' + geg + ' sinngemäß folgende Angaben:';
  cont.appendChild(intro);

  var ta = document.createElement('textarea');
  ta.className = 'field-input field-textarea psychkg-ta';
  ta.placeholder = 'Angaben der Person ...';
  ta.value = s.freitext || '';
  ta.oninput = function() { s.freitext = this.value; };
  cont.appendChild(ta);

  // Ausweis
  var awWrap = document.createElement('div'); awWrap.style.marginTop = '14px';
  var awLbl = document.createElement('div'); awLbl.className = 'input-label';
  awLbl.textContent = (rm ? (rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1)) + (s.name ? ' ' + s.name : '') : 'Person') + ' wies sich aus mit';
  awWrap.appendChild(awLbl);
  var awChips = document.createElement('div'); awChips.className = 'suggestions'; awChips.style.marginTop = '6px';
  [{ v: 'bpa',    label: 'Bundespersonalausweis' },
   { v: 'ausweis', label: 'gültigem Ausweisdokument' }
  ].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.ausweisdokument === opt.v ? ' active' : '');
    btn.addEventListener('click', function() {
      s.ausweisdokument = opt.v;
      awChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
    awChips.appendChild(btn);
  });
  awWrap.appendChild(awChips);
  cont.appendChild(awWrap);

  // Strafantrag
  var saWrap = document.createElement('div'); saWrap.style.marginTop = '14px';
  var saLbl = document.createElement('div'); saLbl.className = 'input-label'; saLbl.textContent = 'Strafantrag';
  saWrap.appendChild(saLbl);
  var saChips = document.createElement('div'); saChips.className = 'suggestions'; saChips.style.marginTop = '6px';
  [{ v: true, label: 'Strafantrag gestellt' }, { v: false, label: 'Kein Strafantrag' }].forEach(function(opt) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = opt.label;
    btn.className = 'btn-suggestion' + (s.strafantrag === opt.v ? ' active' : '');
    btn.addEventListener('click', function() {
      s.strafantrag = opt.v;
      saChips.querySelectorAll('.btn-suggestion').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
    saChips.appendChild(btn);
  });
  saWrap.appendChild(saChips);
  cont.appendChild(saWrap);

  requestAnimationFrame(function() { ta.focus(); });
}

function renderAnzeigeOverview() {
  var cont = document.getElementById('anzeigeOverviewList');
  if (!cont) return;
  cont.innerHTML = '';
  anzeigePersonen.forEach(function(s, idx) {
    var rm = ROLLEN_MAP[s.rolle];
    var isComplete = !!(s.rolle && s.belehrender);
    var card = document.createElement('div');
    card.className = 'schild-overview-card' + (isComplete ? ' complete' : '');
    var nameEl = document.createElement('div'); nameEl.className = 'schild-ov-name';
    nameEl.textContent = s.name || ('Person ' + (idx + 1));
    card.appendChild(nameEl);
    var rolleEl = document.createElement('div'); rolleEl.className = 'schild-ov-rolle';
    rolleEl.textContent = rm ? rm.disp.replace(/^(der|die) /, '') : 'Keine Rolle gewählt';
    card.appendChild(rolleEl);
    if (isComplete) {
      var badge = document.createElement('div'); badge.className = 'schild-ov-badge';
      badge.textContent = '✓ Erfasst';
      card.appendChild(badge);
    }
    cont.appendChild(card);
  });
}

function generateAnzeigeText() {
  return buildAnzeigeEinleitungSatz(anzeigeIntro.was || '[Sachverhalt]');
}

function anzeigeSchilderungenPersonList() {
  return anzeigePersonen.map(function(s) {
    var rm = ROLLEN_MAP[s.rolle];
    if (!rm) return null;
    var bel = s.belehrender || '[Beamter/Beamtin]';
    var geg = s.gegenueber  || '[Beamter/Beamtin]';
    var belTyp = rm.btyp === 'besch' ? 'Beschuldigtenbelehrung' : 'zeugenschaftlicher Belehrung';
    var nomCap = rm.disp.charAt(0).toUpperCase() + rm.disp.slice(1);
    var nameStr = s.name ? ' ' + s.name : '';
    var personBlock = [];
    if (s.ausweisdokument) {
      var dokStr = s.ausweisdokument === 'bpa' ? 'einem Bundespersonalausweis' : 'einem gültigen Ausweisdokument';
      personBlock.push(nomCap + nameStr + ' wies sich mit ' + dokStr + ' aus.');
    }
    var zvrZusatz = s.zvr ? ', mit besonderem Hinweis auf das Zeugnisverweigerungsrecht,' : '';
    var introSatz = 'Nach erfolgter ' + belTyp + zvrZusatz + ' durch ' + bel + ' machte ' + rm.disp + ' gegenüber ' + geg + ' sinngemäß folgende Angaben:';
    var angaben = s.freitext || '[Keine Angaben erfasst]';
    if (s.strafantrag === true) {
      angaben += '\n\n' + nomCap + ' stellt für alle in Frage kommenden Straftaten Strafantrag.';
    } else if (s.strafantrag === false) {
      angaben += '\n\n' + nomCap + ' stellt keinen Strafantrag.';
    }
    personBlock.push(introSatz + '\n\n' + angaben);
    return { ref: rolleRef(s.rolle, s.name), text: personBlock.join('\n\n') };
  }).filter(Boolean);
}

function generateAnzeigeSchilderungenText() {
  return anzeigeSchilderungenPersonList().map(function(p) { return p.text; })
    .filter(function(t) { return t && t.trim(); }).join('\n\n');
}

function goBackToSection(key) {
  var def = SECTION_DEFS[key]; if (!def) return;
  var slides = getActiveSlides();
  var firstSlide = def.getSlides()[0];
  var idx = slides.indexOf(firstSlide);
  if (idx === -1) idx = 0;
  current = idx;
  render();
}

function generateResult() {
  var doc = document.getElementById('reportDoc');
  doc.innerHTML = '';
  var delay = 0;
  var sectionNum = 1;

  function renderBlock(numLabel, title, text, key, isSub) {
    if (doc.children.length > 0) {
      var sp = document.createElement('div');
      sp.className = 'report-spacer';
      doc.appendChild(sp);
    }
    var h = document.createElement('div');
    h.className = 'report-heading report-item-in' + (isSub ? ' report-subheading' : '');
    h.style.animationDelay = delay + 'ms';
    var titleSpan = document.createElement('span');
    titleSpan.textContent = numLabel + ' ' + title;
    h.appendChild(titleSpan);
    if (key) {
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'report-edit-btn';
      editBtn.textContent = 'Bearbeiten';
      (function(k) { editBtn.onclick = function() { goBackToSection(k); }; })(key);
      h.appendChild(editBtn);
    }
    doc.appendChild(h);
    delay += 80;
    if (text && text.trim()) {
      var b = document.createElement('div');
      b.className = 'report-body report-item-in';
      b.style.animationDelay = delay + 'ms';
      b.textContent = text;
      doc.appendChild(b);
      delay += 160;
    }
  }

  function appendSection(title, text, key) {
    if (!text || !text.trim()) return;
    renderBlock(String(sectionNum), title, text, key, false);
    sectionNum++;
  }

  function appendSchilderungen(key, list) {
    list = (list || []).filter(function(p) { return p.text && p.text.trim(); });
    if (!list.length) return;
    if (list.length === 1) {
      renderBlock(String(sectionNum), 'Schilderungen (' + list[0].ref + ')', list[0].text, key, false);
      sectionNum++;
      return;
    }
    var main = sectionNum;
    renderBlock(String(main), 'Schilderungen', '', key, false);
    list.forEach(function(p, i) {
      renderBlock(main + '.' + (i + 1), p.ref, p.text, key, true);
    });
    sectionNum++;
  }

  var generators = {
    allgemeines: function() {
      var strasse = document.getElementById('strasse').value || '[Straße]';
      var hausnummer = document.getElementById('hausnummer').value;
      var plz = document.getElementById('plz').value || '[PLZ]';
      var stadt = document.getElementById('stadt').value || '[Stadt]';
      var anlass = document.getElementById('einsatzanlass').value || '[Einsatzbeschreibung]';
      return buildErsterSatz(anlass) + '\n\n' +
        'Einsatzörtlichkeit: ' + strasse + (hausnummer ? ' ' + hausnummer : '') + ', ' + plz + ' ' + stadt + '.';
    },
    oertlichkeit:  function() { return generateOertlichkeitText(); },
    verhaeltnisse: function() { return generateVerkehrsText(); },
    spuren:        function() { var t = spurenText(); return t ? t.replace(/^\n+/, '') : ''; },
    fahrzeug:      function() { return generateFahrzeugText(); },
    schilderungen: function() { return generateSchilderungenText(); },
    massnahmen:    function() { return generateMassnahmenText(); },
    psychkg:       function() { return generatePsychKGText(); },
    haftbefehl:    function() { return generateHaftbefehlText(); },
    vermisst:      function() { return generateVermisstText(); },
    anzeige:       function() { return generateAnzeigeText(); }
  };

  var titles = {
    allgemeines:   'Allgemeines / Einsatzanlass',
    oertlichkeit:  'Unfallörtlichkeit',
    verhaeltnisse: 'Verkehrsverhältnisse',
    spuren:        'Spuren auf der Fahrbahn',
    fahrzeug:      'Spuren an den Fahrzeugen',
    schilderungen: 'Schilderungen',
    massnahmen:    'Maßnahmen / Sonstiges',
    psychkg:       'Maßnahmen nach dem PsychKG',
    haftbefehl:    'Haftbefehl',
    vermisst:      'Vermisste Person',
    anzeige:       'Anzeigenaufnahme auf der Wache'
  };

  selectedSections.forEach(function(key) {
    if (key === 'blutprobe') {
      appendSection('Entscheidungsweg zur Anordnung der Blutentnahme', generateBlutprobeAnordnungText(), 'blutprobe');
      appendSection('Blutprobe', generateBlutprobeEntnahmeText(), 'blutprobe');
      return;
    }
    if (key === 'anzeige') {
      appendSection('Anzeigenaufnahme auf der Wache', generateAnzeigeText(), 'anzeige');
      appendSchilderungen('anzeige', anzeigeSchilderungenPersonList());
      return;
    }
    if (key === 'schilderungen') {
      appendSchilderungen('schilderungen', schilderungenPersonList());
      return;
    }
    if (generators[key]) appendSection(titles[key], generators[key](), key);
  });

  var slides = getActiveSlides();
  slides.forEach(function (id) {
    var s = document.getElementById(id);
    if (s) { s.classList.remove('active'); s.classList.add('exit-left'); }
  });
  document.getElementById('slide-result').classList.add('active');
  document.getElementById('progress').style.width = '100%';
  document.getElementById('stepCounter').textContent = 'Fertig';
  document.getElementById('btnBack').disabled = true;
  document.getElementById('dots').innerHTML = '';
}

function spurenText() {
  if (document.getElementById('keineSpurenCheck').checked) return '';
  var v = document.getElementById('uo-spuren').value.trim();
  return v ? '\n\nAuf der Fahrbahn wurden folgende Spuren festgestellt: ' + v + '.' : '';
}

function generateOertlichkeitText() {
  if (!branch) return '';
  var plz = document.getElementById('plz').value || '[PLZ]';
  var stadt = document.getElementById('stadt').value || '[Stadt]';

  if (branch === 'strasse') {
    var strasse = document.getElementById('uo-strasse').value || document.getElementById('strasse').value || '[Straße]';
    var uoHausnummer = document.getElementById('uo-hausnummer').value;
    var lage = getChipValue('lage');
    var strassentyp = getChipValue('strassentyp');
    var ortsteil = document.getElementById('uo-ortsteil').value;
    var woGenau = document.getElementById('uo-wo-genau').value;
    var lageGelegen = (lage && lage !== 'none') ? lage + ' gelegene ' : '';
    var strassentypText = (strassentyp && strassentyp !== 'none') ? ' (' + strassentyp + ')' : '';
    var ortsteilText = ortsteil ? ' (Ortsteil: ' + ortsteil + ')' : '';
    var strasseAdresse = strasse + (uoHausnummer ? ' ' + uoHausnummer : '');
    var lines = [];
    lines.push('Bei der Unfallörtlichkeit handelt es sich um folgende ' + lageGelegen + 'Straße: ' +
      strasseAdresse + strassentypText + ', ' + plz + ' ' + stadt + ortsteilText + '.');
    if (woGenau) lines.push('Der Unfall ereignete sich ' + woGenau + '.');
    return lines.filter(Boolean).join('\n\n');
  }

  if (branch === 'parkplatz') {
    var pkAdresse = document.getElementById('pk-adresse').value || '[Adresse]';
    var pkZugehoerigkeit = document.getElementById('pk-zugehoerigkeit').value || '[Zugehörigkeit]';
    var pkPosition = document.getElementById('pk-position').value || '[Position]';
    return 'Bei der Unfallörtlichkeit handelt es sich um den ' + pkZugehoerigkeit +
      ', ' + pkAdresse + ', ' + plz + ' ' + stadt + '.\n\n' + pkPosition;
  }
  return '';
}

function generateVerkehrsText() {
  if (branch !== 'strasse') return '';
  var tempo = document.getElementById('uo-tempo').value;
  var fahrstreifen = document.getElementById('uo-fahrstreifen').value;
  var trennung = getChipValue('trennung');
  var verkehr = getChipValue('verkehr');
  var beleuchtung = getChipValue('beleuchtung');
  var verlauf = getChipValue('verlauf');
  var fahrtrichtung = document.getElementById('uo-fahrtrichtung').value || '[Richtung]';
  var steigung = getChipValue('steigung');
  var wetter = getChipValue('wetter');
  var fahrbahn = getChipValue('fahrbahn');
  var sicht = getChipValue('sicht');

  var trennungMap = {
    'mittellinie': 'eine durchgezogene Mittellinie',
    'doppelte-linie': 'eine doppelte durchgezogene Linie',
    'mittelstreifen': 'einen begrünten Mittelstreifen, baulich',
    'mittelinsel': 'eine bauliche Mittelinsel'
  };
  var verkehrMap = { 'schwach': 'schwaches', 'moderat': 'moderates', 'stark': 'starkes' };
  var beleuchtungMap = {
    'in-betrieb': 'Die Straßenbeleuchtung war in Betrieb und gewährleistete eine ausreichende, gleichmäßige Ausleuchtung der Fahrbahn.',
    'nicht-vorhanden': 'Eine Straßenbeleuchtung war nicht vorhanden.',
    'ausgeschaltet': 'Die Straßenbeleuchtung war vorhanden, aufgrund der Tageszeit bestimmungsgemäß ausgeschaltet.'
  };
  var verlaufMap = { 'gerade': 'gerade', 'linkskurve': 'in einer Linkskurve', 'rechtskurve': 'in einer Rechtskurve' };
  var steigungMap = {
    'keine': 'keine Steigung oder Gefälle',
    'gefaelle-gering': 'ein geringes Gefälle', 'gefaelle-maessig': 'ein mäßiges Gefälle', 'gefaelle-stark': 'ein starkes Gefälle',
    'steigung-gering': 'eine geringe Steigung', 'steigung-maessig': 'eine mäßige Steigung', 'steigung-stark': 'eine starke Steigung'
  };
  var wetterMap = { 'trocken': 'trockene Witterung', 'regen': 'Regen', 'schneefall': 'Schneefall', 'nebel': 'Nebel', 'frost-eis': 'Frost und Eisglätte' };
  var fahrbahnMap = { 'trocken': 'trocken', 'nass': 'nass', 'feucht': 'feucht', 'verschneit': 'mit Schnee bedeckt', 'vereist': 'vereist' };
  var sichtMap = { 'gut': 'guten', 'eingeschraenkt': 'eingeschränkten', 'schlecht': 'schlechten' };

  var lines = [];

  if (tempo) {
    var tempoGrundVal = getChipValue('tempo-grund');
    var tempoSatz = 'Die zulässige Höchstgeschwindigkeit auf diesem Abschnitt der Straße beträgt ' + tempo + ' km/h';
    var tempoGrundMap = {
      vz274:     'vorgegeben durch das VZ. 274',
      zone:      'vorgegeben durch die Beschilderung als Tempo-' + tempo + '-Zone (Zeichen 274.1)',
      ortschaft: 'welche sich aus der Lage innerhalb geschlossener Ortschaft ergibt'
    };
    if (tempoGrundVal && tempoGrundVal !== 'none' && tempoGrundMap[tempoGrundVal]) {
      tempoSatz += ', ' + tempoGrundMap[tempoGrundVal];
    }
    lines.push(tempoSatz + '.');
  }

  if (fahrstreifen && trennung && trennung !== 'none') {
    lines.push('Es bestehen ' + fahrstreifen + ' Fahrstreifen je Richtung. Die Richtungsfahrbahnen sind durch ' +
      (trennungMap[trennung] || '[Trennung]') + ' voneinander getrennt.');
  } else if (fahrstreifen) {
    lines.push('Es bestehen ' + fahrstreifen + ' Fahrstreifen je Richtung.');
  }

  if (verkehr && verkehr !== 'none') {
    lines.push('Zum Zeitpunkt der Unfallaufnahme herrschte ' + (verkehrMap[verkehr] || '[Verkehr]') + ' Verkehrsaufkommen.');
  }

  if (beleuchtung && beleuchtung !== 'none') {
    lines.push(beleuchtungMap[beleuchtung] || '');
  }

  var verlaufVal = (verlauf && verlauf !== 'none') ? (verlaufMap[verlauf] || null) : null;
  var steigungVal = (steigung && steigung !== 'none') ? (steigungMap[steigung] || null) : null;
  if (verlaufVal || steigungVal) {
    var strecke = 'Der Streckenabschnitt verläuft auf Höhe der Unfallstelle';
    if (verlaufVal) strecke += ' ' + verlaufVal;
    if (steigungVal) strecke += (verlaufVal ? ' und' : '') + ' weist in Fahrtrichtung ' + fahrtrichtung + ' ' + steigungVal + ' auf';
    lines.push(strecke + '.');
  }

  var wetterVal = (wetter && wetter !== 'none') ? (wetterMap[wetter] || wetter) : null;
  var sichtVal = (sicht && sicht !== 'none') ? (sichtMap[sicht] || sicht) : null;
  if (wetterVal && sichtVal) {
    lines.push('Zum Unfallzeitpunkt herrschten ' + wetterVal + ' bei ' + sichtVal + ' Sichtverhältnissen.');
  } else if (wetterVal) {
    lines.push('Zum Unfallzeitpunkt herrschten ' + wetterVal + '.');
  } else if (sichtVal) {
    lines.push('Zum Unfallzeitpunkt herrschten ' + sichtVal + ' Sichtverhältnisse.');
  }

  if (fahrbahn && fahrbahn !== 'none') {
    lines.push('Die Fahrbahnoberfläche war zum Unfallzeitpunkt ' + (fahrbahnMap[fahrbahn] || fahrbahn) + '.');
  }

  return lines.filter(Boolean).join('\n\n');
}

function generateAbschnitt2() {
  var parts = [
    generateOertlichkeitText(),
    generateVerkehrsText(),
    spurenText().replace(/^\n+/, '')
  ].filter(Boolean);
  return parts.join('\n\n');
}
// ── Kopieren ────────────────────────────────────────────────

function copyText() {
  var nodes = document.querySelectorAll('#reportDoc > *');

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  var P = 'font-family:Calibri,sans-serif;font-size:11pt;line-height:1.28;text-align:left;margin:0;padding:0;';

  function paraHtml(text) {
    return text.split('\n\n').map(function(p) {
      return '<p style="' + P + '">' + esc(p).replace(/\n/g,'<br>') + '</p>';
    }).join('');
  }

  // In DOM-Reihenfolge sammeln: Überschriften (ohne "Bearbeiten"-Button) und Bodys;
  // eine Überschrift beginnt einen neuen Abschnitt, ein Body wird angehängt.
  var segsPlain = [], segsHtml = [];
  var curPlain = null, curHtml = null;
  function flush() { if (curPlain !== null) { segsPlain.push(curPlain); segsHtml.push(curHtml); } curPlain = null; curHtml = null; }
  nodes.forEach(function(node) {
    if (node.classList.contains('report-heading')) {
      flush();
      var titleEl = node.querySelector('span');
      var head = titleEl ? titleEl.textContent : node.textContent;
      curPlain = head;
      curHtml = '<p style="' + P + 'font-weight:bold;">' + esc(head) + '</p>';
    } else if (node.classList.contains('report-body')) {
      var body = node.textContent;
      if (curPlain === null) { curPlain = ''; curHtml = ''; }
      curPlain += (curPlain ? '\n' : '') + body;
      curHtml += paraHtml(body);
    }
  });
  flush();

  var plain = segsPlain.join('\n\n');
  var html  = '<!DOCTYPE html><html><body style="font-family:Calibri,sans-serif;font-size:11pt;">' +
    segsHtml.join('<p style="' + P + '">&nbsp;</p>') +
    '</body></html>';

  function showCopied() {
    var btn = document.getElementById('btnCopy');
    btn.classList.add('copied'); btn.textContent = 'Kopiert!';
    setTimeout(function() { btn.classList.remove('copied'); btn.textContent = 'Text kopieren'; }, 2000);
  }

  // Modern Clipboard API — Word picks up the HTML variant
  if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
    navigator.clipboard.write([new ClipboardItem({
      'text/html':  new Blob([html],  { type: 'text/html'  }),
      'text/plain': new Blob([plain], { type: 'text/plain' })
    })]).then(showCopied).catch(function() {
      navigator.clipboard.writeText(plain).then(showCopied);
    });
    return;
  }

  // Fallback: contenteditable + execCommand (also puts HTML on clipboard)
  var div = document.createElement('div');
  div.contentEditable = 'true';
  div.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;';
  div.innerHTML = html;
  document.body.appendChild(div);
  var range = document.createRange(); range.selectNodeContents(div);
  var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  try { document.execCommand('copy'); } catch(e) {}
  sel.removeAllRanges();
  document.body.removeChild(div);
  showCopied();
}

// ── Reset ───────────────────────────────────────────────────

function resetAll() {
  streifenwagen = [];
  swCounter = 0;
  current = 0;
  branch = null;
  selectedSections = [];
  document.getElementById('strasse').value = '';
  document.getElementById('hausnummer').value = '';
  document.getElementById('plz').value = '';
  document.getElementById('stadt').value = '';
  document.getElementById('datum').value = today;
  document.getElementById('uhrzeit').value = '';
  document.getElementById('einsatzanlass').value = '';
  document.getElementById('nachtragenCheck').checked = false;
  document.getElementById('timeFields').classList.remove('hidden');
  // Abschnitt 2
  ['uo-strasse', 'uo-hausnummer', 'uo-ortsteil', 'uo-wo-genau', 'uo-tempo', 'uo-fahrstreifen', 'uo-fahrtrichtung',
    'pk-adresse', 'pk-zugehoerigkeit', 'pk-position'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.querySelectorAll('[data-speed]').forEach(function (b) { b.classList.remove('active'); });
  document.getElementById('uo-spuren').value = '';
  document.getElementById('keineSpurenCheck').checked = false;
  document.getElementById('spurenFields').classList.remove('hidden');
  autoOrtsteil = '';
  document.getElementById('strassen-dropdown').innerHTML = '';
  document.getElementById('strassen-dropdown').classList.remove('open');
  document.querySelectorAll('[data-group]').forEach(function (b) { b.classList.remove('active'); });
  document.querySelectorAll('[data-text]').forEach(function (b) { b.classList.remove('active'); });
  document.querySelectorAll('.suggestions-anlass').forEach(function (el) { el.classList.remove('has-selection'); });
  fahrzeugSpuren = [];
  fzCounter = 0;
  fzNummernMax = 2;
  fzCurrentIdx = null;
  fzSelectedNum = null;
  schilderungen = [];
  schildCounter = 0;
  schildCurrentIdx = null;
  massnahmenData = { unfallmitteilungen: false, bescheinigungen: [], bescheinigungenUhrzeit: '', bescheinigungenNwKennung: '' };
  psychkgData = { personRolle: '', anlass: '', arztGender: 'm', arztName: '', transport: '', begleitung: null };
  haftbefehlData = { personRolle: 'betroffm', hbForm: 'Strafbefehl', gericht: 'Amtsgerichts Gütersloh', hbDatum: '', hbAz: '', rkSeit: '', tagessaetze: '', tagessatzBetrag: '', ersatzTage: '', useEventTime: true, kontrolleUhrzeit: '', zielort: 'ZPG Gütersloh' };
  addStreifenwagen();
  // Show library screen again
  var startEl = document.getElementById('screen-start');
  startEl.style.display = '';
  startEl.classList.remove('dismissed');
  renderLibrary();
  // Reset slide states
  document.getElementById('slide-result').classList.remove('active');
  document.querySelectorAll('.slide').forEach(function (s) { s.classList.remove('active', 'exit-left'); });
  document.getElementById('progress').style.width = '0%';
  document.getElementById('stepCounter').textContent = '';
  document.getElementById('dots').innerHTML = '';
  document.getElementById('btnBack').disabled = true;
}

// ── Enter-Taste ─────────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    e.target.blur();
  }
});
