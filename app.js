const QUESTIONS = window.QUESTIONS || [];
const KEY="dea-c01-practice-v2";
let state={
  mode:"timed", order:[], answers:{}, flagged:{}, choiceOrder:{}, locked:{}, hintsShown:{}, current:0, startedAt:null, durationSec:10800,
  finished:false, submittedAt:null, subset:null
};
let timerHandle=null;

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function currentPool(){
  const ids=state.subset?.length?state.subset:state.order;
  return ids.map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
}
function save(){ localStorage.setItem(KEY,JSON.stringify(state)); }
function loadSaved(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY));
    if(x && Array.isArray(x.order) && x.order.length){
      x.choiceOrder ??={};x.locked??={};x.hintsShown??={};x.answers??={};x.flagged??={};
      return x;
    }
  }catch(e){}
  return null;
}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800);}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function selectedMode(){return document.querySelector('input[name="mode"]:checked').value;}
document.querySelectorAll('.mode input').forEach(i=>i.addEventListener('change',()=>{document.querySelectorAll('.mode').forEach(m=>m.classList.remove('selected'));i.closest('.mode').classList.add('selected');}));

function buildHint(q){
  const text=q.explanation||"";
  const service=(text.match(/(?:Amazon|AWS)\s+[A-Z][A-Za-z0-9 ()+.-]+/)||[])[0];
  if(service) return `Think about which AWS capability best matches the key requirement. Focus on the feature associated with ${service.replace(/\.$/,"")}, but do not choose only by service name—check the operational requirement in the scenario.`;
  const task=(q.task||"").replace(/^\d+(?:\.\d+)?\s*/,"");
  if(task) return `Focus on the requirement that matters most for ${task.toLowerCase()}: scalability, ordering, incremental processing, cost, security, or operational effort. Eliminate options that solve a different problem.`;
  return `Identify the strongest constraint in the scenario first. Then eliminate any option that does not directly satisfy that constraint or adds unnecessary operational overhead.`;
}

function startAttempt(subset=null){
  const mode=subset?"untimed":selectedMode();
  let ids=subset?.length?[...subset]:QUESTIONS.map(q=>q.id);
  if(!subset && $("#shuffle").checked) ids=shuffle(ids);
  state={mode,order:ids,answers:{},flagged:{},choiceOrder:{},locked:{},hintsShown:{},current:0,startedAt:Date.now(),durationSec:10800,finished:false,submittedAt:null,subset:subset||null};
  save();showExam();renderQuestion();startTimer();
}
function resumeAttempt(){const x=loadSaved();if(!x)return;state=x;if(state.finished){showResults();renderResults();}else{showExam();renderQuestion();startTimer();}}
function showExam(){$("#home").classList.add("hidden");$("#results").classList.add("hidden");$("#exam").classList.remove("hidden");$("#topstatus").classList.remove("hidden");$("#mobileNav").classList.remove("hidden");}
function showResults(){clearInterval(timerHandle);$("#home").classList.add("hidden");$("#exam").classList.add("hidden");$("#results").classList.remove("hidden");$("#topstatus").classList.add("hidden");$("#mobileNav").classList.add("hidden");}

