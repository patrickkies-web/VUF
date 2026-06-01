var DIENSTGRADE = ['PKin', 'PK', 'POKin', 'POK', 'PHKin', 'PHK', 'KAin', 'KA'];
var current = 0;
var besatzung = [];
var idCounter = 0;
var dragSrc = null;
var branch = null; // 'strasse' | 'parkplatz'
var touchData = { active: false, srcId: null, overItem: null };
var today = new Date().toISOString().split('T')[0];
var GT_STREETS = null; // { name: { plz, stadt, ortsteil } | null }
var autoOrtsteil = '';

var SLIDES_BASE = ['slide-0', 'slide-1', 'slide-2', 'slide-3', 'slide-uo-typ'];
var SLIDES_STRASSE = ['slide-uo-s1', 'slide-uo-s2', 'slide-uo-s3', 'slide-uo-s4', 'slide-uo-spuren'];
var SLIDES_PARKPLATZ = ['slide-uo-p1', 'slide-uo-p2', 'slide-uo-spuren'];

function getActiveSlides() {
  if (branch === 'strasse') return SLIDES_BASE.concat(SLIDES_STRASSE);
  if (branch === 'parkplatz') return SLIDES_BASE.concat(SLIDES_PARKPLATZ);
  return SLIDES_BASE;
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
document.getElementById('btnUoS2').onclick = nextSlide;
document.getElementById('btnUoS3').onclick = nextSlide;
document.getElementById('btnUoS4').onclick = nextSlide;
document.getElementById('btnUoP1').onclick = nextSlide;
document.getElementById('btnUoP2').onclick = nextSlide;
document.getElementById('btnGenerateSpuren').onclick = generateResult;
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
  updatePreview();
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
    updatePreview();
  });
});

// Generische Chip-Gruppen (data-group)
document.querySelectorAll('[data-group]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var group = this.dataset.group;
    document.querySelectorAll('[data-group="' + group + '"]').forEach(function (b) { b.classList.remove('active'); });
    this.classList.add('active');
    if (group === 'uo-typ') {
      branch = this.dataset.value;
      nextSlide();
    }
    if (group === 'tempo-grund') {
      document.getElementById('vzRow').style.display = this.dataset.value === 'vz274' ? '' : 'none';
    }
  });
});

addBesatzung();
render();
ladeGueterslohStrassen();

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
  if (current < slides.length - 1) { current++; render(); }
}

function prevSlide() {
  if (current > 0) { current--; render(); }
}

function render() {
  var slides = getActiveSlides();
  var TOTAL = slides.length;

  document.querySelectorAll('.slide:not(#slide-result)').forEach(function (s) {
    s.classList.remove('active', 'exit-left');
  });
  slides.forEach(function (id, i) {
    var s = document.getElementById(id);
    if (i === current) s.classList.add('active');
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

  if (slides[current] === 'slide-3') updatePreview();
  if (slides[current] === 'slide-uo-p1') updateAdresseVorschlaege();
  if (slides[current] === 'slide-uo-s2' && autoOrtsteil) {
    var f = document.getElementById('uo-ortsteil');
    if (!f.value) f.value = autoOrtsteil;
  }
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

function updateAdresseVorschlaege() {
  var dl = document.getElementById('adresse-vorschlaege');
  if (!dl) return;
  dl.innerHTML = '';
  var strasse = document.getElementById('strasse').value;
  var plz = document.getElementById('plz').value;
  var stadt = document.getElementById('stadt').value;
  var kombiniert = [strasse, plz, stadt].filter(Boolean).join(', ');
  if (strasse) { var o1 = document.createElement('option'); o1.value = strasse; dl.appendChild(o1); }
  if (kombiniert && kombiniert !== strasse) { var o2 = document.createElement('option'); o2.value = kombiniert; dl.appendChild(o2); }
}

function updatePreview() {
  var ta = document.getElementById('einsatzanlass');
  var box = document.getElementById('previewText');
  if (ta && box) box.textContent = buildErsterSatz(ta.value);
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
          document.getElementById('strasse').value = (a.road || '') + nr;
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

document.getElementById('strasse').addEventListener('input', function () {
  var q = this.value.trim();
  var dl = document.getElementById('strassen-vorschlaege');

  if (GT_STREETS && Object.prototype.hasOwnProperty.call(GT_STREETS, q)) {
    var hit = GT_STREETS[q];
    if (hit) fuelleAdressfelder(hit);
    else strasseDetailLaden(q);
    dl.innerHTML = '';
    return;
  }

  dl.innerHTML = '';
  if (!GT_STREETS || q.length < 2) return;

  var qLow = q.toLowerCase();
  Object.keys(GT_STREETS)
    .filter(function (n) {
      var low = n.toLowerCase();
      return low.startsWith(qLow) || low.indexOf(' ' + qLow) !== -1;
    })
    .sort()
    .slice(0, 12)
    .forEach(function (n) {
      var opt = document.createElement('option');
      opt.value = n;
      dl.appendChild(opt);
    });
});

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
      if (obj.ts && Date.now() - obj.ts < 7 * 24 * 3600 * 1000) {
        GT_STREETS = obj.data;
        return;
      }
    }
  } catch (e) {}

  var q = '[out:json][timeout:25];area[name="Gütersloh"]["admin_level"="8"]->.gt;way["highway"]["name"](area.gt);out tags;';
  fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var names = {};
      data.elements.forEach(function (el) {
        var name = el.tags && el.tags.name;
        if (name) names[name] = null;
      });
      GT_STREETS = names;
      try { localStorage.setItem('gt_streets_v2', JSON.stringify({ ts: Date.now(), data: names })); } catch (e) {}
    })
    .catch(function () { GT_STREETS = {}; });
}

