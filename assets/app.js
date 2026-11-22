/* Framing Lab v2 — a deliberately small client with server-confirmed storage. */
(() => {
  'use strict';
  const VERSION = 'framing-lab-v2';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') === '1';
  const apiRoot = String(window.FRAMING_LAB_API || '').replace(/\/$/,'');
  const configured = /^https:\/\/[a-zA-Z0-9.-]+(?:\:[0-9]+)?$/.test(apiRoot);
  const storeKey = VERSION + ':state';
  let session = null;
  let completed = null;
  let arm = 'low';
  let anchor = 45;
  const storage = {
    get() { try { return JSON.parse(localStorage.getItem(storeKey)||'null'); } catch { return null; } },
    set(value) { try { localStorage.setItem(storeKey,JSON.stringify(value)); } catch { /* incognito can block */ } }
  };
  const saved = storage.get();
  if (saved && typeof saved === 'object') {
    if (typeof saved.participantId==='string' && /^[a-zA-Z0-9-]{8,80}$/.test(saved.participantId)) session=saved;
    if (saved.completed && saved.completed.saved === true) completed=saved.completed;
  }
  const save = () => { if(session) storage.set({...session,completed}); };
  const show = id => {for(const name of ['loading','experiment','completed']) $(name).hidden=name!==id;};
  const failInit = message => {
    show('loading');$('loading-message').textContent=message;$('retry-init').hidden=false;
  };
  const setScenario = (nextArm, nextPrice) => {
    arm = nextArm;anchor=nextPrice;$('anchor').textContent='CHF '+anchor;
  };
  async function call(path,payload) {
    const ac=new AbortController();
    const timeout=setTimeout(()=>ac.abort(),22000);
    try {
      const response=await fetch(apiRoot+'/api/'+path,{
        method:payload?'POST':'GET',
        headers:payload?{'Content-Type':'application/json'}:{},
        body:payload?JSON.stringify(payload):undefined,
        cache:'no-store',signal:ac.signal
      });
      let result;
      try {result=await response.json();} catch {throw new Error('The server returned an unreadable response.');}
      if (!response.ok || !result.ok) throw new Error(result.error || 'The server could not confirm the request.');
      return result;
    } finally {clearTimeout(timeout);}
  }
  async function event(name) {
    if (demo || !session || !session.participantId) return;
    try {await call('event',{participantId:session.participantId,name});} catch { /* optional measurement, never blocks response */ }
  }
  function reveal(answer,savedOnServer) {
    show('completed');
    $('understory').hidden=false;
    $('observed-anchor').textContent='CHF '+anchor;
    $('observed-wtp').textContent='CHF '+answer;
    $('receipt').textContent=demo?'Demo mode: no data was collected.':
      (savedOnServer?'Your response was confirmed and saved. Thank you.':'Your earlier response was already saved.');
    $('retry').hidden=!demo;
    const results=$('results-link');if(results) results.hidden=false;
    void event('reveal_viewed');
  }
  async function initialize() {
    $('retry-init').hidden=true;
    show('loading');
    $('loading-message').textContent='Preparing your product scenario…';
    if (demo) {
      // Only demo mode can force the experimental arm, and demo never saves data.
      setScenario(params.get('arm')==='high'?'high':'low',params.get('arm')==='high'?95:45);
      $('fine').textContent='DEMO ONLY — this response will not be saved. Use the regular URL for the live study.';
      show('experiment');return;
    }
    if (!configured) {
      failInit('The live study is not configured yet. Add the Worker URL to config.js, or open ?demo=1 to preview safely.');
      return;
    }
    try {
      const s=await call('assign',session?{participantId:session.participantId}:{});
      if (!s.participantId || !['low','high'].includes(s.arm) || ![45,95].includes(s.anchor))
        throw new Error('The assignment was incomplete.');
      session={participantId:s.participantId,arm:s.arm,anchor:s.anchor};
      setScenario(s.arm,s.anchor);
      save();
      if (completed) {
        // Only restore confirmations that were previously received from the API.
        if(completed.arm===s.arm && completed.anchor===s.anchor) reveal(completed.wtp,false);
        else { completed=null;save();show('experiment');void event('experiment_viewed'); }
      } else {
        show('experiment');void event('experiment_viewed');
      }
    } catch(error) {
      failInit('We couldn’t load the study. '+error.message+' Please try again.');
    }
  }
  $('retry-init').addEventListener('click',()=>void initialize());
  $('response-form').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const input=$('wtp').value.trim();
    const wtp=Number(input);
    if (!input || !Number.isInteger(wtp)||wtp<0||wtp>250) {
      $('error').textContent='Enter a whole amount from CHF 0 to CHF 250.';return;
    }
    $('submit').disabled=true;
    $('submit').firstElementChild.textContent='Checking your answer…';
    $('error').textContent='';
    try {
      if(demo){reveal(wtp,false);return;}
      if(!session) throw new Error('Your assignment was not loaded.');
      void event('response_submitted');
      const reply=await call('submit',{participantId:session.participantId,wtp});
      if(reply.saved!==true || reply.participantId!==session.participantId ||
        reply.arm!==session.arm || reply.anchor!==session.anchor ||
        !Number.isInteger(reply.wtp)) throw new Error('We could not verify that your response was saved.');
      completed={saved:true,wtp:reply.wtp,arm:reply.arm,anchor:reply.anchor};
      save();
      reveal(reply.wtp,true);
    } catch(error) {
      $('error').textContent='We could not confirm your response: '+error.message+' You can retry; a saved answer will not be counted twice.';
    } finally {
      $('submit').disabled=false;
      $('submit').firstElementChild.textContent='Reveal the experiment';
    }
  });
  $('retry').addEventListener('click',()=>{
    if(!demo) return;
    setScenario(arm==='low'?'high':'low',arm==='low'?95:45);
    $('wtp').value='';$('error').textContent='';$('understory').hidden=true;
    show('experiment');$('wtp').focus();
  });
  void initialize();
})();
