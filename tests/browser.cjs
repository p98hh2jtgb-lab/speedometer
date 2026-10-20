const {chromium:playwright} = require('@playwright/test');
const {default:chromium} = require('@sparticuz/chromium');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');

(async()=>{
 const libs=path.resolve('.cache/chromium-libs'); fs.mkdirSync(libs,{recursive:true});
 const archive=path.join(path.dirname(require.resolve('@sparticuz/chromium')),'../bin/al2023.tar.br');
 execFileSync('tar',['xf','-','-C',libs],{input:zlib.brotliDecompressSync(fs.readFileSync(archive))});
 const browser=await playwright.launch({headless:true,executablePath:await chromium.executablePath(),args:chromium.args,env:{...process.env,LD_LIBRARY_PATH:path.join(libs,'lib')+':'+(process.env.LD_LIBRARY_PATH||'')}});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>{
  window.addEventListener('DOMContentLoaded',()=>{
   window.submissions=0;const form=document.createElement('form');document.body.appendChild(form);
   const root=document.querySelector('.apex-speedometer');if(root)form.appendChild(root);
   form.addEventListener('submit',e=>{e.preventDefault();window.submissions++;});
  });
 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let passed=0;
 async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
 async function tab(id){await page.locator('[data-tab="'+id+'"]').click();}
 async function choose(key,value){await page.locator('[data-set="'+key+'"][data-value="'+value+'"]').click();}
 async function set(key,value,event='input'){
  await page.locator('[data-key="'+key+'"]').first().evaluate((el,p)=>{el.value=String(p.value);el.dispatchEvent(new Event(p.event,{bubbles:true}));},{value,event});
 }
 async function demo(speed){await page.locator('[data-demo]').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(speed));}
 async function waitNumber(value){await page.waitForFunction(v=>document.querySelector('.as-number').textContent===v,String(value));}
 async function color(selector='.as-number'){return page.locator(selector).evaluate(el=>getComputedStyle(el).color);}
 async function bounds(selector='.as-hud'){
  const b=await page.locator(selector).boundingBox(),v=page.viewportSize();
  assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,JSON.stringify({b,v}));
 }
 async function open(){if(!(await page.locator('.as-panel').isVisible()))await page.locator('.as-settings-button').click();}
 async function close(){await page.locator('.as-close').click();}
 async function feed(data){await page.evaluate(p=>{clearInterval(window.feed);window.liveApp.updateElectrics(p);window.feed=setInterval(()=>window.liveApp.updateElectrics(p),40);},data);}
 async function movePanel(x,y){const h=await page.locator('.as-header').boundingBox();await page.mouse.move(h.x+60,h.y+20);await page.mouse.down();await page.mouse.move(x,y,{steps:10});await page.mouse.up();}
 try{
 await page.goto('http://127.0.0.1:8080/');
 await check('compact Albanian settings, top-right gear, X and no Ctrl+H',async()=>{
  await waitNumber(65);assert.equal(await page.locator('[data-tab=style]').textContent(),'Pamja');
  const p=await page.locator('.as-panel').boundingBox();assert.equal(p.width,340);assert.equal(p.height,560);
  assert.equal(await page.locator('.as-launch').count(),0);await close();await open();
  const handled=await page.evaluate(()=>{const e=new KeyboardEvent('keydown',{ctrlKey:true,code:'KeyH',cancelable:true,bubbles:true});document.dispatchEvent(e);return e.defaultPrevented;});assert.equal(handled,false);
 });
 await check('real click buttons convert km/h to mph and back immediately',async()=>{
  await choose('units','mph');await waitNumber(40);assert.equal(await page.locator('.as-unit').textContent(),'mph');
  await choose('units','kmh');await waitNumber(65);assert.equal(await page.locator('.as-unit').textContent(),'km/h');
  assert.equal(await page.locator('select,input[type=color]').count(),0);
 });
 await check('settings can live inside a game-like form without submitting it',async()=>{
  assert.ok(await page.locator('form .apex-speedometer').count());
  await choose('units','mph');await waitNumber(40);await choose('units','kmh');await waitNumber(65);
  assert.equal(await page.evaluate(()=>window.submissions),0);
 });
 await check('drag settings separately, save position, do not move HUD',async()=>{
  const before=await page.locator('.as-hud').boundingBox();await movePanel(870,180);
  const panel=await page.locator('.as-panel').boundingBox(),after=await page.locator('.as-hud').boundingBox();
  assert.ok(panel.x>700);assert.ok(Math.abs(before.x-after.x)<1&&Math.abs(before.y-after.y)<1);await bounds('.as-panel');
  await page.reload();await waitNumber(65);const saved=await page.locator('.as-panel').boundingBox();assert.ok(Math.abs(saved.x-panel.x)<2&&Math.abs(saved.y-panel.y)<2);
 });
 await check('collapse and restore panel; X is still available',async()=>{
  await page.locator('.as-collapse').click();assert.equal((await page.locator('.as-panel').boundingBox()).height,56);
  assert.equal(await page.locator('.as-content').isVisible(),false);await close();await open();
  await page.locator('.as-collapse').click();assert.equal(await page.locator('.as-content').isVisible(),true);
 });
 await check('panel width and height can be reduced and keyboard-moved',async()=>{
  await tab('layout');await set('panelWidth',300);await set('panelHeight',420);
  const b=await page.locator('.as-panel').boundingBox();assert.equal(b.width,300);assert.equal(b.height,420);
  await page.locator('.as-header').focus();await page.keyboard.press('ArrowLeft');
  assert.ok((await page.locator('.as-panel').boundingBox()).x<b.x);await bounds('.as-panel');
  await set('panelWidth',340);await set('panelHeight',560);
 });
 await check('panel-away places controls outside a top-left speedometer',async()=>{
  await set('x',5);await set('y',8);await set('panelX',0);await set('panelY',0);
  await page.locator('.as-footer [data-action=panel-away]').click();const p=await page.locator('.as-panel').boundingBox(),h=await page.locator('.as-hud').boundingBox();assert.ok(p.x>h.x+h.width);
 });
 await check('HUD can be dragged independently while settings remain fixed',async()=>{
  await set('x',50);await set('y',82);await page.locator('[data-key=locked]').uncheck();const panel=await page.locator('.as-panel').boundingBox(),h=await page.locator('.as-hud').boundingBox();
  await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(720,650,{steps:10});await page.mouse.up();
  assert.equal(Number(await page.locator('[data-key=x]').inputValue()),50);assert.deepEqual(await page.locator('.as-panel').boundingBox(),panel);
  await page.locator('[data-key=locked]').check();await bounds();
 });
 await check('clicking actual speed text also switches km/h and mph',async()=>{
  await close();await page.locator('.as-number').click();await waitNumber(40);await page.locator('.as-unit').click();await waitNumber(65);await open();
 });
 await check('seven looks change actual font, geometry and effects, not just labels',async()=>{
  await tab('style');const signatures=[];
  for(const style of ['clean','outline','race','neon','hyper','minimal','digital']){
   await page.locator('[data-style="'+style+'"]').click();await page.evaluate(()=>document.fonts.ready);
   signatures.push(await page.locator('.as-number').evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontStyle,s.fontWeight,s.textShadow,s.webkitTextStrokeWidth,getComputedStyle(el.closest('.as-hud')).backgroundImage].join('|');}));
   assert.ok(await page.locator('.as-hud').evaluate((el,s)=>el.classList.contains('as-style-'+s),style));
  }
  assert.equal(new Set(signatures).size,7);
 });
 await check('shared typography: number and unit stay inline in every style',async()=>{
  for(const style of ['clean','outline','race','neon','hyper','minimal','digital']){
   await page.locator('[data-style="'+style+'"]').click();
   const n=await page.locator('.as-number').boundingBox(),u=await page.locator('.as-unit').boundingBox();
   assert.ok(u.x>=n.x+n.width-1&&u.y<n.y+n.height,'unit must stay next to number: '+style);
   assert.equal(await color('.as-unit'),await color());
   const typography=await page.locator('.as-reading').evaluate(el=>{const a=getComputedStyle(el.firstChild),b=getComputedStyle(el.lastChild);return [a.fontFamily===b.fontFamily,a.fontWeight===b.fontWeight,a.fontStyle===b.fontStyle];});assert.deepEqual(typography,[true,true,true]);
  }
  await page.locator('[data-style=clean]').click();await set('size',100);await set('numberWeight',400);
  assert.equal(await page.locator('.as-number').evaluate(el=>getComputedStyle(el).fontSize),'100px');
  assert.equal(await page.locator('.as-unit').evaluate(el=>getComputedStyle(el).fontSize),'25px');
  assert.equal(await page.locator('.as-unit').evaluate(el=>getComputedStyle(el).fontWeight),'400');
  assert.equal(await page.locator('[data-key=unitSize],[data-key=unitWeight],[data-set=unitPosition]').count(),0);
 });
 await check('clicking shared italic label toggles both exactly once',async()=>{
  const label=page.locator('.as-toggle-row').filter({has:page.locator('[data-key=italic]')});
  await label.locator('b').click();assert.equal(await page.locator('[data-key=italic]').isChecked(),true);
  assert.equal(await page.locator('.as-unit').evaluate(el=>getComputedStyle(el).fontStyle),'italic');
  await label.locator('b').click();assert.equal(await page.locator('[data-key=italic]').isChecked(),false);
 });
 await check('native color pickers not required: swatch click changes rendered color',async()=>{
  await tab('color');await page.addStyleTag({content:'.as-number,.as-unit,.as-sprint-card,.as-sprint-label,.as-sprint-time{color:white!important;-webkit-text-fill-color:white!important}'});
  await page.locator('[data-color-key=color][data-paint="#87d8ff"]').click();
  assert.equal(await color(),'rgb(135, 216, 255)');assert.equal(await color('.as-unit'),'rgb(135, 216, 255)');
  assert.equal(await page.locator('[data-set=adaptiveColor][data-value=false]').getAttribute('aria-pressed'),'true');
 });
 await check('HEX validates, Apply explicitly commits, no form submission',async()=>{
  const input=page.locator('.as-hex[data-key=color]');await input.fill('#12');assert.equal(await input.getAttribute('aria-invalid'),'true');
  assert.equal(await color(),'rgb(135, 216, 255)');await input.fill('#aabbcc');await page.locator('[data-apply-color=color]').click();
  assert.equal(await color(),'rgb(170, 187, 204)');assert.equal(await page.evaluate(()=>window.submissions),0);
 });
 await check('one color control paints the whole reading; no telemetry or unit controls',async()=>{
  assert.equal(await page.locator('.as-unit').evaluate(el=>getComputedStyle(el).color),'rgb(170, 187, 204)');
  assert.equal(await page.locator('.as-gear,.as-rpm,[data-key=unitColor],[data-key=unitFollowsColor]').count(),0);
  await tab('behavior');assert.equal(await page.locator('[data-key=showGear],[data-key=showRpm],[data-key=rpmMax]').count(),0);
 });
 await check('default fixed white stays white from 0 to 300, including low speed',async()=>{
  await tab('style');await page.locator('[data-style=clean]').click();await tab('behavior');await set('smoothing',0);
  for(const speed of [0,5,20,40,60,80,100,180,300]){await demo(speed);await waitNumber(speed);assert.equal(await color(),'rgb(255, 255, 255)');assert.equal(await color('.as-unit'),await color());}
 });
 await check('optional warm color is explicit, restrained and shared',async()=>{
  await tab('color');await choose('adaptiveColor',true);
  assert.equal(await page.locator('[data-set=palette],[data-stop]').count(),0);
  await tab('behavior');
  for(const [speed,rgb] of [[0,'255, 255, 255'],[5,'255, 255, 255'],[40,'255, 255, 255'],[60,'255, 255, 255'],[100,'255, 209, 102'],[140,'255, 69, 58'],[300,'255, 69, 58']]){
   await demo(speed);await waitNumber(speed);assert.equal(await color(),'rgb('+rgb+')');assert.equal(await color('.as-unit'),await color());
  }
 });
 await check('unit conversion preserves physical warm threshold',async()=>{
  await demo(100);await waitNumber(100);const old=await color();await choose('units','mph');await waitNumber(62);assert.equal(await color(),old);assert.equal(await color('.as-unit'),old);
  await choose('units','kmh');await waitNumber(100);await tab('behavior');
 });
 await check('decimals convert using real button clicks',async()=>{
  await tab('behavior');await choose('units','mph');await choose('decimals',2);await waitNumber('62.14');await choose('decimals',1);await waitNumber('62.1');await choose('units','kmh');await waitNumber('100.0');await choose('decimals',0);
 });
 await check('Hyper scales with speed and can remain on screen at extremes',async()=>{
  await tab('style');await page.locator('[data-style=hyper]').click();await tab('behavior');await set('smoothing',0);await demo(200);await waitNumber(200);
  assert.ok(Number(await page.locator('.as-hud').evaluate(el=>el.style.getPropertyValue('--as-reactive')))>=1.05);
  await tab('layout');await set('x',97);await set('y',95);await bounds();await set('x',3);await set('y',5);await bounds();await set('x',50);await set('y',82);
 });
 await check('tiny screen clamps panel and the number; gear and X are usable',async()=>{
  await page.setViewportSize({width:390,height:740});await bounds('.as-panel');await bounds();await close();await open();await close();await open();await page.setViewportSize({width:1440,height:900});
 });
 await check('custom preset names are text, safe inside the game form',async()=>{
  await tab('presets');await page.locator('.as-preset-name').fill('<img src=x onerror=alert(1)>');await page.locator('[data-action=save-preset]').click();assert.equal(await page.locator('.as-custom-row img').count(),0);assert.equal(await page.locator('.as-custom-row').count(),1);assert.equal(await page.evaluate(()=>window.submissions),0);
 });
 await check('built-in preset does not move or resize settings panel',async()=>{
  const before=await page.locator('.as-panel').boundingBox();await page.locator('[data-builtin="2"]').click();assert.deepEqual(await page.locator('.as-panel').boundingBox(),before);
 });
 await check('JSON export and valid import keep source, units and compact bounds',async()=>{
  const wait=page.waitForEvent('download');await page.locator('[data-action=export]').click();const download=await wait;
  const file=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(file.schema,'apex-speedometer/v1');assert.equal(file.settings.units,'kmh');
  await page.locator('.as-file').setInputFiles({name:'look.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'apex-speedometer/v1',settings:{size:9999,style:'neon',source:'ground',panelWidth:900,units:'mph',showGear:true,showRpm:true,unitPosition:'below',unitColor:'#ff42c8',unitFollowsColor:false,unitSize:70}}))});
  await page.waitForFunction(()=>document.querySelector('.as-save-state').textContent==='Stili u importua');await tab('style');assert.equal(await page.locator('[data-key=size]').inputValue(),'220');await tab('behavior');assert.equal(await page.locator('[data-set=source][data-value=air]').getAttribute('aria-pressed'),'true');
  await demo(300);await choose('decimals',2);await waitNumber('186.41');
  await page.setViewportSize({width:390,height:740});await bounds();
  const n=await page.locator('.as-number').boundingBox(),u=await page.locator('.as-unit').boundingBox();
  assert.ok(u.x>=n.x+n.width-1&&u.y<n.y+n.height);assert.equal(await color('.as-unit'),await color());
  assert.equal(await page.locator('.as-gear,.as-rpm').count(),0);await page.setViewportSize({width:1440,height:900});

 });
 await check('malformed JSON import reports an Albanian error',async()=>{
  await tab('presets');await page.locator('.as-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('not json')});await page.waitForFunction(()=>document.querySelector('.as-save-state').textContent==='Skedar JSON i pavlefshëm për APEX');
 });
 await check('preset deletion and options persist after reload',async()=>{
  await page.locator('[data-delete-preset="0"]').click();assert.equal(await page.locator('.as-custom-row').count(),0);await tab('style');await set('size',91);await page.waitForTimeout(220);await page.reload();await page.waitForSelector('[data-key=size]');assert.equal(await page.locator('[data-key=size]').inputValue(),'91');
 });
 await check('hidden or disabled HUD can always reopen from gear',async()=>{
  await tab('behavior');await page.locator('[data-key=hideStopped]').check();await demo(0);await close();await page.waitForFunction(()=>document.querySelector('.as-hud').classList.contains('as-stopped'));await open();
  await page.locator('[data-key=enabled]').uncheck();await close();assert.equal(await page.locator('.as-hud').isVisible(),false);await open();assert.equal(await page.locator('.as-hud').isVisible(),true);
 });
 await check('older versions migrate cleanly; withdrawn v0.3.2 returns to fixed color',async()=>{
  await page.evaluate(()=>window.previewApp.destroy());
  for(const revision of [2,3,5]){
   await page.evaluate(revision=>{
    if(window.liveApp)window.liveApp.destroy();
    localStorage.setItem('apex.speedometer.v1.revision',String(revision));
    localStorage.setItem('apex.speedometer.v1',JSON.stringify({size:revision===5?88:164,unitSize:40,numberWeight:revision===5?600:900,italic:revision!==5,style:revision===5?'clean':'race',source:'dynamic',units:'kmh',color:'#ff42c8',adaptiveColor:true,palette:'spectrum',unitPosition:'below',unitFollowsColor:false,unitColor:'#ff42c8',showGear:true,showRpm:true,x:28,y:77,panelX:100,panelY:50}));
    window.liveApp=ApexSpeedometer.mount(document.querySelector('.apex-speedometer'));
   },revision);await open();
   assert.equal(await page.locator('[data-key=size]').inputValue(),'88');assert.equal(await page.locator('[data-key=numberWeight]').inputValue(),'600');
   assert.equal(await color(),'rgb(255, 255, 255)');assert.equal(await color('.as-unit'),await color());
   assert.equal(await page.locator('.as-gear,.as-rpm').count(),0);
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('apex.speedometer.v1')));
   assert.equal(saved.style,'clean');assert.equal(saved.adaptiveColor,false);assert.equal(saved.x,28);assert.equal(saved.y,77);assert.equal(saved.panelX,100);assert.equal(saved.panelY,50);assert.equal(saved.unitPosition,undefined);assert.equal(saved.showGear,undefined);
   assert.equal(await page.evaluate(()=>localStorage.getItem('apex.speedometer.v1.revision')),'4');
  }
  await tab('color');await page.locator('[data-color-key=color][data-paint="#4169ff"]').click();await page.waitForTimeout(220);
  await page.evaluate(()=>{window.liveApp.destroy();window.liveApp=ApexSpeedometer.mount(document.querySelector('.apex-speedometer'));});await open();assert.equal(await color(),'rgb(65, 105, 255)');
  await tab('color');await page.locator('[data-color-key=color][data-paint="#ffffff"]').click();await tab('behavior');await set('smoothing',0);
 });
 await check('300 km/h with wheels locked is correct with no Lua bridge',async()=>{
  await feed({wheelspeed:0,airspeed:300/3.6,rpm:4000,gear:'5'});await waitNumber(300);assert.equal(await page.locator('.as-gear,.as-rpm').count(),0);assert.equal(await page.locator('.as-hud').getAttribute('data-speed-source'),'air');
  await choose('source','air');await waitNumber(300);await choose('units','mph');await waitNumber(186);await choose('units','kmh');await waitNumber(300);
 });
 await check('dynamic handles wheelspin, real zero and camelCase streams',async()=>{
  await choose('source','dynamic');await feed({wheelSpeed:120,airSpeed:25});await waitNumber(90);await feed({wheelspeed:120,airspeed:0});await waitNumber(0);
 });
 await check('wheel mode is explicit, Air missing data is a dash not fake zero',async()=>{
  await choose('source','wheel');await feed({wheelspeed:0,airspeed:300/3.6});await waitNumber(0);await choose('source','air');await waitNumber(300);
  await page.evaluate(()=>clearInterval(window.feed));await waitNumber('—');
 });
 await check('Lua motion remains independent fallback and reset clears samples',async()=>{
  await page.evaluate(()=>{window.liveApp.updateGround({available:true,speed:10,reset:true});window.feed=setInterval(()=>window.liveApp.updateGround({available:true,speed:10}),40);});await waitNumber(36);
  assert.equal(await page.locator('.as-hud').getAttribute('data-speed-source'),'ground');await page.evaluate(()=>{clearInterval(window.feed);window.liveApp.updateGround({available:false,reset:true});});await waitNumber('—');
 });
 await check('dynamic fallback to wheels is visibly labelled',async()=>{
  await choose('source','dynamic');await feed({wheelspeed:20});await waitNumber(72);assert.match(await page.locator('.as-meta').textContent(),/REZERVË: GOMAT/);await page.evaluate(()=>clearInterval(window.feed));
 });
 await check('0-100 is OFF by default: no tracker, calculations, seconds or preview',async()=>{
  await page.evaluate(()=>{
   clearInterval(window.feed);window.liveApp.destroy();
   const settings=JSON.parse(localStorage.getItem('apex.speedometer.v1'));settings.sprintEnabled=false;settings.enabled=true;settings.smoothing=0;settings.units='kmh';settings.style='clean';settings.size=88;settings.numberWeight=600;settings.x=50;settings.y=70;
   localStorage.setItem('apex.speedometer.v1',JSON.stringify(settings));
   window.originalSprint=ApexSpeedometer.createSprint;window.sprintCounts={created:0,sampled:0};
   ApexSpeedometer.createSprint=()=>{window.sprintCounts.created++;const timer=window.originalSprint(),sample=timer.sample;timer.sample=(...args)=>{window.sprintCounts.sampled++;return sample(...args);};return timer;};
   window.liveApp=ApexSpeedometer.mount(document.querySelector('.apex-speedometer'));
   window.sendGround=points=>{
    clearInterval(window.keepGround);
    for(const p of points){window.lastGround={available:true,speed:p[1]/3.6,simTime:p[0]};window.liveApp.updateGround(window.lastGround);}
    window.keepGround=setInterval(()=>window.liveApp.updateGround(window.lastGround),40);
   };
   window.runPoints=base=>{const points=[];for(let i=0;i<=10;i++)points.push([base+i*.05,0]);for(let i=1;i<=44;i++)points.push([base+.5+i*.05,i*100/44]);return points;};
   window.sendGround(window.runPoints(0));
  });await open();await tab('sprint');
  assert.equal(await page.locator('[data-key=sprintEnabled]').isChecked(),false);
  assert.equal(await page.locator('.as-sprint').isVisible(),false);assert.equal(await page.locator('.as-sprint-time').textContent(),'');
  assert.deepEqual(await page.evaluate(()=>window.sprintCounts),{created:0,sampled:0});
  assert.equal(await page.locator('[data-action=sprint-preview]').isDisabled(),true);
 });
 await check('ON still hides all seconds until 100, then displays 2.20 s without moving number',async()=>{
  await page.locator('[data-key=sprintEnabled]').check();
  assert.equal(await page.locator('.as-sprint').isVisible(),false);
  await page.evaluate(()=>window.sendGround(window.runPoints(4).slice(0,-4)));
  assert.equal(await page.locator('.as-sprint').isVisible(),false);assert.equal(await page.locator('.as-sprint-time').textContent(),'');
  const before=await page.locator('.as-reading').boundingBox();
  await page.evaluate(()=>window.sendGround(window.runPoints(4).slice(-4)));
  await page.waitForSelector('.as-sprint:visible');
  assert.equal(await page.locator('.as-sprint-time').textContent(),'2.20 s');assert.equal(await page.locator('.as-sprint-label').textContent(),'0–100 km/h');
  const after=await page.locator('.as-reading').boundingBox(),result=await page.locator('.as-sprint').boundingBox();
  assert.ok(Math.abs(before.y-after.y)<1);assert.ok(result.y>=after.y+after.height);
  assert.equal(await page.locator('.as-number').evaluate(el=>getComputedStyle(el).fontWeight),'600');
  assert.equal(await page.locator('.as-unit').evaluate(el=>getComputedStyle(el).color),await color());
  assert.ok((await page.evaluate(()=>window.sprintCounts.sampled))>0);
  await page.waitForTimeout(380);await page.screenshot({path:'preview/sprint.png'});
 });
 await check('OFF cancels an unfinished run; enabling while moving cannot resume it',async()=>{
  await page.evaluate(()=>window.sendGround(window.runPoints(8).slice(0,-4)));
  assert.equal(await page.locator('.as-sprint').isVisible(),false);
  await page.locator('[data-key=sprintEnabled]').uncheck();const count=await page.evaluate(()=>window.sprintCounts.sampled);
  await page.evaluate(()=>window.sendGround(window.runPoints(8).slice(-4)));
  assert.equal(await page.evaluate(()=>window.sprintCounts.sampled),count);
  await page.locator('[data-key=sprintEnabled]').check();
  await page.evaluate(()=>window.sendGround([[11,90],[11.05,100]]));assert.equal(await page.locator('.as-sprint').isVisible(),false);
  await page.evaluate(()=>window.sendGround(window.runPoints(12)));assert.equal(await page.locator('.as-sprint-time').textContent(),'2.20 s');
 });
 await check('result customization changes actual size, placement, color, label and decorations',async()=>{
  await set('sprintSize',22);await set('sprintGap',10);await set('sprintOffset',8);await set('sprintOpacity',80);
  await choose('sprintAlign','right');await choose('sprintDecimals',1);await page.locator('[data-key=sprintLabel]').uncheck();
  await page.locator('[data-color-key=sprintColor][data-paint="#4169ff"]').click();
  assert.equal(await page.locator('[data-key=sprintFollowColor]').isChecked(),false);
  await page.locator('[data-key=sprintBackground]').check();await page.locator('[data-key=sprintBorder]').check();await page.locator('[data-key=sprintAnimate]').uncheck();
  await page.locator('[data-action=sprint-preview]').click();
  assert.equal(await page.locator('.as-sprint-time').textContent(),'2.2 s');
  assert.equal(await page.locator('.as-sprint-label').textContent(),'PROVË');
  assert.equal(await page.locator('.as-sprint-card').evaluate(el=>getComputedStyle(el).fontSize),'22px');
  assert.equal(await page.locator('.as-sprint-card').evaluate(el=>getComputedStyle(el).color),'rgb(65, 105, 255)');
  assert.equal(await page.locator('.as-sprint').evaluate(el=>getComputedStyle(el).opacity),'0.8');
  assert.equal(await page.locator('.as-sprint').getAttribute('data-align'),'right');
  assert.ok(await page.locator('.as-sprint').evaluate(el=>el.classList.contains('as-sprint-backed')&&el.classList.contains('as-sprint-bordered')));
  assert.equal(await page.locator('.as-sprint-card').evaluate(el=>getComputedStyle(el).animationName),'none');
 });
 await check('Fade, Slide and Pop animate in and out, then remove the result',async()=>{
  await set('sprintDuration',1);await set('sprintAnimationMs',200);await page.locator('[data-key=sprintAnimate]').check();
  for(const mode of ['fade','slide','pop']){
   await choose('sprintAnimation',mode);await page.locator('[data-action=sprint-preview]').click();
   assert.equal(await page.locator('.as-sprint').getAttribute('data-phase'),'in');
   assert.equal(await page.locator('.as-sprint-card').evaluate(el=>getComputedStyle(el).animationName),'as-sprint-'+mode+'-in');
   await page.waitForFunction(()=>document.querySelector('.as-sprint').dataset.phase==='out');
   assert.equal(await page.locator('.as-sprint-card').evaluate(el=>getComputedStyle(el).animationName),'as-sprint-'+mode+'-out');
   await page.waitForFunction(()=>document.querySelector('.as-sprint').hidden);assert.equal(await page.locator('.as-sprint-time').textContent(),'');
  }
 });
 await check('animation OFF and reduced motion both remove all motion',async()=>{
  await page.locator('[data-key=sprintAnimate]').uncheck();await page.locator('[data-action=sprint-preview]').click();
  assert.equal(await page.locator('.as-sprint').getAttribute('data-animation'),'none');
  await page.waitForFunction(()=>document.querySelector('.as-sprint').hidden);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-key=sprintAnimate]').check();await page.locator('[data-action=sprint-preview]').click();
  assert.equal(await page.locator('.as-sprint-card').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.waitForFunction(()=>document.querySelector('.as-sprint').hidden);await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('meter OFF immediately removes result, stops calculations and persists custom controls',async()=>{
  await page.locator('[data-action=sprint-preview]').click();assert.equal(await page.locator('.as-sprint').isVisible(),true);
  await page.locator('[data-key=sprintEnabled]').uncheck();assert.equal(await page.locator('.as-sprint').isVisible(),false);
  const before=await page.evaluate(()=>window.sprintCounts.sampled);await page.evaluate(()=>window.sendGround(window.runPoints(8)));
  assert.equal(await page.evaluate(()=>window.sprintCounts.sampled),before);assert.equal(await page.locator('.as-sprint-time').textContent(),'');
  assert.match(await page.locator('.as-sprint-state').textContent(),/^OFF/);await page.waitForTimeout(220);
  await page.evaluate(()=>{window.liveApp.destroy();window.liveApp=ApexSpeedometer.mount(document.querySelector('.apex-speedometer'));});await open();await tab('sprint');
  assert.equal(await page.locator('[data-key=sprintEnabled]').isChecked(),false);assert.equal(await page.locator('[data-key=sprintSize]').inputValue(),'22');assert.equal(await page.locator('[data-key=sprintDuration]').inputValue(),'1');
  assert.equal(await page.locator('[data-key=sprintBorder]').isChecked(),true);assert.equal(await page.locator('.as-sprint').isVisible(),false);
 });
 await check('wheelspin, missing Lua and missing sim clock never produce fake acceleration times',async()=>{
  await page.locator('[data-key=sprintEnabled]').check();
  await page.evaluate(()=>{
   clearInterval(window.keepGround);window.liveApp.updateGround({available:false,reset:true});
   for(let i=0;i<100;i++)window.liveApp.updateElectrics({wheelspeed:i*2,airspeed:i});
   for(const p of window.runPoints(12))window.liveApp.updateGround({available:true,speed:p[1]/3.6});
  });await page.waitForTimeout(100);
  assert.equal(await page.locator('.as-sprint').isVisible(),false);assert.equal(await page.locator('.as-sprint-time').textContent(),'');
  assert.match(await page.locator('.as-sprint-state').textContent(),/LUA/);
 });
 await check('raw simulation motion times correctly despite mph, smoothing and locked wheels; reset clears',async()=>{
  await tab('behavior');await choose('units','mph');await set('smoothing',500);await tab('sprint');
  await page.locator('[data-key=sprintLabel]').check();await choose('sprintDecimals',2);await page.locator('[data-key=sprintAnimate]').uncheck();
  await page.evaluate(()=>{window.liveApp.updateElectrics({wheelspeed:0});window.sendGround(window.runPoints(16));});
  assert.equal(await page.locator('.as-sprint-time').textContent(),'2.20 s');assert.equal(await page.locator('.as-sprint-label').textContent(),'0–100 km/h');
  assert.equal(await page.locator('.as-unit').textContent(),'mph');
  await page.evaluate(()=>{clearInterval(window.keepGround);window.liveApp.updateGround({available:true,speed:0,simTime:0,reset:true});});
  assert.equal(await page.locator('.as-sprint').isVisible(),false);
 });
 await check('large customized result and main HUD both remain inside a small viewport',async()=>{
  await set('sprintSize',40);await set('sprintGap',48);await set('sprintOffset',120);await choose('sprintAlign','center');
  await tab('layout');await set('x',97);await set('y',95);await tab('sprint');
  await page.setViewportSize({width:390,height:740});await page.locator('[data-action=sprint-preview]').click();
  await bounds();await bounds('.as-sprint');
  await page.locator('[data-key=sprintEnabled]').uncheck();await page.setViewportSize({width:1440,height:900});
  assert.equal(await page.evaluate(()=>window.submissions),0);
  await page.evaluate(()=>{clearInterval(window.keepGround);ApexSpeedometer.createSprint=window.originalSprint;});
 });
 await check('Angular adapter upgrades old CSS, no shortcut, cleans up',async()=>{
  const source=fs.readFileSync('mod/ui/modules/apps/ApexSpeedometer/app.js','utf8');await page.evaluate(source=>{
   window.liveApp.destroy();const handlers={},calls=[];window.angular={module:()=>({directive:(name,factory)=>{window.adapter=factory();}})};
   window.StreamsManager={add:x=>calls.push(['add',x]),remove:x=>calls.push(['remove',x])};window.bngApi={engineLua:x=>calls.push(['lua',x])};(0,eval)(source);
   const scope={$on:(name,fn)=>{handlers[name]=fn;return()=>{delete handlers[name];};}};
   const css=document.createElement('link');css.id='apex-speedometer-css';css.rel='stylesheet';css.href='/ui/modules/apps/ApexSpeedometer/app.css?v=0.2.1';document.head.appendChild(css);
   window.adapter.link(scope,[document.querySelector('.apex-speedometer')]);if(!css.href.endsWith('?v=0.3.3'))throw Error('stale CSS');
   if(!handlers.streamsUpdate||!handlers['apexSpeedometer.ground']||handlers['apexSpeedometer.toggleSettings'])throw Error('wrong subscriptions');
   document.querySelector('.as-settings-button').click();if(document.querySelector('.as-panel').hidden)throw Error('gear failed');document.querySelector('.as-close').click();if(!document.querySelector('.as-panel').hidden)throw Error('X failed');
   handlers['$destroy']();if(Object.keys(handlers).some(k=>k!=='$destroy'))throw Error('listener leaked');if(document.querySelector('.as-settings-button'))throw Error('DOM leaked');if(!calls.some(x=>x[0]==='remove'))throw Error('stream leaked');delete window.angular;
  },source);
 });
 await check('no uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 await page.evaluate(()=>{localStorage.removeItem('apex.speedometer.v1');localStorage.removeItem('apex.speedometer.v1.revision');});await page.reload();await waitNumber(65);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'preview/screenshot.png'});
 console.log('\n'+passed+' browser checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
