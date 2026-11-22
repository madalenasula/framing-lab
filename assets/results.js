/* Published results are withheld until the study is closed and counts clear a disclosure gate. */
(async()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const root=String(window.FRAMING_LAB_API||'').replace(/\/$/,'');
  const amount=value=>Number.isFinite(value)?'CHF '+value.toFixed(1):'—';
  const setStatus=(state,heading,message)=>{$('status').textContent=state;$('status-heading').textContent=heading;$('status-text').textContent=message;};
  if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(root)){
    setStatus('Not connected','Results are not available','The published Worker endpoint must be configured in config.js.');return;
  }
  try{
    const resp=await fetch(root+'/api/results',{cache:'no-store'});
    const r=await resp.json();
    if(!resp.ok||!r.ok)throw new Error(r.error||'Could not load study status');
    $('n-total').textContent=String(r.total);
    $('n-low').textContent=String(r.completed.low);
    $('n-high').textContent=String(r.completed.high);
    $('study-count').hidden=false;
    if(!r.published){
      const closed=r.status==='closed';
      setStatus(closed?'Closed · insufficient data':'Collecting responses',
        closed?'Results are not yet publishable':'The experiment is underway.',
        closed?'Group results are withheld because one or both groups did not reach the publication threshold. This is not a statistical-power criterion.':'To avoid influencing new participants, group averages and comparisons are not shown while data collection is open. This page will share results after the study closes and disclosure criteria are met.');
    } else {
      setStatus('Study closed · results available','The two groups have been compared.',
        'These are descriptive findings from a self-selected, hypothetical online experiment.');
      const s=r.summary;
      $('mean-low').textContent=amount(s.low.mean);
      $('mean-high').textContent=amount(s.high.mean);
      $('mean-effect').textContent=(s.meanDifference>=0?'+ ':'− ')+amount(Math.abs(s.meanDifference));
      $('confidence').textContent=`Approximate 95% confidence interval for high minus low: ${amount(s.approximate95CI[0])} to ${amount(s.approximate95CI[1])}. Normal approximation; interpret cautiously when values are skewed or sample sizes are small.`;
      const max=Math.max(1,...s.low.hist,...s.high.hist);
      const chart=$('histogram');
      for(let i=0;i<s.bins.length;i++){
        const row=document.createElement('div');row.className='bucket';
        const label=document.createElement('label');label.textContent=s.bins[i]+' CHF';row.append(label);
        const bars=document.createElement('div');bars.className='bars';
        for(const arm of ['low','high']){
          const line=document.createElement('div');line.className='bar-group';
          const bar=document.createElement('div');bar.className='bar '+arm;
          bar.style.width=(100*s[arm].hist[i]/max)+'%';
          bar.title=`${arm} reference: ${s[arm].hist[i]} answers`;
          const value=document.createElement('span');value.textContent=String(s[arm].hist[i]);
          line.append(bar,value);bars.append(line);
        }
        row.append(bars);chart.append(row);
      }
      $('histogram').setAttribute('aria-label','Counts by WTP bands, low then high. '+s.bins.map((b,i)=>`${b} CHF: ${s.low.hist[i]} low, ${s.high.hist[i]} high`).join('; '));
      $('interpretation').textContent=s.meanDifference>0?'In this sample, the higher example-price group reported a higher mean valuation. This is not proof of a psychological mechanism or of purchase behavior.':s.meanDifference<0?'In this sample, the higher example-price group reported a lower mean valuation. This is not proof of an absence of anchoring in other settings.':'The groups reported equal mean valuations in this sample. This does not establish equivalence.';
      $('study-findings').hidden=false;
    }
    try{
      const session=JSON.parse(localStorage.getItem('framing-lab-v2:state')||'null');
      if(session?.participantId)void fetch(root+'/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({participantId:session.participantId,name:'results_viewed'})}).catch(()=>{});
    }catch{}
  }catch(error){setStatus('Connection issue','Results could not be loaded',error.message+' Please try again later.');}
})();
