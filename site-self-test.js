(function(){
const bank=window.QUESTIONS||[],errors=[],warnings=[];
const ids=new Set();
for(const q of bank){
 if(ids.has(q.id))errors.push(`Duplicate question id ${q.id}`);ids.add(q.id);
 if(!q.prompt||!String(q.prompt).trim())errors.push(`Question ${q.id}: empty prompt`);
 if(!Array.isArray(q.choices)||q.choices.length<4)errors.push(`Question ${q.id}: fewer than 4 choices`);
 if(!Array.isArray(q.correct)||!q.correct.length)errors.push(`Question ${q.id}: no correct answer`);
 for(const i of q.correct||[])if(i<0||i>=(q.choices||[]).length)errors.push(`Question ${q.id}: invalid correct index ${i}`);
 if((q.correct||[]).length>1&&(q.choices||[]).length<5)warnings.push(`Question ${q.id}: multi-response has fewer than 5 choices`);
 if((q.choices||[]).some(c=>!String(c||"").trim()))errors.push(`Question ${q.id}: empty choice`);
 if(!Array.isArray(q.why)||q.why.length!==(q.choices||[]).length)warnings.push(`Question ${q.id}: explanation count differs from choice count`);
}
const quotas={
 "Domain 1 — Data Ingestion and Transformation":22,
 "Domain 2 — Data Store Management":17,
 "Domain 3 — Data Operations and Support":14,
 "Domain 4 — Data Security and Governance":12
};
const concepts={};
for(const q of bank){const d=q.domain,k=window.deaConceptKey?window.deaConceptKey(q):`${d}:${q.task}:${(q.choices||[]).slice().sort().join("|")}`;(concepts[d]??=new Set()).add(k);}
for(const [d,n] of Object.entries(quotas))if((concepts[d]?.size||0)<n)errors.push(`${d}: only ${concepts[d]?.size||0} distinct concepts available for quota ${n}`);
const multi=bank.filter(q=>(q.correct||[]).length>1).length;if(multi<20)warnings.push(`Only ${multi} multiple-response questions found`);
const report={ok:errors.length===0,totalQuestions:bank.length,uniqueIds:ids.size,multipleResponse:multi,distinctConcepts:Object.fromEntries(Object.entries(concepts).map(([d,s])=>[d,s.size])),errors,warnings,bankAudit:window.DEA_BANK_AUDIT||null,studyModules:Object.keys(window.DEA_STUDY_MODULES||{}).length};
window.DEA_SITE_TEST=report;
if(errors.length)console.error("DEA-C01 site self-test failed",report);else console.info("DEA-C01 site self-test passed",report);
})();