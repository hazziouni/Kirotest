(function(){
const HISTORY_KEY="dea-c01-seen-v1";
const ATTEMPT_SIZE=65;
const quotas={
 "Domain 1 — Data Ingestion and Transformation":{total:22,scored:17},
 "Domain 2 — Data Store Management":{total:17,scored:13},
 "Domain 3 — Data Operations and Support":{total:14,scored:11},
 "Domain 4 — Data Security and Governance":{total:12,scored:9}
};
function getSeen(){try{return new Set(JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]"));}catch(e){return new Set();}}
function setSeen(set){localStorage.setItem(HISTORY_KEY,JSON.stringify([...set]));}
function shuffled(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function takePreferred(pool,n,seen){const fresh=shuffled(pool.filter(q=>!seen.has(q.id))),old=shuffled(pool.filter(q=>seen.has(q.id)));return fresh.concat(old).slice(0,n);}
function choose65(){
 const bank=window.QUESTIONS||[];let seen=getSeen();
 if(bank.length<ATTEMPT_SIZE) return bank.map(q=>q.id);
 if(bank.filter(q=>!seen.has(q.id)).length<ATTEMPT_SIZE){seen=new Set();setSeen(seen);}
 let chosen=[];
 for(const [domain,q] of Object.entries(quotas)){
   const domainPool=bank.filter(x=>x.domain===domain);
   const scored=takePreferred(domainPool.filter(x=>x.scored),q.scored,seen);
   const selectedIds=new Set(scored.map(x=>x.id));
   const unscoredNeed=q.total-q.scored;
   let unscored=takePreferred(domainPool.filter(x=>!x.scored&&!selectedIds.has(x.id)),unscoredNeed,seen);
   if(unscored.length<unscoredNeed){
     const fill=takePreferred(domainPool.filter(x=>!selectedIds.has(x.id)&&!unscored.some(u=>u.id===x.id)),unscoredNeed-unscored.length,seen);
     unscored=unscored.concat(fill);
   }
   chosen=chosen.concat(scored,unscored);
 }
 const ids=new Set(chosen.map(q=>q.id));
 if(chosen.length<ATTEMPT_SIZE){chosen=chosen.concat(takePreferred(bank.filter(q=>!ids.has(q.id)),ATTEMPT_SIZE-chosen.length,seen));}
 chosen=shuffled(chosen.slice(0,ATTEMPT_SIZE));
 chosen.forEach(q=>seen.add(q.id));setSeen(seen);
 return chosen.map(q=>q.id);
}
window.pickDEAExamIds=choose65;
window.getDEABankProgress=function(){const seen=getSeen();return{total:(window.QUESTIONS||[]).length,seen:seen.size,remaining:Math.max(0,(window.QUESTIONS||[]).length-seen.size)};};
const originalStart=window.startAttempt;
window.startAttempt=function(subset=null){
 if(subset&&subset.length) return originalStart(subset);
 const mode=selectedMode();
 const ids=choose65();
 state={mode,order:ids,answers:{},flagged:{},choiceOrder:{},locked:{},hintsShown:{},current:0,startedAt:Date.now(),durationSec:10800,finished:false,submittedAt:null,subset:null};
 save();showExam();renderQuestion();startTimer();
};
const start=document.querySelector("#startBtn");if(start)start.onclick=()=>window.startAttempt();
const retry=document.querySelector("#retryMissed");
const p=window.getDEABankProgress();
const bankCount=document.querySelector("#bankCount");if(bankCount)bankCount.textContent=String(p.total);
const seenCount=document.querySelector("#seenCount");if(seenCount)seenCount.textContent=String(p.seen);
})();