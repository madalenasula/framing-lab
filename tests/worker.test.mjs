import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.mjs';
const env={ALLOWED_ORIGIN:'https://example.github.io',APPS_SCRIPT_URL:'https://script.google.com/macros/s/FAKE/exec'};
const req=(route,opts={})=>new Request('https://api.example.workers.dev'+route,{headers:{Origin:env.ALLOWED_ORIGIN,...(opts.body?{'Content-Type':'application/json'}:{})},...opts});
const mockFetch=async (url,init)=>new Response(JSON.stringify({ok:true,saved:true,participantId:'a1234567',arm:'low',anchor:45,wtp:22}),{status:200});
test('CORS blocks unexpected origins and no origin',async()=>{
  assert.equal((await worker.fetch(new Request('https://x/api/health',{headers:{Origin:'https://bad.example'}}),env)).status,403);
  assert.equal((await worker.fetch(new Request('https://x/api/health'),env)).status,403);
});
test('CORS preflight allows exact origin',async()=>{
  const resp=await worker.fetch(new Request('https://x/api/assign',{method:'OPTIONS',headers:{Origin:env.ALLOWED_ORIGIN}}),env);
  assert.equal(resp.status,204);assert.equal(resp.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);
});
test('reject invalid submissions before upstream fetch',async()=>{
  const r=await worker.fetch(req('/api/submit',{method:'POST',body:JSON.stringify({participantId:'a1234567',wtp:251})}),env);
  assert.equal(r.status,400);
});
test('Worker parses verifiable upstream save reply',async()=>{
  const old=globalThis.fetch;globalThis.fetch=mockFetch;
  try {
    const r=await worker.fetch(req('/api/submit',{method:'POST',body:JSON.stringify({participantId:'a1234567',wtp:22})}),env);
    assert.equal(r.status,200);assert.equal((await r.json()).saved,true);
  } finally { globalThis.fetch=old; }
});
test('Worker surfaces upstream failure as unsuccessful',async()=>{
  const old=globalThis.fetch;globalThis.fetch=async()=>new Response('google error',{status:500});
  try {const r=await worker.fetch(req('/api/submit',{method:'POST',body:JSON.stringify({participantId:'a1234567',wtp:22})}),env);
    assert.equal(r.status,502);assert.equal((await r.json()).ok,false);
  } finally {globalThis.fetch=old;}
});
