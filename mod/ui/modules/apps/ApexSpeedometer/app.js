/* APEX Speedometer: original, dependency-free HUD + BeamNG AngularJS adapter. */
(function (global) {
  'use strict';
  var KEY = 'apex.speedometer.v1';
  var DEFAULTS = {
    enabled: true, style: 'race', size: 88, unitSize: 21, unitGap: 4, digitSpacing: -1,
    numberWeight: 900, unitWeight: 700, unitItalic: true, unitSpacing: 0,
    x: 50, y: 82, units: 'kmh', source: 'dynamic', decimals: 0,
    color: '#ffffff', unitColor: '#ffffff', unitFollowsColor: true, outlineColor: '#11131b',
    outline: 1, shadow: 55, opacity: 100, background: false, italic: true,
    unitPosition: 'side', adaptiveColor: true, palette: 'spectrum', midSpeed: 50, highSpeed: 100,
    midColor: '#a855f7', highColor: '#ff303f', stop5: '#00e5ff', stop20: '#4169ff',
    stop40: '#a855f7', stop60: '#ff42c8', stop80: '#ffad32', stop100: '#ff303f',
    smoothing: 100, glow: 0, reactiveScale: 0, hideStopped: false, showPeak: false,
    showGear: false, showRpm: false, rpmMax: 8000, warning: false, warningSpeed: 130,
    locked: true, panelX: 0, panelY: 0, panelWidth: 340, panelHeight: 560, panelCollapsed: false
  };
  var ENUMS = {style: ['clean', 'outline', 'race', 'neon', 'hyper', 'minimal', 'digital'],
    units: ['kmh', 'mph'], source: ['wheel', 'air', 'dynamic'], palette: ['spectrum', 'custom'],
    unitPosition: ['side', 'below', 'hidden']};
  var LIMITS = {size: [28, 220], unitSize: [8, 70], unitGap: [0, 32], digitSpacing: [-8, 8],
    numberWeight: [400, 900], unitWeight: [400, 900], unitSpacing: [-2, 6], decimals: [0, 2],
    x: [3, 97], y: [5, 95], outline: [0, 5], shadow: [0, 100], opacity: [15, 100],
    midSpeed: [1, 600], highSpeed: [2, 700], smoothing: [0, 500], glow: [0, 40],
    reactiveScale: [0, 20], rpmMax: [1000, 20000], warningSpeed: [1, 700],
    panelX: [0, 100], panelY: [0, 100], panelWidth: [280, 480], panelHeight: [300, 760]};
  var STYLE_NAMES = {clean:'Clean', outline:'Kontur', race:'Racing', neon:'Neon', hyper:'Hyper', minimal:'Minimal', digital:'Digjital'};
  var LOOKS = {
    clean: {style:'clean', size:80, unitSize:20, numberWeight:600, unitWeight:600, italic:false, unitItalic:false,
      outline:0, glow:0, background:false, unitPosition:'side', adaptiveColor:false, color:'#ffffff', reactiveScale:0, digitSpacing:-1},
    outline: {style:'outline', size:88, unitSize:22, numberWeight:900, unitWeight:900, italic:true, unitItalic:true,
      outline:2, glow:0, background:false, unitPosition:'side', adaptiveColor:false, color:'#ffffff', reactiveScale:0, digitSpacing:-1},
    race: {style:'race', size:88, unitSize:21, numberWeight:900, unitWeight:900, italic:true, unitItalic:true,
      outline:1, glow:0, background:false, unitPosition:'side', adaptiveColor:true, palette:'spectrum', reactiveScale:0, digitSpacing:-2},
    neon: {style:'neon', size:86, unitSize:18, numberWeight:600, unitWeight:600, italic:false, unitItalic:false,
      outline:0, glow:22, background:false, unitPosition:'below', adaptiveColor:true, palette:'spectrum', reactiveScale:0, digitSpacing:2},
    hyper: {style:'hyper', size:96, unitSize:22, numberWeight:900, unitWeight:900, italic:true, unitItalic:true,
      outline:0, glow:8, background:true, unitPosition:'side', adaptiveColor:true, palette:'spectrum', reactiveScale:10, digitSpacing:-3},
    minimal: {style:'minimal', size:64, unitSize:13, numberWeight:400, unitWeight:400, italic:false, unitItalic:false,
      outline:0, glow:0, background:false, unitPosition:'below', adaptiveColor:false, color:'#ffffff', reactiveScale:0, digitSpacing:0},
    digital: {style:'digital', size:78, unitSize:17, numberWeight:600, unitWeight:600, italic:false, unitItalic:false,
      outline:0, glow:0, background:true, unitPosition:'side', adaptiveColor:false, color:'#92dfff', reactiveScale:0, digitSpacing:0}
  };
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
    result.decimals = Math.round(result.decimals);
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
  function speedColor(speedKmh, s) {
    if (!s.adaptiveColor) return s.color;
    if (s.palette === 'custom') {
      return speedKmh <= s.midSpeed ? mix(s.color, s.midColor, speedKmh / s.midSpeed) :
        mix(s.midColor, s.highColor, (speedKmh - s.midSpeed) / (s.highSpeed - s.midSpeed));
    }
    // Physical km/h, independent of the display unit. Exactly white at rest, red at/above 100.
    var stops = [[0, '#ffffff'], [5, s.stop5], [20, s.stop20], [40, s.stop40],
      [60, s.stop60], [80, s.stop80], [100, s.stop100]];
    for (var i = 1; i < stops.length; i++) {
      if (speedKmh <= stops[i][0]) return mix(stops[i-1][1], stops[i][1],
        (speedKmh - stops[i-1][0]) / (stops[i][0] - stops[i-1][0]));
    }
    return s.stop100;
  }
  function formatSpeed(speed, decimals) { return Math.max(0,finite(speed) ? speed : 0).toFixed(Math.round(clamp(finite(decimals) ? decimals : 0,0,2))); }
  function panelCorner(width, height, pw, ph, rect) {
    var corners = [[0,0],[100,0],[0,100],[100,100]], best = corners[0], area = Infinity;
    corners.forEach(function (c) {
      var x = 8 + c[0] / 100 * Math.max(0,width-pw-16), y = 8 + c[1] / 100 * Math.max(0,height-ph-16);
      var overlap = Math.max(0,Math.min(x+pw,rect.right)-Math.max(x,rect.left)) *
        Math.max(0,Math.min(y+ph,rect.bottom)-Math.max(y,rect.top));
      if (overlap < area) { best = c; area = overlap; }
    });
    return {x:best[0],y:best[1]};
  }
  var BUILTINS = {};
  ENUMS.style.forEach(function (name) { BUILTINS[STYLE_NAMES[name]] = LOOKS[name]; });
  var API = {defaults: DEFAULTS, sanitize: sanitize, convert: convert, selectedSpeed: selectedSpeed,
    looks: LOOKS, formatSpeed: formatSpeed, panelCorner: panelCorner, speedSample: speedSample, smooth: smooth, speedColor: speedColor, presets: BUILTINS};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.ApexSpeedometer = API;
  API.mount = function (root, options) {
    options = options || {};
    var destroyed = false, frame, dragging = null, cleanups = [], pane = 'style', saveTimer, panelDrag = null, selectedStop = 'stop5';
    var storage = options.storage || global.localStorage;
    function read(key, fallback) { try { return JSON.parse(storage.getItem(key)) || fallback; } catch (_) { return fallback; } }
    var settings = sanitize(read(KEY, DEFAULTS));
    var revision = read(KEY + '.revision', 0);
    if (revision < 3) {
      if (revision < 2) settings.source = 'dynamic';
      settings.size = Math.min(settings.size, 88); settings.unitSize = Math.min(settings.unitSize, 21);
      settings.adaptiveColor = true; settings.palette = 'spectrum';
      settings.panelWidth = 340; settings.panelHeight = 560; settings.panelX = 0; settings.panelY = 0;
      try { storage.setItem(KEY + '.revision', '3'); storage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
    }
    var custom = read(KEY + '.presets', {});
    if (!custom || typeof custom !== 'object' || Array.isArray(custom)) custom = {};
    var data = {wheel: null, air: null, ground: null, wheelAt: -Infinity, airAt: -Infinity, groundAt: -Infinity, rpm: 0, gear: 'N', telemetryAt: -Infinity};
    var displayed = 0, peakMs = 0, previous = performance.now(), demoMs = 65 / 3.6, lastHasSample = false;
    root.innerHTML = '<div class="as-hud" role="group" aria-label="Shpejtësimatësi" tabindex="0">' +
      '<div class="as-rpm" aria-hidden="true"><i></i></div><div class="as-reading"><span class="as-gear"></span>' +
      '<span class="as-number" title="Kliko për km/h ↔ mph">—</span><span class="as-unit">KM/H</span></div>' +
      '<div class="as-flair" aria-hidden="true"><i></i><i></i><i></i></div><div class="as-meta"></div><div class="as-edit-hint">ZHVENDOSE NË EKRAN · ⚙ PËR CILËSIMET</div></div>' +
      '<button class="as-settings-button" type="button" title="Hap cilësimet" aria-label="Hap cilësimet" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3h5l.5 2.5 2 1.2 2.5-.8 2.5 4.3-2 1.8v2l2 1.8-2.5 4.3-2.5-.8-2 1.2-.5 2.5h-5L9 20.5l-2-1.2-2.5.8L2 15.8 4 14v-2l-2-1.8L4.5 6 7 6.8l2-1.2z" transform="translate(0 -1) scale(1 .95)"/><circle cx="12" cy="11.5" r="3"/></svg></button>' +
      '<section id="apex-settings-panel" class="as-panel" aria-label="Cilësimet e shpejtësisë" hidden>' +
      '<header class="as-header" tabindex="0" title="Tërhiqe panelin me maus" aria-label="Zhvendos panelin e cilësimeve"><div class="as-brandmark">A</div><div><h1>APEX <span>SHPEJTËSIMATËSI</span></h1>' +
      '<p>↔ Tërhiqe panelin ku të duash</p></div><button class="as-collapse" type="button" title="Mblidh / zgjero panelin" aria-label="Mblidh / zgjero panelin">−</button><button class="as-close" title="Mbyll cilësimet" aria-label="Mbyll cilësimet">×</button></header>' +
      '<div class="as-status"><span></span>' + (options.demo ? 'PARAPAMJE E SIMULUAR · JO TË DHËNA NGA LOJA' : 'BEAMNG HUD · 0.3.0 / VERSION PROVUES') + '</div>' +
      '<div class="as-source-status" aria-live="polite"></div><nav class="as-nav" aria-label="Kategoritë e cilësimeve"></nav><div class="as-content"></div>' +
      '<footer class="as-footer"><button type="button" data-action="panel-away" class="as-away" title="Largo panelin nga numri">↔ Largo</button><span class="as-save-state">U ruajt në këtë pajisje</span><button class="as-done">Mbyll ↗</button></footer></section>';
    root.querySelectorAll('button').forEach(function (button) { button.type = 'button'; });
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
    function visible(open) {
      panel.hidden = !open;
      root.querySelector('.as-settings-button').setAttribute('aria-expanded', String(open));
      if (open) render();
      else { dragging = null; hud.classList.remove('as-dragging'); apply(); }
    }
    function paint(speedKmh) {
      var value = speedColor(speedKmh, settings), unitValue = settings.unitFollowsColor ? value : settings.unitColor;
      hud.style.setProperty('--as-color', value); hud.style.setProperty('--as-unit-color', unitValue);
      [number, gear, unit].forEach(function (el) {
        var c = el === unit ? unitValue : value;
        el.style.setProperty('color', c, 'important'); el.style.setProperty('-webkit-text-fill-color', c, 'important');
      });
    }
    function updateReading() {
      number.textContent = lastHasSample ? formatSpeed(displayed,settings.decimals) : '—';
      unit.textContent = settings.units === 'mph' ? 'mph' : 'km/h';
      paint(displayed * (settings.units === 'mph' ? 1.609344 : 1));
    }
    function setValue(key, value) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS,key)) return;
      var oldUnits = settings.units, next = Object.assign({},settings); next[key] = value;
      settings = sanitize(next);
      if (oldUnits !== settings.units) displayed *= settings.units === 'mph' ? 2.2369362921/3.6 : 3.6/2.2369362921;
      if (key === 'color') settings.adaptiveColor = false;
      if (key === 'unitColor') settings.unitFollowsColor = false;
      if (key === 'palette') settings.adaptiveColor = true;
      if (key === 'midColor' || key === 'highColor') { settings.adaptiveColor = true; settings.palette = 'custom'; }
      if (/^stop[0-9]+$/.test(key)) { settings.adaptiveColor = true; settings.palette = 'spectrum'; }
      content.querySelectorAll('input[type="checkbox"][data-key]').forEach(function (input) { input.checked = settings[input.dataset.key]; });
      content.querySelectorAll('[data-set]').forEach(function (button) { button.setAttribute('aria-pressed',String(settings[button.dataset.set]) === button.dataset.value); });
      apply(); scheduleSave();
    }
    function apply() {
      hud.hidden = !settings.enabled && panel.hidden;
      hud.className = 'as-hud as-style-' + settings.style + (settings.italic ? ' as-italic' : '') + (settings.unitItalic ? ' as-unit-italic' : '') +
        (settings.background ? ' as-backed' : '') + (!settings.locked && !panel.hidden ? ' as-editing' : '');
      hud.style.setProperty('--as-size', settings.size + 'px');
      hud.style.setProperty('--as-unit-size', settings.unitSize + 'px');
      hud.style.setProperty('--as-unit-gap', settings.unitGap + 'px');
      hud.style.setProperty('--as-digit-spacing', settings.digitSpacing + 'px');
      hud.style.setProperty('--as-number-weight', settings.numberWeight);
      hud.style.setProperty('--as-unit-weight', settings.unitWeight);
      hud.style.setProperty('--as-unit-spacing', settings.unitSpacing + 'px');
      hud.style.setProperty('--as-glow', settings.glow + 'px');
      hud.style.setProperty('--as-outline', settings.outline + 'px');
      hud.style.setProperty('--as-outline-color', settings.outlineColor);
      hud.style.setProperty('--as-shadow', settings.shadow / 100);
      hud.style.setProperty('--as-opacity', settings.opacity / 100);
      hud.style.left = settings.x + '%'; hud.style.top = settings.y + '%';
      hud.dataset.unitPosition = settings.unitPosition;
      unit.textContent = settings.units === 'mph' ? 'mph' : 'km/h';
      rpm.hidden = !settings.showRpm; gear.hidden = !settings.showGear;
      updateReading(); fit(); positionPanel();
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
    function row(label, control, help) { return '<div class="as-row"><span><b>' + label + '</b>' + (help ? '<small>' + help + '</small>' : '') + '</span>' + control + '</div>'; }
    function range(key, label, min, max, suffix) {
      return '<label class="as-range"><span>' + label + '<output data-output="' + key + '">' + settings[key] + (suffix || '') + '</output></span>' +
        '<input aria-label="' + label + '" data-key="' + key + '" data-suffix="' + (suffix || '') + '" type="range" min="' + min + '" max="' + max + '" value="' + settings[key] + '"></label>';
    }
    function toggle(key, label, help) {
      return row(label, '<input aria-label="' + label + '" class="as-switch" data-key="' + key + '" type="checkbox"' + (settings[key] ? ' checked' : '') + '>', help)
        .replace('<div class="as-row">', '<label class="as-row as-toggle-row">').replace(/<\/div>$/, '</label>');
    }
    function select(key, label, choices, help) {
      return row(label, '<div class="as-choices" role="group" aria-label="' + label + '">' + choices.map(function (c) {
        return '<button type="button" data-set="' + key + '" data-value="' + c[0] + '" aria-pressed="' + (String(settings[key]) === String(c[0])) + '">' + c[1] + '</button>';
      }).join('') + '</div>', help);
    }
    function swatches(key) {
      return '<div class="as-swatches" aria-label="Paleta ' + key + '">' + ['#ffffff','#171c25','#ff303f','#ffad32','#ffe54a','#27ec94','#00e5ff','#4169ff','#a855f7','#ff42c8'].map(function (value) {
        return '<button type="button" data-paint="' + value + '" data-color-key="' + key + '" style="--swatch:' + value + '" title="' + value + '" aria-label="' + key + ' ' + value + '" aria-pressed="' + (settings[key] === value) + '"></button>';
      }).join('') + '</div>';
    }
    function color(key, label) {
      return '<div class="as-color-row"><div class="as-color-title">' + label + '</div><div class="as-hex-row">' +
        '<i style="background:' + settings[key] + '"></i><input type="text" class="as-hex" data-key="' + key + '" value="' + settings[key] + '" maxlength="7" spellcheck="false" aria-label="' + label + ' HEX">' +
        '<button type="button" data-apply-color="' + key + '">Apliko</button></div>' + swatches(key) + '</div>';
    }
    function render() {
      root.querySelector('.as-nav').innerHTML = ['style', 'layout', 'color', 'behavior', 'presets'].map(function (id) {
        return '<button type="button" data-tab="' + id + '" class="' + (pane === id ? 'active' : '') + '" aria-pressed="' + (pane === id) + '">' + ({style:'Pamja', layout:'Pozicioni', color:'Ngjyrat', behavior:'Vozitja', presets:'Stilet'})[id] + '</button>';
      }).join('');
      var html = '';
      if (pane === 'style') {
        html = '<div class="as-styles">' + ENUMS.style.map(function (name) {
          return '<button type="button" data-style="' + name + '" aria-pressed="' + (settings.style === name) + '" class="as-style-card"><span class="as-sample-' + name + '">65<small> km/h</small></span><b>' + STYLE_NAMES[name] + '</b></button>';
        }).join('') + '</div>';
        html += '<h3 class="as-group-title">NUMRI</h3><div class="as-two-col">' + range('size', 'Madhësia', 28, 220, ' px') + range('numberWeight', 'Trashësia', 400, 900, '') +
          range('digitSpacing', 'Hapësira e shifrave', -8, 8, ' px') + toggle('italic', 'I pjerrët') + '</div>';
        html += select('units', 'Njësia', [['kmh','km/h'],['mph','mph']]);
        html += '<h3 class="as-group-title">KM/H / MPH</h3><div class="as-two-col">' + range('unitSize','Madhësia e njësisë',8,70,' px') +
          range('unitWeight','Trashësia',400,900,'') + range('unitGap','Largësia nga numri',0,32,' px') + toggle('unitItalic','Njësia e pjerrët') + '</div>';
        html += select('unitPosition','Pozicioni i njësisë',[['side','Anash'],['below','Poshtë'],['hidden','Fshehur']]);
        html += range('unitSpacing','Hapësira e shkronjave',-2,6,' px');
        html += '<p class="as-note">Kliko edhe vetë numrin në lojë për km/h ↔ mph, kur pozicioni është i bllokuar.</p>';
      } else if (pane === 'layout') {
        html = heading('POZICIONI','Dy pozicione të pavarura.','Numrin e lëviz veç. Panelin e tërheq nga titulli, pa lëvizur numrin.');
        html += toggle('locked','Blloko numrin','Çaktivizoje dhe tërhiq numrin me maus.') + '<div class="as-two-col">' +
          range('x','Numri X',3,97,'%') + range('y','Numri Y',5,95,'%') + '</div>';
        html += '<div class="as-button-row"><button data-action="top">Sipër</button><button data-action="center">Në mes</button><button data-action="bottom">Poshtë</button></div>';
        html += '<h3 class="as-group-title">PANELI I CILËSIMEVE</h3><div class="as-two-col">' + range('panelWidth','Gjerësia e panelit',280,480,' px') +
          range('panelHeight','Lartësia e panelit',300,760,' px') + range('panelX','Paneli X',0,100,'%') + range('panelY','Paneli Y',0,100,'%') + '</div>';
        html += '<div class="as-button-row"><button data-action="panel-left">Paneli majtas</button><button data-action="panel-right">Paneli djathtas</button></div>';
        html += '<button class="as-secondary" data-action="panel-away">Largo panelin nga speedometri</button>';
        html += range('opacity','Dukshmëria e HUD-it',15,100,'%') + toggle('background','Sfond i errët');
        html += '<button class="as-secondary" data-action="reset-layout">Rikthe madhësinë dhe pozicionin e numrit</button>';
      } else if (pane === 'color') {
        html = select('adaptiveColor','Ngjyra e numrit',[[true,'Sipas shpejtësisë'],[false,'Fikse']]);
        html += color('color','Ngjyra fikse e numrit');
        html += select('palette','Kalimi i ngjyrave',[['spectrum','Spektri 0–100'],['custom','3 ngjyra personale']]);
        html += '<p class="as-note">Spektri matet gjithmonë në km/h: 0 bardhë → 5 cyan → 20 blu → 40 vjollcë → 60 rozë → 80 portokalli → 100+ kuqe. Kalimi është gradual, edhe kur shfaq mph.</p>';
        html += '<div class="as-ramp">' + [[0,'#ffffff'],[5,settings.stop5],[20,settings.stop20],[40,settings.stop40],[60,settings.stop60],[80,settings.stop80],[100,settings.stop100]].map(function (c) {
          return '<span style="--stop:' + c[1] + '"><i></i>' + c[0] + '</span>';
        }).join('') + '</div>';
        html += '<div class="as-stop-picker">' + [5,20,40,60,80,100].map(function (n) {
          return '<button type="button" data-stop="stop' + n + '" aria-pressed="' + (selectedStop === 'stop'+n) + '">' + n + '</button>';
        }).join('') + '</div>' + color(selectedStop,'Ngjyra në ' + selectedStop.slice(4) + ' km/h');
        html += '<button class="as-secondary" data-action="reset-spectrum">Rikthe spektrin origjinal</button>';
        html += '<h3 class="as-group-title">NGJYRA E NJËSISË</h3>' + toggle('unitFollowsColor','Njësia ndjek numrin') + color('unitColor','Ngjyra fikse e km/h / mph');
        html += '<details><summary>Kalimi personal me 3 ngjyra</summary>' + range('midSpeed','Pragu i mesëm (km/h)',1,600,'') + color('midColor','Ngjyra e mesme') +
          range('highSpeed','Pragu i lartë (km/h)',2,700,'') + color('highColor','Ngjyra e lartë') + '</details>';
        html += color('outlineColor','Ngjyra e konturit') + range('outline','Trashësia e konturit',0,5,' px');
      } else if (pane === 'behavior') {
        html = select('source','Burimi',[['dynamic','Dinamik'],['air','Air'],['wheel','Gomat']]);
        html += '<p class="as-note">Dinamik / Air matin lëvizjen reale, edhe me goma të bllokuara. Gomat përdoren si rezervë e shënuar vetëm nëse të dhënat reale mungojnë.</p>';
        html += select('units','Njësia',[['kmh','km/h'],['mph','mph']]) + select('decimals','Shifrat pas presjes',[[0,'0'],[1,'1'],[2,'2']]);
        html += '<div class="as-two-col">' + range('smoothing','Zbutja',0,500,' ms') + range('reactiveScale','Zmadhim sipas shpejtësisë',0,20,'%') +
          range('glow','Shkëlqimi Neon',0,40,' px') + range('shadow','Hija',0,100,'%') + '</div>';
        html += toggle('enabled','Shfaq speedometrin') + toggle('hideStopped','Fshehe kur ndalet') + toggle('showPeak','Shfaq maksimumin e sesionit');
        html += '<button class="as-secondary" data-action="reset-peak">Pastro maksimumin</button>' + toggle('showGear','Shfaq marshin') + toggle('showRpm','Shiriti RPM');
        html += range('rpmMax','Kufiri RPM (manual)',1000,20000,'') + toggle('warning','Paralajmërim shpejtësie') + range('warningSpeed','Kufiri i paralajmërimit (km/h)',1,700,'');
        if (options.demo) html += rangeDemo();
      } else {
        html = heading('STILET','Ruaje stilin tënd.','Stilet ndryshojnë fontin, formën, ndriçimin dhe sjelljen — jo vetëm ngjyrën.');
        html += '<div class="as-presets">' + Object.keys(BUILTINS).map(function (name, i) {
          return '<button type="button" data-builtin="' + i + '">' + name + '<b>↗</b></button>';
        }).join('') + '</div><div class="as-custom-presets"></div>';
        html += '<div class="as-preset-save"><input class="as-preset-name" maxlength="40" placeholder="Emri i stilit" aria-label="Emri i stilit"><button data-action="save-preset">Ruaj</button></div>';
        html += '<div class="as-button-row"><button data-action="export">Eksporto JSON</button><button data-action="import">Importo JSON</button></div><input class="as-file" type="file" accept=".json,application/json" hidden>';
        html += '<button class="as-danger" data-action="reset-all">Rikthe të gjitha cilësimet…</button>';
      }
      content.innerHTML = html.replace(/<button(?![^>]*type=)/g, '<button type="button"');
      if (pane === 'presets') {
        var list = content.querySelector('.as-custom-presets');
        Object.keys(custom).slice(0, 30).forEach(function (name, index) {
          var item = document.createElement('div'); item.className = 'as-custom-row';
          var load = document.createElement('button'); load.type = 'button'; load.textContent = name; load.dataset.custom = index;
          var del = document.createElement('button'); del.type = 'button'; del.textContent = '×'; del.dataset.deletePreset = index;
          del.setAttribute('aria-label', 'Fshi ' + name); item.append(load, del); list.appendChild(item);
        });
      }
      apply(); positionPanel();
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
      var key = el.dataset.key;
      setValue(key, el.type === 'checkbox' ? el.checked : LIMITS[key] ? Number(el.value) : el.value);
      var output = content.querySelector('[data-output="' + key + '"]');
      if (output) output.textContent = settings[key] + (el.dataset.suffix || '');
      if (key === 'midSpeed' || key === 'highSpeed') {
        var high = content.querySelector('[data-key="highSpeed"]');
        if (high) { high.value = settings.highSpeed; content.querySelector('[data-output="highSpeed"]').textContent = settings.highSpeed; }
      }
      if (el.classList.contains('as-hex')) {
        var chip = el.parentElement.querySelector('i'); if (chip) chip.style.background = settings[key];
        content.querySelectorAll('[data-set="adaptiveColor"], [data-set="unitFollowsColor"]').forEach(function (button) {
          button.setAttribute('aria-pressed',String(settings[button.dataset.set]) === button.dataset.value);
        });
      }
      e.stopPropagation();
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
          var oldUnits = settings.units; settings = sanitize(parsed.settings);
          if (oldUnits !== settings.units) displayed *= settings.units === 'mph' ? 2.2369362921/3.6 : 3.6/2.2369362921;
          save(); render(); notify('Stili u importua');
        } catch (_) { notify('Skedar JSON i pavlefshëm për APEX'); }
      }).catch(function () { if (!destroyed) notify('Skedari nuk mund të lexohet'); });
    });
    on(root, 'click', function (e) {
      var target = e.target.closest('button');
      if (!target) {
        if (e.target.closest('.as-number, .as-unit') && (settings.locked || panel.hidden)) {
          setValue('units',settings.units === 'kmh' ? 'mph' : 'kmh'); if (!panel.hidden) render();
        }
        return;
      }
      e.preventDefault(); e.stopPropagation();
      if (target.dataset.set) {
        var key = target.dataset.set, value = target.dataset.value;
        setValue(key, typeof DEFAULTS[key] === 'boolean' ? value === 'true' : LIMITS[key] ? Number(value) : value);
        render(); return;
      }
      if (target.dataset.applyColor) {
        var field = content.querySelector('.as-hex[data-key="' + target.dataset.applyColor + '"]');
        if (!/^#[0-9a-f]{6}$/i.test(field.value)) { field.setAttribute('aria-invalid','true'); notify('Shkruaj ngjyrën si #00e5ff'); return; }
        setValue(target.dataset.applyColor,field.value); save(); render(); notify('Ngjyra u aplikua'); return;
      }
      if (target.dataset.stop) { selectedStop = target.dataset.stop; render(); return; }
      if (target.matches('.as-collapse')) { settings.panelCollapsed = !settings.panelCollapsed; positionPanel(); save(); return; }
      if (target.matches('.as-settings-button')) { visible(true); return; }
      if (target.matches('.as-close, .as-done')) { visible(false); apply(); return; }
      if (target.dataset.paint) {
        setValue(target.dataset.colorKey || 'color',target.dataset.paint); save(); render(); notify('Ngjyra u aplikua'); return;
      }
      if (target.dataset.tab) { pane = target.dataset.tab; render(); return; }
      if (target.dataset.style) {
        settings = sanitize(Object.assign({},settings,LOOKS[target.dataset.style]));
        save(); render(); return;
      }
      if (target.dataset.builtin !== undefined) {
        var base = Object.assign({}, DEFAULTS, BUILTINS[Object.keys(BUILTINS)[Number(target.dataset.builtin)]]);
        // A look doesn't unexpectedly move the HUD, change units or change speed source.
        settings = sanitize(Object.assign(base, {x: settings.x, y: settings.y, units: settings.units, source: settings.source, locked: settings.locked, panelX:settings.panelX, panelY:settings.panelY, panelWidth:settings.panelWidth, panelHeight:settings.panelHeight, panelCollapsed:settings.panelCollapsed}));
        save(); render(); return;
      }
      if (target.dataset.custom !== undefined) { var oldUnits = settings.units; settings = sanitize(custom[Object.keys(custom)[Number(target.dataset.custom)]]); if (oldUnits !== settings.units) displayed *= settings.units === 'mph' ? 2.2369362921/3.6 : 3.6/2.2369362921; save(); render(); return; }
      if (target.dataset.deletePreset !== undefined) { delete custom[Object.keys(custom)[Number(target.dataset.deletePreset)]]; savePresets(); render(); return; }
      var action = target.dataset.action;
      if (['top', 'center', 'bottom'].indexOf(action) !== -1) { settings.x = 50; settings.y = action === 'top' ? 15 : action === 'center' ? 50 : 82; }
      if (action === 'panel-away') {
        var r = root.getBoundingClientRect(), h = hud.getBoundingClientRect();
        var corner = panelCorner(r.width,r.height,panel.offsetWidth,panel.offsetHeight,{left:h.left-r.left,right:h.right-r.left,top:h.top-r.top,bottom:h.bottom-r.top});
        settings.panelX = corner.x; settings.panelY = corner.y;
      }
      if (action === 'panel-left' || action === 'panel-right') { settings.panelX = action === 'panel-left' ? 0 : 100; settings.panelY = 0; }
      if (action === 'reset-spectrum') { ['stop5','stop20','stop40','stop60','stop80','stop100'].forEach(function (k) { settings[k] = DEFAULTS[k]; }); settings.palette='spectrum'; settings.adaptiveColor=true; }
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
    function positionPanel() {
      if (panel.hidden) return;
      var r = root.getBoundingClientRect();
      panel.classList.toggle('as-collapsed', settings.panelCollapsed);
      panel.style.width = Math.min(settings.panelWidth,Math.max(0,r.width-16)) + 'px';
      panel.style.height = Math.min(settings.panelCollapsed ? 56 : settings.panelHeight,Math.max(0,r.height-16)) + 'px';
      var w = panel.offsetWidth, h = panel.offsetHeight;
      panel.style.left = (8 + settings.panelX/100 * Math.max(0,r.width-w-16)) + 'px';
      panel.style.top = (8 + settings.panelY/100 * Math.max(0,r.height-h-16)) + 'px';
      panel.style.right = 'auto';
      root.querySelector('.as-collapse').textContent = settings.panelCollapsed ? '+' : '−';
    }
    var header = root.querySelector('.as-header');
    on(header,'pointerdown',function (e) {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault(); e.stopPropagation();
      panelDrag = {id:e.pointerId,x:e.clientX,y:e.clientY,left:parseFloat(panel.style.left),top:parseFloat(panel.style.top)};
      header.setPointerCapture(e.pointerId); panel.classList.add('as-panel-dragging');
    });
    on(header,'pointermove',function (e) {
      if (!panelDrag || panelDrag.id !== e.pointerId) return;
      var r = root.getBoundingClientRect();
      settings.panelX = clamp((panelDrag.left + e.clientX-panelDrag.x-8)/Math.max(1,r.width-panel.offsetWidth-16)*100,0,100);
      settings.panelY = clamp((panelDrag.top + e.clientY-panelDrag.y-8)/Math.max(1,r.height-panel.offsetHeight-16)*100,0,100);
      positionPanel();
    });
    function endPanelDrag() { if (!panelDrag) return; panelDrag = null; panel.classList.remove('as-panel-dragging'); save(); }
    on(header,'pointerup',endPanelDrag); on(header,'pointercancel',endPanelDrag); on(header,'lostpointercapture',endPanelDrag);
    on(header,'keydown',function (e) {
      if (e.target !== header || ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key) === -1) return;
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') settings.panelX = clamp(settings.panelX+(e.key === 'ArrowLeft' ? -2 : 2),0,100);
      else settings.panelY = clamp(settings.panelY+(e.key === 'ArrowUp' ? -2 : 2),0,100);
      positionPanel(); scheduleSave();
    });
    on(panel,'keydown',function (e) {
      if (e.target.matches('input') && e.key !== 'Escape') e.stopPropagation();
      if (e.target.matches('input') && e.key === 'Enter') {
        e.preventDefault();
        if (e.target.matches('.as-hex')) e.target.parentElement.querySelector('[data-apply-color]').click();
        if (e.target.matches('.as-preset-name')) content.querySelector('[data-action="save-preset"]').click();
      }
    });
    on(global, 'resize', function () { fit(); positionPanel(); });
    var observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { fit(); positionPanel(); }) : null;
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
      lastHasSample = available;
      var text = available ? formatSpeed(displayed,settings.decimals) : '—';
      if (number.textContent !== text) { number.textContent = text; fit(); }
      var kmh = displayed * (settings.units === 'mph' ? 1.609344 : 1);
      paint(kmh);
      var growth = 1 + clamp(kmh/200,0,1) * settings.reactiveScale/100;
      if (hud.style.getPropertyValue('--as-reactive') !== String(growth)) { hud.style.setProperty('--as-reactive',growth); fit(); }
      hud.classList.toggle('as-stopped', settings.hideStopped && available && Math.abs(ms) * 3.6 < 1 && panel.hidden);
      hud.classList.toggle('as-warning', settings.warning && available && convert(ms,'kmh') > settings.warningSpeed);
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
      updateElectrics: updateElectrics, updateGround: updateGround,
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
          if (css.getAttribute('href') !== '/ui/modules/apps/ApexSpeedometer/app.css?v=0.3.0') {
            css.href = '/ui/modules/apps/ApexSpeedometer/app.css?v=0.3.0';
          }
          var app = API.mount(element[0]);
          StreamsManager.add(['electrics']);
          var offStreams = scope.$on('streamsUpdate', function (_, streams) { if (streams) app.updateElectrics(streams.electrics); });
          var offGround = scope.$on('apexSpeedometer.ground', function (_, payload) { app.updateGround(payload); });
          activeInstances += 1;
          if (activeInstances === 1) bngApi.engineLua("extensions.load('apexSpeedometer')");
          scope.$on('$destroy', function () {
            offStreams(); offGround(); StreamsManager.remove(['electrics']); app.destroy();
            activeInstances -= 1;
            if (activeInstances === 0) bngApi.engineLua("extensions.unload('apexSpeedometer')");
          });
        }
      };
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
