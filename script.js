var DIENSTGRADE = ['PKin', 'PK', 'POKin', 'POK', 'PHKin', 'PHK', 'KAin', 'KA'];
var TOTAL = 4;
var current = 0;
var besatzung = [];
var idCounter = 0;
var dragSrc = null;
var touchData = { active: false, srcId: null, overItem: null };
var today = new Date().toISOString().split('T')[0];

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

document.getElementById('datum').value = today;
document.getElementById('btnAdd').onclick = addBesatzung;
document.getElementById('btnNext0').onclick = nextSlide;
document.getElementById('btnNext1').onclick = nextSlide;
document.getElementById('btnNext2').onclick = nextSlide;
document.getElementById('btnGenerate').onclick = generateResult;
document.getElementById('btnBack').onclick = prevSlide;
document.getElementById('btnCopy').onclick = copyText;
document.getElementById('btnReset').onclick = resetAll;
document.getElementById('btnLocate').onclick = ermittleStandort;
document.getElementById('einsatzanlass').oninput = updatePreview;
document.getElementById('nachtragenCheck').onchange = function () {
  document.getElementById('timeFields').classList.toggle('hidden', this.checked);
};

addBesatzung();
render();

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

function nextSlide() {
  if (current < TOTAL - 1) { current++; render(); }
}

function prevSlide() {
  if (current > 0) { current--; render(); }
}

function render() {
  var slides = [
    document.getElementById('slide-0'),
    document.getElementById('slide-1'),
    document.getElementById('slide-2'),
    document.getElementById('slide-3')
  ];
  slides.forEach(function (s, i) {
    s.classList.remove('active', 'exit-left');
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
  if (current === 3) updatePreview();
}

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

function updatePreview() {
  var ta = document.getElementById('einsatzanlass');
  var box = document.getElementById('previewText');
  if (ta && box) box.textContent = buildErsterSatz(ta.value);
}

function ermittleStandort() {
  var btn = document.getElementById('btnLocate');
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
        document.getElementById('strasse').value = (a.road || '') + nr;
        document.getElementById('plz').value = a.postcode || '';
        document.getElementById('stadt').value = a.city || a.town || a.village || a.municipality || '';
        btn.textContent = 'Standort ermittelt ✓';
        btn.disabled = false;
        setTimeout(function () {
          btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Standort ermitteln';
        }, 3000);
      })
      .catch(function () {
        btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Standort ermitteln';
        btn.disabled = false;
      });
  }, function () {
    btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Standort ermitteln';
    btn.disabled = false;
    alert('GPS-Zugriff wurde verweigert.');
  }, { timeout: 10000 });
}

function generateResult() {
  var strasse = document.getElementById('strasse').value || '[Strasse]';
  var plz = document.getElementById('plz').value || '[PLZ]';
  var stadt = document.getElementById('stadt').value || '[Ort]';
  var anlass = document.getElementById('einsatzanlass').value || '[Einsatzbeschreibung]';

  var text =
    buildErsterSatz(anlass) + '\n\n' +
    'Einsatzörtlichkeit: ' + strasse + ', ' + plz + ' ' + stadt + '.';

  document.getElementById('resultText').textContent = text;

  var allSlides = document.querySelectorAll('.slide');
  allSlides.forEach(function (s) { s.classList.remove('active', 'exit-left'); });
  ['slide-0', 'slide-1', 'slide-2', 'slide-3'].forEach(function (id) {
    document.getElementById(id).classList.add('exit-left');
  });
  document.getElementById('slide-result').classList.add('active');
  document.getElementById('progress').style.width = '100%';
  document.getElementById('stepCounter').textContent = 'Fertig';
  document.getElementById('btnBack').disabled = true;
  document.getElementById('dots').innerHTML = '';
}

function copyText() {
  var el = document.getElementById('resultText');
  var range = document.createRange();
  range.selectNodeContents(el);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  try { document.execCommand('copy'); } catch (e) { }
  sel.removeAllRanges();
  var btn = document.getElementById('btnCopy');
  btn.classList.add('copied');
  btn.textContent = 'Kopiert!';
  setTimeout(function () {
    btn.classList.remove('copied');
    btn.textContent = 'Text kopieren';
  }, 2000);
}

function resetAll() {
  besatzung = [];
  current = 0;
  document.getElementById('strasse').value = '';
  document.getElementById('plz').value = '';
  document.getElementById('stadt').value = '';
  document.getElementById('datum').value = today;
  document.getElementById('uhrzeit').value = '';
  document.getElementById('einsatzanlass').value = '';
  document.getElementById('nachtragenCheck').checked = false;
  document.getElementById('timeFields').classList.remove('hidden');
  addBesatzung();
  render();
  var allSlides = document.querySelectorAll('.slide');
  allSlides.forEach(function (s) { s.classList.remove('active', 'exit-left'); });
  document.getElementById('slide-0').classList.add('active');
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
    if (current === TOTAL - 1) generateResult();
    else nextSlide();
  }
});
