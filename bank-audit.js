(function(){
function norm(s){return String(s||"").toLowerCase().replace(/\b\d+(?:[.,]\d+)?\b/g,"#").replace(/[^a-z0-9#]+/g," ").replace(/\s+/g," ").trim();}
function promptKey(q){return norm(q.prompt).replace(/\b(?:company|organization|team|engineer|platform|workload|production|existing|data|aws)\b/g,"").replace(/\s+/g," ").trim();}
function choicesKey(q){return (q.choices||[]).map(norm).sort().join("||");}
function conceptKey(q){
  // Generated variants of the same question generally retain the same answer set.
  // Combining domain + task + all answer choices prevents those variants from appearing twice in one attempt.
  return [norm(q.domain),norm(q.task),choicesKey(q)].join("::");
}
function countGroups(keyFn){
 const map=new Map();for(const q of (window.QUESTIONS||[])){const k=keyFn(q);if(!k)continue;(map.get(k)||map.set(k,[]).get(k)).push(q.id);}
 const dup=[...map.entries()].filter(([,ids])=>ids.length>1);
 return {unique:map.size,duplicateGroups:dup.length,questionsInDuplicateGroups:dup.reduce((n,[,ids])=>n+ids.length,0),largestGroup:dup.reduce((n,[,ids])=>Math.max(n,ids.length),0)};
}
window.deaConceptKey=conceptKey;
window.deaPromptKey=promptKey;
window.DEA_BANK_AUDIT={
 total:(window.QUESTIONS||[]).length,
 exactOrNormalizedPrompt:countGroups(promptKey),
 conceptSignature:countGroups(conceptKey),
 multipleResponse:(window.QUESTIONS||[]).filter(q=>(q.correct||[]).length>1).length
};
})();