/* APEX Speedometer: original, dependency-free HUD + BeamNG AngularJS adapter. */
(function (global) {
  'use strict';
  var KEY = 'apex.speedometer.v1';
  var DEFAULTS = {
    enabled: true, style: 'outline', size: 108, unitSize: 25, unitGap: 6, digitSpacing: -1, x: 50, y: 82,
    units: 'kmh', source: 'dynamic', color: '#ffffff', outlineColor: '#10131a',
    outline: 2, shadow: 55, opacity: 100, background: false, italic: true,
    unitPosition: 'side', adaptiveColor: true, midSpeed: 100, highSpeed: 200,
    midColor: '#ffd166', highColor: '#ff5b63', smoothing: 140,
    hideStopped: false, showPeak: false, showGear: false, showRpm: false,
    rpmMax: 8000, warning: false, warningSpeed: 130, locked: true
  };
  var ENUMS = {style: ['clean', 'outline', 'race', 'digital'], units: ['kmh', 'mph'],
    source: ['wheel', 'air', 'dynamic'], unitPosition: ['side', 'below', 'hidden']};
  var LIMITS = {size: [32, 220], unitSize: [10, 70], unitGap: [0, 32], digitSpacing: [-8, 8], x: [3, 97], y: [5, 95],
    outline: [0, 5], shadow: [0, 100], opacity: [15, 100], midSpeed: [1, 600],
    highSpeed: [2, 700], smoothing: [0, 500], rpmMax: [1000, 20000], warningSpeed: [1, 700]};
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function sanitize(input) {
    var result = Object.assign({}, DEFAULTS);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
    Object.keys(DEFAULTS).forEach(function (key) {
      var v = input[key];
      if (key === 'source' && v === 'ground') v = 'air';
      if (key === 'source' && v === 'auto') v = 'dynamic';
      if (ENUMS[key]) { if (ENUMS[key].indexOf(v) !== -1) result[key] = v; }
      else if (LIMITS[key]) { if (finite(v)) result[key] = clamp(v, LIMITS[key][0], LIMITS[key][1]); }
      else if (typeof DEFAULTS[key] === 'boolean') { if (typeof v === 'boolean') result[key] = v; }
      else if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) result[key] = v;
    });
    result.highSpeed = Math.max(result.midSpeed + 1, result.highSpeed);
    return result;
  }
  function convert(ms, units) { return Math.abs(finite(ms) ? ms : 0) * (units === 'mph' ? 2.2369362921 : 3.6); }
  function speedSample(data, source, now) {
    function fresh(key) { return finite(data[key]) && now - data[key + 'At'] < 1800; }
    var travel = fresh('ground') ? {speed: Math.abs(data.ground), source: 'ground'} :
      fresh('air') ? {speed: Math.abs(data.air), source: 'air'} : null;
    if (source === 'air' || source === 'ground') return travel;
    if (source === 'dynamic' || source === 'auto') {
      // Actual motion wins, even when the wheels are stationary, spinning, or airborne.
      if (travel) return travel;
      return fresh('wheel') ? {speed: Math.abs(data.wheel), source: 'wheel-fallback'} : null;
    }
    return fresh('wheel') ? {speed: Math.abs(data.wheel), source: 'wheel'} : null;
  }
  function selectedSpeed(data, source, now) {
    var sample = speedSample(data, source, now);
    return sample ? sample.speed : null;
  }
  function smooth(current, target, dt, milliseconds) {
    return milliseconds <= 0 ? target : current + (target - current) * (1 - Math.exp(-dt * 1000 / milliseconds));
  }
  function mix(a, b, t) {
    t = clamp(t, 0, 1);
    return '#' + [1, 3, 5].map(function (i) {
      return Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0');
    }).join('');
  }
  function speedColor(speed, s) {
    if (!s.adaptiveColor) return s.color;
    return speed <= s.midSpeed ? mix(s.color, s.midColor, speed / s.midSpeed) :
      mix(s.midColor, s.highColor, (speed - s.midSpeed) / (s.highSpeed - s.midSpeed));
  }
  var BUILTINS = {
    'Regjistrim i pastër': {style: 'clean', size: 96, outline: 0, shadow: 65, italic: false, adaptiveColor: false},
    'Kontur klasik': {style: 'outline', size: 108, outline: 2, italic: true, adaptiveColor: false},
    'Gara · e kuqe': {style: 'race', color: '#ffffff', highColor: '#ff4255', adaptiveColor: true, showGear: true, showRpm: true, size: 108},
    'Natë · blu': {style: 'digital', color: '#87dcff', adaptiveColor: false, background: true, italic: false, outline: 0},
    'Numra të mëdhenj': {style: 'outline', size: 164, unitSize: 36, y: 78}
  };
  var API = {defaults: DEFAULTS, sanitize: sanitize, convert: convert, selectedSpeed: selectedSpeed,
    speedSample: speedSample, smooth: smooth, speedColor: speedColor, presets: BUILTINS};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.ApexSpeedometer = API;
  API.mount = function (root, options) {
    options = options || {};
    var destroyed = false, frame, dragging = null, cleanups = [], pane = 'style', saveTimer;
    var storage = options.storage || global.localStorage;
    function read(key, fallback) { try { return JSON.parse(storage.getItem(key)) || fallback; } catch (_) { return fallback; } }
    var settings = sanitize(read(KEY, DEFAULTS));
    // Upgrade v0.1 preferences once: don't preserve the broken wheel-only default.
    if (read(KEY + '.revision', 0) < 2) {
      settings.source = 'dynamic'; settings.adaptiveColor = true;
      try { storage.setItem(KEY + '.revision', '2'); storage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
    }
    var custom = read(KEY + '.presets', {});
    if (!custom || typeof custom !== 'object' || Array.isArray(custom)) custom = {};
    var data = {wheel: null, air: null, ground: null, wheelAt: -Infinity, airAt: -Infinity, groundAt: -Infinity, rpm: 0, gear: 'N', telemetryAt: -Infinity};
    var displayed = 0, peakMs = 0, previous = performance.now(), demoMs = 147 / 3.6, lastToggleAt = -Infinity;
    root.innerHTML = '<div class="as-hud" role="group" aria-label="Shpejtësimatësi" tabindex="0">' +
      '<div class="as-rpm" aria-hidden="true"><i></i></div><div class="as-reading"><span class="as-gear"></span>' +
      '<span class="as-number">—</span><span class="as-unit">KM/H</span></div>' +
      '<div class="as-meta"></div><div class="as-edit-hint">ZHVENDOSE NË EKRAN · CTRL+H PËR CILËSIMET</div></div>' +
      '<section class="as-panel" aria-label="Cilësimet e shpejtësisë" hidden>' +
      '<header class="as-header"><div class="as-brandmark">A</div><div><h1>APEX <span>SHPEJTËSIMATËSI</span></h1>' +
      '<p>Shpejtësia jote. Stili yt.</p></div><kbd class="as-shortcut">Ctrl + H</kbd><button class="as-close" title="Mbyll cilësimet" aria-label="Mbyll cilësimet">×</button></header>' +
      '<div class="as-status"><span></span>' + (options.demo ? 'PARAPAMJE E SIMULUAR · JO TË DHËNA NGA LOJA' : 'BEAMNG HUD · 0.2.0 / VERSION PROVUES') + '</div>' +
      '<div class="as-source-status" aria-live="polite"></div><nav class="as-nav" aria-label="Kategoritë e cilësimeve"></nav><div class="as-content"></div>' +
      '<footer class="as-footer"><span class="as-save-state">U ruajt në këtë pajisje</span><button class="as-done">Mbyll ↗</button></footer></section>';
    var hud = root.querySelector('.as-hud'), panel = root.querySelector('.as-panel');
    var content = root.querySelector('.as-content'), number = root.querySelector('.as-number');
    var unit = root.querySelector('.as-unit'), meta = root.querySelector('.as-meta');
    var rpm = root.querySelector('.as-rpm'), gear = root.querySelector('.as-gear');
    function on(el, event, fn, opts) { el.addEventListener(event, fn, opts); cleanups.push(function () { el.removeEventListener(event, fn, opts); }); }
    function notify(message) { root.querySelector('.as-save-state').textContent = message; }
    function save() {
      clearTimeout(saveTimer);
      try { storage.setItem(KEY, JSON.stringify(settings)); notify('U ruajt në këtë pajisje'); }
      catch (_) { notify('Ruajtja nuk punon · ndryshimet janë të përkohshme'); }
    }
    function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 150); }
    function visible(open) { panel.hidden = !open; if (open) render(); else { dragging = null; hud.classList.remove('as-dragging'); apply(); } }
    function toggleSettings() {
      var now = performance.now();
      // The native binding and focused CEF may deliver the same press. Toggle once.
      if (now - lastToggleAt < 180) return;
      lastToggleAt = now; visible(panel.hidden);
    }
    function paint(speed) {
      var value = speedColor(speed, settings);
      hud.style.setProperty('--as-color', value);
      [number, unit, gear].forEach(function (el) {
        el.style.setProperty('color', value, 'important');
        el.style.setProperty('-webkit-text-fill-color', value, 'important');
      });
    }
    function apply() {
      hud.hidden = !settings.enabled && panel.hidden;
      hud.className = 'as-hud as-style-' + settings.style + (settings.italic ? ' as-italic' : '') +
        (settings.background ? ' as-backed' : '') + (!settings.locked && !panel.hidden ? ' as-editing' : '');
      hud.style.setProperty('--as-size', settings.size + 'px');
      hud.style.setProperty('--as-unit-size', settings.unitSize + 'px');
      hud.style.setProperty('--as-unit-gap', settings.unitGap + 'px');
      hud.style.setProperty('--as-digit-spacing', settings.digitSpacing + 'px');
      hud.style.setProperty('--as-outline', settings.outline + 'px');
      hud.style.setProperty('--as-outline-color', settings.outlineColor);
      hud.style.setProperty('--as-shadow', settings.shadow / 100);
      hud.style.setProperty('--as-opacity', settings.opacity / 100);
      hud.style.left = settings.x + '%'; hud.style.top = settings.y + '%';
      hud.dataset.unitPosition = settings.unitPosition;
      unit.textContent = settings.units === 'mph' ? 'mph' : 'km/h';
      rpm.hidden = !settings.showRpm; gear.hidden = !settings.showGear;
      paint(displayed); fit();
    }
    function fit() {
      // Keep the whole HUD visible, even at large font sizes or after a resolution change.
      hud.style.marginLeft = '0px'; hud.style.marginTop = '0px';
      hud.style.setProperty('--as-fit', '1');
      var rect = root.getBoundingClientRect(), h = hud.getBoundingClientRect();
      var scale = Math.min(1, Math.max(0.1, (rect.width - 24) / Math.max(h.width, 1)), Math.max(0.1, (rect.height - 24) / Math.max(h.height, 1)));
      hud.style.setProperty('--as-fit', scale);
      h = hud.getBoundingClientRect();
      var dx = h.left < rect.left + 12 ? rect.left + 12 - h.left : h.right > rect.right - 12 ? rect.right - 12 - h.right : 0;
      var dy = h.top < rect.top + 12 ? rect.top + 12 - h.top : h.bottom > rect.bottom - 12 ? rect.bottom - 12 - h.bottom : 0;
      hud.style.marginLeft = dx + 'px'; hud.style.marginTop = dy + 'px';
    }
    function heading(kicker, title, description) {
      return '<div class="as-section-head"><small>' + kicker + '</small><h2>' + title + '</h2><p>' + description + '</p></div>';
    }
    function row(label, control, help) { return '<label class="as-row"><span><b>' + label + '</b>' + (help ? '<small>' + help + '</small>' : '') + '</span>' + control + '</label>'; }
    function range(key, label, min, max, suffix) {
      return '<label class="as-range"><span>' + label + '<output data-output="' + key + '">' + settings[key] + (suffix || '') + '</output></span>' +
        '<input aria-label="' + label + '" data-key="' + key + '" data-suffix="' + (suffix || '') + '" type="range" min="' + min + '" max="' + max + '" value="' + settings[key] + '"></label>';
    }
    function toggle(key, label, help) { return row(label, '<input class="as-switch" data-key="' + key + '" type="checkbox"' + (settings[key] ? ' checked' : '') + '>', help); }
    function select(key, label, choices, help) {
      return row(label, '<select data-key="' + key + '" aria-label="' + label + '">' + choices.map(function (c) {
        return '<option value="' + c[0] + '"' + (settings[key] === c[0] ? ' selected' : '') + '>' + c[1] + '</option>';
      }).join('') + '</select>', help);
    }
    function color(key, label) {
      return row(label, '<span class="as-color-controls"><input type="color" data-key="' + key + '" value="' + settings[key] + '" aria-label="' + label + '">' +
        '<input type="text" class="as-hex" data-key="' + key + '" value="' + settings[key] + '" maxlength="7" spellcheck="false" aria-label="' + label + ' HEX"></span>');
    }
    function render() {
      root.querySelector('.as-nav').innerHTML = ['style', 'layout', 'color', 'behavior', 'presets'].map(function (id) {
        return '<button data-tab="' + id + '" class="' + (pane === id ? 'active' : '') + '" aria-pressed="' + (pane === id) + '">' + ({style:'Pamja', layout:'Pozicioni', color:'Ngjyrat', behavior:'Vozitja', presets:'Stilet'})[id] + '</button>';
      }).join('');
      var html = '';
      if (pane === 'style') {
        html = heading('01 / PAMJA', 'Numra të pastër. Stili yt.', 'Pa sahata. Pa rrëmujë. Vetëm shpejtësia.');
        html += '<div class="as-styles">' + ENUMS.style.map(function (name) {
          return '<button data-style="' + name + '" aria-pressed="' + (settings.style === name) + '" class="as-style-card ' + (settings.style === name ? 'active' : '') + '"><span class="as-sample-' + name + '">147<small> KM/H</small></span><b>' + ({clean:'I pastër',outline:'Kontur',race:'Gara',digital:'Digjital'})[name] + '</b></button>';
        }).join('') + '</div>';
        html += range('size', 'Madhësia e numrit', 32, 220, ' px') + range('unitSize', 'Madhësia e njësisë', 10, 70, ' px');
        html += range('unitGap', 'Hapësira numër – njësi', 0, 32, ' px') + range('digitSpacing', 'Hapësira mes shifrave', -8, 8, ' px');
        html += select('units', 'Njësia e shpejtësisë', [['kmh', 'km/h'], ['mph', 'mph']]);
        html += select('unitPosition', 'Pozicioni i njësisë', [['side', 'Pranë numrit'], ['below', 'Poshtë numrit'], ['hidden', 'E fshehur']]);
        html += toggle('italic', 'Numra të pjerrët', 'Pamje më sportive, pa ndryshuar madhësinë.');
        html += toggle('showGear', 'Shfaq marshin', 'Tregues i vogël pranë numrit.');
        html += toggle('showRpm', 'Shiriti i rrotullimeve', 'Shirit i hollë sipër numrit, sipas dëshirës.');
        html += range('rpmMax', 'Kufiri i rrotullimeve (manual)', 1000, 20000, ' rpm');
      } else if (pane === 'layout') {
        html = heading('02 / POZICIONI NË EKRAN', 'Vendose ku të pëlqen.', 'Zhbllokoje, pastaj zhvendose numrin me maus.');
        html += toggle('locked', 'Blloko pozicionin', 'Çaktivizoje për ta zhvendosur me panelin hapur.');
        html += range('x', 'Pozicioni horizontal', 3, 97, '%') + range('y', 'Pozicioni vertikal', 5, 95, '%');
        html += '<div class="as-button-row"><button data-action="top">Sipër</button><button data-action="center">Në mes</button><button data-action="bottom">Poshtë</button></div>';
        html += '<p class="as-note">Gjatë zhvendosjes kapet në qendër. Pozicioni ruhet në përqindje dhe mbetet brenda ekranit.</p>';
        html += range('opacity', 'Dukshmëria', 15, 100, '%') + toggle('background', 'Sfond i errët', 'Kontrast shtesë kur rruga është e ndriçuar.');
        html += '<button class="as-secondary" data-action="reset-layout">Rikthe pozicionin dhe madhësinë</button>';
      } else if (pane === 'color') {
        html = heading('03 / NGJYRAT DHE KONTRASTI', 'Ngjyra që vërehen.', 'Ngjyrë fikse ose kalim sipas shpejtësisë. Ndryshimet duken menjëherë.');
        html += '<div class="as-swatches" aria-label="Ngjyra të gatshme">' + ['#ffffff','#75ccff','#ff5b63','#ffd166','#b8ef73','#b999ff'].map(function (value) {
          return '<button data-paint="' + value + '" style="--swatch:' + value + '" aria-label="Zgjidh ngjyrën ' + value + '"></button>';
        }).join('') + '</div>';
        html += color('color', 'Ngjyra kryesore (fikse)') + color('outlineColor', 'Ngjyra e konturit');
        html += range('outline', 'Trashësia e konturit', 0, 5, ' px') + range('shadow', 'Intensiteti i hijes', 0, 100, '%');
        html += toggle('adaptiveColor', 'Ngjyra sipas shpejtësisë', 'Kalimi është gradual. Zgjedhja e ngjyrës kryesore aktivizon ngjyrën fikse.');
        html += range('midSpeed', 'Pragu i mesëm (njësia aktuale)', 1, 600, '') + color('midColor', 'Ngjyra e mesme');
        html += range('highSpeed', 'Pragu i lartë (njësia aktuale)', 2, 700, '') + color('highColor', 'Ngjyra e shpejtësisë së lartë');
      } else if (pane === 'behavior') {
        html = heading('04 / VOZITJA', 'Mat lëvizjen, jo vetëm gomat.', 'Dinamik dhe Air funksionojnë edhe me goma të bllokuara ose gjatë kërcimit.');
        html += toggle('enabled', 'Shfaq shpejtësinë', 'Me cilësimet hapur mbetet e dukshme për rregullim.');
        html += select('source', 'Burimi i shpejtësisë', [['dynamic', 'Dinamik (rekomandohet)'], ['air', 'Lëvizja reale (Air)'], ['wheel', 'Rrotullimi i gomave']], 'Dinamik: shpejtësia reale ka përparësi; gomat përdoren vetëm si rezervë e shënuar.');
        html += range('smoothing', 'Zbutja e numrit', 0, 500, ' ms');
        html += '<p class="as-note">0 ms = menjëherë. Air mat lëvizjen në botën e lojës, jo rrotullimin e gomave dhe jo erën.</p>';
        html += toggle('hideStopped', 'Fshehe kur ndalet', 'Fshihet gradualisht nën 1 km/h, përveç kur paneli është hapur.');
        html += toggle('showPeak', 'Shfaq shpejtësinë maksimale', 'Maksimumi llogaritet nga matjet, jo animacioni i numrit.');
        html += '<button class="as-secondary" data-action="reset-peak">Pastro maksimumin</button>';
        html += toggle('warning', 'Paralajmërimi i shpejtësisë', 'Vijë e kuqe kur kalon shpejtësinë e caktuar.');
        html += range('warningSpeed', 'Kufiri i paralajmërimit (njësia aktuale)', 1, 700, '');
        if (options.demo) html += rangeDemo();
      } else {
        html = heading('05 / STILET E RUAJTURA', 'Ruaje pamjen tënde.', 'Zgjidh një stil, ruaj tëndin ose eksportoje për më vonë.');
        html += '<div class="as-presets">' + Object.keys(BUILTINS).map(function (name, i) {
          return '<button data-builtin="' + i + '"><span>0' + (i + 1) + '</span>' + name + '<b>↗</b></button>';
        }).join('') + '</div><div class="as-custom-presets"></div>';
        html += '<div class="as-preset-save"><input class="as-preset-name" maxlength="40" placeholder="Emri i stilit të ri" aria-label="Emri i stilit"><button data-action="save-preset">Ruaj stilin</button></div>';
        html += '<div class="as-button-row"><button data-action="export">Eksporto JSON</button><button data-action="import">Importo JSON</button></div>';
        html += '<input class="as-file" type="file" accept=".json,application/json" hidden>';
        html += '<button class="as-danger" data-action="reset-all">Rikthe të gjitha cilësimet…</button>';
      }
      content.innerHTML = html;
      if (pane === 'presets') {
        var list = content.querySelector('.as-custom-presets');
        Object.keys(custom).slice(0, 30).forEach(function (name, index) {
          var item = document.createElement('div'); item.className = 'as-custom-row';
          var load = document.createElement('button'); load.textContent = name; load.dataset.custom = index;
          var del = document.createElement('button'); del.textContent = '×'; del.dataset.deletePreset = index;
          del.setAttribute('aria-label', 'Fshi ' + name); item.append(load, del); list.appendChild(item);
        });
      }
      apply();
    }
    function rangeDemo() { return '<label class="as-range"><span>Shpejtësia provuese (km/h)<output data-demo-output>' + Math.round(demoMs * 3.6) + '</output></span><input type="range" min="0" max="400" value="' + Math.round(demoMs * 3.6) + '" data-demo aria-label="Shpejtësia provuese"></label>'; }
    function change(e) {
      var el = e.target;
      if (el.matches('[data-demo]')) { demoMs = Number(el.value) / 3.6; content.querySelector('[data-demo-output]').textContent = el.value; return; }
      if (!el.dataset.key) return;
      if (el.classList.contains('as-hex')) {
        var valid = /^#[0-9a-f]{6}$/i.test(el.value);
        el.setAttribute('aria-invalid', String(!valid));
        if (!valid) return;
      }
      var key = el.dataset.key, next = Object.assign({}, settings);
      next[key] = el.type === 'checkbox' ? el.checked : LIMITS[key] ? Number(el.value) : el.value;
      settings = sanitize(next);
      if (['color', 'outlineColor', 'midColor', 'highColor'].indexOf(key) !== -1) {
        content.querySelectorAll('[data-key="' + key + '"]').forEach(function (control) { if (control !== el) control.value = settings[key]; });
      }
      if (key === 'color') {
        settings.adaptiveColor = false;
        var autoColor = content.querySelector('[data-key="adaptiveColor"]');
        if (autoColor) autoColor.checked = false;
      }
      var output = content.querySelector('[data-output="' + key + '"]');
      if (output) output.textContent = settings[key] + (el.dataset.suffix || '');
      if (key === 'midSpeed' || key === 'highSpeed') {
        var high = content.querySelector('[data-key="highSpeed"]');
        if (high) { high.value = settings.highSpeed; content.querySelector('[data-output="highSpeed"]').textContent = settings.highSpeed; }
      }
      apply(); scheduleSave();
    }
    function savePresets() { try { storage.setItem(KEY + '.presets', JSON.stringify(custom)); } catch (_) { notify('Stilet nuk mund të ruhen'); } }
    on(root, 'input', change);
    on(root, 'change', function (e) {
      if (e.target.dataset.key) change(e);
      if (!e.target.matches('.as-file') || !e.target.files[0]) return;
      var file = e.target.files[0];
      if (file.size > 65536) { notify('Importi u refuzua: maksimumi 64 KB'); return; }
      file.text().then(function (text) {
        if (destroyed) return;
        try {
          var parsed = JSON.parse(text);
          if (!parsed || parsed.schema !== 'apex-speedometer/v1' || !parsed.settings || typeof parsed.settings !== 'object' || Array.isArray(parsed.settings)) throw new Error('format');
          settings = sanitize(parsed.settings); save(); render(); notify('Stili u importua');
        } catch (_) { notify('Skedar JSON i pavlefshëm për APEX'); }
      }).catch(function () { if (!destroyed) notify('Skedari nuk mund të lexohet'); });
    });
    on(root, 'click', function (e) {
      var target = e.target.closest('button'); if (!target) return;
      if (target.matches('.as-close, .as-done')) { visible(false); apply(); return; }
      if (target.dataset.paint) {
        settings.color = target.dataset.paint; settings.adaptiveColor = false; save(); render(); return;
      }
      if (target.dataset.tab) { pane = target.dataset.tab; render(); return; }
      if (target.dataset.style) {
        settings.style = target.dataset.style;
        if (settings.style === 'clean' || settings.style === 'digital') { settings.outline = 0; settings.italic = false; }
        if (settings.style === 'race') { settings.italic = true; settings.adaptiveColor = true; }
        if (settings.style === 'outline' && settings.outline === 0) settings.outline = 2;
        save(); render(); return;
      }
      if (target.dataset.builtin !== undefined) {
        var base = Object.assign({}, DEFAULTS, BUILTINS[Object.keys(BUILTINS)[Number(target.dataset.builtin)]]);
        // A look doesn't unexpectedly move the HUD, change units or change speed source.
        settings = sanitize(Object.assign(base, {x: settings.x, y: settings.y, units: settings.units, source: settings.source, locked: settings.locked}));
        save(); render(); return;
      }
      if (target.dataset.custom !== undefined) { settings = sanitize(custom[Object.keys(custom)[Number(target.dataset.custom)]]); save(); render(); return; }
      if (target.dataset.deletePreset !== undefined) { delete custom[Object.keys(custom)[Number(target.dataset.deletePreset)]]; savePresets(); render(); return; }
      var action = target.dataset.action;
      if (['top', 'center', 'bottom'].indexOf(action) !== -1) { settings.x = 50; settings.y = action === 'top' ? 15 : action === 'center' ? 50 : 82; }
      if (action === 'reset-layout') ['x', 'y', 'size', 'unitSize', 'unitGap', 'digitSpacing'].forEach(function (k) { settings[k] = DEFAULTS[k]; });
      if (action === 'reset-peak') { peakMs = 0; notify('Maksimumi u pastrua'); return; }
      if (action === 'save-preset') {
        var name = content.querySelector('.as-preset-name').value.trim();
        if (!name) { notify('Shkruaj një emër për stilin'); return; }
        if (['__proto__', 'constructor', 'prototype'].indexOf(name) !== -1) { notify('Zgjidh një emër tjetër'); return; }
        if (Object.keys(custom).length >= 30 && !Object.prototype.hasOwnProperty.call(custom, name)) { notify('Lejohen deri në 30 stile'); return; }
        custom[name] = sanitize(settings); savePresets(); render(); return;
      }
      if (action === 'export') {
        var blob = new Blob([JSON.stringify({schema: 'apex-speedometer/v1', settings: settings}, null, 2)], {type: 'application/json'});
        var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'apex-speedometer-look.json'; a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000); notify('Eksporti u kërkua'); return;
      }
      if (action === 'import') { content.querySelector('.as-file').click(); return; }
      if (action === 'reset-all') {
        if (!global.confirm('Të rikthehen cilësimet? Stilet e ruajtura nuk fshihen.')) return;
        settings = sanitize(DEFAULTS); peakMs = 0;
      }
      if (action) { save(); render(); }
    });
    on(hud, 'contextmenu', function (e) { e.preventDefault(); visible(true); });
    on(hud, 'keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); visible(true); } });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { visible(false); apply(); }
      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.code === 'KeyH') {
        e.preventDefault();
        if (!e.repeat) toggleSettings();
      }
    });
    on(hud, 'pointerdown', function (e) {
      if (settings.locked || panel.hidden || e.button !== 0) return;
      e.preventDefault();
      dragging = {id: e.pointerId, x: e.clientX, y: e.clientY, left: settings.x, top: settings.y};
      hud.setPointerCapture(e.pointerId); hud.classList.add('as-dragging');
    });
    on(hud, 'pointermove', function (e) {
      if (!dragging || e.pointerId !== dragging.id) return;
      var rect = root.getBoundingClientRect();
      settings.x = clamp(dragging.left + (e.clientX - dragging.x) / rect.width * 100, 3, 97);
      settings.y = clamp(dragging.top + (e.clientY - dragging.y) / rect.height * 100, 5, 95);
      if (Math.abs(settings.x - 50) < 1.5) settings.x = 50;
      apply();
    });
    function endDrag() { if (!dragging) return; dragging = null; hud.classList.remove('as-dragging'); save(); if (pane === 'layout') render(); }
    on(hud, 'pointerup', endDrag); on(hud, 'pointercancel', endDrag); on(hud, 'lostpointercapture', endDrag);
    on(global, 'resize', fit);
    var observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (observer) observer.observe(root);
    function tick(now) {
      if (destroyed) return;
      var dt = Math.min((now - previous) / 1000, 0.1); previous = now;
      if (options.demo) {
        data.wheel = demoMs; data.air = demoMs; data.ground = demoMs; data.wheelAt = now; data.airAt = now; data.groundAt = now;
        data.rpm = demoMs > 0 ? 2400 + demoMs * 65 : 850; data.gear = demoMs > 0 ? String(Math.min(6, Math.max(1, Math.ceil(demoMs / 14)))) : 'N'; data.telemetryAt = now;
      }
      var sample = speedSample(data, settings.source, now);
      var ms = sample ? sample.speed : null, available = sample !== null;
      var speed = convert(ms, settings.units);
      displayed = smooth(displayed, speed, dt, settings.smoothing);
      if (available) peakMs = Math.max(peakMs, Math.abs(ms));
      var text = available ? String(Math.round(displayed)) : '—';
      if (number.textContent !== text) { number.textContent = text; fit(); }
      paint(displayed);
      hud.classList.toggle('as-stopped', settings.hideStopped && available && Math.abs(ms) * 3.6 < 1 && panel.hidden);
      hud.classList.toggle('as-warning', settings.warning && available && speed > settings.warningSpeed);
      var hasTelemetry = now - data.telemetryAt < 1800;
      gear.textContent = hasTelemetry ? data.gear : '—';
      rpm.firstElementChild.style.width = (hasTelemetry ? clamp(data.rpm / settings.rpmMax * 100, 0, 100) : 0) + '%';
      meta.textContent = !available ? 'NË PRITJE TË SHPEJTËSISË' :
        sample.source === 'wheel-fallback' ? 'REZERVË: GOMAT · PA TË DHËNA REALE' :
        settings.showPeak ? 'MAKS. ' + Math.round(convert(peakMs, settings.units)) + ' ' + unit.textContent : '';
      hud.dataset.speedSource = sample ? sample.source : 'missing';
      var status = root.querySelector('.as-source-status');
      var mode = {wheel:'GOMAT',air:'AIR',dynamic:'DINAMIK'}[settings.source];
      var sourceText = options.demo ? 'PARAPAMJE · SHPEJTËSI E SIMULUAR' : !sample ? 'NË PRITJE TË TË DHËNAVE' :
        sample.source === 'wheel-fallback' ? 'REZERVË: GOMAT · BURIMI REAL MUNGON' :
        sample.source === 'wheel' ? 'RROTULLIMI I GOMAVE' : 'LËVIZJE REALE · ' + (sample.source === 'ground' ? 'LUA' : 'STREAM AIR');
      if (status.textContent !== mode + ' / ' + sourceText) status.textContent = mode + ' / ' + sourceText;
      status.dataset.fallback = String(!!sample && sample.source === 'wheel-fallback');
      frame = requestAnimationFrame(tick);
    }
    function updateElectrics(electrics) {
      if (!electrics) return;
      var now = performance.now();
      var wheel = finite(electrics.wheelspeed) ? electrics.wheelspeed : electrics.wheelSpeed;
      var air = finite(electrics.airspeed) ? electrics.airspeed : electrics.airSpeed;
      if (finite(wheel)) { data.wheel = Math.abs(wheel); data.wheelAt = now; }
      if (finite(air)) { data.air = Math.abs(air); data.airAt = now; }
      data.rpm = finite(electrics.rpm) ? Math.max(0, electrics.rpm) : 0;
      var g = electrics.gear;
      if (typeof g === 'string' && g.length <= 3) data.gear = g;
      else if (finite(electrics.gearIndex)) data.gear = electrics.gearIndex < 0 ? 'R' : electrics.gearIndex === 0 ? 'N' : String(electrics.gearIndex);
      else data.gear = '—';
      data.telemetryAt = now;
    }
    function updateGround(payload) {
      if (!payload) return;
      if (payload.reset) {
        data.wheel = null; data.air = null; data.wheelAt = -Infinity; data.airAt = -Infinity; data.telemetryAt = -Infinity;
        displayed = 0; peakMs = 0;
      }
      if (payload.available && finite(payload.speed)) { data.ground = Math.max(0, payload.speed); data.groundAt = performance.now(); }
      else { data.ground = null; data.groundAt = -Infinity; }
    }
    visible(!!options.demo); apply(); frame = requestAnimationFrame(tick);
    return {
      updateElectrics: updateElectrics, updateGround: updateGround, toggleSettings: toggleSettings,
      destroy: function () {
        destroyed = true; cancelAnimationFrame(frame); clearTimeout(saveTimer); save();
        cleanups.forEach(function (fn) { fn(); }); if (observer) observer.disconnect(); root.innerHTML = '';
      }
    };
  };
  if (global.angular) {
    var activeInstances = 0;
    global.angular.module('beamng.apps').directive('apexSpeedometer', function () {
      return {restrict: 'EA', replace: true, templateUrl: '/ui/modules/apps/ApexSpeedometer/app.html',
        link: function (scope, element) {
          var css = document.getElementById('apex-speedometer-css');
          if (!css) {
            css = document.createElement('link'); css.id = 'apex-speedometer-css'; css.rel = 'stylesheet';
            document.head.appendChild(css);
          }
          // Reusing the UI layout must not keep a previous build's stylesheet alive.
          if (css.getAttribute('href') !== '/ui/modules/apps/ApexSpeedometer/app.css?v=0.2.0') {
            css.href = '/ui/modules/apps/ApexSpeedometer/app.css?v=0.2.0';
          }
          var app = API.mount(element[0]);
          StreamsManager.add(['electrics']);
          var offStreams = scope.$on('streamsUpdate', function (_, streams) { if (streams) app.updateElectrics(streams.electrics); });
          var offGround = scope.$on('apexSpeedometer.ground', function (_, payload) { app.updateGround(payload); });
          var offToggle = scope.$on('apexSpeedometer.toggleSettings', function () { app.toggleSettings(); });
          activeInstances += 1;
          if (activeInstances === 1) bngApi.engineLua("extensions.load('apexSpeedometer')");
          scope.$on('$destroy', function () {
            offStreams(); offGround(); offToggle(); StreamsManager.remove(['electrics']); app.destroy();
            activeInstances -= 1;
            if (activeInstances === 0) bngApi.engineLua("extensions.unload('apexSpeedometer')");
          });
        }
      };
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
