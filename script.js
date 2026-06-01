var DIENSTGRADE = ['PKin', 'PK', 'POKin', 'POK', 'PHKin', 'PHK', 'KAin', 'KA'];
var TOTAL = 3;
var current = 0;
var besatzung = [];
var idCounter = 0;
var dragSrc = null;
var today = new Date().toISOString().split('T')[0];

document.getElementById('datum').value = today;
document.getElementById('btnAdd').onclick = addBesatzung;
document.getElementById('btnNext0').onclick = nextSlide;
document.getElementById('btnNext1').onclick = nextSlide;
document.getElementById('btnGenerate').onclick = generateResult;
document.getElementById('btnBack').onclick = prevSlide;
document.getElementById('btnCopy').onclick = copyText;
document.getElementById('btnReset').onclick = resetAll;
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

  besatzung.forEach(function (b) {
    var item = document.createElement('div');
    item.className = 'besatzung-item';
    item.draggable = true;
    item.dataset.bid = b.id;

    var handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = '<span></span><span></span><span></span>';
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
    document.getElementById('slide-2')
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
}

function generateResult() {
  var nachtr = document.getElementById('nachtragenCheck').checked;
  var datum = document.getElementById('datum').value;
  var uhrzeit = document.getElementById('uhrzeit').value;
  var strasse = document.getElementById('strasse').value || '[Strasse]';
  var plz = document.getElementById('plz').value || '[PLZ]';
  var stadt = document.getElementById('stadt').value || '[Ort]';

  var datumStr = '[DATUM]';
  if (datum) {
    var d = new Date(datum + 'T00:00:00');
    datumStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  var uhrStr = nachtr ? '[nachzutragen]' : (uhrzeit || '[UHR]');
  var besStr = besatzung.length
    ? besatzung.map(function (b) { return (b.name || '[Name]') + ', ' + b.grad; }).join(' / ')
    : '[Besatzung]';

  var text =
    'Am ' + datumStr + ', um ' + uhrStr + ' Uhr, erhielt die Streifenwagenbesatzung ' +
    besStr + ' folgenden Einsatz: [Einsatzbeschreibung].\n\n' +
    'Nach Angaben des Melders [ANGABEN].\n\n' +
    'Einsatzortlichkeit: ' + strasse + ', ' + plz + ' ' + stadt + '.\n\n' +
    'Die Streifenwagenbesatzung ' + besStr + ' wurde zur Einsatzortlichkeit entsandt.';

  document.getElementById('resultText').textContent = text;

  var allSlides = document.querySelectorAll('.slide');
  allSlides.forEach(function (s) { s.classList.remove('active', 'exit-left'); });
  document.getElementById('slide-0').classList.add('exit-left');
  document.getElementById('slide-1').classList.add('exit-left');
  document.getElementById('slide-2').classList.add('exit-left');
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
  document.getElementById('nachtragenCheck').checked = false;
  document.getElementById('timeFields').classList.remove('hidden');
  addBesatzung();
  render();
  var allSlides = document.querySelectorAll('.slide');
  allSlides.forEach(function (s) { s.classList.remove('active', 'exit-left'); });
  document.getElementById('slide-0').classList.add('active');
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
    if (current === TOTAL - 1) generateResult();
    else nextSlide();
  }
});
