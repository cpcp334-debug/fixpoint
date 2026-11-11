// Browser regression against the actual React form. All requests are mocked.
// Requires esbuild (available via tsx) and Playwright with Chromium installed.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url).pathname;
const messages = Object.fromEntries(['en', 'ar'].map(locale => [locale, JSON.parse(readFileSync(`${root}messages/${locale}.json`, 'utf8'))]));
const mocks = {
  'next-intl': `export const useTranslations = ns => key => window.messages[ns]?.[key] ?? ns + "." + key;`,
  '@/i18n/routing': `export const useRouter = () => ({push: url => window.navigation.push(url)}); export const Link = 'a';`,
  '@/lib/analytics/client': `export const formStart = () => () => {};`,
  '@/lib/attribution/client': `export const getAttributionForSubmit = () => ({utm_source:'qa'});`,
  '@/lib/analytics/datalayer': `export const pushDataLayer = (...args) => window.events.push(args);`,
};
const bundle = await build({
  stdin: {contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {LeadForm} from './src/components/forms/LeadForm';
    createRoot(document.getElementById('root')).render(<LeadForm mode={window.mode} locale={window.locale} services={[{slug:'circuit-installation',name:'Circuit Installation'},{slug:'electrical-maintenance',name:'Electrical Maintenance'}]} locations={[{slug:'dubai',name:'Dubai'},{slug:'sharjah',name:'Sharjah'}]} defaultService="circuit-installation" defaultLocation="dubai" />);`, resolveDir: root, loader:'tsx'},
  bundle:true, write:false, platform:'browser', jsx:'automatic', define:{'process.env.NODE_ENV':'"development"'},
  plugins:[{name:'isolated-integrations',setup(b){
    b.onResolve({filter:/.*/}, args => mocks[args.path] ? {path:args.path,namespace:'mock'} : undefined);
    b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));
  }}],
});
const server = createServer((req,res) => {
  if(req.url === '/bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(bundle.outputFiles[0].text);return;}
  res.setHeader('Content-Type','text/html');res.end('<div id="root"></div><script src="/bundle.js"></script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,args:['--no-sandbox']});
let passed=0;
try {
  for(const locale of ['en','ar']) for(const custom of [false,true]) for(const scenario of ['validation','rejected','rateLimit','malformed','network','success','duplicate','ignored']) {
    const page=await browser.newPage(); let calls=0; let payload;
    page.on('pageerror', error => console.error('Browser error:', error.message));
    console.log(`Checking ${locale} ${custom ? "custom" : "catalog"} ${scenario}`);
    await page.addInitScript(({locale,messages})=>{window.locale=locale;window.mode='quote';window.messages=messages;window.navigation=[];window.events=[];},{locale,messages:messages[locale]});
    await page.route('**/api/leads', async route=>{
      calls++;payload=route.request().postDataJSON();
      if(scenario==='network')return route.abort();
      const status=scenario==='rateLimit'?429:scenario==='rejected'?400:200;
      const body=scenario==='malformed'?'not-json':JSON.stringify(scenario==='rejected'?{ok:false,fieldErrors:{email:'Invalid'}}:scenario==='rateLimit'?{ok:false,error:'rateLimit'}:{ok:true,id:'QA/ref',duplicate:scenario==='duplicate',ignored:scenario==='ignored'});
      await route.fulfill({status,contentType:'application/json',body});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('[name=name]').fill('QA Contractor');
    await page.locator('[name=phone]').fill('0000000000');
    await page.locator('[name=email]').fill('qa@example.invalid');
    await page.locator('[name=requirement]').fill(scenario==='validation'?'short':'Synthetic electrical package only');
    await page.locator('[name=locationSlug]').selectOption('sharjah');
    if(custom){await page.getByRole('button',{name:messages[locale].Quote.serviceWriteOwn,exact:true}).click();await page.locator('[name=serviceOther]').fill('Synthetic custom scope');}
    else await page.locator('[name=serviceSlugs][value=electrical-maintenance]').check();
    const values=()=>page.locator('form').evaluate(form=>Array.from(new FormData(form).entries()));
    const before=await values();
    await page.locator('button[type=submit]').click();
    if(['validation','rejected','rateLimit','malformed','network'].includes(scenario)){
      await page.locator('[role=alert]').first().waitFor();
      await page.waitForFunction(()=>!document.querySelector('button[type=submit]').disabled);
      // Allow React action completion/reset to flush before inspecting the DOM.
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      assert.deepEqual(await values(),before,`${locale} ${custom} ${scenario}: entered fields must survive`);
      assert.deepEqual(await page.evaluate(()=>window.navigation),[]);
      if(['rejected','malformed','network'].includes(scenario)){
        const href=await page.locator('[role=alert] a').getAttribute('href');
        assert.match(href,/^https:\/\/wa\.me\/\d+$/);
      }
    }else{
      await page.waitForFunction(()=>window.navigation.length || [...document.querySelectorAll('[role=status]')].some(e=>e.textContent===window.messages.Quote.success));
      assert.deepEqual(await page.evaluate(()=>window.navigation),scenario==='success'?['/get-a-quote/received?ref=QA%2Fref']:[]);
    }
    assert.equal(calls,scenario==='validation'?0:1);
    if(payload){assert.equal(payload.locale,locale);assert.equal(payload.source,'quote');assert.equal(payload.locationSlug,'sharjah');assert.equal(payload.attribution.utm_source,'qa');}
    assert.deepEqual(await page.evaluate(()=>window.events),[]);
    passed++;await page.close();
  }
  console.log(`${passed} English/Arabic quote browser scenarios passed.`);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
