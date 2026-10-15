import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const page=read('index.html'),css=read('style.css'),js=read('app.mjs'),cfg=JSON.parse(read('vercel.json'));
test('HTML uses responsive viewport, semantics and readable metadata',()=>{
 for(const x of ['<!doctype html>','<html lang="en">','name="viewport"','<main id="main"','<h1>','name="description"','rel="canonical"','application/ld+json','og:title','twitter:card'])
 assert.ok(page.includes(x),'Missing '+x);
});
test('creator keyword is honest structured metadata and no search spam',()=>{
 assert.ok(page.includes('name="creator" content="azhardotcoder"'));
 assert.ok(page.includes('github.com/azhardotcoder'));
 assert.ok(!page.includes('name="keywords"'));
});
test('sitemap, robots, app icon and manifest present',()=>{
 for(const x of ['sitemap.xml','robots.txt','icon.svg','manifest.webmanifest','social-preview.svg'])
 assert.ok(existsSync(new URL('../'+x,import.meta.url)),x);
 assert.ok(read('robots.txt').includes('Sitemap:'));
 assert.ok(read('sitemap.xml').includes('love-arcade-generated-by-ai.vercel.app'));
});
test('links to actual JS/CSS and uses essential accessible controls',()=>{
 assert.ok(page.includes('href="./style.css'));
 assert.ok(page.includes('src="./app.mjs'));
 for(const id of ['nickname','roominput','call','mic','speaker','hangup','chatopen','leave','chatinput','dialog','toast'])
 assert.ok(page.includes('id="'+id+'"'),'Missing '+id);
 assert.ok(css.includes(':focus-visible'),'Missing keyboard focus');
 assert.ok(css.includes('prefers-reduced-motion'),'Missing reduced motion');
});
test('no hardcoded API private keys or service-role credentials',()=>{
 const all=page+css+js+read('engine.mjs');
 assert.doesNotMatch(all,/SUPABASE_SERVICE_ROLE_KEY|BEGIN PRIVATE KEY|sk_live_[A-Za-z0-9]{10}/);
});
test('security headers restrict embedding, sniffing, permissions',()=>{
 const values=cfg.headers.flatMap(x=>x.headers).map(x=>x.key);
 for(const k of ['X-Content-Type-Options','Referrer-Policy','X-Frame-Options','Permissions-Policy','Content-Security-Policy'])assert.ok(values.includes(k),k);
});
test('no outbound recording or analytics scripts are installed',()=>{
 assert.ok(!/<script[^>]+google-analytics|googletagmanager|facebook\.net/i.test(page));
});
