/**
 * Framing Lab collector — v1 compatible + isolated v2 research data.
 * Bound to the existing Google spreadsheet (Extensions > Apps Script).
 * Deploy Web app: Execute as Me, access Anyone. Google Sheets/Apps Script
 * are appropriate for a small, explicitly exploratory study only.
 *
 * PRIVACY: Anonymous random ID; no emails, names, IP addresses, or user agents.
 * Data are pseudonymous within the sheet and accessible to the sheet owner.
 * WARNING: Apps Script web-app URLs are public and cannot authenticate callers
 * by origin. The Worker is not an abuse-proof firewall for the direct endpoint.
 */
var V2_EXPERIMENT = 'framing-lab-v2';
var V2_REFERENCE_PRICES = { low: 45, high: 95 };
var V2_STATUS = 'collecting'; // Change to 'closed' after the study closes, THEN redeploy.
var V2_MIN_GROUP_FOR_PUBLIC_RESULTS = 20; // Privacy/UX release gate, NOT statistical power.
var V2_EVENT_TYPES = ['experiment_viewed', 'response_submitted', 'reveal_viewed', 'results_viewed'];

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.experiment === 'framing-lab-v1') return saveV1_(data);
    if (data.experiment !== V2_EXPERIMENT) return asJson_({ok:false,error:'Unknown experiment'});
    if (data.action === 'assign') return asJson_(v2Assign_(data));
    if (data.action === 'submit') return asJson_(v2Submit_(data));
    if (data.action === 'event') return asJson_(v2Event_(data));
    return asJson_({ok:false,error:'Unknown action'});
  } catch (error) {
    console.error(error);
    return asJson_({ok:false,error:'Unable to process this request'});
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'health') return asJson_({ok:true,version:V2_EXPERIMENT,status:V2_STATUS});
    if (action === 'results') return asJson_(v2Results_());
    return asJson_({ok:false,error:'Unknown action'});
  } catch (error) {
    console.error(error);
    return asJson_({ok:false,error:'Unable to read results'});
  }
}

function asJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function v2ValidateId_(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(id);
}

function v2Sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Bind this script to the response spreadsheet');
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function v2Rows_(sheet) {
  var last = sheet.getLastRow();
  return last > 1 ? sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues() : [];
}

function v2Find_(rows, id) {
  for (var i = 0; i < rows.length; i++) if (String(rows[i][1]) === id) return rows[i];
  return null;
}

function v2Locked_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function v2Assignments_() {
  return v2Sheet_('V2_Assignments', ['Assigned at (server)', 'Participant ID', 'Condition', 'Reference CHF']);
}
function v2Responses_() {
  return v2Sheet_('V2_Responses', ['Saved at (server)', 'Participant ID', 'Condition', 'Reference CHF', 'WTP CHF']);
}
function v2Events_() {
  return v2Sheet_('V2_Events', ['Event at (server)', 'Participant ID', 'Event name']);
}

function v2Assign_(data) {
  if (V2_STATUS !== 'collecting') return {ok:false,error:'Study is closed'};
  if (data.participantId != null && !v2ValidateId_(data.participantId))
    return {ok:false,error:'Invalid participant ID'};
  return v2Locked_(function() {
    var sh = v2Assignments_();
    var known = data.participantId && v2Find_(v2Rows_(sh), data.participantId);
    if (known) return {ok:true,participantId:known[1],arm:known[2],anchor:Number(known[3]),reused:true};
    var arm = Math.random() < 0.5 ? 'low' : 'high';
    var id = Utilities.getUuid();
    sh.appendRow([new Date(), id, arm, V2_REFERENCE_PRICES[arm]]);
    return {ok:true,participantId:id,arm:arm,anchor:V2_REFERENCE_PRICES[arm],reused:false};
  });
}

function v2Submit_(data) {
  if (!v2ValidateId_(data.participantId)) return {ok:false,error:'Invalid participant ID'};
  var wtp = data.wtp;
  if (typeof wtp !== 'number' || !isFinite(wtp) || Math.floor(wtp) !== wtp || wtp < 0 || wtp > 250)
    return {ok:false,error:'Enter a whole CHF amount from 0 to 250'};
  return v2Locked_(function() {
    var savedSheet = v2Responses_();
    var previous = v2Find_(v2Rows_(savedSheet), data.participantId);
    if (previous) {
      return {ok:true,saved:true,duplicate:true,participantId:previous[1],
        arm:previous[2],anchor:Number(previous[3]),wtp:Number(previous[4])};
    }
    if (V2_STATUS !== 'collecting') return {ok:false,error:'Study is closed'};
    var assignment = v2Find_(v2Rows_(v2Assignments_()), data.participantId);
    if (!assignment) return {ok:false,error:'Assignment not found; reload and try again'};
    // Arm and anchor are always recovered from the trusted assignment ledger.
    savedSheet.appendRow([new Date(), data.participantId, assignment[2], Number(assignment[3]), wtp]);
    SpreadsheetApp.flush();
    return {ok:true,saved:true,duplicate:false,participantId:data.participantId,
      arm:assignment[2],anchor:Number(assignment[3]),wtp:wtp};
  });
}

