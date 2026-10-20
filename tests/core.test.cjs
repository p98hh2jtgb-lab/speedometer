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
  assert.equal(s.style, 'clean'); assert.equal(s.surprise, undefined);
  assert.deepEqual(hud.sanitize([]), hud.defaults);
});
test('numeric options and shared typography clamp', () => {
  const s = hud.sanitize({size:999,x:-100,smoothing:NaN,numberWeight:900});
  assert.equal(s.size,220);assert.equal(s.x,3);assert.equal(s.smoothing,100);assert.equal(s.numberWeight,700);
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
  const s=hud.sanitize({adaptiveColor:true});
  assert.equal(hud.speedColor(0,s),'#ffffff');assert.equal(hud.speedColor(60,s),'#ffffff');
  assert.equal(hud.speedColor(100,s),'#ffd166');assert.equal(hud.speedColor(140,s),'#ff453a');assert.equal(hud.speedColor(900,s),'#ff453a');
});
test('all built-in looks contain valid settings', () => {
  for (const preset of Object.values(hud.presets)) {
    assert.equal(preset.adaptiveColor,false);
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
test('compact spacing validated; independent unit spacing removed', () => {
  assert.equal(hud.sanitize({digitSpacing:-999}).digitSpacing,-8);
  assert.equal(hud.sanitize({unitGap:999}).unitGap,undefined);
});


test('clean semibold and static white are the defaults at all speeds', () => {
  assert.equal(hud.defaults.adaptiveColor,false);assert.equal(hud.defaults.numberWeight,600);assert.equal(hud.defaults.italic,false);
  for(let i=0;i<=500;i++) assert.equal(hud.speedColor(i,hud.defaults),'#ffffff');
  assert.equal(hud.speedColor(300,hud.sanitize({color:'#87d8ff'})),'#87d8ff');
});
test('optional warm transitions are continuous and never pink', () => {
 const s=hud.sanitize({adaptiveColor:true});
 const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 for(const stop of [60,100,140]){
  const a=rgb(hud.speedColor(stop-.001,s)),b=rgb(hud.speedColor(stop+.001,s));a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<=1));
 }
 for(let speed=0;speed<=140;speed++){
  const [r,g,b]=rgb(hud.speedColor(speed,s));assert.equal(r,255);assert.ok(g>=b,'only white/amber/red, no pink');
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
test('panel position, shared weight and decimals cannot escape validation', () => {
 const s=hud.sanitize({panelX:500,panelY:-1,panelWidth:900,panelHeight:10,numberWeight:10000,unitWeight:0,decimals:1.8});
 assert.equal(s.panelX,100);assert.equal(s.panelY,0);assert.equal(s.panelWidth,480);assert.equal(s.panelHeight,300);
 assert.equal(s.numberWeight,700);assert.equal(s.unitWeight,undefined);assert.equal(s.decimals,2);
});

test('removed transmission, unit and rainbow settings cannot be revived by old presets',()=>{
 const obsolete={showGear:true,showRpm:true,rpmMax:9000,unitSize:99,unitWeight:900,unitItalic:true,unitSpacing:10,unitGap:99,unitPosition:'below',unitFollowsColor:false,unitColor:'#ff42c8',palette:'spectrum',stop60:'#ff42c8',midColor:'#ff42c8',highSpeed:100};
 const result=hud.sanitize(obsolete);
 for(const key of Object.keys(obsolete))assert.equal(Object.hasOwn(result,key),false,key);
 assert.deepEqual(result,hud.defaults);
});
