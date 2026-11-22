import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../backend/Code.gs',import.meta.url),'utf8');
function harness(){
  const storage=new Map();
  const mockSheet=name=>({
    rows:[],getLastRow(){return this.rows.length},getLastColumn(){return this.rows[0]?.length||0},
    appendRow(row){this.rows.push(row)},setFrozenRows(){},
    getRange(r,c,n,cols){return {getValues:()=>this.rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+cols))}}
  });
  const spreadsheet={getSheetByName:name=>storage.get(name)||null,insertSheet(name){const sh=mockSheet(name);storage.set(name,sh);return sh}};
  let next=0;
  const context={console,Math,Date,JSON,isFinite,
    Utilities:{getUuid:()=>`00000000-0000-4000-8000-${String(++next).padStart(12,'0')}`},
    SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet,flush:()=>{}},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    ContentService:{MimeType:{JSON:'JSON'},createTextOutput:s=>({s,setMimeType(){return this}})}
  };
  vm.createContext(context);vm.runInContext(script,context);
  const post=payload=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(payload)}}).s);
  const get=action=>JSON.parse(context.doGet({parameter:{action}}).s);
  return {post,get,storage,context};
}
test('assignments are persistent and server-controlled',()=>{
  const h=harness();let a=h.post({experiment:'framing-lab-v2',action:'assign'});
  assert.equal(a.ok,true);assert.ok([45,95].includes(a.anchor));
  let b=h.post({experiment:'framing-lab-v2',action:'assign',participantId:a.participantId});
  assert.equal(a.arm,b.arm);assert.equal(b.reused,true);
  assert.equal(h.storage.get('V2_Assignments').rows.length,2);
});
test('submissions are idempotent, original answer wins',()=>{
  const h=harness();const id=h.post({experiment:'framing-lab-v2',action:'assign'}).participantId;
  const a=h.post({experiment:'framing-lab-v2',action:'submit',participantId:id,wtp:33,arm:'other'});
  const b=h.post({experiment:'framing-lab-v2',action:'submit',participantId:id,wtp:99});
  assert.equal(a.saved,true);assert.equal(b.duplicate,true);assert.equal(b.wtp,33);
  assert.equal(h.storage.get('V2_Responses').rows.length,2);
});
test('rejects unknown IDs and invalid amounts',()=>{
  const h=harness();assert.equal(h.post({experiment:'framing-lab-v2',action:'submit',participantId:'unknown-id-123',wtp:20}).ok,false);
  const id=h.post({experiment:'framing-lab-v2',action:'assign'}).participantId;
  for(const w of [251,-1,1.5,'20']) assert.equal(h.post({experiment:'framing-lab-v2',action:'submit',participantId:id,wtp:w}).ok,false);
});
test('results withheld while collecting; existing v1 remains compatible',()=>{
  const h=harness();const id=h.post({experiment:'framing-lab-v2',action:'assign'}).participantId;
  h.post({experiment:'framing-lab-v2',action:'submit',participantId:id,wtp:20});
  const r=h.get('results');assert.equal(r.published,false);assert.equal(r.total,1);
  assert.equal(h.post({experiment:'framing-lab-v1',participantId:'visitor-1234',arm:'low',anchor:45,wtp:10}).ok,true);
  assert.equal(h.storage.get('Responses').rows.length,2);
  assert.equal(h.storage.get('V2_Responses').rows.length,2);
});
test('events are deduplicated; closed results can be published',()=>{
  const h=harness();const id=h.post({experiment:'framing-lab-v2',action:'assign'}).participantId;
  const e={experiment:'framing-lab-v2',action:'event',participantId:id,name:'experiment_viewed'};
  assert.equal(h.post(e).ok,true);assert.equal(h.post(e).duplicate,true);
  h.context.V2_STATUS='closed';
  assert.equal(h.post({experiment:'framing-lab-v2',action:'assign',participantId:id}).ok,true);
  assert.equal(h.post({experiment:'framing-lab-v2',action:'assign'}).ok,false);
  assert.equal(h.get('results').published,false);
});
test('closed study publishes only thresholded real aggregate data',()=>{
  const h=harness();
  const as=h.storage;
  // Trigger header creation; replace with deterministic balanced test data.
  h.post({experiment:'framing-lab-v2',action:'assign'});
  const ids=as.get('V2_Assignments');
  for(let i=0;i<40;i++){
    const id='participant-test-'+String(i).padStart(4,'0');
    ids.appendRow([new Date(),id,i<20?'low':'high',i<20?45:95]);
    h.post({experiment:'framing-lab-v2',action:'submit',participantId:id,wtp:i<20?20:40});
  }
  h.context.V2_STATUS='closed';
  const r=h.get('results');
  assert.equal(r.published,true);assert.equal(r.summary.meanDifference,20);
  assert.equal(r.summary.low.n,20);assert.equal(r.summary.high.n,20);
  assert.deepEqual(Array.from(r.summary.low.hist),[0,20,0,0,0,0]);
});
