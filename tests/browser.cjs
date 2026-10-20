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
 async function set(key,value){await page.locator('[data-key="'+key+'"]').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
 async function inBounds(){const box=await page.locator('.as-hud').boundingBox();const size=page.viewportSize();assert.ok(box.x>=10 && box.y>=10 && box.x+box.width<=size.width-10 && box.y+box.height<=size.height-10,JSON.stringify({box,size}));}
 try {
 await page.goto('http://127.0.0.1:8080/preview/index.html');
 await check('demo renders settings and a live number',async()=>{await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='147');assert.equal(await page.locator('.as-panel').isVisible(),true);});
 await check('four distinct styles switch live',async()=>{for(const style of ['clean','race','digital','outline']){await page.locator('[data-style="'+style+'"]').click();assert.ok(await page.locator('.as-hud').evaluate((el,s)=>el.classList.contains('as-style-'+s),style));}});
 await check('size, units and placement update independently',async()=>{await set('size',180);await set('unitSize',45);await page.locator('[data-key=units]').selectOption('mph');await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='91');assert.equal(await page.locator('.as-unit').textContent(),'MPH');await page.locator('[data-key=unitPosition]').selectOption('below');assert.equal(await page.locator('.as-hud').getAttribute('data-unit-position'),'below');});
 await check('HUD clamps to safe screen bounds at extremes',async()=>{await tab('layout');await set('x',97);await set('y',95);await inBounds();await set('x',3);await set('y',5);await inBounds();});
 await check('unlock and drag with center snapping',async()=>{await page.locator('[data-action=bottom]').click();await page.locator('[data-key=locked]').uncheck();const b=await page.locator('.as-hud').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(720,650,{steps:10});await page.mouse.up();assert.equal(Number(await page.locator('[data-key=x]').inputValue()),50);await inBounds();});
 await check('color settings and auto thresholds validate',async()=>{await tab('color');await page.locator('[data-key=adaptiveColor]').check();await set('midSpeed',600);await set('highSpeed',2);assert.equal(await page.locator('[data-key=highSpeed]').inputValue(),'601');});
 await check('preset names are text, not HTML',async()=>{await tab('presets');await page.locator('.as-preset-name').fill('<img src=x onerror=alert(1)>');await page.locator('[data-action=save-preset]').click();assert.equal(await page.locator('.as-custom-row img').count(),0);assert.equal(await page.locator('.as-custom-row').count(),1);});
 await check('JSON export works',async()=>{const wait=page.waitForEvent('download');await page.locator('[data-action=export]').click();const d=await wait;const exported=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.equal(exported.schema,'apex-speedometer/v1');assert.equal(exported.settings.units,'mph');});
 await check('valid JSON imports and clamps unsafe settings',async()=>{await page.locator('.as-file').setInputFiles({name:'look.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'apex-speedometer/v1',settings:{size:9999,style:'digital',color:'#ff0000'}}))});await page.waitForFunction(()=>document.querySelector('.as-save-state').textContent==='Look imported');await tab('style');assert.equal(await page.locator('[data-key=size]').inputValue(),'220');assert.ok(await page.locator('.as-hud').evaluate(el=>el.classList.contains('as-style-digital')));});
 await check('malformed imports report an error',async()=>{await tab('presets');await page.locator('.as-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('not json')});await page.waitForFunction(()=>document.querySelector('.as-save-state').textContent==='Invalid APEX preset JSON');});
 await check('presets apply and custom presets delete',async()=>{await page.locator('[data-builtin="1"]').click();assert.ok(await page.locator('.as-hud').evaluate(el=>el.classList.contains('as-style-outline')));await page.locator('[data-delete-preset="0"]').click();assert.equal(await page.locator('.as-custom-row').count(),0);});
 await check('settings persist after reload',async()=>{await tab('style');await set('size',123);await page.waitForTimeout(250);await page.reload();await page.waitForSelector('[data-key=size]');assert.equal(await page.locator('[data-key=size]').inputValue(),'123');});
 await check('small viewport and huge HUD remain on screen',async()=>{await page.setViewportSize({width:390,height:740});await set('size',220);await page.locator('.as-close').click();await inBounds();const b=await page.locator('.as-launch').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);assert.ok(await page.locator('.as-panel').isVisible());await page.setViewportSize({width:1440,height:900});});
 await check('hide when stopped; settings reveal it',async()=>{await tab('behavior');await page.locator('[data-key=hideStopped]').check();await page.locator('[data-demo]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('.as-close').click();await page.waitForFunction(()=>document.querySelector('.as-hud').classList.contains('as-stopped'));await page.locator('.as-launch').click();await page.waitForFunction(()=>!document.querySelector('.as-hud').classList.contains('as-stopped'));});
 await check('real-data mode: wheel, ground, missing data and session reset',async()=>{
   await page.evaluate(()=>{window.previewApp.destroy();localStorage.removeItem('apex.speedometer.v1');window.liveApp=ApexSpeedometer.mount(document.querySelector('.apex-speedometer'));window.feed=setInterval(()=>window.liveApp.updateElectrics({wheelspeed:25,rpm:4000,gear:'3'}),50);});
   await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='90');
   await page.locator('.as-launch').click();await tab('behavior');await page.locator('[data-key=source]').selectOption('ground');
   await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='—');
   await page.evaluate(()=>{clearInterval(window.feed);window.liveApp.updateGround({available:true,speed:10,reset:true});window.feed=setInterval(()=>window.liveApp.updateGround({available:true,speed:10}),50);});
   await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='36');
   await page.evaluate(()=>{clearInterval(window.feed);window.liveApp.updateGround({available:false});});
   await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='—');
 });
 await check('Angular adapter subscribes, loads extension and cleans up',async()=>{
  const source=fs.readFileSync('mod/ui/modules/apps/ApexSpeedometer/app.js','utf8');
  await page.evaluate(source=>{
   window.liveApp.destroy();const handlers={}, calls=[];
   window.angular={module:()=>({directive:(name,factory)=>{window.adapter=factory();}})};
   window.StreamsManager={add:x=>calls.push(['add',x]),remove:x=>calls.push(['remove',x])};window.bngApi={engineLua:x=>calls.push(['lua',x])};
   (0,eval)(source);
   const scope={$on:(name,fn)=>{handlers[name]=fn;return ()=>{delete handlers[name];};}};
   window.adapter.link(scope,[document.querySelector('.apex-speedometer')]);
   if(!handlers.streamsUpdate||!handlers['apexSpeedometer.ground'])throw Error('missing handlers');
   handlers.streamsUpdate(null,{electrics:{wheelspeed:10,rpm:2000,gear:'2'}});
   handlers['$destroy']();
   if(handlers.streamsUpdate||handlers['apexSpeedometer.ground'])throw Error('leaked listeners');
   if(!calls.some(x=>x[0]==='remove'))throw Error('stream not released');
   if(!calls.some(x=>x[0]==='lua' && x[1].includes("extensions.load('apexSpeedometer')")))throw Error('extension not loaded');
   delete window.angular;
  },source);
 });
 await check('no uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 // Capture an actual UI screenshot, explicitly a simulated preview.
 await page.reload();await page.locator('[data-style=race]').click();await set('size',122);
 await page.waitForFunction(()=>document.querySelector('.as-number').textContent==='147');
 await page.screenshot({path:'preview/screenshot.png'});
 console.log(`\n${passed} browser checks passed.`);
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
