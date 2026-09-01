(function(){
const HISTORY_KEY="dea-c01-seen-v1";
const ATTEMPT_SIZE=65;
const plan={
 "Domain 1 — Data Ingestion and Transformation":{Easy:{total:5,scored:4},Medium:{total:12,scored:9},Hard:{total:5,scored:4}},
 "Domain 2 — Data Store Management":{Easy:{total:4,scored:3},Medium:{total:9,scored:7},Hard:{total:4,scored:3}},
 "Domain 3 — Data Operations and Support":{Easy:{total:3,scored:2},Medium:{total:8,scored:7},Hard:{total:3,scored:2}},
 "Domain 4 — Data Security and Governance":{Easy:{total:3,scored:2},Medium:{total:6,scored:5},Hard:{total:3,scored:2}}
};
function getSeen(){try{return new Set(JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]").map(Number));}catch(e){return new Set();}}
function setSeen(set){localStorage.setItem(HISTORY_KEY,JSON.stringify([...set]));}
function shuffled(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function key(q){return window.deaConceptKey?window.deaConceptKey(q):[q.domain,q.task,(q.choices||[]).slice().sort().join("|")].join("::");}
function available(pool,usedIds,usedConcepts,predicate){return pool.filter(q=>!usedIds.has(q.id)&&!usedConcepts.has(key(q))&&(!predicate||predicate(q)));}
function takePreferred(pool,n,seen,usedIds,usedConcepts,predicate){
 const eligible=available(pool,usedIds,usedConcepts,predicate);
 const fresh=shuffled(eligible.filter(q=>!seen.has(q.id))),old=shuffled(eligible.filter(q=>seen.has(q.id)));
 return fresh.concat(old).slice(0,n);
}
function add(list,chosen,usedIds,usedConcepts){for(const q of list){if(usedIds.has(q.id)||usedConcepts.has(key(q)))continue;usedIds.add(q.id);usedConcepts.add(key(q));chosen.push(q);}}
function choose65(){
 const bank=window.QUESTIONS||[];let seen=getSeen();if(bank.length<ATTEMPT_SIZE)return bank.map(q=>q.id);
 if(bank.filter(q=>!seen.has(q.id)).length<ATTEMPT_SIZE){seen=new Set();setSeen(seen);}
 let chosen=[];const usedIds=new Set(),usedConcepts=new Set();
 for(const [domain,difficultyPlan] of Object.entries(plan)){
   const domainPool=bank.filter(q=>q.domain===domain);
   for(const [difficulty,p] of Object.entries(difficultyPlan)){
     let scored=takePreferred(domainPool,p.scored,seen,usedIds,usedConcepts,q=>q.scored&&(q.difficulty||"Medium")===difficulty);add(scored,chosen,usedIds,usedConcepts);
     if(scored.length<p.scored){add(takePreferred(domainPool,p.scored-scored.length,seen,usedIds,usedConcepts,q=>q.scored),chosen,usedIds,usedConcepts);}
     const need=p.total-p.scored;
     let unscored=takePreferred(domainPool,need,seen,usedIds,usedConcepts,q=>!q.scored&&(q.difficulty||"Medium")===difficulty);add(unscored,chosen,usedIds,usedConcepts);
     if(unscored.length<need){add(takePreferred(domainPool,need-unscored.length,seen,usedIds,usedConcepts,q=>!q.scored),chosen,usedIds,usedConcepts);}
   }
 }
 // First fallback preserves unique concepts even if exact scored/difficulty quotas cannot be filled.
 if(chosen.length<ATTEMPT_SIZE)add(takePreferred(bank,ATTEMPT_SIZE-chosen.length,seen,usedIds,usedConcepts),chosen,usedIds,usedConcepts);
 // Only if the bank has fewer than 65 distinct concept signatures, allow a final ID-only fallback.
 if(chosen.length<ATTEMPT_SIZE){
   const remaining=shuffled(bank.filter(q=>!usedIds.has(q.id))).slice(0,ATTEMPT_SIZE-chosen.length);for(const q of remaining){usedIds.add(q.id);chosen.push(q);}
 }
 chosen=shuffled(chosen.slice(0,ATTEMPT_SIZE));chosen.forEach(q=>seen.add(q.id));setSeen(seen);return chosen.map(q=>q.id);
}
window.pickDEAExamIds=choose65;
window.getDEABankProgress=function(){const seen=getSeen();return{total:(window.QUESTIONS||[]).length,seen:seen.size,remaining:Math.max(0,(window.QUESTIONS||[]).length-seen.size)};};
window.getDEADifficultyPlan=function(){return{Easy:15,Medium:35,Hard:15};};
const originalStart=window.startAttempt;
window.startAttempt=function(subset=null){if(subset&&subset.length)return originalStart(subset);const mode=selectedMode(),ids=choose65();state={mode,order:ids,answers:{},flagged:{},choiceOrder:{},locked:{},hintsShown:{},current:0,startedAt:Date.now(),durationSec:10800,finished:false,submittedAt:null,subset:null};save();showExam();renderQuestion();startTimer();};
const start=document.querySelector("#startBtn");if(start)start.onclick=()=>window.startAttempt();
const p=window.getDEABankProgress(),bankCount=document.querySelector("#bankCount"),seenCount=document.querySelector("#seenCount");if(bankCount)bankCount.textContent=String(p.total);if(seenCount)seenCount.textContent=String(p.seen);
})();