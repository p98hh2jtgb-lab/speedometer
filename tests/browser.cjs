const {chromium:playwright} = require('@playwright/test');
const {default:chromium} = require('@sparticuz/chromium');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');

(async()=>{
 const libs=path.resolve('.cache/chromium-libs');
 fs.mkdirSync(libs,{recursive:true});
 const archive=path.join(path.dirname(require.resolve('@sparticuz/chromium')),'../bin/al2023.tar.br');
 execFileSync('tar',['xf','-','-C',libs],{input:zlib.brotliDecompressSync(fs.readFileSync(archive))});
 const browser = await playwright.launch({headless:true, executablePath:await chromium.executablePath(), args:chromium.args, env:{...process.env,LD_LIBRARY_PATH:path.join(libs,'lib')+':'+(process.env.LD_LIBRARY_PATH||'')}});
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 let passed=0;
 async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
 async function tab(name){await page.locator('[data-tab="'+name+'"]').click();}
 async function set(key,value,event='input'){
  await page.locator('[data-key="'+key+'"]').first().evaluate((el,{value,event})=>{el.value=String(value);el.dispatchEvent(new Event(event,{bubbles:true}));},{value,event});
 }
 async function toggle(){if(await page.locator('.as-panel').isVisible()) await page.locator('.as-close').click(); else await page.locator('.as-settings-button').click();}
 async function inBounds(){const box=await page.locator('.as-hud').boundingBox();const size=page.viewportSize();assert.ok(box.x>=10 && box.y>=10 && box.x+box.width<=size.width-10 && box.y+box.height<=size.height-10,JSON.stringify({box,size}));}
 async function feed(payload){await page.evaluate(p=>{clearInterval(window.feed);window.liveApp.updateElectrics(p);window.feed=setInterval(()=>window.liveApp.updateElectrics(p),40);},payload);}
 try {
 await page.goto('http://127.0.0.1:8080/');
 await check('Albanian UI, top-right gear opens settings and X closes them',async()=>{
  await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='147');
  assert.equal(await page.locator('.as-launch').count(),0);
  assert.equal(await page.locator('.as-settings-button').count(),1);
  const gear=await page.locator('.as-settings-button').boundingBox();
  assert.ok(gear.x>page.viewportSize().width-65 && gear.y<30,JSON.stringify(gear));
  assert.equal(await page.locator('[data-tab=style]').textContent(),'Pamja');
  await toggle();assert.equal(await page.locator('.as-panel').isVisible(),false);
  await toggle();assert.equal(await page.locator('.as-panel').isVisible(),true);
  assert.equal(await page.locator('.as-settings-button').getAttribute('aria-expanded'),'true');
  await page.locator('.as-settings-button svg').click();
  assert.equal(await page.locator('.as-panel').isVisible(),true); // gear opens, it doesn't toggle closed
  await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{ctrlKey:true,code:'KeyH',bubbles:true,cancelable:true})));
  assert.equal(await page.locator('.as-panel').isVisible(),true);
 });
 await check('four distinct styles switch live',async()=>{
  for(const style of ['clean','race','digital','outline']){await page.locator('[data-style="'+style+'"]').click();assert.ok(await page.locator('.as-hud').evaluate((el,s)=>el.classList.contains('as-style-'+s),style));}
 });
 await check('bundled condensed font loads and compact 100 km/h spacing is real',async()=>{
  await page.evaluate(()=>document.fonts.ready);
  await tab('behavior');await set('smoothing',0);
  await page.locator('[data-demo]').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='100');
  const n=await page.locator('.as-number').boundingBox(),u=await page.locator('.as-unit').boundingBox();
  assert.ok(u.x-(n.x+n.width)<=7,JSON.stringify({n,u}));
  assert.ok(n.width<180,'100 should not have a phantom minimum width');
  assert.equal(await page.locator('.as-number').evaluate(el=>getComputedStyle(el).minWidth),'0px');
  assert.ok(await page.evaluate(()=>document.fonts.check('600 108px "Apex Barlow"')));
  await tab('style');await set('unitGap',2);await set('digitSpacing',-2);
  assert.equal(await page.locator('.as-reading').evaluate(el=>getComputedStyle(el).gap),'2px');
 });
 await check('size, units and unit placement update independently',async()=>{
  await set('size',180);await set('unitSize',45);await page.locator('[data-key=units]').selectOption('mph');
  await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='62');
  assert.equal(await page.locator('.as-unit').textContent(),'mph');
  await page.locator('[data-key=unitPosition]').selectOption('below');assert.equal(await page.locator('.as-hud').getAttribute('data-unit-position'),'below');
 });
 await check('HUD stays inside screen bounds at extremes',async()=>{
  await tab('layout');await set('x',97);await set('y',95);await inBounds();await set('x',3);await set('y',5);await inBounds();
 });
 await check('unlock and drag with center snapping',async()=>{
  await page.locator('[data-action=bottom]').click();await page.locator('[data-key=locked]').uncheck();
  const b=await page.locator('.as-hud').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(720,650,{steps:10});await page.mouse.up();
  assert.equal(Number(await page.locator('[data-key=x]').inputValue()),50);await inBounds();
 });
 await check('color applies on change-only events and overrides game-like CSS',async()=>{
  await page.addStyleTag({content:'.as-number,.as-unit{color:white!important;-webkit-text-fill-color:white!important}'});
  await tab('color');await set('color','#12ab34','change');
  assert.equal(await page.locator('[data-key=adaptiveColor]').isChecked(),false);
  for(const selector of ['.as-number','.as-unit']){
   assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).color),'rgb(18, 171, 52)');
   assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).webkitTextFillColor),'rgb(18, 171, 52)');
  }
 });
 await check('hex entry validates without resetting colors; swatches work',async()=>{
  const hex=page.locator('input.as-hex[data-key=color]');await hex.fill('#12');
  assert.equal(await hex.getAttribute('aria-invalid'),'true');
  assert.equal(await page.locator('.as-number').evaluate(el=>getComputedStyle(el).color),'rgb(18, 171, 52)');
  await hex.fill('#75ccff');assert.equal(await hex.getAttribute('aria-invalid'),'false');
  await page.locator('[data-paint="#ff5b63"]').click();assert.equal(await page.locator('.as-number').evaluate(el=>getComputedStyle(el).color),'rgb(255, 91, 99)');
 });
 await check('speed-reactive colors visibly change with actual speed',async()=>{
  await page.locator('[data-key=adaptiveColor]').check();await set('midSpeed',100);await set('highSpeed',200);
  await set('midColor','#00ff00');await set('highColor','#ff0000');
  await tab('style');await page.locator('[data-key=units]').selectOption('kmh');
  await tab('behavior');await page.locator('[data-demo]').evaluate(el=>{el.value='200';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.as-number')).color==='rgb(255, 0, 0)');
  await page.locator('[data-demo]').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.as-number')).color==='rgb(0, 255, 0)');
 });
 await check('thresholds stay ordered',async()=>{
  await tab('color');await set('midSpeed',600);await set('highSpeed',2);assert.equal(await page.locator('[data-key=highSpeed]').inputValue(),'601');
 });
 await check('preset names are safe text, not HTML',async()=>{
  await tab('presets');await page.locator('.as-preset-name').fill('<img src=x onerror=alert(1)>');await page.locator('[data-action=save-preset]').click();
  assert.equal(await page.locator('.as-custom-row img').count(),0);assert.equal(await page.locator('.as-custom-row').count(),1);
 });
 await check('JSON export works',async()=>{
  const wait=page.waitForEvent('download');await page.locator('[data-action=export]').click();const d=await wait;
  const exported=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.equal(exported.schema,'apex-speedometer/v1');assert.equal(exported.settings.source,'dynamic');
 });
 await check('import validates and translates old source names',async()=>{
  await page.locator('.as-file').setInputFiles({name:'look.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'apex-speedometer/v1',settings:{size:9999,style:'digital',source:'ground',color:'#ff0000'}}))});
  await page.waitForFunction(()=>document.querySelector('.as-save-state').textContent==='Stili u importua');
  await tab('style');assert.equal(await page.locator('[data-key=size]').inputValue(),'220');await tab('behavior');assert.equal(await page.locator('[data-key=source]').inputValue(),'air');
 });
 await check('malformed imports report an Albanian error',async()=>{
  await tab('presets');await page.locator('.as-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('not json')});
  await page.waitForFunction(()=>document.querySelector('.as-save-state').textContent==='Skedar JSON i pavlefshëm për APEX');
 });
 await check('presets apply and custom presets delete',async()=>{
  await page.locator('[data-builtin="1"]').click();assert.ok(await page.locator('.as-hud').evaluate(el=>el.classList.contains('as-style-outline')));
  await page.locator('[data-delete-preset="0"]').click();assert.equal(await page.locator('.as-custom-row').count(),0);
 });
 await check('settings persist after reload',async()=>{
  await tab('style');await set('size',123);await page.waitForTimeout(250);await page.reload();await page.waitForSelector('[data-key=size]');assert.equal(await page.locator('[data-key=size]').inputValue(),'123');
 });
 await check('small viewport and huge HUD remain on screen',async()=>{
  await page.setViewportSize({width:390,height:740});await set('size',220);await page.locator('.as-close').click();await inBounds();await toggle();assert.ok(await page.locator('.as-panel').isVisible());await page.setViewportSize({width:1440,height:900});
 });
 await check('hide at stop and disabled HUD can still reopen with gear',async()=>{
  await tab('behavior');await page.locator('[data-key=hideStopped]').check();await page.locator('[data-demo]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('.as-close').click();await page.waitForFunction(()=>document.querySelector('.as-hud').classList.contains('as-stopped'));
  await toggle();await page.waitForFunction(()=>!document.querySelector('.as-hud').classList.contains('as-stopped'));
  await page.locator('[data-key=enabled]').uncheck();await page.locator('.as-close').click();assert.equal(await page.locator('.as-hud').isVisible(),false);
  await toggle();assert.equal(await page.locator('.as-hud').isVisible(),true);
 });
 await check('v0.1 saved wheel default migrates once, preserving other preferences',async()=>{
  await page.evaluate(()=>{window.previewApp.destroy();localStorage.removeItem('apex.speedometer.v1.revision');localStorage.setItem('apex.speedometer.v1',JSON.stringify({source:'wheel',size:111,color:'#123456'}));window.liveApp=ApexSpeedometer.mount(document.querySelector('.apex-speedometer'));});
  await toggle();await tab('behavior');assert.equal(await page.locator('[data-key=source]').inputValue(),'dynamic');await set('smoothing',0);
  await tab('style');assert.equal(await page.locator('[data-key=size]').inputValue(),'111');
 });
 await check('locked-wheel braking at 300 km/h works without ANY Lua bridge',async()=>{
  await feed({wheelspeed:0,airspeed:300/3.6,rpm:4000,gear:'5'});
  await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='300');
  assert.equal(await page.locator('.as-hud').getAttribute('data-speed-source'),'air');
  await tab('behavior');await page.locator('[data-key=source]').selectOption('air');
  assert.equal(await page.locator('.as-number').textContent(),'300');
 });
 await check('dynamic handles wheelspin and real zero; camelCase stream is supported',async()=>{
  await page.locator('[data-key=source]').selectOption('dynamic');
  await feed({wheelSpeed:120,airSpeed:25});await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='90');
  await feed({wheelspeed:120,airspeed:0});await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='0');
 });
 await check('native wheel mode remains explicit and air missing data is not fake zero',async()=>{
  await page.locator('[data-key=source]').selectOption('wheel');await feed({wheelspeed:0,airspeed:300/3.6});await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='0');
  await page.locator('[data-key=source]').selectOption('air');await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='300');
  await page.evaluate(()=>clearInterval(window.feed));
  await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='—');
 });
 await check('Lua velocity is independent fallback; vehicle reset clears old samples',async()=>{
  await page.evaluate(()=>{window.liveApp.updateGround({available:true,speed:10,reset:true});window.feed=setInterval(()=>window.liveApp.updateGround({available:true,speed:10}),40);});
  await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='36');
  assert.equal(await page.locator('.as-hud').getAttribute('data-speed-source'),'ground');
  await page.evaluate(()=>{clearInterval(window.feed);window.liveApp.updateGround({available:false,reset:true});});
  await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='—');
 });
 await check('dynamic wheel-only fallback is visibly labelled',async()=>{
  await page.locator('[data-key=source]').selectOption('dynamic');await feed({wheelspeed:20});
  await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='72');assert.match(await page.locator('.as-meta').textContent(),/REZERVË: GOMAT/);
  await page.evaluate(()=>clearInterval(window.feed));
 });
 await check('Angular adapter has no hotkey hook and gear works; cleanup releases telemetry',async()=>{
  const source=fs.readFileSync('mod/ui/modules/apps/ApexSpeedometer/app.js','utf8');
  await page.evaluate(source=>{
   window.liveApp.destroy();const handlers={}, calls=[];
   window.angular={module:()=>({directive:(name,factory)=>{window.adapter=factory();}})};
   window.StreamsManager={add:x=>calls.push(['add',x]),remove:x=>calls.push(['remove',x])};window.bngApi={engineLua:x=>calls.push(['lua',x])};
   (0,eval)(source);
   const scope={$on:(name,fn)=>{handlers[name]=fn;return ()=>{delete handlers[name];};}};
   const stale=document.createElement('link');stale.id='apex-speedometer-css';stale.rel='stylesheet';stale.href='/ui/modules/apps/ApexSpeedometer/app.css?v=0.2.0';document.head.appendChild(stale);
   window.adapter.link(scope,[document.querySelector('.apex-speedometer')]);
   if(!stale.href.endsWith('?v=0.2.1'))throw Error('old stylesheet was not upgraded');
   if(!handlers.streamsUpdate||!handlers['apexSpeedometer.ground'])throw Error('missing telemetry handlers');
   if(handlers['apexSpeedometer.toggleSettings'])throw Error('hotkey hook still registered');
   const event=new KeyboardEvent('keydown',{ctrlKey:true,code:'KeyH',bubbles:true,cancelable:true});
   document.dispatchEvent(event);
   if(event.defaultPrevented||!document.querySelector('.as-panel').hidden)throw Error('Ctrl+H still handled');
   document.querySelector('.as-settings-button').click();
   if(document.querySelector('.as-panel').hidden)throw Error('gear did not open settings');
   document.querySelector('.as-close').click();
   if(!document.querySelector('.as-panel').hidden)throw Error('X did not close settings');
   handlers.streamsUpdate(null,{electrics:{wheelspeed:0,airspeed:50,rpm:2000,gear:'2'}});
   handlers['$destroy']();
   if(Object.keys(handlers).some(k=>k!=='$destroy'))throw Error('leaked handlers');
   if(document.querySelector('.as-settings-button'))throw Error('gear leaked after app removal');
   if(!calls.some(x=>x[0]==='remove'))throw Error('stream not released');
   if(!calls.some(x=>x[0]==='lua' && x[1].includes("extensions.load('apexSpeedometer')")))throw Error('extension not loaded');
   if(!calls.some(x=>x[0]==='lua' && x[1].includes("extensions.unload('apexSpeedometer')")))throw Error('extension not unloaded');
   delete window.angular;
  },source);
 });
 await check('no uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 // Capture the real UI on a clearly labelled simulated backdrop.
 await page.evaluate(()=>localStorage.removeItem('apex.speedometer.v1'));
 await page.reload();await page.locator('[data-style=race]').click();await set('size',122);
 await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='147');await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:'preview/screenshot.png'});
 console.log(`\n${passed} browser checks passed.`);
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
