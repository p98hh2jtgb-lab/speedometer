const {test}=require('node:test');
const assert=require('node:assert/strict');
const hud=require('../mod/ui/modules/apps/ApexSpeedometer/app.js');
const options=extra=>hud.sanitize({...hud.defaults,...extra});
function arm(timer,config=hud.defaults,start=0,step=.05){
 for(let i=0;i<=Math.ceil(config.sprintArmDelay/step);i++)timer.sample(0,start+i*step,config);
}
function launch(timer,config=hud.defaults,start=.5,steps=44,step=.05){
 const results=[];
 for(let i=1;i<=steps+1;i++){
  const result=timer.sample(i*100/steps,start+i*step,config);
  if(result!==null)results.push(result);
 }
 return results;
}
test('all new tracking is opt-in; 0.3.1 clean defaults stay intact',()=>{
 assert.equal(hud.defaults.sprintEnabled,false);assert.equal(hud.defaults.sprintDuration,4);
 assert.equal(hud.defaults.style,'clean');assert.equal(hud.defaults.numberWeight,600);
 assert.equal(hud.defaults.adaptiveColor,false);assert.equal(hud.defaults.sprintFollowColor,true);
 for(const preset of Object.values(hud.looks))assert.equal(preset.sprintEnabled,undefined);
});
test('0-100 starts only after a sustained standstill, not a rolling launch',()=>{
 const timer=hud.createSprint();
 for(let i=0;i<100;i++)assert.equal(timer.sample(10+i,i*.05,hud.defaults),null);
 assert.equal(timer.phase(),'idle');
 timer.reset();timer.sample(0,0,hud.defaults);timer.sample(50,.1,hud.defaults);
 assert.equal(timer.sample(100,.2,hud.defaults),null);
});
test('no live results: completion returns 2.20 seconds exactly once',()=>{
 const timer=hud.createSprint();arm(timer);assert.equal(timer.phase(),'armed');
 const results=launch(timer);assert.equal(results.length,1);assert.ok(Math.abs(results[0]-2.2)<1e-9);
 assert.equal(timer.phase(),'finished');
 for(let i=0;i<10;i++)assert.equal(timer.sample(150,3+i*.05,hud.defaults),null);
});
test('100 km/h crossing is interpolated, not rounded to the next sample',()=>{
 const timer=hud.createSprint();arm(timer);let result;
 for(let i=1;i<=44;i++){const value=timer.sample(i*100/43.5,.5+i*.05,hud.defaults);if(value!==null)result=value;}
 assert.ok(Math.abs(result-2.175)<1e-9);
});
test('pause does not advance or complete a run',()=>{
 const timer=hud.createSprint();arm(timer);
 timer.sample(10,.55,hud.defaults);
 for(let i=0;i<100;i++)assert.equal(timer.sample(200,.55,hud.defaults),null);
 assert.equal(timer.phase(),'running');
 let result;for(let i=1;i<=44;i++){const r=timer.sample(i*100/44,.55+i*.05,hud.defaults);if(r!==null)result=r;}
 assert.ok(Math.abs(result-2.25)<1e-9);
});
test('slow-motion changes real sample count, not simulation-time result',()=>{
 const timer=hud.createSprint();arm(timer,hud.defaults,0,.005);
 const result=launch(timer,hud.defaults,.5,440,.005);
 assert.equal(result.length,1);assert.ok(Math.abs(result[0]-2.2)<1e-9);
});
test('stale gaps, reversed clocks, invalid values and reset cannot produce a result',()=>{
 for(const bad of [[40,3],[40,.1],[NaN,.6],[40,NaN],[-1,.6]]){
  const timer=hud.createSprint();arm(timer);timer.sample(10,.55,hud.defaults);
  assert.equal(timer.sample(...bad,hud.defaults),null);
  assert.equal(timer.sample(110,3.05,hud.defaults),null);
 }
 const timer=hud.createSprint();arm(timer);timer.sample(10,.55,hud.defaults);timer.reset();
 assert.equal(timer.sample(100,.6,hud.defaults),null);
});
test('an aborted launch must stop and re-arm before measuring again',()=>{
 const timer=hud.createSprint();arm(timer);timer.sample(10,.55,hud.defaults);timer.sample(0,.6,hud.defaults);
 assert.equal(timer.phase(),'idle');assert.equal(timer.sample(110,.65,hud.defaults),null);
});
test('automatic re-arm and manual-only mode behave independently',()=>{
 for(const automatic of [true,false]){
  const config=options({sprintAutoRearm:automatic}),timer=hud.createSprint();arm(timer,config);launch(timer,config);
  arm(timer,config,3);assert.equal(timer.phase(),automatic?'armed':'finished');
  const results=launch(timer,config,3.5);assert.equal(results.length,automatic?1:0);
  timer.reset();arm(timer,config,6);assert.equal(timer.phase(),'armed');
 }
});
test('a configurable stop delay is respected',()=>{
 const timer=hud.createSprint(),config=options({sprintArmDelay:1.5});
 for(let i=0;i<30;i++)timer.sample(0,i*.05,config);
 assert.equal(timer.phase(),'idle');timer.sample(0,1.5,config);assert.equal(timer.phase(),'armed');
});
test('all sprint controls reject invalid types/enums and clamp imported bounds',()=>{
 const s=options({sprintEnabled:'true',sprintDuration:100,sprintSize:-1,sprintGap:900,sprintOffset:-900,sprintOpacity:0,sprintDecimals:2.9,sprintAnimation:'evil',sprintAlign:'evil',sprintColor:'url(evil)',sprintArmDelay:0,sprintAnimationMs:Infinity});
 assert.equal(s.sprintEnabled,false);assert.equal(s.sprintDuration,15);assert.equal(s.sprintSize,10);
 assert.equal(s.sprintGap,48);assert.equal(s.sprintOffset,-120);assert.equal(s.sprintOpacity,20);
 assert.equal(s.sprintDecimals,3);assert.equal(s.sprintAnimation,'slide');assert.equal(s.sprintAlign,'center');
 assert.equal(s.sprintColor,'#ffffff');assert.equal(s.sprintArmDelay,.2);assert.equal(s.sprintAnimationMs,350);
});

test('runs exceeding 120 seconds abort instead of yielding a stale result',()=>{
 const timer=hud.createSprint();arm(timer);
 for(let i=1;i<=2401;i++)assert.equal(timer.sample(10,.5+i*.05,hud.defaults),null);
 assert.equal(timer.phase(),'idle');assert.equal(timer.sample(100,120.6,hud.defaults),null);
});
