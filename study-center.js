(function(){
const MODULES={
 streaming:{title:"Streaming & Ingestion",icon:"⚡",accent:"#2563eb",desc:"Choose between Kinesis, Data Firehose, MSK, SQS, DMS, DataSync and AppFlow.",tags:["Kinesis","Firehose","MSK","DMS","SQS"],overview:[
  ["Kinesis Data Streams","Real-time stream with shards, partition keys, replay and custom consumers."],
  ["Data Firehose","Managed delivery to S3/Redshift/OpenSearch with buffering and optional transforms."],
  ["MSK","Managed Kafka when Kafka APIs, offsets and consumer groups matter."],
  ["DMS / DataSync / AppFlow","DMS = database migration/CDC; DataSync = files; AppFlow = supported SaaS apps."]],flow:[
  ["Producers","apps / devices","#60a5fa"],["Stream","Kinesis or MSK","#2563eb"],["Processing","Lambda / Glue / consumers","#7c3aed"],["Delivery","Firehose / custom sink","#ea580c"],["Targets","S3 / Redshift / OpenSearch","#16a34a"]],compare:[
  ["Kinesis Data Streams","Custom real-time consumers, replay, ordering","Need consumer logic; shard/on-demand semantics"],
  ["Data Firehose","Managed delivery with least ops","Not a general consumer stream"],
  ["MSK","Kafka compatibility","Kafka semantics/components add complexity"],
  ["SQS","Decoupled work queue / buffering","Not a replayable ordered stream in the Kinesis sense"],
  ["DMS","Full load + CDC for databases","Not file transfer or generic ETL"]],traps:[
  "Ordering in Kinesis is within a shard. A stable partition key preserves ordering for that key; random keys can destroy per-entity ordering.",
  "Enhanced fan-out solves consumer read-throughput isolation. It does not solve producer hot-shard design.",
  "Firehose is often the LEAST operational overhead answer when the goal is simply managed delivery to S3.",
  "Choose MSK because Kafka compatibility is required—not simply because the workload is streaming."],check:["Partition key vs shard behavior","Standard vs enhanced fan-out","Firehose buffering and delivery","MSK vs Kinesis","DMS full load vs CDC","SQS DLQ and visibility timeout"]},
 "glue-spark":{title:"AWS Glue & Spark ETL",icon:"🧩",accent:"#7c3aed",desc:"Spark transformations, Glue bookmarks, DynamicFrames, joins, skew and file optimization.",tags:["Glue","Spark","Bookmarks","Parquet","Skew"],overview:[
  ["Glue Jobs","Managed Spark/Python ETL integrated with S3, IAM and Data Catalog."],
  ["Job bookmarks","Persist incremental processing state for supported sources."],
  ["DynamicFrames","Glue abstraction useful for semi-structured and ambiguous schemas."],
  ["Spark optimization","Broadcast small tables, prune early, control partition counts, handle skew."]],flow:[
  ["S3 / JDBC","source data","#0284c7"],["Glue Catalog","schema + partitions","#0ea5e9"],["Glue Spark","transform","#7c3aed"],["Quality","rules / checks","#f59e0b"],["S3 / Warehouse","curated output","#16a34a"]],compare:[
  ["Broadcast join","Very small dimension + huge fact","Executor memory must safely hold broadcast side"],
  ["Repartition","Redistribute data / increase or reshape partitions","Full shuffle"],
  ["Coalesce","Reduce partition count cheaply","Can create uneven partitions"],
  ["ResolveChoice","Resolve DynamicFrame ambiguous types","Specific to schema ambiguity"],
  ["Job bookmarks","Avoid reprocessing input","Not database transaction-log CDC"]],traps:[
  "Increasing shuffle partitions may tune a shuffle, but broadcasting a tiny table can eliminate the large shuffle entirely.",
  "A crawler discovers metadata; it is not an ETL checkpoint.",
  "Small-file problems hurt Athena/Spark through metadata and request overhead. Compaction is often the right fix.",
  "Lambda orchestration does not remove Lambda's hard maximum execution duration."],check:["Broadcast vs repartition","Job bookmarks","ResolveChoice","Pushdown predicates","Small-file compaction","Skew / salting"]},
 "s3-athena":{title:"S3, Athena & Data Lake",icon:"🗄️",accent:"#0891b2",desc:"Design efficient lake layouts with Parquet, partitions, Athena, Glue Catalog and Iceberg.",tags:["S3","Athena","Parquet","Iceberg","Catalog"],overview:[
  ["Parquet / ORC","Columnar formats reduce bytes scanned and support efficient compression."],
  ["Partitioning","Partition on selective, commonly filtered dimensions—not every possible column."],
  ["Athena","Serverless SQL directly over S3; cost strongly tied to data scanned."],
  ["Iceberg","Transactional lake table metadata, snapshots, schema/partition evolution."]],flow:[
  ["Raw S3","landing zone","#0ea5e9"],["Catalog","Glue metadata","#6366f1"],["Curated S3","Parquet / Iceberg","#0891b2"],["Query","Athena / Spectrum","#f59e0b"],["Consumers","BI / ML / apps","#16a34a"]],compare:[
  ["Athena","Standalone serverless SQL over S3","No warehouse cluster required"],
  ["Redshift Spectrum","Redshift users query external S3 data","Best when integrated with Redshift tables"],
  ["Partition projection","Predictable partition patterns","Avoid registering every partition"],
  ["Iceberg","ACID-style lake tables / evolution","More table metadata management"],
  ["S3 Lifecycle","Age-based tier/expiry","Not dynamic query optimization"]],traps:[
  "Partitioning too finely can create many tiny partitions/files and hurt performance.",
  "Athena and Spectrum can both query S3. The clue is whether the user context is standalone serverless SQL or existing Redshift SQL.",
  "Parquet alone does not replace good partition design and file sizing.",
  "Partition projection derives metadata; it does not physically create or move partitions."],check:["Parquet vs JSON/CSV","Partition pruning","Athena workgroups","CTAS","Iceberg snapshots","Lifecycle vs Intelligent-Tiering"]},
 redshift:{title:"Amazon Redshift",icon:"🏢",accent:"#dc2626",desc:"Warehouse design: Spectrum, RA3, distribution, sort keys, WLM and materialized views.",tags:["Spectrum","RA3","DISTKEY","Sort key","WLM"],overview:[
  ["Distribution","Controls where rows live; co-location can reduce redistribution during large joins."],
  ["Sort keys","Help block pruning for common range/equality filters."],
  ["RA3","Separates managed storage and compute more effectively."],
  ["Spectrum","Query S3 external tables from the Redshift SQL environment."]],flow:[
  ["S3","lake / staging","#0ea5e9"],["COPY / Spectrum","load or external query","#f59e0b"],["Redshift","columnar warehouse","#dc2626"],["WLM","workload control","#7c3aed"],["BI","dashboards / SQL","#16a34a"]],compare:[
  ["COPY","Load data into local Redshift tables","Fast bulk load; duplicates storage"],
  ["Spectrum","Query external S3 without full load","External scan performance/cost considerations"],
  ["DISTKEY","Reduce redistribution for large joins","Bad key can cause skew"],
  ["Sort key","Improve pruning","Should reflect filter/order patterns"],
  ["Materialized view","Precompute repeated expensive queries","Needs refresh strategy"]],traps:[
  "Distribution key and sort key solve different problems: data movement vs scan pruning.",
  "Spectrum is preferred over Athena when the requirement explicitly keeps users inside Redshift and joins external S3 data to warehouse tables.",
  "RA3 solves storage/compute scaling—not bad SQL or poor distribution design.",
  "Materialized views help repeated expensive logic; they are not useful simply because a table is large."],check:["COPY vs Spectrum","Distribution styles","Sort keys","RA3","Materialized views","WLM / queueing"]},
 dynamodb:{title:"Amazon DynamoDB",icon:"⚙️",accent:"#ea580c",desc:"Model access patterns, partition keys, GSIs, TTL, PITR and hot-partition avoidance.",tags:["Partition key","GSI","TTL","PITR","Hot partitions"],overview:[
  ["Access patterns first","Design keys from the queries the application must support."],
  ["Partition key","High-cardinality, well-distributed keys avoid concentrated traffic."],
  ["GSI","Alternate partition/sort key for additional query patterns."],
  ["TTL / PITR","TTL expires items; PITR protects against accidental data changes."]],flow:[
  ["Application","known access patterns","#2563eb"],["Partition key","traffic distribution","#ea580c"],["DynamoDB","low latency store","#f59e0b"],["GSI","alternate queries","#7c3aed"],["Streams / TTL","events + expiry","#16a34a"]],compare:[
  ["Base key","Primary access pattern","Must distribute load"],
  ["GSI","Alternate key access","Adds write/storage cost"],
  ["TTL","Automatic expiry","Not exact-to-the-second deletion"],
  ["PITR","Restore recent table state","Recovery, not query optimization"],
  ["Write sharding","Spread a hot logical key","Adds read aggregation complexity"]],traps:[
  "Provisioning more capacity does not fundamentally repair a very poor hot-key design.",
  "A GSI is justified by a real alternate access pattern, not as a generic performance switch.",
  "TTL is asynchronous and is not a compliance-retention control.",
  "DynamoDB is an operational low-latency store, not a substitute for analytical warehouse scans."],check:["Partition-key distribution","Composite keys","GSI vs LSI basics","TTL","PITR","Hot-key write sharding"]},
 orchestration:{title:"Orchestration & Operations",icon:"🔁",accent:"#4f46e5",desc:"Choose Step Functions, MWAA, EventBridge and CloudWatch; design retries, DLQs and idempotency.",tags:["Step Functions","MWAA","CloudWatch","Retry","DLQ"],overview:[
  ["Step Functions","Stateful service orchestration with Retry, Catch, branches and history."],
  ["MWAA","Managed Airflow for DAG-centric data-platform scheduling."],
  ["EventBridge Scheduler","Simple time-based target invocation without scheduler hosts."],
  ["CloudWatch","Metrics, logs and alarms for operational visibility."]],flow:[
  ["Trigger","schedule / event","#0ea5e9"],["Orchestrator","Step Functions / MWAA","#4f46e5"],["Tasks","Glue / Lambda / Batch","#7c3aed"],["Failures","Retry / Catch / DLQ","#dc2626"],["Observability","CloudWatch","#16a34a"]],compare:[
  ["Step Functions","Service state machine / error handling","Excellent native AWS orchestration"],
  ["MWAA","Complex Airflow DAG ecosystem","More scheduler/DAG machinery"],
  ["EventBridge Scheduler","Simple cron / one-time trigger","Not multi-step orchestration"],
  ["Retry + backoff","Transient failure handling","Must be bounded"],
  ["DLQ","Preserve terminal failures","Does not fix root cause"]],traps:[
  "A scheduler triggers; an orchestrator tracks multi-step execution state.",
  "Retry without backoff can amplify throttling. Infinite retry loops are almost never the best answer.",
  "Idempotency matters because many AWS event systems provide at-least-once delivery behavior.",
  "CloudWatch observes; it does not orchestrate or buffer failed work."],check:["Retry vs Catch","Backoff","DLQ / redrive","Idempotency","CloudWatch metrics","Step Functions vs MWAA"]},
 security:{title:"Security & Governance",icon:"🔐",accent:"#16a34a",desc:"IAM, KMS, VPC endpoints, Lake Formation, Macie, CloudTrail and retention controls.",tags:["IAM","KMS","Lake Formation","CloudTrail","Macie"],overview:[
  ["IAM least privilege","Grant only required actions on required resources."],
  ["SSE-KMS","Encryption with KMS authorization and auditable key use."],
  ["Lake Formation","Central fine-grained data-lake governance."],
  ["CloudTrail / Macie","CloudTrail = API audit; Macie = sensitive-data discovery in S3."]],flow:[
  ["Identity","IAM / role","#2563eb"],["Network","VPC endpoint","#0891b2"],["Authorization","IAM / Lake Formation","#16a34a"],["Encryption","KMS","#f59e0b"],["Audit","CloudTrail / Macie","#7c3aed"]],compare:[
  ["IAM","Service/resource authorization","General AWS permissions"],
  ["Lake Formation","Fine-grained lake permissions","Data-lake governance layer"],
  ["KMS","Cryptographic key control","Does not replace S3/IAM authorization"],
  ["CloudTrail","API auditing","Data events needed for S3 object-level calls"],
  ["Macie","Sensitive-data discovery","Does not itself enforce encryption/access"]],traps:[
  "SSE-KMS access can require both S3 permission and KMS decrypt authorization.",
  "A VPC endpoint provides private connectivity; it does not replace IAM authorization.",
  "CloudTrail management events and S3 data events are different. GetObject/PutObject auditing needs data events.",
  "Object Lock is immutability/retention—not encryption or backup."],check:["Least privilege","SSE-S3 vs SSE-KMS","VPC endpoint policies","Lake Formation / LF-Tags","CloudTrail data events","Macie / Object Lock"]}
};
function escape(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function inject(){
 const topic=document.querySelector(".topic-section"),home=document.querySelector("#home");if(!home||document.querySelector(".study-center"))return;
 const sec=document.createElement("section");sec.className="study-center";sec.innerHTML=`<div class="study-center-head"><div><h2>Study Center</h2><p>Review the architecture, service trade-offs and common exam traps before starting a quiz. Each recap is interactive and designed for quick revision.</p></div></div><div class="study-grid">${Object.entries(MODULES).map(([k,m])=>`<div class="card study-card" style="--study-accent:${m.accent}"><div class="study-icon">${m.icon}</div><h3>${escape(m.title)}</h3><p>${escape(m.desc)}</p><div class="study-tags">${m.tags.map(t=>`<span class="study-tag">${escape(t)}</span>`).join("")}</div><button class="study-open" data-study="${k}">Open interactive recap →</button></div>`).join("")}</div>`;
 if(topic)home.insertBefore(sec,topic);else home.appendChild(sec);
 sec.querySelectorAll("[data-study]").forEach(b=>b.onclick=()=>openModule(b.dataset.study));
}
function openModule(key){const m=MODULES[key];if(!m)return;const root=document.querySelector("#modalRoot");root.innerHTML=`<div class="modalback"><div class="modal study-modal"><button class="study-close" id="studyClose">×</button><div class="study-modal-head"><h2>${m.icon} ${escape(m.title)}</h2><p>${escape(m.desc)}</p><div class="study-tabs"><button class="study-tab active" data-tab="overview">Overview</button><button class="study-tab" data-tab="architecture">Architecture</button><button class="study-tab" data-tab="compare">Compare</button><button class="study-tab" data-tab="traps">Exam traps</button><button class="study-tab" data-tab="check">Checklist</button></div></div><div class="study-body">
<div class="study-panel active" data-panel="overview"><h3>Core ideas</h3><div class="key-points">${m.overview.map(x=>`<div class="key-box"><strong>${escape(x[0])}</strong>${escape(x[1])}</div>`).join("")}</div><div class="study-progress-note">Tip: read the scenario and identify the decisive requirement first: protocol compatibility, ordering, cost, latency, operational overhead, governance or recovery.</div></div>
<div class="study-panel" data-panel="architecture"><h3>Architecture map</h3><div class="architecture">${m.flow.map((x,i)=>`${i?'<div class="arch-arrow">→</div>':''}<div class="arch-node" style="--node:${x[2]}">${escape(x[0])}<small>${escape(x[1])}</small></div>`).join("")}</div><h4>How to read it</h4><div class="rule">Follow the data from left to right. At each step, ask whether the question is testing ingestion semantics, processing, storage, orchestration or security. This prevents choosing a service from the wrong architectural layer.</div></div>
<div class="study-panel" data-panel="compare"><h3>Service comparison</h3><table class="compare-table"><thead><tr><th>Service / feature</th><th>Use when</th><th>Watch out for</th></tr></thead><tbody>${m.compare.map(r=>`<tr><td><strong>${escape(r[0])}</strong></td><td>${escape(r[1])}</td><td>${escape(r[2])}</td></tr>`).join("")}</tbody></table></div>
<div class="study-panel" data-panel="traps"><h3>Common exam traps</h3>${m.traps.map(t=>`<div class="trap">⚠ ${escape(t)}</div>`).join("")}<div class="rule">Exam rule: a distractor can be technically possible and still be wrong because another option meets the same requirement more natively, securely, cheaply or with less operational overhead.</div></div>
<div class="study-panel" data-panel="check"><h3>Before you take the quiz, can you explain…</h3><div class="study-checklist">${m.check.map(c=>`<div class="check-item">☐ ${escape(c)}</div>`).join("")}</div><div class="study-launch"><button class="primary" data-launch-topic="${key}" data-launch-mode="untimed">Start 30-question untimed test</button><button class="secondary" data-launch-topic="${key}" data-launch-mode="timed">Start 60-minute test</button></div></div>
</div></div></div>`;
 root.querySelector("#studyClose").onclick=()=>root.innerHTML="";root.querySelector(".modalback").onclick=e=>{if(e.target===e.currentTarget)root.innerHTML="";};
 root.querySelectorAll(".study-tab").forEach(t=>t.onclick=()=>{root.querySelectorAll(".study-tab").forEach(x=>x.classList.toggle("active",x===t));root.querySelectorAll(".study-panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===t.dataset.tab));});
 root.querySelectorAll("[data-launch-topic]").forEach(b=>b.onclick=()=>{root.innerHTML="";window.startTopicTest?.(b.dataset.launchTopic,b.dataset.launchMode);});
}
window.DEA_STUDY_MODULES=MODULES;inject();
})();