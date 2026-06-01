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
var fahrzeugSpuren = [];
var fzCounter = 0;

var KAROSSERIE_BEREICHE = [
  { label: 'Frontbereich', teile: ['Frontschürze links', 'Frontschürze Mitte', 'Frontschürze rechts', 'Motorhaube', 'Frontscheibe', 'Scheinwerfer links', 'Scheinwerfer rechts', 'Nebelscheinwerfer links', 'Nebelscheinwerfer rechts', 'Kotflügel vorne links', 'Kotflügel vorne rechts'] },
  { label: 'Linke Fahrzeugseite', teile: ['Außenspiegel links', 'Vordertür links', 'Hintertür links', 'Schweller links', 'A-Säule links', 'B-Säule links', 'C-Säule links', 'Radlauf vorne links', 'Radlauf hinten links', 'Felge vorne links', 'Felge hinten links', 'Seitenscheibe vorne links', 'Seitenscheibe hinten links', 'Kotflügel / Heckseitenblech links'] },
  { label: 'Rechte Fahrzeugseite', teile: ['Außenspiegel rechts', 'Vordertür rechts', 'Hintertür rechts', 'Schweller rechts', 'A-Säule rechts', 'B-Säule rechts', 'C-Säule rechts', 'Radlauf vorne rechts', 'Radlauf hinten rechts', 'Felge vorne rechts', 'Felge hinten rechts', 'Seitenscheibe vorne rechts', 'Seitenscheibe hinten rechts', 'Kotflügel / Heckseitenblech rechts'] },
  { label: 'Heckbereich', teile: ['Heckschürze / Stoßstange hinten', 'Heckklappe / Kofferraumdeckel', 'Heckscheibe', 'Rückleuchte links', 'Rückleuchte rechts'] },
  { label: 'Sonstiges', teile: ['Dach', 'Unterfahrschutz'] }
];

var SLIDES_BASE = ['slide-0', 'slide-1', 'slide-2', 'slide-3', 'slide-uo-typ'];
var SLIDES_STRASSE = ['slide-uo-s1', 'slide-uo-s1b', 'slide-uo-s2', 'slide-uo-s3', 'slide-uo-s4', 'slide-uo-s4b', 'slide-uo-s5', 'slide-uo-spuren', 'slide-uo-fahrzeug', 'slide-schilderungen'];
var SLIDES_PARKPLATZ = ['slide-uo-p1', 'slide-uo-p2', 'slide-uo-spuren', 'slide-uo-fahrzeug', 'slide-schilderungen'];

