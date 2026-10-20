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
   signatures.push(await page.locator('.as-number').evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontStyle,s.fontWeight,s.textShadow,getComputedStyle(el.closest('.as-hud').querySelector('.as-flair')).display].join('|');}));
   assert.ok(await page.locator('.as-hud').evaluate((el,s)=>el.classList.contains('as-style-'+s),style));
  }
  assert.equal(new Set(signatures).size,7);
 });
 await check('number and unit weight, italic and sizes are independent',async()=>{
  await page.locator('[data-style=outline]').click();await set('size',100);await set('unitSize',25);await set('numberWeight',400);await set('unitWeight',900);await page.locator('[data-key=unitItalic]').uncheck();
  assert.equal(await page.locator('.as-number').evaluate(el=>getComputedStyle(el).fontWeight),'400');
  assert.equal(await page.locator('.as-unit').evaluate(el=>getComputedStyle(el).fontWeight),'900');
  assert.equal(await page.locator('.as-unit').evaluate(el=>getComputedStyle(el).fontStyle),'normal');
  await choose('unitPosition','side');await set('unitGap',2);await set('digitSpacing',-2);assert.equal(await page.locator('.as-reading').evaluate(el=>getComputedStyle(el).gap),'2px');
 });
 await check('clicking a toggle label changes its checkbox exactly once',async()=>{
  const label=page.locator('.as-toggle-row').filter({has:page.locator('[data-key=unitItalic]')});
  await label.locator('b').click();assert.equal(await page.locator('[data-key=unitItalic]').isChecked(),true);
  await label.locator('b').click();assert.equal(await page.locator('[data-key=unitItalic]').isChecked(),false);
 });
 await check('native color pickers not required: swatch click changes rendered color',async()=>{
  await tab('color');await page.addStyleTag({content:'.as-number,.as-unit{color:white!important;-webkit-text-fill-color:white!important}'});
  await page.locator('[data-color-key=color][data-paint="#27ec94"]').click();
  assert.equal(await color(),'rgb(39, 236, 148)');assert.equal(await color('.as-unit'),'rgb(39, 236, 148)');
  assert.equal(await page.locator('[data-set=adaptiveColor][data-value=false]').getAttribute('aria-pressed'),'true');
 });
 await check('HEX validates, Apply explicitly commits, no form submission',async()=>{
  const input=page.locator('.as-hex[data-key=color]');await input.fill('#12');assert.equal(await input.getAttribute('aria-invalid'),'true');
  assert.equal(await color(),'rgb(39, 236, 148)');await input.fill('#aabbcc');await page.locator('[data-apply-color=color]').click();
  assert.equal(await color(),'rgb(170, 187, 204)');assert.equal(await page.evaluate(()=>window.submissions),0);
 });
 await check('unit color changes independently of number and follows when requested',async()=>{
  await page.locator('[data-color-key=unitColor][data-paint="#4169ff"]').click();assert.equal(await color('.as-unit'),'rgb(65, 105, 255)');assert.equal(await color(),'rgb(170, 187, 204)');
  assert.equal(await page.locator('[data-key=unitFollowsColor]').isChecked(),false);await page.locator('[data-key=unitFollowsColor]').check();assert.equal(await color('.as-unit'),await color());
 });
 await check('full 0–100 km/h rainbow renders at each physical threshold',async()=>{
  await page.locator('[data-action=reset-spectrum]').click();await tab('behavior');await set('smoothing',0);
  for(const [speed,rgb] of [[0,'255, 255, 255'],[5,'0, 229, 255'],[20,'65, 105, 255'],[40,'168, 85, 247'],[60,'255, 66, 200'],[80,'255, 173, 50'],[100,'255, 48, 63'],[180,'255, 48, 63']]){
   await demo(speed);await waitNumber(speed);assert.equal(await color(),'rgb('+rgb+')');
  }
 });
 await check('changing units cannot change the physical color threshold',async()=>{
  await demo(40);await waitNumber(40);const old=await color();await choose('units','mph');await waitNumber(25);assert.equal(await color(),old);
  await demo(100);await waitNumber(62);assert.equal(await color(),'rgb(255, 48, 63)');await choose('units','kmh');await waitNumber(100);
 });
 await check('color stops are editable and resettable',async()=>{
  await tab('color');await page.locator('[data-stop=stop100]').click();await page.locator('[data-color-key=stop100][data-paint="#00e5ff"]').click();
  assert.equal(await color(),'rgb(0, 229, 255)');await page.locator('[data-action=reset-spectrum]').click();assert.equal(await color(),'rgb(255, 48, 63)');
 });
 await check('decimals convert using real button clicks',async()=>{
  await tab('behavior');await choose('units','mph');await choose('decimals',2);await waitNumber('62.14');await choose('decimals',1);await waitNumber('62.1');await choose('units','kmh');await waitNumber('100.0');await choose('decimals',0);
 });
 await check('Hyper scales with speed and can remain on screen at extremes',async()=>{
  await tab('style');await page.locator('[data-style=hyper]').click();await tab('behavior');await set('smoothing',0);await demo(200);await waitNumber(200);
  assert.ok(Number(await page.locator('.as-hud').evaluate(el=>el.style.getPropertyValue('--as-reactive')))>=1.09);
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
  await page.locator('.as-file').setInputFiles({name:'look.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'apex-speedometer/v1',settings:{size:9999,style:'neon',source:'ground',panelWidth:900,units:'mph'}}))});
  await page.waitForFunction(()=>document.querySelector('.as-save-state').textContent==='Stili u importua');await tab('style');assert.equal(await page.locator('[data-key=size]').inputValue(),'220');await tab('behavior');assert.equal(await page.locator('[data-set=source][data-value=air]').getAttribute('aria-pressed'),'true');
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
 await check('v0.2 migration makes existing UI smaller and installs spectrum once',async()=>{
  await page.evaluate(()=>{window.previewApp.destroy();localStorage.setItem('apex.speedometer.v1.revision','2');localStorage.setItem('apex.speedometer.v1',JSON.stringify({size:164,unitSize:40,source:'dynamic',units:'kmh',color:'#123456'}));window.liveApp=ApexSpeedometer.mount(document.querySelector('.apex-speedometer'));});await open();
  assert.equal(await page.locator('[data-key=size]').inputValue(),'88');await tab('color');assert.equal(await page.locator('[data-set=palette][data-value=spectrum]').getAttribute('aria-pressed'),'true');await tab('behavior');await set('smoothing',0);
 });
 await check('300 km/h with wheels locked is correct with no Lua bridge',async()=>{
  await feed({wheelspeed:0,airspeed:300/3.6,rpm:4000,gear:'5'});await waitNumber(300);assert.equal(await page.locator('.as-hud').getAttribute('data-speed-source'),'air');
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
 await check('Angular adapter upgrades old CSS, no shortcut, cleans up',async()=>{
  const source=fs.readFileSync('mod/ui/modules/apps/ApexSpeedometer/app.js','utf8');await page.evaluate(source=>{
   window.liveApp.destroy();const handlers={},calls=[];window.angular={module:()=>({directive:(name,factory)=>{window.adapter=factory();}})};
   window.StreamsManager={add:x=>calls.push(['add',x]),remove:x=>calls.push(['remove',x])};window.bngApi={engineLua:x=>calls.push(['lua',x])};(0,eval)(source);
   const scope={$on:(name,fn)=>{handlers[name]=fn;return()=>{delete handlers[name];};}};
   const css=document.createElement('link');css.id='apex-speedometer-css';css.rel='stylesheet';css.href='/ui/modules/apps/ApexSpeedometer/app.css?v=0.2.1';document.head.appendChild(css);
   window.adapter.link(scope,[document.querySelector('.apex-speedometer')]);if(!css.href.endsWith('?v=0.3.0'))throw Error('stale CSS');
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
