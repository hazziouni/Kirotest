(function(){
const bank=window.QUESTIONS||[];
const industries=["financial-services company","online marketplace","media platform","logistics company","healthcare analytics team","retail organization","telecommunications provider","travel company","software company","manufacturing business"];
const endings=[
 "Which solution BEST meets these requirements?",
 "Which option should the data engineer recommend?",
 "What should the data engineer do?",
 "Which approach provides the MOST operationally efficient solution?",
 "Which solution meets the requirement with the LEAST operational overhead?",
 "Which option is the MOST appropriate?"
];
function pick(a,n){return a[Math.abs(n)%a.length];}
function cleanCore(p){
 let s=String(p||"").replace(/\s*\[Scenario \d+\]\s*$/i,"").trim();
 const starters=[
  /^A [^.]+ processes [^.]+\.\s*/i,
  /^A data engineer at a [^.]+ must support [^.]+\.\s*/i,
  /^A [^.]+ is redesigning a data pipeline that handles [^.]+\.\s*/i,
  /^For a workload at a [^,]+ handling [^,]+,\s*/i,
  /^A [^.]+ reports a data-engineering requirement for [^.]+\.\s*/i
 ];
 for(const r of starters)s=s.replace(r,"");
 s=s.replace(/\s+(Which solution is MOST appropriate\?|Which option best meets the requirement\?|What should the engineer do\?|Which approach should be selected\?|Which AWS option is the best fit\?)$/i,"");
 return s.trim();
}
function varyPrompt(q){
 if(q.id<=65)return;
 const core=cleanCore(q.prompt);if(!core)return;
 const ind=pick(industries,q.id);
 const e=pick(endings,q.id*3);
 const forms=[
  `${core} ${e}`,
  `During a design review, a data engineer identifies the following requirement: ${core} ${e}`,
  `A ${ind} has an existing data platform. ${core} ${e}`,
  `A data engineer is evaluating two competing designs. The required behavior is: ${core} ${e}`,
  `An existing workload must be updated. ${core} ${e}`,
  `A ${ind} wants to simplify its data architecture. ${core} ${e}`,
  `The data platform team has the following constraint: ${core} ${e}`,
  `A production pipeline is being reviewed for cost, reliability, and operational effort. ${core} ${e}`,
  `Which AWS design should be used when the following requirement must be satisfied? ${core}`,
  `A data engineer must choose between several technically valid AWS approaches. ${core} ${e}`
 ];
 q.prompt=pick(forms,q.id*7);
}
function multiWrap(seed,body){
 const forms=[
  `${body} Which TWO actions should the data engineer take? (Select TWO.)`,
  `A data engineer must satisfy the following requirement: ${body} Which TWO options should be selected? (Select TWO.)`,
  `During a production-readiness review, the team identifies this requirement: ${body} Which TWO recommendations are appropriate? (Select TWO.)`,
  `An existing data pipeline must be improved. ${body} Which TWO changes best satisfy the requirement? (Select TWO.)`,
  `${body} Select TWO responses that together provide the best solution.`,
  `A data platform team is comparing several valid AWS techniques. ${body} Which TWO choices should the team implement? (Select TWO.)`
 ];
 return pick(forms,seed);
}
function M(prompt,choices,correct,explanation,why,task){return{prompt,choices,correct,explanation,why,task};}
const T={
 "Domain 1 — Data Ingestion and Transformation":[
  s=>M(multiWrap(s,"A streaming application uses Kinesis Data Streams. Records for the same device must remain ordered, and several independent consumers require predictable read throughput."),
   ["Use the device ID as the partition key.","Register the latency-sensitive applications as enhanced fan-out consumers.","Use a random UUID as the partition key for every record.","Send all records with a constant partition key.","Replace every consumer with an S3 event notification."],[0,1],
   "A stable device key preserves per-device shard ordering, while enhanced fan-out isolates consumer read throughput.",
   ["Correct: a stable device ID keeps one device's records on the same shard, assuming the key distribution is healthy.","Correct: enhanced fan-out provides dedicated per-shard throughput to registered consumers.","Random partition keys improve distribution but break per-device ordering.","A constant key preserves global ordering only by concentrating all writes on one shard, creating a hot shard.","S3 notifications are not a substitute for low-latency independent Kinesis consumers."],"1.1 Perform data ingestion"),
  s=>M(multiWrap(s,"A Glue Spark job reads a very large S3 dataset. Queries downstream usually filter by event_date, and the job joins the data to a small reference table."),
   ["Write the output as Parquet partitioned by event_date.","Broadcast the small reference table when it fits safely in executor memory.","Write one JSON object for every source row.","Repartition both sides of every join to a single partition.","Disable predicate pushdown."],[0,1],
   "Columnar partitioned output reduces downstream scans, while a broadcast join can avoid a large shuffle.",
   ["Correct: Parquet plus event_date partitioning supports column pruning and partition pruning.","Correct: broadcasting a genuinely small table avoids shuffling the large side of the join.","Per-row JSON creates a severe small-files problem and increases scan cost.","A single partition removes parallelism and creates a bottleneck.","Disabling pushdown generally increases I/O."],"1.2 Transform and process data"),
  s=>M(multiWrap(s,"An Oracle database is being migrated to Aurora. The target must contain existing rows and remain synchronized with ongoing source changes until cutover."),
   ["Configure AWS DMS to perform a full load.","Enable change data capture (CDC) for ongoing changes.","Use only a Glue crawler to detect changed rows.","Run one final CSV export at cutover and ignore earlier changes.","Use S3 Lifecycle transitions to track transaction logs."],[0,1],
   "A full load copies the existing data, and CDC then applies ongoing transactional changes until cutover.",
   ["Correct: full load establishes the initial target dataset.","Correct: CDC keeps the target synchronized after the initial copy.","A crawler catalogs metadata; it does not replicate database transaction logs.","A single final export does not continuously synchronize the target.","S3 Lifecycle manages object storage classes, not database replication."],"1.1 Perform data ingestion"),
  s=>M(multiWrap(s,"A stateful data workflow invokes Glue jobs and Lambda functions. Transient failures should be retried automatically, while permanent failures must be routed to cleanup logic."),
   ["Configure Step Functions Retry policies with backoff.","Configure Catch paths for handled terminal errors.","Implement an infinite immediate retry loop in Lambda.","Remove task timeouts.","Use an S3 lifecycle rule to represent workflow state."],[0,1],
   "Step Functions provides explicit Retry and Catch semantics for resilient workflow orchestration.",
   ["Correct: Retry can handle transient errors with bounded attempts and backoff.","Correct: Catch can route terminal failures to cleanup or recovery states.","Tight infinite retries can amplify throttling and outages.","Removing timeouts can leave stuck workflow states.","Lifecycle rules do not orchestrate execution state."],"1.3 Orchestrate data pipelines"),
  s=>M(multiWrap(s,"A recurring Glue job should process only new files and reduce unnecessary S3 reads before transformation."),
   ["Enable Glue job bookmarks for supported incremental sources.","Use partition pruning or pushdown predicates when the required partitions are known.","Disable the Glue Data Catalog.","Convert all source files to uncompressed CSV.","Read every partition and filter only after the full scan."],[0,1],
   "Bookmarks track processed input state, while pruning reduces I/O before the main transformation.",
   ["Correct: bookmarks help prevent reprocessing previously consumed input.","Correct: pruning skips irrelevant partitions or records earlier in the read path.","Disabling the catalog removes useful metadata and does not improve incremental state.","CSV usually increases analytical scan cost.","Filtering after a complete scan wastes I/O."],"1.2 Transform and process data")
 ],
 "Domain 2 — Data Store Management":[
  s=>M(multiWrap(s,"Athena queries a large S3 dataset. Most queries select only a few columns and always filter by event_date."),
   ["Store the data in Parquet or ORC.","Partition the data by event_date.","Create one object per row.","Disable compression.","Store all records in a single unpartitioned JSON prefix."],[0,1],
   "Columnar storage and selective partitioning directly reduce Athena bytes scanned.",
   ["Correct: columnar formats allow column pruning and efficient compression.","Correct: date partitioning allows partition pruning for the common predicate.","Tiny files create request and metadata overhead.","Disabling compression increases scan volume.","An unpartitioned JSON layout forces more data scanning."],"2.1 Choose a data store"),
  s=>M(multiWrap(s,"A Redshift workload frequently joins two large tables by customer_id and also performs time-range filters on event_timestamp."),
   ["Choose compatible distribution on customer_id when the data distribution supports it.","Choose a sort strategy that supports the frequent event_timestamp range filters.","Use a random Kinesis partition key for the Redshift tables.","Disable table statistics.","Export each query result to S3 before joining it back to Redshift."],[0,1],
   "Distribution can reduce join redistribution, while sort design can improve block pruning for range predicates.",
   ["Correct: co-locating large join partners can reduce network redistribution.","Correct: an appropriate sort key can improve zone-map pruning for time filters.","Kinesis partition keys do not control Redshift row distribution.","The optimizer benefits from accurate statistics.","Export-and-reload adds unnecessary work and latency."],"2.1 Choose a data store"),
  s=>M(multiWrap(s,"A data-lake table on S3 needs transactional writes and safe schema evolution while remaining queryable by supported analytics engines."),
   ["Use an open table format such as Apache Iceberg.","Maintain table metadata in a compatible catalog such as the Glue Data Catalog.","Store only raw CSV files with no table metadata.","Use SQS FIFO as the table transaction log.","Use an EC2 instance store volume as the durable system of record."],[0,1],
   "Iceberg supplies table-level metadata and transactional semantics, while a compatible catalog makes the table discoverable to analytics engines.",
   ["Correct: Iceberg supports snapshots, schema evolution, and transactional table operations.","Correct: a compatible catalog can expose the table metadata to query engines.","Plain CSV files alone do not provide table-level transaction semantics.","SQS is a messaging service, not an Iceberg metadata catalog.","Instance store is ephemeral."],"2.4 Design data models and schema evolution"),
  s=>M(multiWrap(s,"A DynamoDB workload has a hot partition and also needs a new efficient query pattern based on an alternate partition key."),
   ["Redesign or shard the write key to distribute write traffic.","Create a global secondary index for the alternate query key when justified by the access pattern.","Keep a single constant partition key and increase item size.","Use Athena workgroups to distribute DynamoDB writes.","Disable adaptive capacity."],[0,1],
   "Write-key distribution addresses the hotspot, and a GSI can support the alternate access pattern.",
   ["Correct: higher-cardinality key design or write sharding spreads traffic.","Correct: a GSI provides an alternate key schema for efficient queries.","A constant key worsens the hot-partition problem.","Athena workgroups do not control DynamoDB partitioning.","Disabling adaptive behaviors would not solve a poor key design."],"2.1 Choose a data store")
 ],
 "Domain 3 — Data Operations and Support":[
  s=>M(multiWrap(s,"A production pipeline experiences intermittent failures. Operators need fast detection and failed messages must remain available for investigation."),
   ["Create CloudWatch alarms on meaningful failure or backlog metrics.","Configure an SQS dead-letter queue or equivalent failure destination where appropriate.","Disable retries and delete every failed message immediately.","Store all logs only on a developer laptop.","Use S3 Intelligent-Tiering as the alerting system."],[0,1],
   "Alarms provide proactive detection, while a DLQ or failure destination preserves terminal failures for analysis.",
   ["Correct: alarms turn service metrics into actionable notifications.","Correct: a DLQ isolates repeatedly failing messages without losing them.","Immediate deletion creates data loss.","Laptop-only logs are not centralized production observability.","Storage tiering is unrelated to alerting."],"3.3 Maintain and monitor data pipelines"),
  s=>M(multiWrap(s,"A Step Functions workflow calls a throttled downstream API. The pipeline should recover from transient throttling without creating a retry storm."),
   ["Use bounded retries with exponential backoff.","Set a sensible maximum number of attempts and route terminal failure to controlled handling.","Retry continuously with no delay.","Remove all timeouts and retry limits.","Increase S3 object retention."],[0,1],
   "Bounded backoff reduces retry pressure, and explicit terminal handling prevents uncontrolled loops.",
   ["Correct: exponential backoff is appropriate for transient throttling.","Correct: bounded attempts plus controlled error handling make failures observable and deterministic.","Immediate infinite retries can worsen throttling.","Unlimited execution can leave stuck workflows.","S3 retention does not affect API throttling."],"3.3 Maintain and monitor data pipelines"),
  s=>M(multiWrap(s,"A team wants to improve confidence in a recurring data pipeline before publishing data to downstream consumers."),
   ["Define data-quality rules for required fields, ranges, uniqueness, or referential expectations.","Publish quality results to operational monitoring so failures can stop or quarantine bad output.","Disable schema validation to reduce job duration.","Treat every null as valid regardless of business rules.","Use Route 53 health checks as the only data-quality mechanism."],[0,1],
   "Explicit quality rules plus monitored enforcement allow bad data to be detected before publication.",
   ["Correct: quality rules encode measurable expectations about the dataset.","Correct: operationalizing quality results makes failures actionable in the pipeline.","Disabling validation reduces confidence rather than improving quality.","Null acceptance depends on the data contract.","DNS health checks do not validate dataset contents."],"3.4 Ensure data quality")
 ],
 "Domain 4 — Data Security and Governance":[
  s=>M(multiWrap(s,"A private-subnet data-processing workload must access a sensitive S3 bucket without using the public internet. The bucket should also reject requests that do not originate from the approved VPC endpoint."),
   ["Create an S3 gateway VPC endpoint.","Add a bucket-policy condition that restricts access to the approved VPC endpoint.","Assign public IP addresses to every worker.","Route all S3 traffic through a NAT gateway and allow any source.","Make the bucket public but encrypt the objects."],[0,1],
   "The endpoint provides private routing, and the bucket policy enforces the required network-origin restriction.",
   ["Correct: an S3 gateway endpoint provides private VPC-to-S3 connectivity.","Correct: a SourceVpce-style policy condition can restrict requests to the approved endpoint.","Public IPs violate the private-access requirement.","NAT is unnecessary for S3 when a gateway endpoint meets the requirement and does not enforce the requested endpoint restriction.","Encryption does not make public access acceptable."],"4.2 Apply authorization mechanisms"),
  s=>M(multiWrap(s,"An application reads SSE-KMS encrypted objects from S3. The S3 policy allows access, but decryption must also be explicitly controlled and auditable."),
   ["Grant the principal the required KMS decrypt permission.","Ensure the KMS key policy permits the intended principal or authorization path.","Make the S3 object public to bypass KMS.","Change the object extension to .parquet.","Disable CloudTrail."],[0,1],
   "SSE-KMS requires authorization at both the S3 object layer and the KMS key layer.",
   ["Correct: the caller needs the relevant KMS cryptographic permission.","Correct: the key policy must allow the principal or an appropriate IAM authorization path.","Public S3 access does not bypass KMS authorization.","File extensions do not affect decryption permissions.","Disabling audit logging weakens governance and does not fix access."],"4.3 Ensure data encryption and masking"),
  s=>M(multiWrap(s,"A governed data lake contains hundreds of catalog tables. Permissions should scale by business classification, and security teams also need automated discovery of PII in S3."),
   ["Use Lake Formation LF-Tags for tag-based authorization.","Use Amazon Macie to discover sensitive S3 data.","Create one IAM user for every table.","Use S3 lifecycle tags as the only authorization system.","Use Kinesis partition keys to classify PII."],[0,1],
   "LF-Tags scale lake permissions by classification, while Macie addresses sensitive-data discovery in S3.",
   ["Correct: LF-Tags support scalable tag-based lake governance.","Correct: Macie discovers and classifies sensitive data in S3.","Per-table IAM users do not scale and mix identity with dataset governance.","Lifecycle tags control lifecycle behavior, not Lake Formation authorization.","Kinesis partition keys are unrelated to PII classification."],"4.5 Understand data privacy and governance"),
  s=>M(multiWrap(s,"Auditors require both a general record of AWS management API activity and object-level reads and writes for a sensitive S3 bucket."),
   ["Enable an appropriate CloudTrail trail for management events.","Enable CloudTrail S3 data events for the sensitive bucket.","Rely only on S3 storage-class metrics.","Use Athena CTAS as an audit log.","Disable object-level logging to reduce event volume."],[0,1],
   "Management events cover account and service API activity, while S3 data events capture object-level operations such as GetObject and PutObject.",
   ["Correct: management events provide the general API audit trail.","Correct: S3 data events add the required object-level activity.","Storage metrics do not provide an API audit trail.","CTAS is a query materialization operation, not audit logging.","Disabling data events would miss the explicit object-level requirement."],"4.4 Prepare logs for audit")
 ]
};
for(const q of bank)varyPrompt(q);
for(const q of bank){
 if(q.id<=65 || q.id%5!==0)return;
 const arr=T[q.domain];if(!arr||!arr.length)return;
 const x=arr[Math.floor(q.id/5)%arr.length](q.id);
 q.prompt=x.prompt;q.choices=x.choices;q.correct=x.correct;q.explanation=x.explanation;q.why=x.why;q.task=x.task;
 if(q.difficulty==="Easy")q.difficulty="Medium";
}
window.DEA_REALISM_INFO={multipleResponse:bank.filter(q=>q.correct&&q.correct.length>1).length,total:bank.length};
})();