function renderQuestion(){
  const pool=currentPool(); const q=pool[state.current]; if(!q)return;
  $("#qnum").textContent=`Question ${state.current+1} of ${pool.length}`;
  $("#topProgress").textContent=`Question ${state.current+1} / ${pool.length}`;
  $("#domainTag").textContent=q.domain.replace("Domain ","D");
  $("#qprompt").textContent=q.prompt;
  const multi=q.correct.length>1;
  $("#multiHint").classList.toggle("hidden",!multi);
  if(multi) $("#multiHint").textContent=`Multiple response — select ${q.correct.length} answers.`;

  const shown=!!state.hintsShown[q.id];
  $("#studyHint").classList.toggle("hidden",!shown);
  $("#studyHint").innerHTML=shown?`<strong>💡 Hint</strong>${esc(buildHint(q))}`:"";
  $("#hintBtn").textContent=shown?"💡 Hide hint":"💡 Show hint";
  $("#hintBtn").onclick=()=>{state.hintsShown[q.id]=!state.hintsShown[q.id];save();renderQuestion();};

  const ans=state.answers[q.id]||[];
  state.choiceOrder ??={};state.locked??={};
  if(!state.choiceOrder[q.id]){state.choiceOrder[q.id]=shuffle(q.choices.map((_,i)=>i));save();}
  const displayOrder=state.choiceOrder[q.id];
  const locked=!!state.locked[q.id];

  $("#choices").innerHTML=displayOrder.map((originalIndex,displayIndex)=>{
    const c=q.choices[originalIndex];
    const isCorrect=q.correct.includes(originalIndex),isUser=ans.includes(originalIndex);
    let cls=ans.includes(originalIndex)?"selected":"";
    if(locked){if(isCorrect)cls+=" correct-answer";else if(isUser)cls+=" wrong-answer";cls+=" locked";}
    return `<label class="choice ${cls}">
      <input type="${multi?"checkbox":"radio"}" name="q${q.id}" value="${originalIndex}" ${isUser?"checked":""} ${locked?"disabled":""}>
      <span class="letter">${letters[displayIndex]}</span><span>${esc(c)}</span>
    </label>`;
  }).join("");

  if(!locked){
    $("#choices").querySelectorAll("input").forEach(inp=>inp.addEventListener("change",e=>{
      let arr=state.answers[q.id]||[]; const idx=Number(e.target.value);
      if(multi){
        if(e.target.checked){
          if(arr.length>=q.correct.length){e.target.checked=false;toast(`Select only ${q.correct.length} answers.`);return;}
          arr=[...new Set([...arr,idx])];
        }else arr=arr.filter(x=>x!==idx);
      }else arr=[idx];
      state.answers[q.id]=arr;
      if((!multi && arr.length===1)||(multi && arr.length===q.correct.length)) state.locked[q.id]=true;
      save();renderQuestion();
      if(state.locked[q.id]) setTimeout(()=>$("#instantFeedback").scrollIntoView({behavior:"smooth",block:"nearest"}),80);
    }));
  }

  renderInstantFeedback(q,displayOrder,ans,locked);
  const flagged=!!state.flagged[q.id];
  ["#reviewBtn","#mReview"].forEach(sel=>{const b=$(sel);b.classList.toggle("active",flagged);b.textContent=flagged?(sel==="#mReview"?"★":"★ Marked for review"):(sel==="#mReview"?"☆":"☆ Mark for review");});
  $("#prevBtn").disabled=state.current===0;$("#mPrev").disabled=state.current===0;
  $("#nextBtn").textContent=state.current===pool.length-1?"Review & submit →":"Next →";
  $("#mNext").textContent=state.current===pool.length-1?"Submit":"Next →";
  renderNavigator();
}

function renderInstantFeedback(q,displayOrder,ans,locked){
  const box=$("#instantFeedback");
  if(!locked){box.classList.add("hidden");box.innerHTML="";return;}
  const ok=sameSet(ans,q.correct);
  box.className=`instant-feedback ${ok?"good":"bad"}`;
  box.innerHTML=`<h3>${ok?"✅ Correct answer":"❌ Incorrect answer"}</h3>
    <p><strong>Why:</strong> ${esc(q.explanation)}</p>
    <div class="feedback-options">${displayOrder.map((originalIndex,displayIndex)=>{
      const correct=q.correct.includes(originalIndex),user=ans.includes(originalIndex);
      const tag=correct?"✓ Correct option":(user?"✕ Your selected option":"Why this is not correct");
      const cls=correct?"correct":(user?"userwrong":"");
      return `<div class="feedback-option ${cls}"><b>${letters[displayIndex]}. ${esc(q.choices[originalIndex])} — ${tag}</b>${esc(q.why[originalIndex])}</div>`;
    }).join("")}</div>
    <div class="feedback-tip">Your first completed answer is locked so the score stays meaningful. You can still mark the question for review and revisit this explanation later.</div>`;
}