var ROLLEN_MAP = {
  zeuge:  { disp: 'der Zeuge',               er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  zeugin: { disp: 'die Zeugin',              er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  },
  ub02m:  { disp: 'der Unfallbeteiligte 02', er: 'Er',  erLow: 'er',  sein: 'sein', seiner: 'seiner' },
  ub02w:  { disp: 'die Unfallbeteiligte 02', er: 'Sie', erLow: 'sie', sein: 'ihr',  seiner: 'ihrer'  }
};

var schilderungen = [];
var schildCounter = 0;

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
document.getElementById('btnUoS1b').onclick = nextSlide;
document.getElementById('btnUoS2').onclick = nextSlide;
document.getElementById('btnUoS3').onclick = nextSlide;
document.getElementById('btnUoS4').onclick = nextSlide;
document.getElementById('btnUoS4b').onclick = nextSlide;
document.getElementById('btnUoS5').onclick = nextSlide;
document.getElementById('btnUoP1').onclick = nextSlide;
document.getElementById('btnUoP2').onclick = nextSlide;
document.getElementById('btnUoSpuren').onclick = nextSlide;
document.getElementById('btnAddFahrzeug').onclick = addFahrzeugSpur;
document.getElementById('btnGenerateFahrzeug').onclick = nextSlide;
document.getElementById('btnAddSchilderung').onclick = addSchilderung;
document.getElementById('btnGenerateSchilderungen').onclick = generateResult;
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
    var wrap = this.closest('.suggestions');
    if (wrap) wrap.classList.add('has-selection');
    updatePreview();
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

addBesatzung();
addFahrzeugSpur();
addSchilderung();
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
  if (slides[current] === 'slide-uo-s1') {
    updateUoAdresseChips();
    var ot = document.getElementById('uo-ortsteil');
    if (!ot.value && autoOrtsteil) ot.value = autoOrtsteil;
  }
  if (slides[current] === 'slide-uo-p1') updateAdresseVorschlaege();
  if (slides[current] === 'slide-uo-fahrzeug') renderFahrzeugSpuren();
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
    if (!GT_STREETS || q.length < 2) { closeDropdown(); return; }
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

// ── Fahrzeugspuren ──────────────────────────────────────────

function mkTeilDetail() {
  return { schadensart: [], schadensartFrei: '', verlauf: '', von: '', bis: '', lackanhaftungen: null, farbe: '', pergamintute: null, spurfix: null };
}

function addFahrzeugSpur() {
  fzCounter++;
  fahrzeugSpuren.push({
    id: fzCounter,
    zugehoerigkeit: '02',
    phase: 'picker',
    selectedTeile: [],
    detailStep: 0,
    teileDetails: {},
    aufgrundText: null,
    wert: '',
    lichtbilder: null
  });
  renderFahrzeugSpuren();
}

function removeFahrzeugSpur(id) {
  fahrzeugSpuren = fahrzeugSpuren.filter(function (f) { return f.id !== id; });
  renderFahrzeugSpuren();
}

function renderFahrzeugSpuren() {
  var list = document.getElementById('fahrzeugList');
  if (!list) return;
  list.innerHTML = '';

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
    ttl.textContent = 'Fahrzeug ' + (idx + 1);
    var rb = document.createElement('button');
    rb.className = 'btn-remove';
    rb.type = 'button';
    rb.innerHTML = '&times;';
    (function (id) { rb.onclick = function () { removeFahrzeugSpur(id); }; })(fz.id);
    hdr.appendChild(ttl); hdr.appendChild(rb);
    card.appendChild(hdr);

    // ── Zugehörigkeit ──
    card.appendChild(mkGroup('Zugehörigkeit', mkChipRow(
      [{ v: '01', label: '01' }, { v: '02', label: '02' }],
      fz.zugehoerigkeit,
      function (v) { fz.zugehoerigkeit = v; }
    )));

    if (fz.phase === 'picker') {
      // ──────── PICKER PHASE ────────
      var pickerWrap = document.createElement('div');
      pickerWrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

      var pickerLbl = document.createElement('div');
      pickerLbl.className = 'input-label';
      pickerLbl.textContent = 'Beschädigte Fahrzeugteile markieren';
      pickerWrap.appendChild(pickerLbl);

      KAROSSERIE_BEREICHE.forEach(function (bereich) {
        var catWrap = document.createElement('div');
        catWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
        var catLbl = document.createElement('div');
        catLbl.className = 'fz-category-label';
        catLbl.textContent = bereich.label;
        catWrap.appendChild(catLbl);
        var chips = document.createElement('div');
        chips.className = 'fz-part-chips';
        bereich.teile.forEach(function (teilName) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-part-chip' + (fz.selectedTeile.indexOf(teilName) !== -1 ? ' active' : '');
          btn.textContent = teilName;
          btn.onclick = (function (t) { return function () {
            var i = fz.selectedTeile.indexOf(t);
            if (i !== -1) {
              fz.selectedTeile.splice(i, 1);
              delete fz.teileDetails[t];
            } else {
              fz.selectedTeile.push(t);
              if (!fz.teileDetails[t]) fz.teileDetails[t] = mkTeilDetail();
            }
            renderFahrzeugSpuren();
          }; })(teilName);
          chips.appendChild(btn);
        });
        catWrap.appendChild(chips);
        pickerWrap.appendChild(catWrap);
      });

      var n = fz.selectedTeile.length;
      var detailBtn = document.createElement('button');
      detailBtn.type = 'button';
      detailBtn.className = 'btn-det-next';
      detailBtn.style.marginTop = '6px';
      if (n === 0) {
        detailBtn.textContent = 'Bitte Teile auswählen';
        detailBtn.disabled = true;
        detailBtn.style.opacity = '0.4';
        detailBtn.style.cursor = 'default';
      } else {
        detailBtn.textContent = 'Details erfassen (' + n + ' Teil' + (n !== 1 ? 'e' : '') + ') →';
        (function (fzRef) {
          detailBtn.onclick = function () { fzRef.phase = 'detail'; fzRef.detailStep = 0; renderFahrzeugSpuren(); };
        })(fz);
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
      (function (fzRef) { backPickerBtn.onclick = function () { fzRef.phase = 'picker'; renderFahrzeugSpuren(); }; })(fz);
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
    return (b.dienstgrad ? b.dienstgrad + ' ' : '') + b.name.trim();
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
    rolle: '',
    belehrender: '',
    gegenueber: '',
    modus: '',
    abstelltDatum: document.getElementById('datum').value || '',
    abstelltUhrzeit: '',
    abstelltOrt: getUnfallOrtVorfill(),
    rueckUhrzeit: '',
    zwischenzeit: null,
    zwischenzeitText: '',
    freitext: ''
  });
  renderSchilderungen();
}

