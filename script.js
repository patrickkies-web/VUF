var DIENSTGRADE = ['PKin', 'PK', 'POKin', 'POK', 'PHKin', 'PHK', 'KAin', 'KA'];
var current = 0;
var besatzung = [];
var idCounter = 0;
var dragSrc = null;
var branch = null; // 'strasse' | 'parkplatz'
var selectedSections = [];
var touchData = { active: false, srcId: null, overItem: null };
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
      slides.push('slide-schilderungen-overview');
      return slides;
    }
  }
};

var LEITFAEDEN = {
  strasse:   { label: 'VUF Straße',   sections: ['allgemeines','oertlichkeit','verhaeltnisse','spuren','fahrzeug','schilderungen'] },
  parkplatz: { label: 'VUF Parkplatz', sections: ['allgemeines','oertlichkeit','spuren','fahrzeug','schilderungen'] }
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

var ROLLEN_MAP = {
  zeuge:  { disp: 'der Zeuge',               dativ: 'dem Zeugen',               btyp: 'zeuge', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  zeugin: { disp: 'die Zeugin',              dativ: 'der Zeugin',               btyp: 'zeuge', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  },
  ub01m:  { disp: 'der Unfallbeteiligte 01', dativ: 'dem Unfallbeteiligten 01', btyp: 'zeuge', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  ub01w:  { disp: 'die Unfallbeteiligte 01', dativ: 'der Unfallbeteiligten 01', btyp: 'zeuge', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  },
  ub02m:  { disp: 'der Unfallbeteiligte 02', dativ: 'dem Unfallbeteiligten 02', btyp: 'zeuge', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  ub02w:  { disp: 'die Unfallbeteiligte 02', dativ: 'der Unfallbeteiligten 02', btyp: 'zeuge', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  },
  beschm: { disp: 'der Beschuldigte',        dativ: 'dem Beschuldigten',        btyp: 'besch', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  beschw: { disp: 'die Beschuldigte',        dativ: 'der Beschuldigten',        btyp: 'besch', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  }
};

var schilderungen = [];
var schildCounter = 0;
var schildCurrentIdx = null;

function getActiveSlides() {
  var slides = [];
  var ORDER = ['allgemeines','oertlichkeit','verhaeltnisse','spuren','fahrzeug','schilderungen'];
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
    var fi = besatzung.findIndex(function (x) { return x.id === touchData.srcId; });
    var ti = besatzung.findIndex(function (x) { return x.id === parseInt(touchData.overItem.dataset.bid); });
    if (fi !== ti && fi !== -1 && ti !== -1) {
      var moved = besatzung.splice(fi, 1)[0];
      besatzung.splice(ti, 0, moved);
      renderBesatzung();
    }
  }
  touchData.active = false;
  touchData.srcId = null;
  touchData.overItem = null;
});

// Init
document.getElementById('datum').value = today;
document.getElementById('btnAdd').onclick = addBesatzung;
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
document.getElementById('btnErstelleBericht').onclick = generateResult;
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
  var ORDER = ['allgemeines','oertlichkeit','verhaeltnisse','spuren','fahrzeug','schilderungen'];
  ORDER.forEach(function(key) {
    var def = SECTION_DEFS[key];
    var isOn = selectedSections.indexOf(key) !== -1;

    // Compute dependency notes
    var depNote = '';
    if (key === 'schilderungen' && isOn && selectedSections.indexOf('allgemeines') === -1) {
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

addBesatzung();
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

function addBesatzung() {
  idCounter++;
  var id = idCounter;
  besatzung.push({ id: id, name: '', grad: 'POK' });
  renderBesatzung();
  setTimeout(function () {
    var inputs = document.querySelectorAll('.b-name');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }, 50);
}

function removeBesatzung(id) {
  besatzung = besatzung.filter(function (b) { return b.id !== id; });
  renderBesatzung();
}

function renderBesatzung() {
  var list = document.getElementById('besatzungList');
  list.innerHTML = '';
  var hint = document.getElementById('dragHint');
  if (hint) hint.style.display = besatzung.length >= 2 ? 'flex' : 'none';

  besatzung.forEach(function (b) {
    var item = document.createElement('div');
    item.className = 'besatzung-item';
    item.draggable = true;
    item.dataset.bid = b.id;

    var handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = '<span></span><span></span><span></span>';
    handle.addEventListener('touchstart', function (e) {
      touchData.active = true;
      touchData.srcId = b.id;
      touchData.overItem = null;
      item.classList.add('dragging');
      e.preventDefault();
    }, { passive: false });
    item.appendChild(handle);

    var fields = document.createElement('div');
    fields.className = 'besatzung-fields';

    var ni = document.createElement('input');
    ni.type = 'text';
    ni.className = 'field-input b-name';
    ni.placeholder = 'Nachname, Vorname';
    ni.value = b.name;
    ni.dataset.bid = b.id;
    ni.oninput = function () { b.name = this.value; };
    fields.appendChild(ni);

    var sel = document.createElement('select');
    sel.className = 'field-select';
    DIENSTGRADE.forEach(function (g) {
      var o = document.createElement('option');
      o.value = g;
      o.textContent = g;
      if (g === b.grad) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () { b.grad = this.value; };
    fields.appendChild(sel);
    item.appendChild(fields);

    var rb = document.createElement('button');
    rb.className = 'btn-remove';
    rb.innerHTML = '&times;';
    rb.title = 'Entfernen';
    (function (bid) { rb.onclick = function () { removeBesatzung(bid); }; })(b.id);
    item.appendChild(rb);

    item.addEventListener('dragstart', function (e) {
      dragSrc = item;
      setTimeout(function () { item.classList.add('dragging'); }, 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', function () {
      item.classList.remove('dragging');
      list.querySelectorAll('.besatzung-item').forEach(function (el) { el.classList.remove('drag-over'); });
    });
    item.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (item !== dragSrc) {
        list.querySelectorAll('.besatzung-item').forEach(function (el) { el.classList.remove('drag-over'); });
        item.classList.add('drag-over');
      }
    });
    item.addEventListener('drop', function (e) {
      e.preventDefault();
      if (dragSrc && dragSrc !== item) {
        var fi = besatzung.findIndex(function (x) { return x.id === parseInt(dragSrc.dataset.bid); });
        var ti = besatzung.findIndex(function (x) { return x.id === parseInt(item.dataset.bid); });
        var moved = besatzung.splice(fi, 1)[0];
        besatzung.splice(ti, 0, moved);
        renderBesatzung();
      }
    });

    list.appendChild(item);
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
  if (slides[current] === 'slide-schilderungen-overview') renderSchilderungenOverview();
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
  var besStr = besatzung.length
    ? besatzung.map(function (b) { return (b.name || '[Name]') + ', ' + b.grad; }).join(' / ')
    : '[Besatzung]';
  return 'Am ' + datumStr + ', um ' + uhrStr + ' Uhr, erhielt die Streifenwagenbesatzung ' +
    besStr + ' folgenden Einsatz: ' + (anlass || '…') + '.';
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
    var skipBtn = document.createElement('button');
    skipBtn.type = 'button'; skipBtn.className = 'btn-det-back'; skipBtn.style.marginTop = '14px';
    skipBtn.textContent = 'Zu den Schilderungen →';
    skipBtn.onclick = function () { fzCurrentIdx = null; jumpToSlide('slide-schilderungen'); };
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
  besatzung.forEach(function (b) { if (b.name) frags.push(b.name); });
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
  return besatzung.filter(function (b) { return b.name && b.name.trim(); }).map(function (b) {
    return (b.grad ? b.grad + ' ' : '') + b.name.trim();
  });
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
    btmStoffgruppen: [],
    verletzungText: '',
    verletzungRtw: null,
    modus: '',
    abstelltDatum: document.getElementById('datum').value || '',
    abstelltUhrzeit: '',
    abstelltOrt: getUnfallOrtVorfill(),
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

function generateSchilderungenText() {
  if (!schilderungen.length) return '';
  return schilderungen.map(function (s) {
    var rm = ROLLEN_MAP[s.rolle];
    if (!rm) return '';
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
      var methLow = s.btmTestMethode === 'speichel' ? 'Speichel' : 'Urin';
      var intro2 = dispCap + ' erklärte sich mit der Durchführung eines freiwilligen Drogenvortests mittels ' + meth + ' einverstanden.';
      if (s.btmTestErgebnis === 'positiv' && s.btmStoffgruppen && s.btmStoffgruppen.length) {
        parts.push(intro2 + ' Der Test reagierte positiv auf folgende Stoffgruppen: ' + s.btmStoffgruppen.join(', ') + '.');
      } else if (s.btmTestErgebnis === 'positiv') {
        parts.push(intro2 + ' Der Test reagierte positiv.');
      } else if (s.btmTestErgebnis === 'negativ') {
        parts.push(intro2 + ' Der Test verlief negativ.');
      } else {
        parts.push(intro2);
      }
    } else if (s.btmTestDurchgefuehrt === 'abgelehnt') {
      parts.push(dispCap + ' lehnte die Durchführung eines freiwilligen Drogenvortests ab.');
    }

    var intro = 'Nach erfolgter ' + belTyp + ' durch ' + bel + ' machte ' + rm.disp + ' gegenüber ' + geg + ' sinngemäß folgende Angaben:';
    var body = '';
    if (s.modus === 'vuf') {
      var datum = formatDateDE(s.abstelltDatum) || '[Datum]';
      var uzeit = s.abstelltUhrzeit || '[Uhrzeit]';
      var ort   = s.abstelltOrt || '[Ort]';
      var rueck = s.rueckUhrzeit || '[Uhrzeit]';
      body = rm.er + ' habe ' + rm.sein + ' Fahrzeug am ' + datum + ' gegen ' + uzeit + ' Uhr ' + ort + ' abgestellt. Bei ' + rm.seiner + ' Rückkehr gegen ' + rueck + ' Uhr habe ' + rm.erLow + ' ' + rm.sein + ' Fahrzeug beschädigt vorgefunden.\n' + dispCap + ' geht davon aus, dass es in diesem Zeitraum zu einem Verkehrsunfall gekommen ist, bei welchem ' + rm.sein + ' Fahrzeug beschädigt wurde.';
      if (s.zwischenzeit === 'ja' && s.zwischenzeitText) {
        body += ' In der Zwischenzeit habe ' + rm.erLow + ' folgendes festgestellt: ' + s.zwischenzeitText;
      } else {
        body += ' Weitere Feststellungen in der Zwischenzeit habe ' + rm.erLow + ' nicht gemacht.';
      }
    } else if (s.modus === 'frei') {
      body = s.freitext || '[Keine Angaben]';
    }
    parts.push(intro + '\n\n' + body);
    return parts.join('\n\n');
  }).filter(Boolean).join('\n\n');
}

function generateResult() {
  var doc = document.getElementById('reportDoc');
  doc.innerHTML = '';
  var delay = 0;
  var sectionNum = 1;

  function appendSection(title, text) {
    if (!text || !text.trim()) return;
    if (doc.children.length > 0) {
      var sp = document.createElement('div');
      sp.className = 'report-spacer';
      doc.appendChild(sp);
    }
    var h = document.createElement('div');
    h.className = 'report-heading report-item-in';
    h.style.animationDelay = delay + 'ms';
    h.textContent = sectionNum + ' ' + title;
    doc.appendChild(h);
    delay += 80;
    var b = document.createElement('div');
    b.className = 'report-body report-item-in';
    b.style.animationDelay = delay + 'ms';
    b.textContent = text;
    doc.appendChild(b);
    delay += 160;
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
    schilderungen: function() { return generateSchilderungenText(); }
  };

  var titles = {
    allgemeines:   'Allgemeines / Einsatzanlass',
    oertlichkeit:  'Unfallörtlichkeit',
    verhaeltnisse: 'Verkehrsverhältnisse',
    spuren:        'Spuren auf der Fahrbahn',
    fahrzeug:      'Spuren an den Fahrzeugen',
    schilderungen: 'Schilderungen'
  };

  selectedSections.forEach(function(key) {
    if (generators[key]) appendSection(titles[key], generators[key]());
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
    if (tempoGrundVal && tempoGrundVal !== 'none') {
      tempoSatz += ', ' + (tempoGrundVal === 'vz274' ? 'vorgegeben durch das VZ. 274' : 'welche sich aus der Lage innerhalb geschlossener Ortschaft ergibt');
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
  var parts = [];
  var headings = document.querySelectorAll('#reportDoc .report-heading');
  var bodies = document.querySelectorAll('#reportDoc .report-body');
  headings.forEach(function (h, i) {
    parts.push(h.textContent + '\n' + (bodies[i] ? bodies[i].textContent : ''));
  });
  var text = parts.join('\n\n');
  navigator.clipboard.writeText(text).catch(function () {
    var el = document.getElementById('reportDoc');
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    try { document.execCommand('copy'); } catch (e) { }
    sel.removeAllRanges();
  });
  var btn = document.getElementById('btnCopy');
  btn.classList.add('copied');
  btn.textContent = 'Kopiert!';
  setTimeout(function () {
    btn.classList.remove('copied');
    btn.textContent = 'Text kopieren';
  }, 2000);
}

// ── Reset ───────────────────────────────────────────────────

function resetAll() {
  besatzung = [];
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
  addBesatzung();
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