// ── Chip-Wert lesen ─────────────────────────────────────────

function getChipValue(group) {
  var active = document.querySelector('[data-group="' + group + '"].active');
  return active ? active.dataset.value : null;
}

// ── Bericht generieren ──────────────────────────────────────

function generateResult() {
  var strasse = document.getElementById('strasse').value || '[Straße]';
  var hausnummer = document.getElementById('hausnummer').value;
  var strasseVoll = strasse + (hausnummer ? ' ' + hausnummer : '');
  var plz = document.getElementById('plz').value || '[PLZ]';
  var stadt = document.getElementById('stadt').value || '[Stadt]';
  var anlass = document.getElementById('einsatzanlass').value || '[Einsatzbeschreibung]';

  var text1 =
    buildErsterSatz(anlass) + '\n\n' +
    'Einsatzörtlichkeit: ' + strasseVoll + ', ' + plz + ' ' + stadt + '.';

  document.getElementById('resultText').textContent = text1;

  var text2 = generateAbschnitt2();
  document.getElementById('resultText2').textContent = text2;
  document.getElementById('section2Result').style.display = text2 ? '' : 'none';

  var slides = getActiveSlides();
  slides.forEach(function (id) {
    var s = document.getElementById(id);
    s.classList.remove('active');
    s.classList.add('exit-left');
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

function generateAbschnitt2() {
  if (!branch) return '';

  var strasse = document.getElementById('strasse').value || '[Straße]';
  var plz = document.getElementById('plz').value || '[PLZ]';
  var stadt = document.getElementById('stadt').value || '[Stadt]';

  if (branch === 'strasse') {
    var lage = getChipValue('lage') || '[innerorts/außerorts]';
    var strassentyp = getChipValue('strassentyp') || '[Straßentyp]';
    var ortsteil = document.getElementById('uo-ortsteil').value;
    var woGenau = document.getElementById('uo-wo-genau').value || '[Unfallstelle]';
    var tempo = document.getElementById('uo-tempo').value || '[Tempo]';
    var tempoGrund = getChipValue('tempo-grund');
    var vz274 = document.getElementById('uo-vz274').value || '[VZ]';
    var fahrstreifen = document.getElementById('uo-fahrstreifen').value || '[Anzahl]';
    var trennung = getChipValue('trennung');
    var verkehr = getChipValue('verkehr');
    var beleuchtung = getChipValue('beleuchtung');
    var verlauf = getChipValue('verlauf');
    var fahrtrichtung = document.getElementById('uo-fahrtrichtung').value || '[Richtung]';
    var steigung = getChipValue('steigung');

    var ortsteilText = ortsteil ? ' (Ortsteil: ' + ortsteil + ')' : '';

    var tempoGrundText = tempoGrund === 'vz274'
      ? 'vorgegeben durch das VZ. 274-' + vz274 + '.'
      : 'welche sich aus der Lage innerhalb geschlossener Ortschaft ergibt.';

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
      'gefaelle-gering': 'ein geringes Gefälle',
      'gefaelle-maessig': 'ein mäßiges Gefälle',
      'gefaelle-stark': 'ein starkes Gefälle',
      'steigung-gering': 'eine geringe Steigung',
      'steigung-maessig': 'eine mäßige Steigung',
      'steigung-stark': 'eine starke Steigung'
    };

    return 'Bei der Unfallörtlichkeit handelt es sich um die ' + lage + ' gelegene ' +
      strasse + ' (' + strassentyp + '), in ' + plz + ' ' + stadt + ortsteilText + '.\n\n' +
      'Der Unfall ereignete sich ' + woGenau + '.\n\n' +
      'Die zulässige Höchstgeschwindigkeit auf diesem Abschnitt der Straße beträgt ' + tempo +
      ' km/h, ' + tempoGrundText + '\n\n' +
      'Es bestehen ' + fahrstreifen + ' Fahrstreifen je Richtung. Die Richtungsfahrbahnen sind durch ' +
      (trennungMap[trennung] || '[Trennung]') + ' voneinander getrennt.\n\n' +
      'Zum Zeitpunkt der Unfallaufnahme herrschte ' + (verkehrMap[verkehr] || '[Verkehr]') + ' Verkehrsaufkommen.\n\n' +
      (beleuchtungMap[beleuchtung] || '[Beleuchtung]') + '\n\n' +
      'Der Streckenabschnitt verläuft auf Höhe der Unfallstelle ' +
      (verlaufMap[verlauf] || '[Verlauf]') + ' und weist in Fahrtrichtung ' + fahrtrichtung +
      ' ' + (steigungMap[steigung] || '[Steigung]') + ' auf.' +
      spurenText();
  }

  if (branch === 'parkplatz') {
    var pkAdresse = document.getElementById('pk-adresse').value || '[Adresse]';
    var pkZugehoerigkeit = document.getElementById('pk-zugehoerigkeit').value || '[Zugehörigkeit]';
    var pkPosition = document.getElementById('pk-position').value || '[Position]';

    return 'Bei der Unfallörtlichkeit handelt es sich um den ' + pkZugehoerigkeit +
      ', ' + pkAdresse + ', ' + plz + ' ' + stadt + '.\n\n' + pkPosition + spurenText();
  }

  return '';
}

// ── Kopieren ────────────────────────────────────────────────

function copyText() {
  var text = document.getElementById('resultText').textContent;
  var text2El = document.getElementById('section2Result');
  if (text2El.style.display !== 'none') {
    text += '\n\n' + document.getElementById('resultText2').textContent;
  }
  navigator.clipboard.writeText(text).catch(function () {
    var el = document.getElementById('resultText');
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
  ['uo-ortsteil', 'uo-wo-genau', 'uo-tempo', 'uo-vz274', 'uo-fahrstreifen', 'uo-fahrtrichtung',
    'pk-adresse', 'pk-zugehoerigkeit', 'pk-position'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('vzRow').style.display = 'none';
  document.getElementById('uo-spuren').value = '';
  document.getElementById('keineSpurenCheck').checked = false;
  document.getElementById('spurenFields').classList.remove('hidden');
  autoOrtsteil = '';
  document.getElementById('strassen-vorschlaege').innerHTML = '';
  document.querySelectorAll('[data-group]').forEach(function (b) { b.classList.remove('active'); });
  addBesatzung();
  render();
  document.querySelectorAll('.slide').forEach(function (s) { s.classList.remove('active', 'exit-left'); });
  document.getElementById('slide-0').classList.add('active');
}

// ── Enter-Taste ─────────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
    var slides = getActiveSlides();
    if (current === slides.length - 1) generateResult();
    else nextSlide();
  }
});
