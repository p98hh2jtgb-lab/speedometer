const {test} = require('node:test');
const assert = require('node:assert/strict');
const hud = require('../mod/ui/modules/apps/ApexSpeedometer/app.js');

test('default options survive sanitization without shared references', () => {
  const a = hud.sanitize(null); a.size = 12;
  assert.equal(hud.defaults.size, 100);
  assert.deepEqual(hud.sanitize(hud.defaults), hud.defaults);
});
test('reject unknown keys, malformed types, colors and enums', () => {
  const s = hud.sanitize({size: '200', color: 'url(evil)', locked: 'false', style: 'bad', surprise: 42});
  assert.equal(s.size, 100); assert.equal(s.color, '#ffffff'); assert.equal(s.locked, true);
  assert.equal(s.style, 'outline'); assert.equal(s.surprise, undefined);
  assert.deepEqual(hud.sanitize([]), hud.defaults);
});
test('numeric options clamp; thresholds stay ordered', () => {
  const s = hud.sanitize({size: 999, x: -100, smoothing: NaN, highSpeed: 5, midSpeed: 600});
  assert.equal(s.size, 220); assert.equal(s.x, 3); assert.equal(s.smoothing, 140);
  assert.equal(s.highSpeed, 601);
});
test('m/s conversion, reverse and invalid numbers', () => {
  assert.equal(hud.convert(10, 'kmh'), 36);
  assert.ok(Math.abs(hud.convert(10, 'mph') - 22.369362921) < 0.00001);
  assert.equal(hud.convert(-10, 'kmh'), 36);
  assert.equal(hud.convert(Infinity, 'kmh'), 0);
});
test('source selection and freshness do not turn missing data into zero', () => {
  const data = {wheel: 12, wheelAt: 100, ground: 10, groundAt: 100};
  assert.equal(hud.selectedSpeed(data, 'wheel', 500), 12);
  assert.equal(hud.selectedSpeed(data, 'ground', 500), 10);
  assert.equal(hud.selectedSpeed(data, 'auto', 500), 10);
  data.groundAt = -5000;
  assert.equal(hud.selectedSpeed(data, 'auto', 500), 12);
  assert.equal(hud.selectedSpeed(data, 'ground', 500), null);
  assert.equal(hud.selectedSpeed(data, 'wheel', 2000), null);
});
test('zero speed is valid', () => {
  assert.equal(hud.selectedSpeed({wheel:0, wheelAt:0}, 'wheel', 1), 0);
});
test('smoothing is frame-rate independent and instant mode works', () => {
  const single = hud.smooth(0, 100, 0.1, 140);
  const split = hud.smooth(hud.smooth(0, 100, 0.05, 140), 100, 0.05, 140);
  assert.ok(Math.abs(single - split) < 0.00001);
  assert.equal(hud.smooth(0, 100, 0.1, 0), 100);
});
test('adaptive color exact endpoints and clamping', () => {
  const s = hud.sanitize({adaptiveColor:true});
  assert.equal(hud.speedColor(0,s),s.color);
  assert.equal(hud.speedColor(100,s),s.midColor);
  assert.equal(hud.speedColor(200,s),s.highColor);
  assert.equal(hud.speedColor(900,s),s.highColor);
  assert.equal(hud.speedColor(900,hud.defaults),hud.defaults.color);
});
test('all built-in looks contain valid settings', () => {
  for (const preset of Object.values(hud.presets)) {
    const s = hud.sanitize({...hud.defaults,...preset});
    for (const [key,value] of Object.entries(preset)) assert.equal(s[key],value);
  }
});
