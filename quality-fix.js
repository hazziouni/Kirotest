(function(){
(window.QUESTIONS||[]).forEach(q=>{
  if(q.id<=65||q.correct.length!==1)return;
  const c=q.choices[q.correct[0]]||"";
  if(/workgroup result encryption/i.test(c)){
    q.choices=[
      c,
      "Encrypt only the source S3 dataset and leave the Athena query-result location without an enforced encryption setting.",
      "Allow each analyst to select SSE-S3 or SSE-KMS manually for individual queries instead of enforcing a workgroup setting.",
      "Require TLS for Athena API calls but do not configure encryption for query-result objects stored in S3."
    ];
    q.correct=[0];
    q.why=[
      `Correct: ${q.explanation}`,
      "Source-data encryption does not automatically enforce encryption settings on the separate S3 objects written as Athena query results.",
      "Manual per-user settings are inconsistent; workgroup configuration provides centralized enforcement for query results.",
      "TLS protects data in transit but does not satisfy the at-rest encryption requirement for query-result objects in S3."
    ];
  }
});
})();