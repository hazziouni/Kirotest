(function(){
const HISTORY_KEY="dea-c01-seen-v1",CONCEPT_HISTORY_KEY="dea-c01-seen-concepts-v1",ATTEMPT_SIZE=65;
const plan={
 "Domain 1 — Data Ingestion and Transformation":{Easy:{total:5,scored:4},Medium:{total:12,scored:9},Hard:{total:5,scored:4}},
 "Domain 2 — Data Store Management":{Easy:{total:4,scored:3},Medium:{total:9,scored:7},Hard:{total:4,scored:3}},
 "Domain 3 — Data Operations and Support":{Easy:{total:3,scored:2},Medium:{total:8,scored:7},Hard:{total:3,scored:2}},
 "Domain 4 — Data Security and Governance":{Easy:{total:3,scored:2},Medium:{total:6,scored:5},Hard:{total:3,scored:2}}
};
function getSet(k,numeric=false){try{return new Set((JSON.parse(localStorage.getItem(k)||"[]")||[]).map(x=>numeric?Number(x):String(x)));}catch(e){return new Set();}}
function saveSet(k,s){localStorage.setItem(k,JSON.stringify([...s]));}
function shuffled(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function key(q){return window.deaConceptKey?window.deaConceptKey(q):[q.domain,q.task,(q.choices||[]).slice().sort().join("|")].join("::");}
function available(pool,usedIds,usedConcepts,predicate){return pool.filter(q=>!usedIds.has(q.id)&&!usedConcepts.has(key(q))&&(!predicate||predicate(q)));}
function takePreferred(pool,n,seenIds,seenConcepts,usedIds,usedConcepts,predicate){
 const eligible=available(pool,usedIds,usedConcepts,predicate);
 // Highest priority: concept never seen on this device. Then unseen question variants of known concepts, then old questions.
 const freshConcept=shuffled(eligible.filter(q=>!seenConcepts.has(key(q))));
 const freshId=shuffled(eligible.filter(q=>seenConcepts.has(key(q))&&!seenIds.has(q.id)));
 const old=shuffled(eligible.filter(q=>seenIds.has(q.id)));
 return freshConcept.concat(freshId,old).slice(0,n);
}
function add(list,chosen,usedIds,usedConcepts){for(const q of list){const k=key(q);if(usedIds.has(q.id)||usedConcepts.has(k))continue;usedIds.add(q.id);usedConcepts.add(k);chosen.push(q);}}
function choose65(){
 const bank=window.QUESTIONS||[];let seenIds=getSet(HISTORY_KEY,true),seenConcepts=getSet(CONCEPT_HISTORY_KEY,false);if(bank.length<ATTEMPT_SIZE)return bank.map(q=>q.id);
 const allConcepts=new Set(bank.map(key));const remainingConcepts=[...allConcepts].filter(k=>!seenConcepts.has(k)).length;
 if(remainingConcepts<ATTEMPT_SIZE){seenConcepts=new Set();saveSet(CONCEPT_HISTORY_KEY,seenConcepts);}
 if(bank.filter(q=>!seenIds.has(q.id)).length<ATTEMPT_SIZE){seenIds=new Set();saveSet(HISTORY_KEY,seenIds);}
 let chosen=[];const usedIds=new Set(),usedConcepts=new Set();
 for(const [domain,difficultyPlan] of Object.entries(plan)){
   const domainPool=bank.filter(q=>q.domain===domain);
   for(const [difficulty,p] of Object.entries(difficultyPlan)){
     let scored=takePreferred(domainPool,p.scored,seenIds,seenConcepts,usedIds,usedConcepts,q=>q.scored&&(q.difficulty||"Medium")===difficulty);add(scored,chosen,usedIds,usedConcepts);
     if(scored.length<p.scored)add(takePreferred(domainPool,p.scored-scored.length,seenIds,seenConcepts,usedIds,usedConcepts,q=>q.scored),chosen,usedIds,usedConcepts);
     const need=p.total-p.scored;let unscored=takePreferred(domainPool,need,seenIds,seenConcepts,usedIds,usedConcepts,q=>!q.scored&&(q.difficulty||"Medium")===difficulty);add(unscored,chosen,usedIds,usedConcepts);
     if(unscored.length<need)add(takePreferred(domainPool,need-unscored.length,seenIds,seenConcepts,usedIds,usedConcepts,q=>!q.scored),chosen,usedIds,usedConcepts);
   }
 }
 if(chosen.length<ATTEMPT_SIZE)add(takePreferred(bank,ATTEMPT_SIZE-chosen.length,seenIds,seenConcepts,usedIds,usedConcepts),chosen,usedIds,usedConcepts);
 if(chosen.length<ATTEMPT_SIZE){const remaining=shuffled(bank.filter(q=>!usedIds.has(q.id))).slice(0,ATTEMPT_SIZE-chosen.length);for(const q of remaining){usedIds.add(q.id);chosen.push(q);}}
 chosen=shuffled(chosen.slice(0,ATTEMPT_SIZE));for(const q of chosen){seenIds.add(q.id);seenConcepts.add(key(q));}saveSet(HISTORY_KEY,seenIds);saveSet(CONCEPT_HISTORY_KEY,seenConcepts);return chosen.map(q=>q.id);
}
window.pickDEAExamIds=choose65;
window.getDEABankProgress=function(){const seenIds=getSet(HISTORY_KEY,true),seenConcepts=getSet(CONCEPT_HISTORY_KEY,false),totalConcepts=new Set((window.QUESTIONS||[]).map(key)).size;return{total:(window.QUESTIONS||[]).length,seen:seenIds.size,remaining:Math.max(0,(window.QUESTIONS||[]).length-seenIds.size),totalConcepts,seenConcepts:seenConcepts.size};};
window.getDEADifficultyPlan=function(){return{Easy:15,Medium:35,Hard:15};};
const originalStart=window.startAttempt;window.startAttempt=function(subset=null){if(subset&&subset.length)return originalStart(subset);const mode=selectedMode(),ids=choose65();state={mode,order:ids,answers:{},flagged:{},choiceOrder:{},locked:{},hintsShown:{},current:0,startedAt:Date.now(),durationSec:10800,finished:false,submittedAt:null,subset:null};save();showExam();renderQuestion();startTimer();};
const start=document.querySelector("#startBtn");if(start)start.onclick=()=>window.startAttempt();const p=window.getDEABankProgress(),bankCount=document.querySelector("#bankCount"),seenCount=document.querySelector("#seenCount");if(bankCount)bankCount.textContent=String(p.total);if(seenCount)seenCount.textContent=String(p.seen);
})();