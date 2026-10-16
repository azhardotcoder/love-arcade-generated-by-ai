import {test,expect} from '@playwright/test';

const site='/?transport=cloudflare&backend=http%3A%2F%2F127.0.0.1%3A8788';
test.use({viewport:{width:390,height:844}});
test.beforeEach(async({context})=>{
 await context.route('**/unpkg.com/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* cloud mode does not need PeerJS for games or chat */'}));
});
async function startHost(context,nickname='Nova'){
 const host=await context.newPage();
 await host.goto(site);
 await host.locator('#nickname').fill(nickname);
 await host.locator('#create').click();
 await expect(host.locator('#room')).toBeVisible({timeout:15000});
 await expect(host.locator('#room')).toHaveAttribute('data-stage','waiting');
 await expect(host.locator('#roomcode')).toHaveText(/^\d{6}$/);
 return host;
}
test('Cloudflare: code-only guest needs host approval, real-time chat and game actions work across tabs',async({context})=>{
 test.setTimeout(90000);
 const host=await startHost(context,'Delhi');
 const guest=await context.newPage();
 await guest.goto(site);
 await guest.locator('#nickname').fill('Mumbai');
 await guest.locator('#roominput').fill((await host.locator('#roomcode').textContent()).trim());
 await guest.locator('#join').click();
 await expect(guest.locator('#waitingRoom')).toBeVisible({timeout:12000});
 await expect(guest.locator('#waitingHint')).toContainText(/approve/i,{timeout:12000});
 await expect(host.getByRole('dialog')).toBeVisible({timeout:12000});
 await expect(host.getByRole('dialog')).toContainText('Mumbai');
 await host.getByRole('dialog').getByRole('button',{name:'Allow player'}).click();
 await expect(host.locator('#room')).toHaveAttribute('data-stage','home',{timeout:12000});
 await expect(guest.locator('#room')).toHaveAttribute('data-stage','home',{timeout:12000});
 await expect(guest.locator('#theirname')).toHaveText('Delhi');
 await expect(host.locator('#theirname')).toHaveText('Mumbai');
 await host.locator('#homeChat').click();
 await host.locator('#chatinput').fill('Hello from Delhi');
 await host.locator('#chatsend').click();
 await guest.locator('#homeChat').click();
 await expect(guest.locator('#chatlog')).toContainText('Hello from Delhi');
 await expect(host.locator('#chatlog')).toContainText('Delivered');
 await host.locator('#chatclose').click();
 await guest.locator('#chatclose').click();
 await host.locator('#homeGames').click();
 await host.locator('[data-game="heartsync"]').click();
 await expect(guest.locator('.bond-surface')).toBeVisible({timeout:12000});
 await host.locator('[data-bond-action=begin]').click();
 await expect(guest.locator('.bond-question')).toBeVisible();
 await host.locator('[data-bond-action=choose][data-value="0"]').click();
 await expect(guest.locator('[data-bond-action=choose]')).toHaveCount(4);
 await guest.locator('[data-bond-action=choose][data-value="1"]').click();
 await expect(host.locator('[data-bond-action=predict]')).toHaveCount(4);
 await host.locator('[data-bond-action=predict][data-value="1"]').click();
 await guest.locator('[data-bond-action=predict][data-value="0"]').click();
 await expect(host.locator('.bond-reveal-grid')).toBeVisible();
 await expect(guest.locator('.bond-reveal-grid')).toBeVisible();
 // SessionStorage retains only the guest's long reconnect token after approval.
 await guest.reload();
 await expect(guest.locator('#room')).toHaveAttribute('data-stage','activity',{timeout:15000});
 await expect(guest.locator('.bond-reveal-grid')).toBeVisible();
 await expect(host.locator('#room')).toHaveAttribute('data-stage','activity',{timeout:15000});
 for(const page of [host,guest]){
  const sizes=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(sizes.doc).toBeLessThanOrEqual(sizes.viewport+2);
 }
 await host.close();await guest.close();
});
test('Cloudflare: private invite link joins without approval, with no credentials in query strings',async({context})=>{
 test.setTimeout(60000);
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:4173'});
 const host=await startHost(context,'Starlight');
 await host.locator('#waitingCopy').click();
 const link=await host.evaluate(()=>navigator.clipboard.readText());
 const url=new URL(link);
 expect(url.hash).toMatch(/^#room=\d{6}&invite=[a-f0-9]{64}$/);
 expect(url.searchParams.get('invite')).toBe(null);
 const guest=await context.newPage();
 await guest.goto(link);
 await expect(guest.locator('#room')).toHaveAttribute('data-stage','home',{timeout:17000});
 await expect(host.locator('#room')).toHaveAttribute('data-stage','home',{timeout:17000});
 await expect(guest.locator('#theirname')).toHaveText('Starlight');
 await host.locator('#homeGames').click();
 await host.locator('[data-game=stars]').click();
 await expect(guest.locator('.bond-stars')).toBeVisible({timeout:12000});
 await host.locator('[data-bond-action=begin]').click();
 await host.locator('[data-bond-action=choose][data-value="2"]').click();
 await guest.locator('[data-bond-action=choose][data-value="2"]').click();
 await expect(host.locator('.bond-star-reveal')).toContainText('Two hearts, one wish');
 await expect(guest.locator('.bond-star-reveal')).toContainText('Two hearts, one wish');
 await host.close();await guest.close();
});
