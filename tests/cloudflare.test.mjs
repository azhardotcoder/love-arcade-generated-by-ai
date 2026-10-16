import test from 'node:test';
import assert from 'node:assert/strict';
import {
 ROOM_CODE,SECRET,SIX_HOURS,ALLOWED_EVENTS,codeFromRandom,secretHex,
 secretHash,equalHash,displayName,safeOrigin,readMessage
} from '../cloudflare/protocol.mjs';
import {readFileSync} from 'node:fs';

test('six-digit room codes preserve leading zeroes and exclude biased random overflow',()=>{
 assert.equal(codeFromRandom(()=>0),'000000');
 assert.equal(codeFromRandom(()=>42),'000042');
 assert.equal(codeFromRandom(()=>123456),'123456');
 let attempts=0;
 const value=codeFromRandom(()=>++attempts===1?4294967295:7);
 assert.equal(value,'000007');
 assert.ok(ROOM_CODE.test('000001'));
 assert.ok(ROOM_CODE.test('999999'));
 assert.ok(!ROOM_CODE.test('12345'));
 assert.ok(!ROOM_CODE.test('12a456'));
});
test('long tokens have 256 bits of entropy and are hashed before persistence',async()=>{
 const token=secretHex();
 assert.ok(SECRET.test(token));
 assert.notEqual(token,secretHex());
 const hash=await secretHash(token);
 assert.equal(hash.length,64);
 assert.notEqual(hash,token);
 assert.ok(equalHash(hash,await secretHash(token)));
 assert.equal(equalHash(hash,await secretHash(secretHex())),false);
 assert.equal(equalHash('short',hash),false);
});
test('creator supplied names are sanitized and limited',()=>{
 assert.equal(displayName('  Sweetheart  '),'Sweetheart');
 assert.equal(displayName('<script>Azhar</script>'),'scriptAzhar/script');
 assert.equal(displayName(''), 'Sweetheart');
 assert.equal(displayName('VeryLongNameWithMoreThanTwentyFourCharacters').length,24);
});
test('origin comparison is exact with no permissive cross-origin wildcard',()=>{
 const allowed='https://love-arcade-generated-by-ai.vercel.app,http://localhost:4173';
 assert.ok(safeOrigin('https://love-arcade-generated-by-ai.vercel.app',allowed));
 assert.ok(safeOrigin('http://localhost:4173',allowed));
 assert.equal(safeOrigin('https://evil.example',allowed),false);
 assert.equal(safeOrigin('https://love-arcade-generated-by-ai.vercel.app.evil.example',allowed),false);
 assert.equal(safeOrigin(null,allowed),false);
});
test('message parser rejects oversized and malformed frames',()=>{
 assert.equal(readMessage('garbage'),null);
 assert.equal(readMessage('[]'),null);
 assert.equal(readMessage('{}').type,undefined);
 assert.equal(readMessage('{"type":"ping"}').type,'ping');
 assert.equal(readMessage('x'.repeat(900),500),null);
});
test('only known non-game ephemeral events can be forwarded',()=>{
 for(const e of ['voice-invite','voice-end','watch-reaction','draw-preview','typing'])assert.ok(ALLOWED_EVENTS.has(e));
 for(const e of ['snapshot','admin','action','host-token','eval','state'])assert.ok(!ALLOWED_EVENTS.has(e));
});
test('Cloudflare config defines SQLite-backed Durable Objects, correct Worker and exact account',()=>{
 const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(config.name,'love-arcade-server');
 assert.equal(config.account_id,'133da2bd551cfcc3dd4e1a7aa9e10cd3');
 assert.equal(config.main,'cloudflare/worker.mjs');
 assert.ok(config.migrations.some(m=>m.new_sqlite_classes.includes('ArcadeRoom')));
 assert.ok(config.migrations.some(m=>m.new_sqlite_classes.includes('CreateLimiter')));
 assert.equal(config.durable_objects.bindings.length,2);
 assert.equal(config.workers_dev,true);
 assert.equal(SIX_HOURS,21600000);
});