function removeSchilderung(id) {
  schilderungen = schilderungen.filter(function (s) { return s.id !== id; });
  renderSchilderungen();
}

function renderSchilderungen() {
  var list = document.getElementById('schilderungList');
  if (!list) return;
  list.innerHTML = '';
  var officers = getBesatzungLabels();

  schilderungen.forEach(function (s, idx) {
    var card = document.createElement('div');
    card.style.cssText = 'border-left:3px solid var(--accent);padding:0 0 0 18px;display:flex;flex-direction:column;gap:20px;';

    function mkGroup(lbl, content) {
      var g = document.createElement('div');
      g.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      if (lbl) { var l = document.createElement('div'); l.className = 'input-label'; l.textContent = lbl; g.appendChild(l); }
      if (content) g.appendChild(content);
      return g;
    }

    function mkChips(opts, cur, onChange) {
      var wrap = document.createElement('div'); wrap.className = 'suggestions';
      opts.forEach(function (o) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-suggestion' + (cur === o.v ? ' active' : '');
        btn.textContent = o.label;
        btn.onclick = (function (v) { return function () { onChange(v); renderSchilderungen(); }; })(o.v);
        wrap.appendChild(btn);
      });
      return wrap;
    }

    function mkOfficerChips(cur, onChange) {
      var wrap = document.createElement('div'); wrap.className = 'suggestions';
      if (!officers.length) {
        var note = document.createElement('div');
        note.style.cssText = 'font-size:13px;color:var(--accent);background:rgba(29,78,216,.08);border:1px solid rgba(29,78,216,.25);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;';
        note.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> Bitte zuerst die Besatzung auf <strong>Folie 1</strong> eintragen.';
        wrap.appendChild(note);
      } else {
        officers.forEach(function (name) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-suggestion' + (cur === name ? ' active' : '');
          btn.textContent = name;
          btn.onclick = (function (n) { return function () { onChange(n); renderSchilderungen(); }; })(name);
          wrap.appendChild(btn);
        });
      }
      return wrap;
    }

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    var ttl = document.createElement('div');
    ttl.className = 'input-label'; ttl.style.cssText = 'font-weight:700;font-size:15px;margin:0;';
    ttl.textContent = 'Person ' + (idx + 1);
    var rb = document.createElement('button');
    rb.className = 'btn-remove'; rb.type = 'button'; rb.innerHTML = '&times;';
    (function (sid) { rb.onclick = function () { removeSchilderung(sid); }; })(s.id);
    hdr.appendChild(ttl); hdr.appendChild(rb);
    card.appendChild(hdr);

    // Rolle
    card.appendChild(mkGroup('Rolle', mkChips(
      [{ v: 'zeuge', label: 'Zeuge' }, { v: 'zeugin', label: 'Zeugin' },
       { v: 'ub02m', label: 'Unfallbeteiligter 02' }, { v: 'ub02w', label: 'Unfallbeteiligte 02' }],
      s.rolle, function (v) { s.rolle = v; }
    )));

    if (s.rolle) {
      // Belehrender
      card.appendChild(mkGroup('Belehrung durchgeführt durch', mkOfficerChips(
        s.belehrender,
        function (n) { s.belehrender = n; if (!s.gegenueber) s.gegenueber = n; }
      )));

      if (s.belehrender) {
        // Gegenüber
        card.appendChild(mkGroup('Äußerung gemacht gegenüber', mkOfficerChips(
          s.gegenueber, function (n) { s.gegenueber = n; }
        )));

        if (s.gegenueber) {
          // Modus
          card.appendChild(mkGroup('Art der Schilderung', mkChips(
            [{ v: 'vuf', label: 'Fahrzeug abgestellt & Schäden festgestellt (VUF-Standard)' },
             { v: 'frei', label: 'Freie Schilderung' }],
            s.modus, function (v) { s.modus = v; }
          )));

          if (s.modus === 'vuf') {
            // Date + Abstelluhrzeit row
            var dateRow = document.createElement('div');
            dateRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';
            function mkInpGroup(lbl, type, val, onChange) {
              var g = document.createElement('div');
              g.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
              var l = document.createElement('div'); l.className = 'input-label'; l.textContent = lbl;
              var inp = document.createElement('input');
              inp.type = type; inp.className = 'field-input'; inp.value = val;
              inp.oninput = function () { onChange(this.value); };
              g.appendChild(l); g.appendChild(inp);
              return g;
            }
            dateRow.appendChild(mkInpGroup('Datum Abstellung', 'date', s.abstelltDatum, function (v) { s.abstelltDatum = v; }));
            dateRow.appendChild(mkInpGroup('Uhrzeit Abstellung', 'time', s.abstelltUhrzeit, function (v) { s.abstelltUhrzeit = v; }));
            card.appendChild(dateRow);

            var ortInp = document.createElement('input');
            ortInp.type = 'text'; ortInp.className = 'field-input';
            ortInp.placeholder = 'z.B. in der Berliner Straße 12';
            ortInp.value = s.abstelltOrt;
            ortInp.oninput = function () { s.abstelltOrt = this.value; };
            card.appendChild(mkGroup('Wo abgestellt', ortInp));

            var rueckInp = document.createElement('input');
            rueckInp.type = 'time'; rueckInp.className = 'field-input';
            rueckInp.style.maxWidth = '160px'; rueckInp.value = s.rueckUhrzeit;
            rueckInp.oninput = function () { s.rueckUhrzeit = this.value; };
            card.appendChild(mkGroup('Uhrzeit der Rückkehr', rueckInp));

            card.appendChild(mkGroup('Beobachtungen in der Zwischenzeit?', mkChips(
              [{ v: 'nein', label: 'Nein' }, { v: 'ja', label: 'Ja' }],
              s.zwischenzeit, function (v) { s.zwischenzeit = v; }
            )));

            if (s.zwischenzeit === 'ja') {
              var zwTa = document.createElement('textarea');
              zwTa.className = 'field-input field-textarea';
              zwTa.placeholder = 'Was hat die Person in der Zwischenzeit beobachtet?';
              zwTa.value = s.zwischenzeitText;
              zwTa.oninput = function () { s.zwischenzeitText = this.value; };
              card.appendChild(mkGroup('Beschreibung der Beobachtungen', zwTa));
            }

          } else if (s.modus === 'frei') {
            var freiTa = document.createElement('textarea');
            freiTa.className = 'field-input field-textarea';
            freiTa.style.minHeight = '120px';
            freiTa.placeholder = 'Schilderung sinngemäß eingeben …';
            freiTa.value = s.freitext;
            freiTa.oninput = function () { s.freitext = this.value; };
            card.appendChild(mkGroup('Schilderung / Äußerung', freiTa));
          }
        }
      }
    }

    list.appendChild(card);
  });

  // Scroll new content into view
  requestAnimationFrame(function () {
    var slide = document.getElementById('slide-schilderungen');
    if (slide) slide.scrollTop = slide.scrollHeight;
  });
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
    var intro = 'Nach erfolgter zeugenschaftlicher Belehrung durch ' + bel + ' gab ' + rm.disp + ' gegenüber ' + geg + ' sinngemäß folgendes an:';
    var body = '';
    if (s.modus === 'vuf') {
      var datum = formatDateDE(s.abstelltDatum) || '[Datum]';
      var uzeit = s.abstelltUhrzeit || '[Uhrzeit]';
      var ort   = s.abstelltOrt || '[Ort]';
      var rueck = s.rueckUhrzeit || '[Uhrzeit]';
      body = rm.er + ' habe ' + rm.sein + ' Fahrzeug am ' + datum + ' gegen ' + uzeit + ' Uhr ' + ort + ' abgestellt. Bei ' + rm.seiner + ' Rückkehr gegen ' + rueck + ' Uhr habe ' + rm.erLow + ' festgestellt, dass ' + rm.sein + ' Fahrzeug beschädigt worden war.';
      if (s.zwischenzeit === 'ja' && s.zwischenzeitText) {
        body += ' In der Zwischenzeit habe ' + rm.erLow + ' folgendes festgestellt: ' + s.zwischenzeitText;
      } else {
        body += ' Weitere Feststellungen in der Zwischenzeit habe ' + rm.erLow + ' nicht gemacht.';
      }
    } else if (s.modus === 'frei') {
      body = s.freitext || '[Keine Angaben]';
    }
    return intro + '\n\n' + body;
  }).filter(Boolean).join('\n\n');
}

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
  var text2 = generateAbschnitt2();
  var text3 = generateFahrzeugText();

  (function () {
    var doc = document.getElementById('reportDoc');
    doc.innerHTML = '';
    var delay = 0;
    function appendSection(num, title, text) {
      if (!text) return;
      if (doc.children.length > 0) {
        var sp = document.createElement('div');
        sp.className = 'report-spacer';
        doc.appendChild(sp);
      }
      var h = document.createElement('div');
      h.className = 'report-heading report-item-in';
      h.style.animationDelay = delay + 'ms';
      h.textContent = num + ' ' + title;
      doc.appendChild(h);
      delay += 80;
      var b = document.createElement('div');
      b.className = 'report-body report-item-in';
      b.style.animationDelay = delay + 'ms';
      b.textContent = text;
      doc.appendChild(b);
      delay += 160;
    }
    var text4 = generateSchilderungenText();
    appendSection('1', 'Allgemeines / Einsatzanlass', text1);
    appendSection('2', 'Unfallörtlichkeit', text2);
    appendSection('3', 'Spuren an den Fahrzeugen', text3);
    appendSection('4', 'Schilderungen', text4);

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
  })();
}

