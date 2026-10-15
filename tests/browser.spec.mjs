import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({viewport:{width:390,height:844},deviceScaleFactor:1});
test.beforeEach(async ({page})=>{
 await page.addInitScript(()=>{
  // Local signaling stub: smoke tests do not require the public PeerJS server.
  window.Peer=class {
   constructor(id){this.id=id||'test-guest';this.handlers={};this.open=false;setTimeout(()=>{this.open=true;this.handlers.open?.(this.id)},25)}
   on(type,handler){this.handlers[type]=handler;return this}
   destroy(){this.open=false}
  };
 });
 await page.route('**/unpkg.com/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'// mocked in Playwright'}));
});
test('mobile landing page: loads fast, no horizontal overflow, usable controls',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Player two/i})).toBeVisible();
 await expect(page.getByRole('button',{name:/Create our room/i})).toBeVisible();
 await expect(page.locator('.city').first()).toBeVisible();
 const result=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,width:innerWidth}));
 expect(result.doc).toBeLessThanOrEqual(result.width+2);
 expect(errors).toEqual([]);
});
test('create a room, see presence & voice controls, and leave safely',async({page})=>{
 await page.goto('/');
 await page.getByLabel('Your nickname').fill('Sweetheart');
 await page.getByRole('button',{name:/Create our room/i}).click();
 await expect(page.locator('#room')).toBeVisible();
 await expect(page.locator('#myname')).toHaveText('Sweetheart');
 await expect(page.locator('#roomcode')).toHaveText(/[A-Z2-9]{4} [A-Z2-9]{4} [A-Z2-9]{4}/);
 await expect(page.getByRole('button',{name:'Mute'})).toBeDisabled();
 await page.locator('#chatopen').click();
 await expect(page.locator('#chatpanel')).toBeVisible();
 await page.locator('#chatclose').click();
 await expect(page.locator('#chatpanel')).toBeHidden();
 await page.locator('#leave').click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('dialog').getByRole('button',{name:'Leave room'}).click();
 await expect(page.locator('#welcome')).toBeVisible();
 await expect(page.locator('#room')).toBeHidden();
});
test('SEO metadata and structured data render without needing JavaScript',async({page})=>{
 await page.goto('/');
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://love-arcade-generated-by-ai.vercel.app/');
 await expect(page.locator('meta[name=creator]')).toHaveAttribute('content','azhardotcoder');
 const json=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
 expect(json.creator.name).toBe('azhardotcoder');
 expect(json.isAccessibleForFree).toBe(true);
});
test('mobile landing page has no critical or serious WCAG violations',async({page})=>{
 await page.goto('/');
 const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect(a.violations.filter(x=>['critical','serious'].includes(x.impact)).map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length}))).toEqual([]);
});

test('guided room UX shows invite state and chat backdrop',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.welcome-steps')).toContainText('Create a room');
 await expect(page.locator('.welcome-steps')).toContainText('Invite your person');
 await page.getByRole('button',{name:/Create our room/i}).click();
 await expect(page.locator('#roomGuide')).toBeVisible();
 await expect(page.locator('#guideTitle')).toContainText('invite your person');
 await expect(page.locator('#guideShare')).toBeVisible();
 await page.locator('#chatopen').click();
 await expect(page.locator('#chatpanel')).toBeVisible();
 await expect(page.locator('#chatbackdrop')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#chatpanel')).toBeHidden();
 await expect(page.locator('#chatbackdrop')).toBeHidden();
});

test('UX stylesheet and game status hooks are available',async({page})=>{
 await page.goto('/');
 await expect(page.locator('link[href*="experience.css"]')).toHaveCount(1);
 const ux=await page.evaluate(async()=>{const r=await fetch('/experience.css');return {status:r.status,content:(await r.text()).length}});
 expect(ux.status).toBe(200);expect(ux.content).toBeGreaterThan(2000);
 await expect(page.locator('#gameStatus')).toHaveAttribute('role','status');
 await expect(page.locator('#gameName')).toHaveCount(1);
});

test('voice controls have unique targets instead of colliding with SVG symbols',async({page})=>{
 await page.goto('/');
 const collisions=await page.evaluate(()=>{
  const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
  return ids.filter((id,i)=>ids.indexOf(id)!==i);
 });
 expect(collisions).toEqual([]);
 await expect(page.locator('#mic')).toHaveCount(1);
 await expect(page.locator('#hangup')).toHaveCount(1);
 await expect(page.locator('#mic')).toHaveJSProperty('tagName','BUTTON');
 await expect(page.locator('#hangup')).toHaveJSProperty('tagName','BUTTON');
 await expect(page.locator('symbol#icon-mic')).toHaveCount(1);
 await expect(page.locator('symbol#icon-hangup')).toHaveCount(1);
});
test('presence indicators use green online, red offline and waiting state',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Create our room/i}).click();
 await expect(page.locator('#room')).toBeVisible();
 await expect(page.locator('#mystatus')).toHaveClass(/is-online/);
 await expect(page.locator('#theirstatus')).toHaveClass(/is-waiting/);
 await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
 await expect(page.locator('#mystatus')).toHaveClass(/is-offline/);
});
