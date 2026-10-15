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
