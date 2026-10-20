const {test} = require('node:test');
const assert = require('node:assert/strict');
const hud = require('../mod/ui/modules/apps/ApexSpeedometer/app.js');

test('default options survive sanitization without shared references', () => {
  const a = hud.sanitize(null); a.size = 12;
  assert.equal(hud.defaults.size, 88);
  assert.deepEqual(hud.sanitize(hud.defaults), hud.defaults);
});
test('reject unknown keys, malformed types, colors and enums', () => {
  const s = hud.sanitize({size: '200', color: 'url(evil)', locked: 'false', style: 'bad', surprise: 42});
  assert.equal(s.size, 88); assert.equal(s.color, '#ffffff'); assert.equal(s.locked, true);
  assert.equal(s.style, 'race'); assert.equal(s.surprise, undefined);
  assert.deepEqual(hud.sanitize([]), hud.defaults);
});
test('numeric options clamp; thresholds stay ordered', () => {
  const s = hud.sanitize({size: 999, x: -100, smoothing: NaN, highSpeed: 5, midSpeed: 600});
  assert.equal(s.size, 220); assert.equal(s.x, 3); assert.equal(s.smoothing, 100);
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
  const s = hud.sanitize({adaptiveColor:true,palette:'custom',midSpeed:100,highSpeed:200});
  assert.equal(hud.speedColor(0,s),s.color);
  assert.equal(hud.speedColor(100,s),s.midColor);
  assert.equal(hud.speedColor(200,s),s.highColor);
  assert.equal(hud.speedColor(900,s),s.highColor);
  assert.equal(hud.speedColor(900,{...hud.defaults,adaptiveColor:false}),hud.defaults.color);
});
test('all built-in looks contain valid settings', () => {
  for (const preset of Object.values(hud.presets)) {
    const s = hud.sanitize({...hud.defaults,...preset});
    for (const [key,value] of Object.entries(preset)) assert.equal(s[key],value);
  }
});


test('dynamic is the default and old source names migrate', () => {
  assert.equal(hud.defaults.source, 'dynamic');
  assert.equal(hud.sanitize({source:'auto'}).source, 'dynamic');
  assert.equal(hud.sanitize({source:'ground'}).source, 'air');
});
test('locked wheels at 300 km/h keep actual travel speed', () => {
  const data={wheel:0,wheelAt:100,air:300/3.6,airAt:100};
  assert.equal(hud.selectedSpeed(data,'dynamic',100),300/3.6);
  assert.equal(hud.selectedSpeed(data,'air',100),300/3.6);
  assert.equal(hud.selectedSpeed(data,'wheel',100),0);
});
test('airborne, wheelspin and stationary vehicle use world motion, including true zero', () => {
  assert.equal(hud.selectedSpeed({wheel:120,wheelAt:0,air:30,airAt:0},'dynamic',1),30);
  assert.equal(hud.selectedSpeed({wheel:80,wheelAt:0,air:0,airAt:0},'dynamic',1),0);
  assert.equal(hud.selectedSpeed({wheel:0,wheelAt:0,ground:60,groundAt:0},'dynamic',1),60);
});
test('dynamic fallback is labelled, strict Air never falls back to wheel', () => {
  const data={wheel:55,wheelAt:0,air:20,airAt:-5000};
  assert.deepEqual(hud.speedSample(data,'dynamic',1),{speed:55,source:'wheel-fallback'});
  assert.equal(hud.selectedSpeed(data,'air',1),null);
});
test('new compact spacing settings are validated', () => {
  assert.equal(hud.defaults.unitGap,4);
  assert.equal(hud.sanitize({unitGap:999,digitSpacing:-999}).unitGap,32);
  assert.equal(hud.sanitize({digitSpacing:-999}).digitSpacing,-8);
});


test('spectrum has six colors before red at 100, with white at rest', () => {
 const s=hud.sanitize({adaptiveColor:true,palette:'spectrum'});
 const stops=[[0,'#ffffff'],[5,s.stop5],[20,s.stop20],[40,s.stop40],[60,s.stop60],[80,s.stop80],[100,s.stop100],[300,s.stop100]];
 for(const [speed,color] of stops) assert.equal(hud.speedColor(speed,s),color);
 assert.notEqual(hud.speedColor(2.5,s),'#ffffff');
 assert.notEqual(hud.speedColor(2.5,s),s.stop5);
 for(let i=0;i<100;i++) assert.match(hud.speedColor(i+0.5,s),/^#[0-9a-f]{6}$/);
});
test('spectrum transitions are continuous across each threshold', () => {
 const s=hud.sanitize({});
 const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 for(const stop of [5,20,40,60,80,100]){
  const a=rgb(hud.speedColor(stop-0.001,s)), b=rgb(hud.speedColor(stop+0.001,s));
  a.forEach((value,i)=>assert.ok(Math.abs(value-b[i])<=1));
 }
});
test('format speed supports decimals without negative or invalid numbers', () => {
 assert.equal(hud.formatSpeed(62.1371,0),'62'); assert.equal(hud.formatSpeed(62.1371,1),'62.1');
 assert.equal(hud.formatSpeed(62.1371,2),'62.14'); assert.equal(hud.formatSpeed(NaN,0),'0');
});
test('all seven looks are distinct configurations and have bounded sizing', () => {
 assert.equal(Object.keys(hud.looks).length,7);
 assert.notDeepEqual(hud.looks.race,hud.looks.neon);assert.notDeepEqual(hud.looks.neon,hud.looks.hyper);
 assert.ok(hud.looks.hyper.reactiveScale>0);assert.ok(hud.looks.neon.glow>10);
 assert.equal(hud.looks.minimal.numberWeight,400);assert.ok(hud.defaults.panelWidth<400);
});
test('choose a panel corner outside the number when possible', () => {
 assert.deepEqual(hud.panelCorner(1440,900,340,560,{left:8,top:8,right:220,bottom:120}),{x:100,y:0});
 assert.deepEqual(hud.panelCorner(1440,900,340,560,{left:650,top:700,right:790,bottom:820}),{x:0,y:0});
});
test('panel position, unit styling and decimals cannot escape validation', () => {
 const s=hud.sanitize({panelX:500,panelY:-1,panelWidth:900,panelHeight:10,numberWeight:10000,unitWeight:0,decimals:1.8});
 assert.equal(s.panelX,100);assert.equal(s.panelY,0);assert.equal(s.panelWidth,480);assert.equal(s.panelHeight,300);
 assert.equal(s.numberWeight,900);assert.equal(s.unitWeight,400);assert.equal(s.decimals,2);
});
