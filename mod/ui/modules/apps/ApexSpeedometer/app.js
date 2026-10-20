/* APEX Speedometer: original, dependency-free HUD + BeamNG AngularJS adapter. */
(function (global) {
  'use strict';
  var KEY = 'apex.speedometer.v1';
  var DEFAULTS = {
    enabled: true, style: 'outline', size: 100, unitSize: 28, x: 50, y: 82,
    units: 'kmh', source: 'wheel', color: '#ffffff', outlineColor: '#10131a',
    outline: 2, shadow: 55, opacity: 100, background: false, italic: true,
    unitPosition: 'side', adaptiveColor: false, midSpeed: 100, highSpeed: 200,
    midColor: '#ffd166', highColor: '#ff5b63', smoothing: 140,
    hideStopped: false, showPeak: false, showGear: false, showRpm: false,
    rpmMax: 8000, warning: false, warningSpeed: 130, locked: true
  };
  var ENUMS = {style: ['clean', 'outline', 'race', 'digital'], units: ['kmh', 'mph'],
    source: ['wheel', 'ground', 'auto'], unitPosition: ['side', 'below', 'hidden']};
  var LIMITS = {size: [32, 220], unitSize: [10, 70], x: [3, 97], y: [5, 95],
    outline: [0, 5], shadow: [0, 100], opacity: [15, 100], midSpeed: [1, 600],
    highSpeed: [2, 700], smoothing: [0, 500], rpmMax: [1000, 20000], warningSpeed: [1, 700]};
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function finite(n) { return typeof n === 'number' && Number.isFinite(n); }
  function sanitize(input) {
    var result = Object.assign({}, DEFAULTS);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
    Object.keys(DEFAULTS).forEach(function (key) {
      var v = input[key];
      if (ENUMS[key]) { if (ENUMS[key].indexOf(v) !== -1) result[key] = v; }
      else if (LIMITS[key]) { if (finite(v)) result[key] = clamp(v, LIMITS[key][0], LIMITS[key][1]); }
      else if (typeof DEFAULTS[key] === 'boolean') { if (typeof v === 'boolean') result[key] = v; }
      else if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) result[key] = v;
    });
    result.highSpeed = Math.max(result.midSpeed + 1, result.highSpeed);
    return result;
  }
  function convert(ms, units) { return Math.abs(finite(ms) ? ms : 0) * (units === 'mph' ? 2.2369362921 : 3.6); }
  function selectedSpeed(data, source, now) {
    var wheel = finite(data.wheel) && now - data.wheelAt < 1800;
    var ground = finite(data.ground) && now - data.groundAt < 1800;
    if (source === 'wheel') return wheel ? data.wheel : null;
    if (source === 'ground') return ground ? data.ground : null;
    // Auto prefers actual vehicle velocity, and falls back to the wheel stream.
    return ground ? data.ground : wheel ? data.wheel : null;
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
    'Clean recording': {style: 'clean', size: 96, outline: 0, shadow: 65, italic: false},
    'Classic outline': {style: 'outline', size: 100, outline: 2, italic: true},
    'Race red': {style: 'race', color: '#ffffff', highColor: '#ff4255', adaptiveColor: true, showGear: true, showRpm: true, size: 108},
    'Night blue': {style: 'digital', color: '#87dcff', background: true, italic: false, outline: 0},
    'Big numbers': {style: 'outline', size: 164, unitSize: 36, y: 78}
  };
  var API = {defaults: DEFAULTS, sanitize: sanitize, convert: convert, selectedSpeed: selectedSpeed,
    smooth: smooth, speedColor: speedColor, presets: BUILTINS};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.ApexSpeedometer = API;
  API.mount = function (root, options) {
    options = options || {};
    var destroyed = false, frame, dragging = null, cleanups = [], pane = 'style', saveTimer;
    var storage = options.storage || global.localStorage;
    function read(key, fallback) { try { return JSON.parse(storage.getItem(key)) || fallback; } catch (_) { return fallback; } }
    var settings = sanitize(read(KEY, DEFAULTS));
    var custom = read(KEY + '.presets', {});
    if (!custom || typeof custom !== 'object' || Array.isArray(custom)) custom = {};
    var data = {wheel: null, ground: null, wheelAt: -Infinity, groundAt: -Infinity, rpm: 0, gear: 'N', telemetryAt: -Infinity};
    var displayed = 0, peakMs = 0, previous = performance.now(), demoMs = 147 / 3.6;
    root.innerHTML = '<div class="as-hud" role="group" aria-label="Speedometer" tabindex="0">' +
      '<div class="as-rpm" aria-hidden="true"><i></i></div><div class="as-reading"><span class="as-gear"></span>' +
      '<span class="as-number">—</span><span class="as-unit">KM/H</span></div>' +
      '<div class="as-meta"></div><div class="as-edit-hint">DRAG TO POSITION · RIGHT-CLICK FOR SETTINGS</div></div>' +
      '<button class="as-launch" title="Speedometer settings" aria-label="Open speedometer settings">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg><span>APEX</span></button>' +
      '<section class="as-panel" aria-label="Speedometer settings" hidden>' +
      '<header class="as-header"><div class="as-brandmark">A</div><div><h1>APEX <span>SPEEDOMETER</span></h1>' +
      '<p>Your speed. Your signature.</p></div><button class="as-close" title="Close settings" aria-label="Close settings">×</button></header>' +
      '<div class="as-status"><span></span>' + (options.demo ? 'SIMULATED PREVIEW · NOT GAME TELEMETRY' : 'BEAMNG HUD · 0.1.0 / TEST BUILD') + '</div>' +
      '<nav class="as-nav" aria-label="Settings sections"></nav><div class="as-content"></div>' +
      '<footer class="as-footer"><span class="as-save-state">Saved on this device</span><button class="as-done">Done ↗</button></footer></section>';
    var hud = root.querySelector('.as-hud'), panel = root.querySelector('.as-panel');
    var content = root.querySelector('.as-content'), number = root.querySelector('.as-number');
    var unit = root.querySelector('.as-unit'), meta = root.querySelector('.as-meta');
    var rpm = root.querySelector('.as-rpm'), gear = root.querySelector('.as-gear');
    function on(el, event, fn, opts) { el.addEventListener(event, fn, opts); cleanups.push(function () { el.removeEventListener(event, fn, opts); }); }
    function notify(message) { root.querySelector('.as-save-state').textContent = message; }
    function save() {
      clearTimeout(saveTimer);
      try { storage.setItem(KEY, JSON.stringify(settings)); notify('Saved on this device'); }
      catch (_) { notify('Storage unavailable · changes are temporary'); }
    }
    function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 150); }
    function visible(open) { panel.hidden = !open; if (open) render(); else { dragging = null; hud.classList.remove('as-dragging'); apply(); } }
    function apply() {
      hud.hidden = !settings.enabled && panel.hidden;
      hud.className = 'as-hud as-style-' + settings.style + (settings.italic ? ' as-italic' : '') +
        (settings.background ? ' as-backed' : '') + (!settings.locked && !panel.hidden ? ' as-editing' : '');
      hud.style.setProperty('--as-size', settings.size + 'px');
      hud.style.setProperty('--as-unit-size', settings.unitSize + 'px');
      hud.style.setProperty('--as-outline', settings.outline + 'px');
      hud.style.setProperty('--as-outline-color', settings.outlineColor);
      hud.style.setProperty('--as-shadow', settings.shadow / 100);
      hud.style.setProperty('--as-opacity', settings.opacity / 100);
      hud.style.left = settings.x + '%'; hud.style.top = settings.y + '%';
      hud.dataset.unitPosition = settings.unitPosition;
      unit.textContent = settings.units === 'mph' ? 'MPH' : 'KM/H';
      rpm.hidden = !settings.showRpm; gear.hidden = !settings.showGear;
      fit();
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
    function color(key, label) { return row(label, '<input type="color" data-key="' + key + '" value="' + settings[key] + '" aria-label="' + label + '">'); }
    function render() {
      root.querySelector('.as-nav').innerHTML = ['style', 'layout', 'color', 'behavior', 'presets'].map(function (id) {
        return '<button data-tab="' + id + '" class="' + (pane === id ? 'active' : '') + '" aria-pressed="' + (pane === id) + '">' + id + '</button>';
      }).join('');
      var html = '';
      if (pane === 'style') {
        html = heading('01 / APPEARANCE', 'Make it yours.', 'A simple number. A completely different feel.');
        html += '<div class="as-styles">' + ENUMS.style.map(function (name) {
          return '<button data-style="' + name + '" aria-pressed="' + (settings.style === name) + '" class="as-style-card ' + (settings.style === name ? 'active' : '') + '"><span class="as-sample-' + name + '">147<small> KM/H</small></span><b>' + name + '</b></button>';
        }).join('') + '</div>';
        html += range('size', 'Speed text size', 32, 220, ' px') + range('unitSize', 'Unit text size', 10, 70, ' px');
        html += select('units', 'Speed units', [['kmh', 'km/h'], ['mph', 'mph']]);
        html += select('unitPosition', 'Unit placement', [['side', 'Beside number'], ['below', 'Below number'], ['hidden', 'Hidden']]);
        html += toggle('italic', 'Italic numbers', 'Give the HUD a little forward motion.');
        html += toggle('showGear', 'Show gear', 'Small gear indicator beside the speed.');
        html += toggle('showRpm', 'RPM line', 'Optional thin bar above the number.');
        html += range('rpmMax', 'RPM bar maximum (manual)', 1000, 20000, ' rpm');
      } else if (pane === 'layout') {
        html = heading('02 / ON-SCREEN EDITOR', 'Find your spot.', 'Unlock, then drag the number directly on screen.');
        html += toggle('locked', 'Lock HUD position', 'Turn off to drag while settings are open.');
        html += range('x', 'Horizontal position', 3, 97, '%') + range('y', 'Vertical position', 5, 95, '%');
        html += '<div class="as-button-row"><button data-action="top">Top</button><button data-action="center">Center</button><button data-action="bottom">Bottom</button></div>';
        html += '<p class="as-note">Snaps to the horizontal center while dragging. Positions are saved as percentages; the HUD stays within the screen.</p>';
        html += range('opacity', 'HUD opacity', 15, 100, '%') + toggle('background', 'Soft background', 'A subtle dark backing for bright scenes.');
        html += '<button class="as-secondary" data-action="reset-layout">Reset position & size</button>';
      } else if (pane === 'color') {
        html = heading('03 / COLOR & CONTRAST', 'Stand out. Stay clear.', 'Tune the contrast for your road, day or night.');
        html += color('color', 'Main color') + color('outlineColor', 'Outline color');
        html += range('outline', 'Outline thickness', 0, 5, ' px') + range('shadow', 'Shadow intensity', 0, 100, '%');
        html += toggle('adaptiveColor', 'Speed-reactive color', 'Smoothly blend through your selected colors.');
        html += range('midSpeed', 'Middle threshold (selected units)', 1, 600, '') + color('midColor', 'Middle color');
        html += range('highSpeed', 'High threshold (selected units)', 2, 700, '') + color('highColor', 'High color');
      } else if (pane === 'behavior') {
        html = heading('04 / DRIVING', 'Feel the difference.', 'Fine-tune the number without adding clutter.');
        html += toggle('enabled', 'Show speed HUD', 'Settings keep it visible for editing.');
        html += select('source', 'Speed source', [['wheel', 'Wheel speed'], ['ground', 'Ground velocity'], ['auto', 'Auto']], 'Auto prefers ground velocity, then wheel speed.');
        html += range('smoothing', 'Number smoothing', 0, 500, ' ms');
        html += '<p class="as-note">0 ms = instant. Higher values soften rapid changes. Ground speed is vehicle velocity, not an airspeed sensor.</p>';
        html += toggle('hideStopped', 'Fade out when stopped', 'Fades below 1 km/h; settings keep it visible.');
        html += toggle('showPeak', 'Show session top speed', 'Peak uses raw speed, not the smoothed display.');
        html += '<button class="as-secondary" data-action="reset-peak">Reset top speed</button>';
        html += toggle('warning', 'Speed warning', 'A subtle underline above your chosen speed.');
        html += range('warningSpeed', 'Warning threshold (selected units)', 1, 700, '');
        if (options.demo) html += rangeDemo();
      } else {
        html = heading('05 / YOUR COLLECTION', 'One click. New mood.', 'Load a look, save your own, or take it with you.');
        html += '<div class="as-presets">' + Object.keys(BUILTINS).map(function (name, i) {
          return '<button data-builtin="' + i + '"><span>0' + (i + 1) + '</span>' + name + '<b>↗</b></button>';
        }).join('') + '</div><div class="as-custom-presets"></div>';
        html += '<div class="as-preset-save"><input class="as-preset-name" maxlength="40" placeholder="My new look" aria-label="Preset name"><button data-action="save-preset">Save look</button></div>';
        html += '<div class="as-button-row"><button data-action="export">Export JSON</button><button data-action="import">Import JSON</button></div>';
        html += '<input class="as-file" type="file" accept=".json,application/json" hidden>';
        html += '<button class="as-danger" data-action="reset-all">Reset all settings…</button>';
      }
      content.innerHTML = html;
      if (pane === 'presets') {
        var list = content.querySelector('.as-custom-presets');
        Object.keys(custom).slice(0, 30).forEach(function (name, index) {
          var item = document.createElement('div'); item.className = 'as-custom-row';
          var load = document.createElement('button'); load.textContent = name; load.dataset.custom = index;
          var del = document.createElement('button'); del.textContent = '×'; del.dataset.deletePreset = index;
          del.setAttribute('aria-label', 'Delete ' + name); item.append(load, del); list.appendChild(item);
        });
      }
      apply();
    }
    function rangeDemo() { return '<label class="as-range"><span>Preview speed (km/h)<output data-demo-output>' + Math.round(demoMs * 3.6) + '</output></span><input type="range" min="0" max="400" value="' + Math.round(demoMs * 3.6) + '" data-demo aria-label="Preview speed"></label>'; }
    function change(e) {
      var el = e.target;
      if (el.matches('[data-demo]')) { demoMs = Number(el.value) / 3.6; content.querySelector('[data-demo-output]').textContent = el.value; return; }
      if (!el.dataset.key) return;
      var key = el.dataset.key, next = Object.assign({}, settings);
      next[key] = el.type === 'checkbox' ? el.checked : LIMITS[key] ? Number(el.value) : el.value;
      settings = sanitize(next);
      var output = content.querySelector('[data-output="' + key + '"]');
      if (output) output.textContent = settings[key] + (el.dataset.suffix || '');
      if (key === 'midSpeed' || key === 'highSpeed') {
        var high = content.querySelector('[data-key="highSpeed"]');
        if (high) { high.value = settings.highSpeed; content.querySelector('[data-output="highSpeed"]').textContent = settings.highSpeed; }
      }
      apply(); scheduleSave();
    }
    function savePresets() { try { storage.setItem(KEY + '.presets', JSON.stringify(custom)); } catch (_) { notify('Could not save presets'); } }
    on(root, 'input', change);
    on(root, 'change', function (e) {
      if (!e.target.matches('.as-file') || !e.target.files[0]) return;
      var file = e.target.files[0];
      if (file.size > 65536) { notify('Import rejected: maximum 64 KB'); return; }
      file.text().then(function (text) {
        if (destroyed) return;
        try {
          var parsed = JSON.parse(text);
          if (!parsed || parsed.schema !== 'apex-speedometer/v1' || !parsed.settings || typeof parsed.settings !== 'object' || Array.isArray(parsed.settings)) throw new Error('format');
          settings = sanitize(parsed.settings); save(); render(); notify('Look imported');
        } catch (_) { notify('Invalid APEX preset JSON'); }
      }).catch(function () { if (!destroyed) notify('Could not read file'); });
    });
    on(root, 'click', function (e) {
      var target = e.target.closest('button'); if (!target) return;
      if (target.matches('.as-launch')) { visible(panel.hidden); return; }
      if (target.matches('.as-close, .as-done')) { visible(false); apply(); return; }
      if (target.dataset.tab) { pane = target.dataset.tab; render(); return; }
      if (target.dataset.style) {
        settings.style = target.dataset.style;
        if (settings.style === 'clean' || settings.style === 'digital') settings.outline = 0;
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
      if (action === 'reset-layout') ['x', 'y', 'size', 'unitSize'].forEach(function (k) { settings[k] = DEFAULTS[k]; });
      if (action === 'reset-peak') { peakMs = 0; notify('Top speed reset'); return; }
      if (action === 'save-preset') {
        var name = content.querySelector('.as-preset-name').value.trim();
        if (!name) { notify('Enter a name for your look'); return; }
        if (['__proto__', 'constructor', 'prototype'].indexOf(name) !== -1) { notify('Please choose another name'); return; }
        if (Object.keys(custom).length >= 30 && !Object.prototype.hasOwnProperty.call(custom, name)) { notify('Maximum 30 saved looks'); return; }
        custom[name] = sanitize(settings); savePresets(); render(); return;
      }
      if (action === 'export') {
        var blob = new Blob([JSON.stringify({schema: 'apex-speedometer/v1', settings: settings}, null, 2)], {type: 'application/json'});
        var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'apex-speedometer-look.json'; a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000); notify('Export requested'); return;
      }
      if (action === 'import') { content.querySelector('.as-file').click(); return; }
      if (action === 'reset-all') {
        if (!global.confirm('Reset APEX settings? Saved custom looks will be kept.')) return;
        settings = sanitize(DEFAULTS); peakMs = 0;
      }
      if (action) { save(); render(); }
    });
    on(hud, 'contextmenu', function (e) { e.preventDefault(); visible(true); });
    on(hud, 'keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); visible(true); } });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { visible(false); apply(); }
      if (e.altKey && e.shiftKey && e.code === 'KeyS') { e.preventDefault(); visible(panel.hidden); apply(); }
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
        data.wheel = demoMs; data.ground = demoMs; data.wheelAt = now; data.groundAt = now;
        data.rpm = demoMs > 0 ? 2400 + demoMs * 65 : 850; data.gear = demoMs > 0 ? String(Math.min(6, Math.max(1, Math.ceil(demoMs / 14)))) : 'N'; data.telemetryAt = now;
      }
      var ms = selectedSpeed(data, settings.source, now), available = ms !== null;
      var speed = convert(ms, settings.units);
      displayed = smooth(displayed, speed, dt, settings.smoothing);
      if (available) peakMs = Math.max(peakMs, Math.abs(ms));
      var text = available ? String(Math.round(displayed)) : '—';
      if (number.textContent !== text) { number.textContent = text; fit(); }
      hud.style.setProperty('--as-color', speedColor(displayed, settings));
      hud.classList.toggle('as-stopped', settings.hideStopped && available && Math.abs(ms) * 3.6 < 1 && panel.hidden);
      hud.classList.toggle('as-warning', settings.warning && available && speed > settings.warningSpeed);
      var hasTelemetry = now - data.telemetryAt < 1800;
      gear.textContent = hasTelemetry ? data.gear : '—';
      rpm.firstElementChild.style.width = (hasTelemetry ? clamp(data.rpm / settings.rpmMax * 100, 0, 100) : 0) + '%';
      meta.textContent = !available ? 'WAITING FOR ' + (settings.source === 'ground' ? 'GROUND' : settings.source === 'wheel' ? 'WHEEL' : 'SPEED') + ' DATA' : settings.showPeak ? 'TOP ' + Math.round(convert(peakMs, settings.units)) + ' ' + unit.textContent : '';
      frame = requestAnimationFrame(tick);
    }
    function updateElectrics(electrics) {
      if (!electrics) return;
      var now = performance.now();
      if (finite(electrics.wheelspeed)) { data.wheel = electrics.wheelspeed; data.wheelAt = now; }
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
        data.wheel = null; data.wheelAt = -Infinity; data.telemetryAt = -Infinity;
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
          if (!document.getElementById('apex-speedometer-css')) {
            var css = document.createElement('link'); css.id = 'apex-speedometer-css'; css.rel = 'stylesheet';
            css.href = '/ui/modules/apps/ApexSpeedometer/app.css'; document.head.appendChild(css);
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
