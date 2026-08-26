(function(){
const HISTORY_KEY="dea-c01-seen-v1";
const ATTEMPT_SIZE=65;
// 65 questions total: 15 Easy, 35 Medium, 15 Hard; 50 scored + 15 experimental.
const plan={
 "Domain 1 — Data Ingestion and Transformation":{
   Easy:{total:5,scored:4}, Medium:{total:12,scored:9}, Hard:{total:5,scored:4}
 },
 "Domain 2 — Data Store Management":{
   Easy:{total:4,scored:3}, Medium:{total:9,scored:7}, Hard:{total:4,scored:3}
 },
 "Domain 3 — Data Operations and Support":{
   Easy:{total:3,scored:2}, Medium:{total:8,scored:7}, Hard:{total:3,scored:2}
 },
 "Domain 4 — Data Security and Governance":{
   Easy:{total:3,scored:2}, Medium:{total:6,scored:5}, Hard:{total:3,scored:2}
 }
};
function getSeen(){try{return new Set(JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]").map(Number));}catch(e){return new Set();}}
function setSeen(set){localStorage.setItem(HISTORY_KEY,JSON.stringify([...set]));}
function shuffled(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function takePreferred(pool,n,seen,exclude=new Set()){
 const usable=pool.filter(q=>!exclude.has(q.id));
 const fresh=shuffled(usable.filter(q=>!seen.has(q.id)));
 const old=shuffled(usable.filter(q=>seen.has(q.id)));
 return fresh.concat(old).slice(0,n);
}
function choose65(){
 const bank=window.QUESTIONS||[];let seen=getSeen();
 if(bank.length<ATTEMPT_SIZE)return bank.map(q=>q.id);
 if(bank.filter(q=>!seen.has(q.id)).length<ATTEMPT_SIZE){seen=new Set();setSeen(seen);}
 let chosen=[];const chosenIds=new Set();
 for(const [domain,difficultyPlan] of Object.entries(plan)){
   const domainPool=bank.filter(q=>q.domain===domain);
   for(const [difficulty,p] of Object.entries(difficultyPlan)){
     const diffPool=domainPool.filter(q=>(q.difficulty||"Medium")===difficulty);
     let scored=takePreferred(diffPool.filter(q=>q.scored),p.scored,seen,chosenIds);
     scored.forEach(q=>chosenIds.add(q.id));chosen.push(...scored);
     // Safety fallback if a generated slice ever lacks enough scored questions at this exact difficulty.
     if(scored.length<p.scored){
       const fill=takePreferred(domainPool.filter(q=>q.scored),p.scored-scored.length,seen,chosenIds);
       fill.forEach(q=>chosenIds.add(q.id));chosen.push(...fill);
     }
     const needUnscored=p.total-p.scored;
     let unscored=takePreferred(diffPool.filter(q=>!q.scored),needUnscored,seen,chosenIds);
     unscored.forEach(q=>chosenIds.add(q.id));chosen.push(...unscored);
     if(unscored.length<needUnscored){
       const fill=takePreferred(domainPool.filter(q=>!q.scored),needUnscored-unscored.length,seen,chosenIds);
       fill.forEach(q=>chosenIds.add(q.id));chosen.push(...fill);
     }
   }
 }
 if(chosen.length<ATTEMPT_SIZE){
   const fill=takePreferred(bank,ATTEMPT_SIZE-chosen.length,seen,chosenIds);
   fill.forEach(q=>chosenIds.add(q.id));chosen.push(...fill);
 }
 chosen=shuffled(chosen.slice(0,ATTEMPT_SIZE));
 chosen.forEach(q=>seen.add(q.id));setSeen(seen);
 return chosen.map(q=>q.id);
}
window.pickDEAExamIds=choose65;
window.getDEABankProgress=function(){const seen=getSeen();return{total:(window.QUESTIONS||[]).length,seen:seen.size,remaining:Math.max(0,(window.QUESTIONS||[]).length-seen.size)};};
window.getDEADifficultyPlan=function(){return{Easy:15,Medium:35,Hard:15};};
const originalStart=window.startAttempt;
window.startAttempt=function(subset=null){
 if(subset&&subset.length)return originalStart(subset);
 const mode=selectedMode();const ids=choose65();
 state={mode,order:ids,answers:{},flagged:{},choiceOrder:{},locked:{},hintsShown:{},current:0,startedAt:Date.now(),durationSec:10800,finished:false,submittedAt:null,subset:null};
 save();showExam();renderQuestion();startTimer();
};
const start=document.querySelector("#startBtn");if(start)start.onclick=()=>window.startAttempt();
const p=window.getDEABankProgress();
const bankCount=document.querySelector("#bankCount");if(bankCount)bankCount.textContent=String(p.total);
const seenCount=document.querySelector("#seenCount");if(seenCount)seenCount.textContent=String(p.seen);
})();