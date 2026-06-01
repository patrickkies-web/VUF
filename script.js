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

var SLIDES_BASE = ['slide-0', 'slide-1', 'slide-2', 'slide-3', 'slide-uo-typ'];
var SLIDES_STRASSE = ['slide-uo-s1', 'slide-uo-s2', 'slide-uo-s3', 'slide-uo-s4', 'slide-uo-s5', 'slide-uo-spuren', 'slide-uo-fahrzeug'];
var SLIDES_PARKPLATZ = ['slide-uo-p1', 'slide-uo-p2', 'slide-uo-spuren', 'slide-uo-fahrzeug'];

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
document.getElementById('btnUoS5').onclick = nextSlide;
document.getElementById('btnUoP1').onclick = nextSlide;
document.getElementById('btnUoP2').onclick = nextSlide;
document.getElementById('btnUoSpuren').onclick = nextSlide;
document.getElementById('btnAddFahrzeug').onclick = addFahrzeugSpur;
document.getElementById('btnGenerateFahrzeug').onclick = generateResult;
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

function addFahrzeugSpur() {
  fzCounter++;
  fahrzeugSpuren.push({ id: fzCounter, zugehoerigkeit: '', teil: '', verlauf: '', anstoesshoehe: '', farbe: '', wert: '' });
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
    card.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px;';

    function mkRow(lbl, inp) {
      var g = document.createElement('div');
      g.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      var l = document.createElement('div');
      l.className = 'input-label';
      l.textContent = lbl;
      g.appendChild(l); g.appendChild(inp);
      return g;
    }

    // Header
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    var ttl = document.createElement('div');
    ttl.className = 'input-label';
    ttl.textContent = 'Fahrzeug ' + (idx + 1);
    var rb = document.createElement('button');
    rb.className = 'btn-remove';
    rb.type = 'button';
    rb.innerHTML = '&times;';
    (function (id) { rb.onclick = function () { removeFahrzeugSpur(id); }; })(fz.id);
    hdr.appendChild(ttl); hdr.appendChild(rb);
    card.appendChild(hdr);

    // Zugehörigkeit
    var zuInput = document.createElement('input');
    zuInput.type = 'text'; zuInput.className = 'field-input';
    zuInput.placeholder = 'z.B. des Geschädigten'; zuInput.value = fz.zugehoerigkeit;
    zuInput.oninput = function () { fz.zugehoerigkeit = this.value; };
    card.appendChild(mkRow('Fahrzeug-Zugehörigkeit', zuInput));

    // Fahrzeugteil
    var teilInput = document.createElement('input');
    teilInput.type = 'text'; teilInput.className = 'field-input';
    teilInput.placeholder = 'z.B. linke hintere Stoßstange'; teilInput.value = fz.teil;
    teilInput.oninput = function () { fz.teil = this.value; };
    card.appendChild(mkRow('Fahrzeugteil (Wo)', teilInput));

    // Verlauf chips
    var verlaufOpts = [
      { v: 'horizontal', label: 'horizontal' },
      { v: 'diagonal', label: 'diagonal' },
      { v: 'horizontal-diagonal', label: 'horiz. + diag.' },
      { v: 'vertikal', label: 'vertikal' }
    ];
    var verlaufSugg = document.createElement('div');
    verlaufSugg.className = 'suggestions';
    verlaufOpts.forEach(function (o) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-suggestion' + (fz.verlauf === o.v ? ' active' : '');
      btn.textContent = o.label;
      btn.onclick = function () {
        fz.verlauf = o.v;
        verlaufSugg.querySelectorAll('.btn-suggestion').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      };
      verlaufSugg.appendChild(btn);
    });
    var verlaufG = document.createElement('div');
    verlaufG.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    var verlaufL = document.createElement('div');
    verlaufL.className = 'input-label';
    verlaufL.textContent = 'Verlauf der Beschädigung';
    verlaufG.appendChild(verlaufL); verlaufG.appendChild(verlaufSugg);
    card.appendChild(verlaufG);

    // Anstoßhöhe + Farbe (grid)
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:110px 1fr;gap:10px;';
    var ansInput = document.createElement('input');
    ansInput.type = 'number'; ansInput.className = 'field-input';
    ansInput.placeholder = 'cm'; ansInput.value = fz.anstoesshoehe;
    ansInput.oninput = function () { fz.anstoesshoehe = this.value; };
    var farbeInput = document.createElement('input');
    farbeInput.type = 'text'; farbeInput.className = 'field-input';
    farbeInput.placeholder = 'z.B. weißer'; farbeInput.value = fz.farbe;
    farbeInput.oninput = function () { fz.farbe = this.value; };
    grid.appendChild(mkRow('Anstoßhöhe (cm)', ansInput));
    grid.appendChild(mkRow('Farbe Lackaufrieb', farbeInput));
    card.appendChild(grid);

    // Schadenshöhe
    var wertInput = document.createElement('input');
    wertInput.type = 'number'; wertInput.className = 'field-input';
    wertInput.placeholder = 'z.B. 500'; wertInput.value = fz.wert;
    wertInput.oninput = function () { fz.wert = this.value; };
    card.appendChild(mkRow('Schadenshöhe ca. (€)', wertInput));

    list.appendChild(card);
  });
}

