import {
  ATTENTION_CLAIM_STATUSES,
  UI_CLAIM_FILTERS,
} from "./claimFilters.js";

export const INDEX_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Escrow · Instruction evidence</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="site-header">
    <div class="brand-mark" aria-hidden="true">E</div>
    <div>
      <p class="eyebrow">Escrow</p>
      <h1>Instructions you can trust.</h1>
      <p class="tagline">Executable tests for the instructions coding agents rely on.</p>
    </div>
    <div id="overall-status" class="overall-status neutral" aria-live="polite">READY</div>
  </header>

  <main>
    <section class="panel controls-panel" aria-labelledby="scan-title">
      <div class="section-heading">
        <div><p class="step-label">01 · Instructions</p><h2 id="scan-title">Scan configuration</h2></div>
        <p id="repository-name" class="repository-name"></p>
      </div>
      <div class="control-grid">
        <label class="wide">Repository<input id="repository" readonly></label>
        <label>Target directory<input id="target"></label>
        <label>Codex model<input id="model"></label>
        <label class="toggle"><input id="execute" type="checkbox"><span>Execute documented commands</span></label>
        <label class="toggle advanced"><input id="allow-network" type="checkbox"><span>Allow network <small>Advanced</small></span></label>
      </div>
      <div class="action-row">
        <button id="scan" class="primary">Scan instructions</button>
        <p id="message" role="status" aria-live="polite">Ready to inspect the effective instruction chain.</p>
      </div>
      <ol id="stages" class="stages" aria-label="Scan stages">
        <li>Discovering instruction files</li><li>Extracting claims</li>
        <li>Validating repository evidence</li><li id="execution-stage">Executing approved commands</li>
        <li>Building report</li>
      </ol>
    </section>

    <section id="results" class="hidden" aria-labelledby="results-title">
      <div class="section-heading standalone">
        <div><p class="step-label">02 · Evidence</p><h2 id="results-title">Deterministic results</h2></div>
        <div class="downloads" aria-label="Download reports">
          <a class="download-button" href="/api/report?format=json" download>Download JSON</a>
          <a class="download-button" href="/api/report?format=markdown" download>Download Markdown</a>
          <a class="download-button" href="/api/report?format=html" download>Download HTML</a>
        </div>
      </div>
      <p id="result-message" class="result-message" role="status"></p>
      <div id="summary" class="summary-grid"></div>

      <div class="two-column">
        <section class="panel" aria-labelledby="chain-title">
          <p class="step-label">Effective scope</p><h3 id="chain-title">Instruction chain</h3>
          <ol id="instruction-chain" class="instruction-chain"></ol>
        </section>
        <section class="panel" aria-labelledby="flow-title">
          <p class="step-label">Trust boundary</p><h3 id="flow-title">How the result is made</h3>
          <div class="trust-flow"><span>Instructions</span><b>→</b><span>Evidence</span><b>→</b><span>Repair</span><b>→</b><span>Verified</span></div>
          <p class="muted">Codex extracts candidate claims. TypeScript validators assign every verdict.</p>
        </section>
      </div>

      <section class="claims-section" aria-labelledby="claims-title">
        <div class="section-heading">
          <div><p class="step-label">Claim ledger</p><h3 id="claims-title">Repository evidence</h3></div>
          <div id="filters" class="filters" role="group" aria-label="Filter claims"></div>
        </div>
        <div id="claims" class="claim-list"></div>
      </section>
    </section>

    <section id="repair" class="panel repair-panel hidden" aria-labelledby="repair-title">
      <div class="section-heading">
        <div><p class="step-label">03 · Repair</p><h2 id="repair-title">Preview instruction repair</h2></div>
        <span class="scope-pill">AGENTS.md files only</span>
      </div>
      <p>Generate the smallest truthful documentation patch in an isolated worktree. Preview never changes the active checkout.</p>
      <button id="preview-repair" class="secondary">Preview instruction repair</button>
      <div id="repair-result" class="hidden">
        <div id="repair-verification" class="verification"></div>
        <div id="repair-totals" class="repair-totals"></div>
        <p><strong>Changed files</strong></p><ul id="changed-files"></ul>
        <pre id="repair-diff" class="diff" tabindex="0"></pre>
        <div class="apply-box">
          <label class="confirmation"><input id="confirm-apply" type="checkbox"> I understand this will modify only the verified instruction files in the active repository.</label>
          <div class="action-row">
            <button id="revalidate" class="secondary">Revalidate</button>
            <button id="apply-repair" class="danger" disabled>Apply verified repair</button>
          </div>
        </div>
      </div>
    </section>
  </main>
  <footer>Local-only · 127.0.0.1 · No telemetry · No repository persistence</footer>
  <script type="module" src="/app.js"></script>
