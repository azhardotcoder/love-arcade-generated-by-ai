import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';

const peerStub=String.raw`
(()=>{
 const channel='love-arcade-browser-integration';
 class Conn {
  constructor(owner,target){this.owner=owner;this.peer=target;this.open=false;this.listeners={}}
  on(t,f){(this.listeners[t]??=[]).push(f);return this}
  emit(t,v){for(const f of this.listeners[t]||[])f(v)}
  send(payload){if(this.open)this.owner.bc.postMessage({target:this.peer,from:this.owner.id,kind:'data',payload})}
  close(){if(!this.open)return;this.open=false;this.owner.bc.postMessage({target:this.peer,from:this.owner.id,kind:'close'});this.emit('close')}
 }
 class Peer {
  constructor(id){this.id=id||('guest-'+Math.random().toString(36).slice(2));this.open=false;this.disconnected=false;this.destroyed=false;this.listeners={};this.connections=new Map();this.bc=new BroadcastChannel(channel);this.bc.onmessage=e=>this.read(e.data);setTimeout(()=>{this.open=true;this.emit('open',this.id)},25)}
  on(t,f){(this.listeners[t]??=[]).push(f);return this}
  emit(t,v){for(const f of this.listeners[t]||[])f(v)}
  connect(target,options={}){const c=new Conn(this,target);this.connections.set(target,c);setTimeout(()=>this.bc.postMessage({target,from:this.id,kind:'connect',metadata:options.metadata||{}}),50);return c}
  read(d){if(d.target!==this.id)return;let c=this.connections.get(d.from);
   if(d.kind==='connect'){c=new Conn(this,d.from);this.connections.set(d.from,c);c.metadata=d.metadata;this.emit('connection',c);setTimeout(()=>{c.open=true;c.emit('open');this.bc.postMessage({target:d.from,from:this.id,kind:'accept'})},35)}
   else if(d.kind==='accept'){if(c){c.open=true;c.emit('open')}}
   else if(d.kind==='data'){c?.emit('data',d.payload)}
   else if(d.kind==='close'){if(c?.open){c.open=false;c.emit('close')}}
  }
  destroy(){this.destroyed=true;for(const c of this.connections.values())c.close();this.bc.close()}
  reconnect(){this.disconnected=false;this.open=true;this.emit('open',this.id)}
 }
 window.Peer=Peer;
})();
`.slice(1,-1);

test.use({viewport:{width:390,height:844}});
test('two browser tabs share approval-based Truth or Dare and chat',async({context})=>{
 await context.route('**/unpkg.com/**',route=>route.fulfill({status:200,contentType:'text/javascript',body:peerStub}));
 const host=await context.newPage();
 const guest=await context.newPage();
 await Promise.all([host.goto('/'),guest.goto('/')]);
 await host.locator('#nickname').fill('Alex');
 await guest.locator('#nickname').fill('Sam');
 await host.locator('#create').click();
 await expect(host.locator('#room')).toBeVisible();
 const code=(await host.locator('#roomcode').textContent()).replace(/\s/g,'');
 await guest.locator('#roominput').fill(code);
 await guest.locator('#join').click();
 await expect(host.locator('#theirname')).toHaveText('Sam',{timeout:12000});
 await expect(guest.locator('#theirname')).toHaveText('Alex',{timeout:12000});
 await expect(host.locator('#theirstatus')).toContainText('Online');
 await expect(guest.locator('#theirstatus')).toContainText('Online');
 await host.locator('#featured').click();
 await expect(host.locator('#game')).toBeVisible();
 await expect(guest.locator('#game')).toBeVisible();
 await host.locator('[data-do="truth"]').click();
 await expect(guest.locator('[data-do="approve"]')).toHaveCount(0);
 await expect(host.locator('[data-do="complete"]')).toBeVisible();
 await host.locator('#response').fill('A little love for you');
 await host.locator('[data-do="complete"]').click();
 await expect(guest.locator('[data-do="approve"]')).toBeVisible();
 await guest.locator('[data-do="approve"]').click();
 await expect(host.locator('#roundlabel')).toHaveText('ROUND 02');
 await expect(guest.locator('#roundlabel')).toHaveText('ROUND 02');
 await expect(guest.locator('[data-do="truth"]')).toBeVisible();
 await host.locator('#chatopen').click();
 await host.locator('#chatinput').fill('This is a sweet message!');
 await host.locator('#chatform').getByRole('button',{name:'Send message'}).click();
 await guest.locator('#chatopen').click();
 await expect(guest.locator('#chatlog')).toContainText('This is a sweet message!');
 await guest.close();await host.close();
});


test('two players play legal chess moves and agree a draw and rematch',async({context})=>{
 const chessSource=readFileSync(new URL('../node_modules/chess.js/dist/esm/chess.js',import.meta.url),'utf8');
 await context.route('**/unpkg.com/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:peerStub}));
 await context.route('https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm',route=>route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:chessSource}));
 const host=await context.newPage(),guest=await context.newPage();
 await Promise.all([host.goto('/'),guest.goto('/')]);
 await host.locator('#nickname').fill('White');
 await guest.locator('#nickname').fill('Black');
 await host.locator('#create').click();
 const code=(await host.locator('#roomcode').textContent()).replace(/\s/g,'');
 await guest.locator('#roominput').fill(code);
 await guest.locator('#join').click();
 await expect(host.locator('#theirstatus')).toContainText('Online');
 await expect(guest.locator('#theirstatus')).toContainText('Online');
 await host.locator('[data-game=chess]').click();
 await expect(host.locator('.chess-board .chess-square')).toHaveCount(64,{timeout:12000});
 await expect(guest.locator('.chess-board .chess-square')).toHaveCount(64,{timeout:12000});
 await expect(host.locator('.chess-playerstrip')).toHaveCount(2);
 await expect(host.locator('[data-square=e2]')).toContainText('♙');
 await host.locator('[data-square=e2]').click();
 await expect(host.locator('[data-square=e4]')).toHaveClass(/legal-target/);
 await host.locator('[data-square=e4]').click();
 await expect(guest.locator('.move-list')).toContainText('e4');
 await guest.locator('[data-square=e7]').click();
 await guest.locator('[data-square=e5]').click();
 await expect(host.locator('.move-list')).toContainText('e5');
 await host.locator('[data-chess-action=chess-offer][data-offer=draw]').click();
 await expect(guest.locator('[data-chess-action=chess-accept]')).toBeVisible();
 await guest.locator('[data-chess-action=chess-accept]').click();
 await expect(host.locator('.chess-result')).toContainText('Draw');
 await expect(guest.locator('.chess-result')).toContainText('Draw');
 await host.locator('[data-chess-action=chess-rematch]').click();
 await guest.locator('[data-chess-action=chess-rematch]').click();
 await expect(host.locator('.chess-result')).toHaveCount(0);
 await expect(guest.locator('.chess-result')).toHaveCount(0);
 await expect(host.locator('.move-row')).toHaveCount(0);
 await host.close();await guest.close();
});