function generateFahrzeugText() {
  if (!fahrzeugSpuren.length) return '';
  var verlaufMap = {
    'horizontal': 'horizontaler',
    'diagonal': 'diagonaler',
    'horizontal-diagonal': 'horizontaler diagonaler',
    'vertikal': 'vertikaler'
  };
  return fahrzeugSpuren.map(function (fz) {
    var zu = fz.zugehoerigkeit || '[Zugehörigkeit]';
    var teil = fz.teil || '[Fahrzeugteil]';
    var verlaufAdj = fz.verlauf ? (verlaufMap[fz.verlauf] || fz.verlauf) : '[Verlauf]';
    var hoehe = fz.anstoesshoehe ? fz.anstoesshoehe + ' cm' : '[Höhe] cm';

    var lines = [];
    lines.push('Am Fahrzeug ' + zu + ' zeigten sich folgende unfallbedingte Beschädigungen/Spuren an folgenden Fahrzeugteilen:');
    lines.push('    - ' + teil + ': ' + verlaufAdj + ' Verlauf – Anstoßhöhe: ' + hoehe);
    if (fz.farbe) {
      lines.push('An dieser Stelle konnte ' + fz.farbe + ' Lackaufrieb festgestellt werden. Aus diesem Grund wurde hier der Lack abgetragen und in einer Pergamintüte gesichert (liegt dem Vorgang bei).');
      lines.push('Für ermittlungstaktische Zwecke wurde eine Spurensicherungsfolie auf der Stelle aufgetragen und im Anschluss gesichert (SPURFIX-Folie).');
    }
    lines.push('Aufgrund der festgestellten äußeren Beschädigungen können verdeckte Schäden, insbesondere an Trägerstrukturen, Befestigungspunkten, Verformungselementen nicht ausgeschlossen werden.');
    if (fz.wert) lines.push('Die Höhe der sichtbaren Beschädigungen liegt bei ca. ' + fz.wert + ' €.');
    lines.push('Es wurden Lichtbilder gefertigt, welche dem Vorgang digital beigefügt werden.');
    return lines.join('\n');
  }).join('\n\n');
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

  var text3 = generateFahrzeugText();
  document.getElementById('resultText3').textContent = text3;
  document.getElementById('section3Result').style.display = text3 ? '' : 'none';

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
  var text = document.getElementById('resultText').textContent;
  var text2El = document.getElementById('section2Result');
  if (text2El.style.display !== 'none') text += '\n\n' + document.getElementById('resultText2').textContent;
  var text3El = document.getElementById('section3Result');
  if (text3El.style.display !== 'none') text += '\n\n' + document.getElementById('resultText3').textContent;
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
  fahrzeugSpuren = [];
  fzCounter = 0;
  addBesatzung();
  addFahrzeugSpur();
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