function spurenText() {
  if (document.getElementById('keineSpurenCheck').checked) return '';
  var v = document.getElementById('uo-spuren').value.trim();
  return v ? '\n\nAuf der Fahrbahn wurden folgende Spuren festgestellt: ' + v + '.' : '';
}

function generateAbschnitt2() {
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
    var tempo = document.getElementById('uo-tempo').value;
    var fahrstreifen = document.getElementById('uo-fahrstreifen').value;
    var trennung = getChipValue('trennung');
    var verkehr = getChipValue('verkehr');
    var beleuchtung = getChipValue('beleuchtung');
    var verlauf = getChipValue('verlauf');
    var fahrtrichtung = document.getElementById('uo-fahrtrichtung').value || '[Richtung]';
    var steigung = getChipValue('steigung');

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

    var lageText = (lage && lage !== 'none') ? lage + ' ' : '';
    var lageGelegen = lageText ? lageText + 'gelegene ' : '';
    var strassentypText = (strassentyp && strassentyp !== 'none') ? ' (' + strassentyp + ')' : '';
    var ortsteilText = ortsteil ? ' (Ortsteil: ' + ortsteil + ')' : '';
    var strasseAdresse = strasse + (uoHausnummer ? ' ' + uoHausnummer : '');

    var lines = [];
    lines.push('Bei der Unfallörtlichkeit handelt es sich um folgende ' + lageGelegen + 'Straße: ' +
      strasseAdresse + strassentypText + ', ' + plz + ' ' + stadt + ortsteilText + '.');

    if (woGenau) lines.push('Der Unfall ereignete sich ' + woGenau + '.');

    if (tempo) {
      var tempoGrundVal = getChipValue('tempo-grund');
      var tempoSatz = 'Die zulässige Höchstgeschwindigkeit auf diesem Abschnitt der Straße beträgt ' + tempo + ' km/h';
      if (tempoGrundVal && tempoGrundVal !== 'none') {
        tempoSatz += ', ' + (tempoGrundVal === 'vz274'
          ? 'vorgegeben durch das VZ. 274'
          : 'welche sich aus der Lage innerhalb geschlossener Ortschaft ergibt');
      }
      tempoSatz += '.';
      lines.push(tempoSatz);
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

    var wetter = getChipValue('wetter');
    var fahrbahn = getChipValue('fahrbahn');
    var sicht = getChipValue('sicht');

    var wetterMap = {
      'trocken': 'trockene Witterung',
      'regen': 'Regen',
      'schneefall': 'Schneefall',
      'nebel': 'Nebel',
      'frost-eis': 'Frost und Eisglätte'
    };
    var fahrbahnMap = {
      'trocken': 'trocken',
      'nass': 'nass',
      'feucht': 'feucht',
      'verschneit': 'mit Schnee bedeckt',
      'vereist': 'vereist'
    };
    var sichtMap = {
      'gut': 'guten',
      'eingeschraenkt': 'eingeschränkten',
      'schlecht': 'schlechten'
    };

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

    return lines.filter(Boolean).join('\n\n') + spurenText();
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
  schilderungen = [];
  schildCounter = 0;
  addBesatzung();
  addFahrzeugSpur();
  addSchilderung();
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
