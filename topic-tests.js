(function(){
const SIZE=30,TIMED_SECONDS=3600,HISTORY_KEY="dea-c01-seen-v1",CONCEPT_HISTORY_KEY="dea-c01-seen-concepts-v1";
const THEMES={
 "streaming":{name:"Streaming & Ingestion",desc:"Kinesis Data Streams, Data Firehose, MSK, DMS, DataSync, AppFlow, queues and ingestion patterns.",re:/Kinesis|Firehose|MSK|Kafka|DMS|DataSync|AppFlow|SQS|ingestion|CDC|stream/i},
 "glue-spark":{name:"AWS Glue & Spark ETL",desc:"Glue jobs, DynamicFrames, bookmarks, Spark joins, partitioning, skew, transformations and ETL optimization.",re:/Glue job|Glue Spark|DynamicFrame|ResolveChoice|broadcast join|repartition|coalesce|job bookmark|Spark job|Spark dataset|ETL/i},
 "s3-athena":{name:"S3, Athena & Data Lake",desc:"S3 layouts, Parquet, partitions, Athena, catalogs, Iceberg, lifecycle, external data and lake optimization.",re:/Athena|Parquet|ORC|Iceberg|partition projection|Glue Data Catalog|S3 Lifecycle|Intelligent-Tiering|data lake|S3 dataset|S3 objects/i},
 "redshift":{name:"Amazon Redshift",desc:"Spectrum, distribution, sort keys, RA3, materialized views, workload management, COPY and warehouse performance.",re:/Redshift|Spectrum|RA3|DISTKEY|sort key|materialized view|warehouse table|warehouse performance/i},
 "dynamodb":{name:"Amazon DynamoDB",desc:"Partition-key design, hot partitions, GSIs, TTL, PITR, access patterns and operational NoSQL design.",re:/DynamoDB|GSI|global secondary index|point-in-time recovery|hot partition|NoSQL|partition key.*write/i},
 "orchestration":{name:"Orchestration & Operations",desc:"Step Functions, MWAA, EventBridge, monitoring, CloudWatch, retries, DLQs, idempotency, CI/CD and troubleshooting.",re:/Step Functions|MWAA|Airflow|EventBridge Scheduler|CloudWatch|DLQ|dead-letter|exponential backoff|idempoten|monitoring|troubleshoot|CI\/CD|failure metric|execution history/i},
 "security":{name:"Security & Governance",desc:"IAM, KMS, VPC endpoints, Lake Formation, Macie, CloudTrail, Secrets Manager, Object Lock and audit controls.",re:/IAM|KMS|SSE-KMS|VPC endpoint|Lake Formation|LF-Tag|Macie|CloudTrail|Secrets Manager|Object Lock|Access Analyzer|service control policy|least privilege|security|governance|audit|encrypt/i}
};
function sh(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function getSet(k,numeric=false){try{return new Set((JSON.parse(localStorage.getItem(k)||"[]")||[]).map(x=>numeric?Number(x):String(x)));}catch(e){return new Set();}}
function saveSet(k,s){localStorage.setItem(k,JSON.stringify([...s]));}
function text(q){return [q.prompt,q.task,q.domain,...(q.choices||[])].join(" ");}
function themePool(key){const t=THEMES[key];return (window.QUESTIONS||[]).filter(q=>q.scored&&t.re.test(text(q)));}
function ckey(q){return window.deaConceptKey?window.deaConceptKey(q):[q.domain,q.task,(q.choices||[]).slice().sort().join("|")].join("::");}
function take(pool,n,seenIds,seenConcepts,usedIds,usedConcepts,predicate){
 const eligible=pool.filter(q=>!usedIds.has(q.id)&&!usedConcepts.has(ckey(q))&&(!predicate||predicate(q)));
 const freshConcept=sh(eligible.filter(q=>!seenConcepts.has(ckey(q)))),freshId=sh(eligible.filter(q=>seenConcepts.has(ckey(q))&&!seenIds.has(q.id))),old=sh(eligible.filter(q=>seenIds.has(q.id)));
 return freshConcept.concat(freshId,old).slice(0,n);
}
function add(items,picked,usedIds,usedConcepts){for(const q of items){const k=ckey(q);if(usedIds.has(q.id)||usedConcepts.has(k))continue;usedIds.add(q.id);usedConcepts.add(k);picked.push(q);}}
function pickTopic(key){
 const pool=themePool(key);let seenIds=getSet(HISTORY_KEY,true),seenConcepts=getSet(CONCEPT_HISTORY_KEY,false);const poolConcepts=new Set(pool.map(ckey)),unseen=[...poolConcepts].filter(k=>!seenConcepts.has(k)).length;if(unseen<SIZE){for(const k of poolConcepts)seenConcepts.delete(k);saveSet(CONCEPT_HISTORY_KEY,seenConcepts);}
 const usedIds=new Set(),usedConcepts=new Set(),picked=[],targets={Easy:6,Medium:17,Hard:7};
 add(take(pool,6,seenIds,seenConcepts,usedIds,usedConcepts,q=>(q.correct||[]).length>1),picked,usedIds,usedConcepts);
 for(const [difficulty,target] of Object.entries(targets)){const already=picked.filter(q=>(q.difficulty||"Medium")===difficulty).length;add(take(pool,Math.max(0,target-already),seenIds,seenConcepts,usedIds,usedConcepts,q=>(q.difficulty||"Medium")===difficulty),picked,usedIds,usedConcepts);}
 if(picked.length<SIZE)add(take(pool,SIZE-picked.length,seenIds,seenConcepts,usedIds,usedConcepts),picked,usedIds,usedConcepts);
 if(picked.length<SIZE){const domainCounts={};for(const q of pool)domainCounts[q.domain]=(domainCounts[q.domain]||0)+1;const primaryDomain=Object.entries(domainCounts).sort((a,b)=>b[1]-a[1])[0]?.[0],related=(window.QUESTIONS||[]).filter(q=>q.scored&&q.domain===primaryDomain);add(take(related,SIZE-picked.length,seenIds,seenConcepts,usedIds,usedConcepts),picked,usedIds,usedConcepts);}
 if(picked.length<SIZE)add(take((window.QUESTIONS||[]).filter(q=>q.scored),SIZE-picked.length,seenIds,seenConcepts,usedIds,usedConcepts),picked,usedIds,usedConcepts);
 const final=sh(picked.slice(0,SIZE));for(const q of final){seenIds.add(q.id);seenConcepts.add(ckey(q));}saveSet(HISTORY_KEY,seenIds);saveSet(CONCEPT_HISTORY_KEY,seenConcepts);return final.map(q=>q.id);
}
function resetAttemptLabels(){const lab=document.querySelector("#attemptKind");if(lab){lab.textContent="";lab.classList.add("hidden");}const scoreLabel=document.querySelector("#scoredLabel");if(scoreLabel)scoreLabel.textContent="Official-style scored set";}
function startTopic(key,mode){const t=THEMES[key];if(!t)return;const ids=pickTopic(key),timed=mode==="timed";state={mode:timed?"timed":"untimed",order:ids,answers:{},flagged:{},choiceOrder:{},locked:{},hintsShown:{},current:0,startedAt:Date.now(),durationSec:timed?TIMED_SECONDS:10800,finished:false,submittedAt:null,subset:null,topicKey:key,topicName:t.name};save();showExam();renderQuestion();startTimer();const lab=document.querySelector("#attemptKind");if(lab){lab.textContent=t.name+(timed?" • 60 min":" • Untimed");lab.classList.remove("hidden");}const scoreLabel=document.querySelector("#scoredLabel");if(scoreLabel)scoreLabel.textContent="Thematic scored set";}
const globalStart=window.startAttempt;window.startAttempt=function(subset=null){resetAttemptLabels();return globalStart(subset);};window.startTopicTest=startTopic;document.querySelectorAll("[data-topic]").forEach(btn=>btn.onclick=()=>startTopic(btn.dataset.topic,btn.dataset.topicMode||"untimed"));window.DEA_THEMES=THEMES;
})();