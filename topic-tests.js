(function(){
const SIZE=30,TIMED_SECONDS=3600,HISTORY_KEY="dea-c01-seen-v1";
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
function seenSet(){try{return new Set(JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]").map(Number));}catch(e){return new Set();}}
function saveSeen(s){localStorage.setItem(HISTORY_KEY,JSON.stringify([...s]));}
function text(q){return [q.prompt,q.task,q.domain,...(q.choices||[])].join(" ");}
function themePool(key){const t=THEMES[key];return (window.QUESTIONS||[]).filter(q=>q.scored&&t.re.test(text(q)));}
function take(pool,n,seen,used,predicate){const eligible=pool.filter(q=>!used.has(q.id)&&(!predicate||predicate(q)));const fresh=sh(eligible.filter(q=>!seen.has(q.id))),old=sh(eligible.filter(q=>seen.has(q.id)));return fresh.concat(old).slice(0,n);}
function pickTopic(key){
 const pool=themePool(key),seen=seenSet(),used=new Set(),picked=[];
 const targets={Easy:6,Medium:17,Hard:7};
 let multi=take(pool,6,seen,used,q=>(q.correct||[]).length>1);
 multi.forEach(q=>used.add(q.id));picked.push(...multi);
 for(const [difficulty,target] of Object.entries(targets)){
   const already=picked.filter(q=>(q.difficulty||"Medium")===difficulty).length;
   const add=take(pool,Math.max(0,target-already),seen,used,q=>(q.difficulty||"Medium")===difficulty);
   add.forEach(q=>used.add(q.id));picked.push(...add);
 }
 if(picked.length<SIZE){const fill=take(pool,SIZE-picked.length,seen,used);fill.forEach(q=>used.add(q.id));picked.push(...fill);}
 if(picked.length<SIZE){const fallback=(window.QUESTIONS||[]).filter(q=>q.scored);const fill=take(fallback,SIZE-picked.length,seen,used);fill.forEach(q=>used.add(q.id));picked.push(...fill);}
 const final=sh(picked.slice(0,SIZE));final.forEach(q=>seen.add(q.id));saveSeen(seen);return final.map(q=>q.id);
}
function resetAttemptLabels(){
 const lab=document.querySelector("#attemptKind");if(lab){lab.textContent="";lab.classList.add("hidden");}
 const scoreLabel=document.querySelector("#scoredLabel");if(scoreLabel)scoreLabel.textContent="Official-style scored set";
}
function startTopic(key,mode){
 const t=THEMES[key];if(!t)return;
 const ids=pickTopic(key);const timed=mode==="timed";
 state={mode:timed?"timed":"untimed",order:ids,answers:{},flagged:{},choiceOrder:{},locked:{},hintsShown:{},current:0,startedAt:Date.now(),durationSec:timed?TIMED_SECONDS:10800,finished:false,submittedAt:null,subset:null,topicKey:key,topicName:t.name};
 save();showExam();renderQuestion();startTimer();
 const lab=document.querySelector("#attemptKind");if(lab){lab.textContent=t.name+(timed?" • 60 min":" • Untimed");lab.classList.remove("hidden");}
 const scoreLabel=document.querySelector("#scoredLabel");if(scoreLabel)scoreLabel.textContent="Thematic scored set";
}
const globalStart=window.startAttempt;
window.startAttempt=function(subset=null){resetAttemptLabels();return globalStart(subset);};
window.startTopicTest=startTopic;
document.querySelectorAll("[data-topic]").forEach(btn=>btn.onclick=()=>startTopic(btn.dataset.topic,btn.dataset.topicMode||"untimed"));
window.DEA_THEMES=THEMES;
})();