function renderNavigator(){
  const pool=currentPool();
  $("#qgrid").innerHTML=pool.map((q,i)=>{const a=(state.answers[q.id]||[]).length>0,f=!!state.flagged[q.id];return `<button class="qdot ${i===state.current?"current":""} ${a?"answered":""} ${f?"flagged":""}" data-i="${i}">${i+1}</button>`;}).join("");
  $("#qgrid").querySelectorAll("button").forEach(b=>b.onclick=()=>{state.current=Number(b.dataset.i);save();renderQuestion();window.scrollTo({top:0,behavior:"smooth"});});
  $("#answeredCount").textContent=pool.filter(q=>(state.answers[q.id]||[]).length).length;
  $("#flaggedCount").textContent=pool.filter(q=>state.flagged[q.id]).length;
}
function nav(delta){const pool=currentPool();if(delta>0&&state.current===pool.length-1){confirmSubmit();return;}state.current=Math.max(0,Math.min(pool.length-1,state.current+delta));save();renderQuestion();window.scrollTo({top:0,behavior:"smooth"});}
function toggleFlag(){const q=currentPool()[state.current];state.flagged[q.id]=!state.flagged[q.id];save();renderQuestion();}
function fmt(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
function startTimer(){clearInterval(timerHandle);if(state.mode!=="timed"){$("#timer").textContent="Untimed";$("#timer").classList.remove("danger");return;}const tick=()=>{const elapsed=(Date.now()-state.startedAt)/1000,left=state.durationSec-elapsed;$("#timer").textContent=fmt(left);$("#timer").classList.toggle("danger",left<=600);if(left<=0){clearInterval(timerHandle);submitExam(true);}};tick();timerHandle=setInterval(tick,1000);}
function modal(title,body,okText,onOk){$("#modalRoot").innerHTML=`<div class="modalback"><div class="modal"><h3>${esc(title)}</h3><p>${body}</p><div class="modal-actions"><button class="ghost" id="cancelModal">Cancel</button><button class="primary" id="okModal">${esc(okText)}</button></div></div></div>`;$("#cancelModal").onclick=()=>$("#modalRoot").innerHTML="";$("#okModal").onclick=()=>{$("#modalRoot").innerHTML="";onOk();};}
function confirmSubmit(){const pool=currentPool(),unanswered=pool.filter(q=>(state.answers[q.id]||[]).length===0).length;modal("Submit this attempt?",`You have <strong>${unanswered}</strong> unanswered question${unanswered===1?"":"s"}. You can review them before submitting.`,"Submit exam",()=>submitExam(false));}
function sameSet(a,b){if(a.length!==b.length)return false;const A=[...a].sort((x,y)=>x-y),B=[...b].sort((x,y)=>x-y);return A.every((v,i)=>v===B[i]);}
function submitExam(timeout=false){if(state.finished)return;state.finished=true;state.submittedAt=Date.now();save();showResults();renderResults();if(timeout)toast("Time expired — exam submitted.");}
function resultData(){const pool=currentPool();let correctAll=0,scoredCorrect=0,scoredTotal=0,unanswered=0;const per={};pool.forEach(q=>{const a=state.answers[q.id]||[],ok=sameSet(a,q.correct);if(!a.length)unanswered++;if(ok)correctAll++;if(q.scored){scoredTotal++;if(ok)scoredCorrect++;}per[q.domain]??={correct:0,total:0};per[q.domain].total++;if(ok)per[q.domain].correct++;});return{pool,correctAll,scoredCorrect,scoredTotal,unanswered,per};}
function renderResults(){const r=resultData(),pct=r.scoredTotal?Math.round(r.scoredCorrect/r.scoredTotal*100):Math.round(r.correctAll/r.pool.length*100);$("#scorePct").textContent=pct+"%";$("#scoreRing").style.setProperty("--scoredeg",(pct*3.6)+"deg");$("#score50").textContent=`${r.scoredCorrect} / ${r.scoredTotal}`;$("#score65").textContent=`${r.correctAll} / ${r.pool.length}`;$("#unansweredMetric").textContent=r.unanswered;const elapsed=((state.submittedAt||Date.now())-state.startedAt)/1000;$("#timeUsed").textContent=fmt(elapsed);$("#resultHeadline").textContent=pct>=85?"Strong performance":pct>=70?"Good base — keep refining":pct>=55?"Progressing — target weak domains":"Build the fundamentals first";$("#resultText").textContent=`You answered ${r.correctAll} of ${r.pool.length} practice questions correctly. The official-style view counts only the questions marked as scored in this simulator.`;$("#domainBreakdown").innerHTML=Object.entries(r.per).map(([d,v])=>{const p=v.total?Math.round(v.correct/v.total*100):0;return `<div class="break-row"><div><strong>${esc(d.replace("Domain ","D"))}</strong><div class="bar"><i style="width:${p}%"></i></div></div><span>${v.correct} / ${v.total} correct</span><strong>${p}%</strong></div>`;}).join("");renderReview();$("#reviewPanel").classList.add("hidden");$("#toggleReview").textContent="Show answer review";const missed=r.pool.filter(q=>!sameSet(state.answers[q.id]||[],q.correct)).map(q=>q.id);$("#retryMissed").disabled=missed.length===0;$("#retryMissed").onclick=()=>{if(missed.length)startAttempt(missed);};}
function renderReview(){const r=resultData();$("#reviewPanel").innerHTML=`<div class="card-pad"><h3 style="margin:0">Answer review</h3><p style="color:#6b7280;margin:6px 0 0;font-size:13px">Open any question to review the full explanation.</p></div>`+r.pool.map((q,i)=>{const a=state.answers[q.id]||[],ok=sameSet(a,q.correct),status=!a.length?["Unanswered","skip"]:ok?["Correct","ok"]:["Incorrect","bad"];return `<details class="review-item"><summary>Q${i+1}. ${esc(q.prompt)} <span class="statuspill ${status[1]}">${status[0]}</span>${q.scored?"":'<span class="statuspill skip">experimental</span>'}</summary><div class="expl"><strong>Explanation:</strong> ${esc(q.explanation)}</div><div style="margin-top:10px">${(state.choiceOrder?.[q.id]||q.choices.map((_,j)=>j)).map((originalIndex,displayIndex)=>{const c=q.choices[originalIndex],isC=q.correct.includes(originalIndex),isU=a.includes(originalIndex),cls=isC?"correct":(isU&&!isC?"user-wrong":"");return `<div class="choice-review ${cls}"><b>${letters[displayIndex]}. ${esc(c)} ${isC?"✓ Correct":isU?"✕ Your choice":""}</b>${esc(q.why[originalIndex])}</div>`;}).join("")}</div></details>`;}).join("");}
function newExam(){localStorage.removeItem(KEY);state={mode:"timed",order:[],answers:{},flagged:{},choiceOrder:{},locked:{},hintsShown:{},current:0,startedAt:null,durationSec:10800,finished:false,submittedAt:null,subset:null};clearInterval(timerHandle);$("#results").classList.add("hidden");$("#exam").classList.add("hidden");$("#home").classList.remove("hidden");$("#topstatus").classList.add("hidden");$("#mobileNav").classList.add("hidden");$("#resumeBox").classList.add("hidden");window.scrollTo(0,0);}

$("#startBtn").onclick=()=>startAttempt();$("#resumeBtn").onclick=resumeAttempt;$("#prevBtn").onclick=()=>nav(-1);$("#nextBtn").onclick=()=>nav(1);$("#mPrev").onclick=()=>nav(-1);$("#mNext").onclick=()=>nav(1);$("#reviewBtn").onclick=toggleFlag;$("#mReview").onclick=toggleFlag;$("#submitBtn").onclick=confirmSubmit;$("#newExam").onclick=newExam;$("#toggleReview").onclick=()=>{const p=$("#reviewPanel");p.classList.toggle("hidden");$("#toggleReview").textContent=p.classList.contains("hidden")?"Show answer review":"Hide answer review";if(!p.classList.contains("hidden"))p.scrollIntoView({behavior:"smooth",block:"start"});};

const saved=loadSaved();if(saved){$("#resumeBox").classList.remove("hidden");$("#resumeBtn").textContent=saved.finished?"View saved results":"Resume saved attempt";}
