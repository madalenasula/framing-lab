/** Cloudflare Worker — JSON/CORS bridge for GitHub Pages -> Apps Script.
 * Enforces input schema and allowed website origin; does NOT fully prevent
 * abuse of a public Google Apps Script /exec endpoint.
 */
const routes = {
  '/api/assign': {method:'POST',action:'assign'},
  '/api/submit': {method:'POST',action:'submit'},
  '/api/event': {method:'POST',action:'event'},
  '/api/results': {method:'GET',action:'results'},
  '/api/health': {method:'GET',action:'health'}
};
const data = (payload,status=200,extra={})=>new Response(JSON.stringify(payload),{
  status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',...extra}
});

export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    const route = routes[url.pathname];
    if (!route) return data({ok:false,error:'Not found'},404);
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGIN||'').replace(/\/$/,'');
    const cors = {'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'300'};
    if (origin && origin===allowed) cors['Access-Control-Allow-Origin']=origin;
    if (request.method==='OPTIONS') return origin===allowed ? new Response(null,{status:204,headers:cors}) : data({ok:false,error:'Origin not allowed'},403,cors);
    if (!origin || origin!==allowed) return data({ok:false,error:'Origin not allowed'},403,cors);
    if (request.method!==route.method) return data({ok:false,error:'Method not allowed'},405,cors);
    if (!env.APPS_SCRIPT_URL || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(env.APPS_SCRIPT_URL))
      return data({ok:false,error:'Backend not configured'},503,cors);
    let target, init;
    if (route.method==='POST') {
      const type=request.headers.get('Content-Type')||'';
      if (!type.toLowerCase().includes('application/json')) return data({ok:false,error:'JSON required'},415,cors);
      const raw=await request.text();
      if (raw.length>2048) return data({ok:false,error:'Request too large'},413,cors);
      let payload;
      try { payload=JSON.parse(raw); } catch { return data({ok:false,error:'Invalid JSON'},400,cors); }
      if (!payload || typeof payload!=='object' || Array.isArray(payload)) return data({ok:false,error:'Invalid payload'},400,cors);
      const id=payload.participantId;
      if (id!=null && (typeof id!=='string'||!/^[\w-]{8,80}$/.test(id)))
        return data({ok:false,error:'Invalid participant ID'},400,cors);
      if (route.action==='submit' && (!id || typeof payload.wtp!=='number' ||
          !Number.isInteger(payload.wtp) || payload.wtp<0 || payload.wtp>250))
        return data({ok:false,error:'Invalid submission'},400,cors);
      if (route.action==='event' && (!id || !['experiment_viewed','response_submitted','reveal_viewed','results_viewed'].includes(payload.name)))
        return data({ok:false,error:'Invalid event'},400,cors);
      target=env.APPS_SCRIPT_URL;
      init={method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({experiment:'framing-lab-v2',action:route.action,
          ...(id?{participantId:id}:{}),...(route.action==='submit'?{wtp:payload.wtp}:{}),
          ...(route.action==='event'?{name:payload.name}:{})}),redirect:'follow',signal:AbortSignal.timeout(18000)};
    } else {
      target=env.APPS_SCRIPT_URL+'?action='+encodeURIComponent(route.action);
      init={method:'GET',redirect:'follow',signal:AbortSignal.timeout(18000)};
    }
    try {
      const resp=await fetch(target,init);
      if (!resp.ok) return data({ok:false,error:'Upstream unavailable'},502,cors);
      let reply;
      try {reply=await resp.json();} catch {return data({ok:false,error:'Invalid upstream response'},502,cors);}
      if (!reply || typeof reply.ok!=='boolean') return data({ok:false,error:'Malformed upstream response'},502,cors);
      return data(reply,reply.ok?200:422,cors);
    } catch(e) {
      console.error('Upstream fetch failed',String(e));
      return data({ok:false,error:'Could not verify request; retry safely'},502,cors);
    }
  }
};
