import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function frontend(query,configured,reply){
  const elements=new Map();
  function element(id){
    if(!elements.has(id)){
      elements.set(id,{
        hidden:['understory','completed','experiment','retry','results-link','retry-init'].includes(id),textContent:'',value:'',disabled:false,
        firstElementChild:{textContent:''},handlers:{},
        addEventListener(name,fn){this.handlers[name]=fn;},
        focus(){this.focused=true;}
      });
    }
    return elements.get(id);
  }
  const values=new Map();
  const fetches=[];
  const ctx={
    window:{FRAMING_LAB_API:configured?'https://api.example.workers.dev':'PASTE_YOUR_WORKER_URL_HERE'},
    location:{search:query},URLSearchParams,JSON,Number,String,Date,Math,RegExp,Promise,
    AbortController, setTimeout,clearTimeout,console,
    localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
    document:{getElementById:element},
    fetch:async(url,options)=>{
      const path=String(url).split('/api/')[1];fetches.push(path);
      const response=reply(path,options);
      return {ok:!!response.ok,json:async()=>response};
    }
  };
  vm.createContext(ctx);vm.runInContext(script,ctx);
  return {element,values,fetches};
}
test('demo never sends requests and reveals both price arms only after submission',async()=>{
  const f=frontend('?demo=1',false,()=>{throw Error('Unexpected backend request')});
  await flush();
  assert.equal(f.element('anchor').textContent,'CHF 45');
  assert.equal(f.element('understory').hidden,true);
  f.element('wtp').value='42';
  await f.element('response-form').handlers.submit({preventDefault(){}});
  assert.equal(f.element('observed-wtp').textContent,'CHF 42');
  assert.equal(f.element('understory').hidden,false);
  f.element('retry').handlers.click();
  assert.equal(f.element('anchor').textContent,'CHF 95');
  assert.deepEqual(f.fetches,[]);
});
test('without Worker configuration, public mode refuses submission',async()=>{
  const f=frontend('',false,()=>({ok:true}));await flush();
  assert.equal(f.element('loading').hidden,false);
  assert.equal(f.element('experiment').hidden,true);
  assert.match(f.element('loading-message').textContent,/not configured/);
  assert.deepEqual(f.fetches,[]);
});
test('confirmed backend submission reveals receipt; response is stored locally only after acknowledgement',async()=>{
  const id='example-participant-001';
  const f=frontend('',true,(path,opts)=>{
    if(path==='assign')return {ok:true,participantId:id,arm:'high',anchor:95};
    if(path==='submit')return {ok:true,saved:true,participantId:id,arm:'high',anchor:95,wtp:42};
    return {ok:true};
  });
  await flush();await flush();
  assert.equal(f.element('anchor').textContent,'CHF 95');
  f.element('wtp').value='42';
  await f.element('response-form').handlers.submit({preventDefault(){}});
  assert.match(f.element('receipt').textContent,/confirmed and saved/);
  const saved=JSON.parse(f.values.get('framing-lab-v2:state'));
  assert.equal(saved.completed.saved,true);
  assert.equal(saved.completed.wtp,42);
});
test('backend rejection does not show false success',async()=>{
  const id='example-participant-002';
  const f=frontend('',true,(path)=>{
    if(path==='assign')return {ok:true,participantId:id,arm:'low',anchor:45};
    if(path==='submit')return {ok:false,error:'Storage unavailable'};
    return {ok:true};
  });
  await flush();await flush();
  f.element('wtp').value='30';
  await f.element('response-form').handlers.submit({preventDefault(){}});
  assert.equal(f.element('completed').hidden,true);
  assert.match(f.element('error').textContent,/Storage unavailable/);
  const saved=JSON.parse(f.values.get('framing-lab-v2:state'));
  assert.equal(saved.completed,null);
});