</body>
</html>`;

export const STYLES_CSS = `
:root{--ink:#17201d;--muted:#62706a;--paper:#f4f2eb;--panel:#fffdf7;--line:#d9ddd5;--green:#176b50;--green-soft:#e4f2eb;--red:#b63d32;--red-soft:#f8e8e5;--amber:#9a6810;--amber-soft:#f7efd9;--blue:#315d87;--shadow:0 18px 55px rgba(35,45,40,.08)}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 10% 0,#e6efe8 0,transparent 30rem),var(--paper);color:var(--ink);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,a{font:inherit}button:focus-visible,input:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #70a4d1;outline-offset:3px}
.site-header{max-width:1180px;margin:0 auto;padding:58px 30px 36px;display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center}.brand-mark{width:54px;height:54px;border-radius:17px;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:800;letter-spacing:.04em}.eyebrow,.step-label{margin:0 0 4px;color:var(--green);font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.site-header h1{font-family:Georgia,serif;font-size:clamp(32px,5vw,58px);line-height:1;margin:0}.tagline{margin:10px 0 0;color:var(--muted);font-size:17px}.overall-status{padding:12px 16px;border:1px solid var(--line);border-radius:999px;font-size:13px;font-weight:900;letter-spacing:.1em}.overall-status.pass{background:var(--green-soft);color:var(--green);border-color:#acd2bf}.overall-status.fail{background:var(--red-soft);color:var(--red);border-color:#e9b8b1}.overall-status.warning{background:var(--amber-soft);color:var(--amber);border-color:#ead193}
main{max-width:1180px;margin:0 auto;padding:0 30px 70px}.panel{background:rgba(255,253,247,.94);border:1px solid var(--line);border-radius:20px;padding:25px;box-shadow:var(--shadow)}.section-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:20px}.section-heading.standalone{margin:42px 0 18px}.section-heading h2,.section-heading h3,.panel h3{font-family:Georgia,serif;margin:0;font-size:28px}.repository-name{font-weight:700;color:var(--muted)}
.control-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px}.control-grid label{display:flex;flex-direction:column;gap:7px;color:var(--muted);font-size:13px;font-weight:700}.control-grid .wide{grid-column:span 3}.control-grid input[type=text],.control-grid input:not([type]){width:100%}.control-grid input{border:1px solid #cbd1c9;border-radius:10px;background:#fff;padding:11px 12px;color:var(--ink)}.control-grid input[readonly]{background:#edf0eb;color:#56615c}.control-grid .toggle{align-self:center;flex-direction:row;align-items:center;color:var(--ink);padding-top:22px}.toggle input{accent-color:var(--green);width:18px;height:18px}.advanced small{padding:2px 6px;background:var(--amber-soft);color:var(--amber);border-radius:6px;margin-left:4px}.action-row{display:flex;align-items:center;gap:18px;margin-top:22px}.action-row p{color:var(--muted);margin:0}.primary,.secondary,.danger{border-radius:10px;padding:11px 17px;font-weight:800;cursor:pointer}.primary{border:1px solid var(--ink);background:var(--ink);color:#fff}.secondary{border:1px solid #aeb8b1;background:#fff;color:var(--ink)}.danger{border:1px solid var(--red);background:var(--red);color:#fff}.danger:disabled,button:disabled{opacity:.45;cursor:not-allowed}.stages{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:0;margin:24px 0 0;list-style:none;counter-reset:stage}.stages li{border-top:3px solid var(--line);padding-top:8px;color:var(--muted);font-size:12px}.stages li.running{border-color:var(--blue);color:var(--blue);font-weight:800}.stages li.done{border-color:var(--green);color:var(--green)}.stages li.skipped{opacity:.45}
.hidden{display:none!important}.downloads{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.download-button{display:inline-flex;align-items:center;min-height:40px;border:1px solid #aeb8b1;border-radius:10px;background:#fff;color:var(--ink);padding:8px 12px;font-weight:800;text-decoration:none}.download-button:hover{border-color:var(--green);color:var(--green)}.result-message{margin:0 0 18px;padding:15px 18px;border-radius:14px;font-family:Georgia,serif;font-size:20px;font-weight:700}.result-message.fail{background:var(--red-soft);color:#7d211a;border:1px solid #e5aaa2}.result-message.pass{background:var(--green-soft);color:#0f583f;border:1px solid #add0bd}.summary-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}.summary-card{background:var(--panel);border:1px solid var(--line);border-radius:15px;padding:16px}.summary-card strong{display:block;font-family:Georgia,serif;font-size:30px}.summary-card span{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.07em}.summary-card.failed,.summary-card.warnings,.summary-card.blocked,.summary-card.inconclusive{background:#fff9ef;border-color:#dbb96f}.summary-card.failed{background:var(--red-soft);border-color:#e0a7a0}.summary-card.passed,.summary-card.advisory,.summary-card.overridden{box-shadow:none}.two-column{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:18px 0}.instruction-chain{margin:16px 0 0;padding-left:24px}.instruction-chain li{padding:7px 0 7px 5px}.instruction-chain code{word-break:break-all}.scope-note{display:block;color:var(--muted);font-size:12px}.trust-flow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:22px 0;padding:16px;border-radius:13px;background:#edf3ee}.trust-flow span{font-weight:800}.trust-flow b{color:var(--green)}.muted{color:var(--muted)}
.claims-section{margin-top:28px}.filters{display:flex;flex-wrap:wrap;gap:6px}.filters button{border:1px solid var(--line);background:transparent;border-radius:999px;padding:7px 12px;color:var(--muted);cursor:pointer}.filters button.active{background:var(--ink);color:#fff;border-color:var(--ink)}.claim-list{display:grid;gap:10px}.claim-card{background:var(--panel);border:1px solid var(--line);border-radius:15px;overflow:hidden}.claim-card.status-failed{border-color:#d98980;box-shadow:0 10px 28px rgba(182,61,50,.12)}.claim-card.status-warning,.claim-card.status-blocked,.claim-card.status-inconclusive{border-color:#d9b45f;box-shadow:0 8px 24px rgba(154,104,16,.09)}.claim-card.status-passed,.claim-card.status-advisory,.claim-card.status-overridden{background:rgba(255,253,247,.72);box-shadow:none}.claim-card summary{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:17px;cursor:pointer;list-style:none}.claim-card summary::-webkit-details-marker{display:none}.status-badge{border-radius:999px;padding:4px 9px;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.status-passed{background:var(--green-soft);color:var(--green)}.status-failed{background:var(--red-soft);color:var(--red)}.status-warning,.status-blocked,.status-inconclusive{background:var(--amber-soft);color:var(--amber)}.status-advisory,.status-overridden{background:#e9edf1;color:#52677a}.claim-type{font-weight:800}.claim-source{color:var(--muted);font-size:12px;text-align:right;word-break:break-all}.claim-body{border-top:1px solid var(--line);padding:18px;display:grid;gap:14px}.claim-body h4{margin:0 0 5px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.claim-body p,.claim-body ul{margin:0}.instruction-quote{font-family:Georgia,serif;font-size:17px}.evidence-list{padding-left:20px}.command-output,.diff{white-space:pre-wrap;word-break:break-word;background:#16201d;color:#dce9e1;border-radius:12px;padding:15px;overflow:auto;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
.repair-panel{margin-top:32px;border-color:#bed0c4}.scope-pill{background:var(--green-soft);color:var(--green);border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800}.verification{margin:22px 0 12px;padding:13px;border-radius:10px;background:var(--green-soft);color:var(--green);font-weight:800}.repair-totals{display:grid;grid-template-columns:1fr 1fr;gap:12px}.repair-totals div{border:1px solid var(--line);border-radius:12px;padding:12px}.apply-box{border-top:1px solid var(--line);margin-top:20px;padding-top:18px}.confirmation{display:flex;gap:10px;align-items:flex-start}.confirmation input{margin-top:5px;accent-color:var(--red)}footer{max-width:1180px;margin:0 auto;padding:20px 30px 40px;color:var(--muted);text-align:center;font-size:12px}
@media(max-width:800px){.site-header{grid-template-columns:auto 1fr}.overall-status{grid-column:1/-1;justify-self:start}.control-grid{grid-template-columns:1fr}.control-grid .wide{grid-column:auto}.summary-grid{grid-template-columns:repeat(2,1fr)}.two-column{grid-template-columns:1fr}.stages{grid-template-columns:1fr}.section-heading{align-items:flex-start;flex-direction:column}.claim-card summary{grid-template-columns:auto 1fr}.claim-source{grid-column:1/-1;text-align:left}.trust-flow{flex-wrap:wrap}}
`;

export const APP_JAVASCRIPT = `
const state={config:null,report:null,preview:null,filter:'attention'};
const $=(id)=>document.getElementById(id);
const el=(name,className,text)=>{const node=document.createElement(name);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node};
const labels={passed:'Passed',failed:'Failed',warnings:'Warnings',blocked:'Blocked',inconclusive:'Inconclusive',advisory:'Advisory',overridden:'Overridden'};
const filters=${JSON.stringify(UI_CLAIM_FILTERS)};
const attentionStatuses=new Set(${JSON.stringify(ATTENTION_CLAIM_STATUSES)});

async function api(path,options={}){const response=await fetch(path,options);const type=response.headers.get('content-type')||'';const body=type.includes('application/json')?await response.json():await response.text();if(!response.ok)throw new Error(body.error||body||('Request failed: '+response.status));return body}
function requestOptions(){return{target:$('target').value,model:$('model').value,execute:$('execute').checked,allowNetwork:$('allow-network').checked,timeout:state.config.timeout}}
function setBusy(busy,message){$('scan').disabled=busy;$('preview-repair').disabled=busy;$('message').textContent=message;document.body.setAttribute('aria-busy',String(busy))}
function updateStages(running,complete){const items=[...$('stages').children];items.forEach((item,index)=>{item.className=complete?'done':running&&index===0?'running':''});if(!$('execute').checked)items[3].className=complete?'skipped':''}
function displayRepositoryPath(path){const root=state.report?.repositoryRoot||state.config?.repository;if(!root||typeof path!=='string')return path;const normalizedRoot=root.replaceAll('\\\\','/').replace(/\\/+$/,'');const normalizedPath=path.replaceAll('\\\\','/');if(normalizedPath===normalizedRoot)return'.';const prefix=normalizedRoot+'/';if(normalizedPath.startsWith(prefix))return normalizedPath.slice(prefix.length);if(normalizedPath.startsWith('/')||normalizedPath==='..'||normalizedPath.startsWith('../'))return'[outside repository] '+path;return normalizedPath}
function displayRepositoryEvidence(value){const root=state.report?.repositoryRoot||state.config?.repository;if(!root||typeof value!=='string')return value;const normalizedRoot=root.replaceAll('\\\\','/').replace(/\\/+$/,'');const text=value.replaceAll('\\\\','/');const displayed=text.replaceAll(normalizedRoot+'/','');if(displayed===normalizedRoot)return'.';return displayed.replaceAll('"'+normalizedRoot+'"','"."')}
function sourceLocation(claim){return displayRepositoryPath(claim.sourceFile)+':'+claim.lineStart+(claim.lineEnd===claim.lineStart?'':'-'+claim.lineEnd)}
function statusFilter(status){return status==='warning'?'warnings':status}
function claimMatchesFilter(claim){if(state.filter==='all')return true;if(state.filter==='attention')return attentionStatuses.has(claim.status);return statusFilter(claim.status)===state.filter}

function renderSummary(report){const root=$('summary');root.replaceChildren();Object.entries(labels).forEach(([key,label])=>{const card=el('div','summary-card '+key);card.append(el('strong','',report.summary[key]),el('span','',label));root.append(card)});const overall=$('overall-status');overall.textContent=report.overallStatus==='pass_with_warnings'?'PASS WITH WARNINGS':report.overallStatus.toUpperCase();overall.className='overall-status '+(report.overallStatus==='pass'?'pass':report.overallStatus==='fail'?'fail':'warning')}
function renderChain(report){const root=$('instruction-chain');root.replaceChildren();report.instructionChain.forEach((file,index)=>{const item=el('li');item.append(el('code','',displayRepositoryPath(file.path)),el('span','scope-note',index===0?'Broadest instruction':'More specific · scope '+displayRepositoryPath(file.directory)));root.append(item)});if(report.instructionChain.length===0)root.append(el('li','muted','No non-empty instruction files discovered.'))}
function renderFilters(){const root=$('filters');root.replaceChildren();filters.forEach(filter=>{const button=el('button',state.filter===filter.name?'active':'',filter.label);button.type='button';button.setAttribute('aria-pressed',String(state.filter===filter.name));button.onclick=()=>{state.filter=filter.name;renderFilters();renderClaims()};root.append(button)})}
function addField(root,title,value,className){if(value===undefined||value===null||value==='')return;const box=el('div');box.append(el('h4','',title),el('p',className||'',value));root.append(box)}
function renderClaims(){const root=$('claims');root.replaceChildren();const claims=state.report?.claims||[];claims.filter(claimMatchesFilter).forEach(claim=>{const card=el('details','claim-card status-'+claim.status);if(claim.status==='failed')card.open=true;const head=el('summary');head.append(el('span','status-badge status-'+claim.status,claim.status),el('span','claim-type',claim.type.replaceAll('_',' ')),el('span','claim-source',sourceLocation(claim)));const body=el('div','claim-body');addField(body,'Original instruction',claim.originalText,'instruction-quote');addField(body,'Normalized claim',claim.normalizedValue);const evidence=el('div');evidence.append(el('h4','','Deterministic evidence'));const list=el('ul','evidence-list');claim.evidence.forEach(item=>list.append(el('li','',displayRepositoryEvidence(item))));evidence.append(list);body.append(evidence);addField(body,'Suggestion',claim.suggestion);if(claim.commandResult){const output='Command: '+claim.commandResult.command+'\\nWorking directory: '+displayRepositoryPath(claim.commandResult.workingDirectory)+'\\nExit code: '+claim.commandResult.exitCode+'\\nDuration: '+claim.commandResult.durationMs+'ms\\n\\nSTDOUT\\n'+claim.commandResult.stdout+'\\n\\nSTDERR\\n'+claim.commandResult.stderr;addField(body,'Command output',output,'command-output')}card.append(head,body);root.append(card)});if(root.children.length===0)root.append(el('p','muted','No claims match this filter.'))}
function renderReport(report,options={}){state.report=report;state.filter=report.claims.some(claim=>attentionStatuses.has(claim.status))?'attention':'passed';$('results').classList.remove('hidden');const resultMessage=$('result-message');resultMessage.textContent=report.summary.failed>0?'These instructions do not match the repository.':'No broken instructions were found.';resultMessage.className='result-message '+(report.summary.failed>0?'fail':'pass');renderSummary(report);renderChain(report);renderFilters();renderClaims();$('repair').classList.toggle('hidden',report.summary.failed===0&&!state.preview);if(!options.preservePreview){$('repair-result').classList.add('hidden');state.preview=null;$('confirm-apply').checked=false;$('apply-repair').disabled=true}}

async function scan(){setBusy(true,'Running the shared Escrow check pipeline…');updateStages(true,false);try{const report=await api('/api/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestOptions())});renderReport(report);updateStages(false,true);$('message').textContent='Scan complete. Every status below comes from deterministic validation.'}catch(error){$('message').textContent='Scan failed: '+error.message;updateStages(false,false)}finally{setBusy(false,$('message').textContent)}}
function totalsText(report){return report.summary.passed+' passed · '+report.summary.failed+' failed · '+report.summary.warnings+' warnings · '+report.summary.inconclusive+' inconclusive'}
function displayRepairPatch(patch){const root=state.config?.repository?.replaceAll('\\\\','/').replace(/\\/+$/,'');return root?patch.replaceAll(root+'/',''):patch}
async function previewRepair(){setBusy(true,'Generating and verifying an instruction-only repair in a temporary worktree…');try{const preview=await api('/api/fix/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestOptions())});state.preview=preview;$('repair-result').classList.remove('hidden');$('repair-verification').textContent=preview.verified?'Verified: repair reduced failures without introducing new failures.':'No verified repair was produced.';$('repair-diff').textContent=preview.patch?displayRepairPatch(preview.patch):'No patch.';const changed=$('changed-files');changed.replaceChildren();preview.changedFiles.forEach(file=>changed.append(el('li','',displayRepositoryPath(file))));const totals=$('repair-totals');totals.replaceChildren();const before=el('div');before.append(el('strong','','Before'),el('p','',totalsText(preview.beforeReport)));const after=el('div');after.append(el('strong','','After'),el('p','',preview.afterReport?totalsText(preview.afterReport):'Not available'));totals.append(before,after);$('apply-repair').disabled=!preview.verified||!$('confirm-apply').checked;$('message').textContent=preview.verified?'Repair preview verified. The active checkout is unchanged.':'No repair was needed or verified.'}catch(error){$('message').textContent='Repair preview rejected: '+error.message}finally{setBusy(false,$('message').textContent)}}
function revalidatePreview(){if(!state.preview?.verified||!state.preview.afterReport){$('message').textContent='No verified preview is available to revalidate.';return}renderReport(state.preview.afterReport,{preservePreview:true});$('repair').classList.remove('hidden');$('repair-result').classList.remove('hidden');$('message').textContent='Verified repair revalidated in the isolated worktree. The active checkout is unchanged.'}
async function applyRepair(){if(!state.preview?.verified||!$('confirm-apply').checked)return;setBusy(true,'Applying the exact verified instruction patch…');try{await api('/api/fix/apply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({previewId:state.preview.previewId,confirmation:'APPLY_VERIFIED_REPAIR'})});state.preview=null;$('message').textContent='Verified repair applied. Scan again to build fresh evidence.';$('apply-repair').disabled=true;$('confirm-apply').checked=false}catch(error){$('message').textContent='Repair was not applied: '+error.message}finally{setBusy(false,$('message').textContent)}}
async function load(){try{state.config=await api('/api/config');$('repository').value=state.config.repository;$('target').value=state.config.target;$('model').value=state.config.model;$('execute').checked=state.config.execute;$('allow-network').checked=state.config.allowNetwork;$('repository-name').textContent=state.config.repository.split('/').filter(Boolean).at(-1)||state.config.repository;$('execution-stage').classList.toggle('skipped',!state.config.execute)}catch(error){$('message').textContent='Unable to load local configuration: '+error.message}}
$('scan').onclick=scan;$('preview-repair').onclick=previewRepair;$('revalidate').onclick=revalidatePreview;$('apply-repair').onclick=applyRepair;$('confirm-apply').onchange=()=>{$('apply-repair').disabled=!(state.preview?.verified&&$('confirm-apply').checked)};$('execute').onchange=()=>{$('execution-stage').classList.toggle('skipped',!$('execute').checked)};load();
`;