function v2Event_(data) {
  if (!v2ValidateId_(data.participantId) || V2_EVENT_TYPES.indexOf(data.name) < 0)
    return {ok:false,error:'Invalid event'};
  return v2Locked_(function() {
    var assignment = v2Find_(v2Rows_(v2Assignments_()), data.participantId);
    if (!assignment) return {ok:false,error:'Assignment not found'};
    var sh = v2Events_();
    var rows = v2Rows_(sh);
    // One unique occurrence of each event per participant avoids inflated funnels.
    for (var i=0; i<rows.length; i++) {
      if (String(rows[i][1]) === data.participantId && rows[i][2] === data.name)
        return {ok:true,duplicate:true};
    }
    sh.appendRow([new Date(),data.participantId,data.name]);
    return {ok:true};
  });
}

function v2Mean_(numbers) {
  if (!numbers.length) return null;
  return numbers.reduce(function(a,b){return a+b;},0) / numbers.length;
}
function v2Median_(numbers) {
  if (!numbers.length) return null;
  var copy = numbers.slice().sort(function(a,b){return a-b;});
  var m = Math.floor(copy.length/2);
  return copy.length%2 ? copy[m] : (copy[m-1]+copy[m])/2;
}
function v2Variance_(numbers) {
  if (numbers.length<2) return null;
  var mean = v2Mean_(numbers);
  return numbers.reduce(function(a,x){return a+(x-mean)*(x-mean);},0)/(numbers.length-1);
}
function v2Bin_(numbers) {
  var breaks = [0,20,40,60,80,101,251];
  return [0,0,0,0,0,0].map(function(_,i){
    return numbers.filter(function(x){return x>=breaks[i] && x<breaks[i+1];}).length;
  });
}
function v2Results_() {
  var responses = v2Rows_(v2Responses_());
  var assignments = v2Rows_(v2Assignments_());
  var counts = {low:0,high:0};
  assignments.forEach(function(r){if (r[2] in counts) counts[r[2]]++;});
  var values = {low:[],high:[]};
  responses.forEach(function(r){ if (r[2] in values) values[r[2]].push(Number(r[4])); });
  var total = values.low.length+values.high.length;
  var base = {ok:true,version:V2_EXPERIMENT,status:V2_STATUS,total:total,
    assigned:counts,completed:{low:values.low.length,high:values.high.length}};
  // Prevent results from influencing active participants or identifying tiny groups.
  if (V2_STATUS !== 'closed' || values.low.length < V2_MIN_GROUP_FOR_PUBLIC_RESULTS ||
      values.high.length < V2_MIN_GROUP_FOR_PUBLIC_RESULTS) {
    base.published = false;
    base.message = V2_STATUS === 'closed' ? 'Not enough responses to publish group results.' : 'Study is collecting responses.';
    return base;
  }
  var varLow = v2Variance_(values.low), varHigh = v2Variance_(values.high);
  var effect = v2Mean_(values.high) - v2Mean_(values.low);
  var se = Math.sqrt(varLow/values.low.length + varHigh/values.high.length);
  // Deliberately approximate: normal-based 95% CI, not a final inferential analysis.
  base.published = true;
  base.summary = {
    low:{n:values.low.length,mean:v2Mean_(values.low),median:v2Median_(values.low),hist:v2Bin_(values.low)},
    high:{n:values.high.length,mean:v2Mean_(values.high),median:v2Median_(values.high),hist:v2Bin_(values.high)},
    meanDifference:effect, approximate95CI:[effect-1.96*se,effect+1.96*se],
    ciMethod:'Normal approximation, exploratory', bins:['0–19','20–39','40–59','60–79','80–100','101–250']
  };
  return base;
}

/** Unmodified v1 response path, so the existing study and sheet keep working. */
function saveV1_(p) {
  var arms = { low: 45, high: 95 };
  var id = String(p.participantId || '');
  var wtp = Number(p.wtp);
  if (!Object.prototype.hasOwnProperty.call(arms, p.arm) || Number(p.anchor) !== arms[p.arm] ||
      !/^[a-zA-Z0-9-]{8,80}$/.test(id) || !Number.isInteger(wtp) || wtp < 0 || wtp > 250)
    return asJson_({ok:false,error:'Invalid response'});
  return v2Locked_(function(){
    var sh = v2Sheet_('Responses',['Timestamp (server)','Participant ID','Condition','Reference CHF','WTP CHF']);
    if (v2Find_(v2Rows_(sh), id)) return asJson_({ok:true,duplicate:true});
    sh.appendRow([new Date(),id,p.arm,arms[p.arm],wtp]);
    return asJson_({ok:true});
  });
}
