(function(){
function same(a,b){if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;const A=[...a].map(Number).sort((x,y)=>x-y),B=[...b].map(Number).sort((x,y)=>x-y);return A.every((v,i)=>v===B[i]);}
function stats(){const pool=currentPool();let correct=0,wrong=0,unanswered=0;for(const q of pool){const a=state.answers[q.id]||[];if(!a.length)unanswered++;else if(state.locked?.[q.id]&&same(a,q.correct))correct++;else if(state.locked?.[q.id])wrong++;}return{correct,wrong,unanswered,total:pool.length};}
window.renderNavigator=function(){
 const pool=currentPool(),s=stats();
 const grid=document.querySelector("#qgrid");
 if(grid){
   grid.innerHTML=pool.map((q,i)=>{
     const a=state.answers[q.id]||[],locked=!!state.locked?.[q.id],ok=locked&&same(a,q.correct),bad=locked&&!ok&&a.length>0,f=!!state.flagged[q.id];
     const status=ok?"correct-progress":bad?"incorrect-progress":"unanswered-progress";
     return `<button class="qdot ${i===state.current?"current":""} ${status} ${f?"flagged":""}" data-i="${i}" title="${ok?"Correct":bad?"Incorrect":"Unanswered"}">${i+1}</button>`;
   }).join("");
   grid.querySelectorAll("button").forEach(b=>b.onclick=()=>{state.current=Number(b.dataset.i);save();renderQuestion();window.scrollTo({top:0,behavior:"smooth"});});
 }
 const side=document.querySelector(".side-summary");
 if(side){side.classList.add("progress-summary");side.innerHTML=`<div class="mini good-mini"><strong>${s.correct}</strong>correct</div><div class="mini bad-mini"><strong>${s.wrong}</strong>wrong</div><div class="mini neutral-mini"><strong>${s.unanswered}</strong>unanswered</div><div class="mini"><strong>${pool.filter(q=>state.flagged[q.id]).length}</strong>review</div>`;}
 let legend=document.querySelector(".progress-legend");
 const sidebar=document.querySelector(".sidebar");
 if(sidebar&&!legend){legend=document.createElement("div");legend.className="progress-legend";legend.innerHTML='<span><i class="g"></i>Correct</span><span><i class="r"></i>Wrong</span><span><i class="x"></i>Not answered</span><span><i class="o"></i>Review</span>';const head=sidebar.querySelector(".side-head");head?.insertAdjacentElement("afterend",legend);}
 let strip=document.querySelector("#liveScoreStrip");const card=document.querySelector(".question-card");
 if(card&&!strip){strip=document.createElement("div");strip.id="liveScoreStrip";strip.className="live-score-strip";const qtop=card.querySelector(".qtop");qtop?.insertAdjacentElement("afterend",strip);}
 if(strip)strip.innerHTML=`<span class="live-score-chip good">✓ ${s.correct} correct</span><span class="live-score-chip bad">✕ ${s.wrong} wrong</span><span class="live-score-chip pending">${s.unanswered} remaining</span>`;
};
// Re-render current view once after this patch is loaded if an attempt is already visible.
try{if(document.querySelector("#exam")&&!document.querySelector("#exam").classList.contains("hidden"))renderNavigator();}catch(e){}
})();