(function(){
const rules=[
[/customer ID as the Kinesis partition key/i,[
 ["Use customer_id plus a random suffix as the partition key for every event.","The random suffix improves distribution but can send one customer's events to different shards, so per-customer ordering is lost."],
 ["Use the event timestamp as the partition key and store customer_id in the payload.","A timestamp distributes by time rather than customer and does not preserve one customer's shard-level ordering."],
 ["Use a random UUID as the partition key and increase the Kinesis retention period.","Retention does not restore ordering after records for one customer have been distributed across shards."]]],
[/enhanced fan-out consumers/i,[
 ["Increase the stream shard count and keep all consumers on shared-throughput GetRecords polling.","More shards increase total stream capacity, but standard consumers still share the per-shard read throughput rather than receiving dedicated throughput."],
 ["Use the Kinesis Client Library with additional worker instances but do not register enhanced fan-out consumers.","KCL improves consumer coordination, but standard polling consumers still share read throughput on each shard."],
 ["Send the stream to Amazon Data Firehose and have every application read the Firehose delivery destination.","Firehose is optimized for managed delivery, not independent low-latency application consumers with dedicated stream throughput."]]],
[/Amazon Data Firehose/i,[
 ["Use Kinesis Data Streams with a Lambda consumer that buffers and writes batches to S3.","This can work, but the team must operate the consumer behavior and scaling that Firehose provides as a managed delivery capability."],
 ["Use an AWS Glue streaming job that reads the stream and continuously writes S3 output.","Glue streaming is appropriate for richer streaming ETL, but it adds more processing and operational complexity for a simple managed delivery requirement."],
 ["Use Amazon MSK Serverless with a Kafka sink connector to S3.","This is viable for Kafka workloads, but introduces Kafka and connector components when Kafka compatibility is not required."]]],
[/Use Amazon MSK\.?$/i,[
 ["Use self-managed Apache Kafka on Amazon EC2 with the existing clients unchanged.","Kafka compatibility is preserved, but the company would still manage brokers, patching, scaling, and availability."],
 ["Migrate producers and consumers to Kinesis Data Streams while retaining the Kafka consumer-group code unchanged.","Kinesis uses different APIs and consumption semantics, so existing Kafka applications cannot remain unchanged."],
 ["Use Amazon Data Firehose as a direct replacement for the Kafka brokers.","Firehose is a delivery service and does not expose Kafka broker APIs, offsets, and consumer-group semantics."]]],
[/DMS full load plus CDC/i,[
 ["Use AWS DMS CDC only and begin replication from the current transaction-log position.","CDC alone captures ongoing changes but does not load the existing source rows required for a complete migration."],
 ["Use AWS Glue JDBC jobs with job bookmarks to copy changed rows based on a timestamp column.","A custom incremental pattern can be built, but it is less appropriate than transaction-log CDC for a database migration that must stay synchronized until cutover."],
 ["Use AWS Schema Conversion Tool for schema conversion and rely on a final one-time database export at cutover.","Schema conversion helps with heterogeneous migrations, but a one-time export does not keep the target synchronized with ongoing changes."]]],
[/Glue job bookmarks/i,[
 ["Store the maximum processed event timestamp in DynamoDB and filter the next Glue run using that watermark.","A custom watermark can work but adds state-management logic; job bookmarks provide managed processing state for supported Glue sources."],
 ["Run a Glue crawler before every job and process only objects whose catalog partition was created since the previous run.","Crawler metadata creation is not a reliable ETL checkpoint and does not by itself track which objects were successfully processed."],
 ["Generate a daily S3 Inventory report and exclude object keys that appeared in the previous inventory.","Inventory is not designed as per-run ETL state and can lag object creation; it also does not represent successful job processing."]]],
[/Broadcast the small dimension table/i,[
 ["Repartition both the fact table and the dimension table on the join key before the join.","This can improve partition alignment but still shuffles the multi-terabyte fact table, which a broadcast join avoids when the dimension is small enough."],
 ["Increase spark.sql.shuffle.partitions and force a sort-merge join.","More shuffle partitions can tune a shuffle join, but it does not eliminate the unnecessary shuffle of the large fact dataset."],
 ["Cache the 4 TB fact table before executing the join.","Caching a very large fact table is expensive and does not remove the join shuffle; broadcasting the small side directly addresses the bottleneck."]]],
[/ResolveChoice/i,[
 ["Use ApplyMapping to cast the field directly without first resolving the DynamicFrame choice type.","ApplyMapping is useful for schema mapping, but an unresolved choice type should first be resolved explicitly to avoid ambiguous casts."],
 ["Convert the DynamicFrame to a DataFrame and rely on Spark schema inference to choose the final type automatically.","Schema inference does not guarantee the intended deterministic resolution of an already ambiguous Glue choice type."],
 ["Use Relationalize to split the DynamicFrame into normalized tables and keep both conflicting types.","Relationalize addresses nested structures; it does not directly satisfy the requirement to resolve one field to a single target type."]]],
[/AWS Glue or another long-running compute service/i,[
 ["Increase Lambda memory to the maximum and keep the entire 28-minute transformation in one invocation.","More memory can increase CPU, but it does not change Lambda's maximum invocation duration."],
 ["Invoke the same 28-minute Lambda asynchronously from S3 instead of synchronously.","Asynchronous invocation changes delivery semantics, not the maximum execution duration of a Lambda invocation."],
 ["Place the Lambda task inside Step Functions Standard and allow the task to run for 28 minutes.","Step Functions can orchestrate Lambda, but the Lambda task itself still has the Lambda execution-duration limit."]]],
[/Parquet partitioned by event_date/i,[
 ["Write Parquet without partitions and rely only on column pruning.","Column pruning helps, but Athena would still inspect files across all dates instead of pruning date partitions before scanning."],
 ["Write JSON partitioned by event_date and enable gzip compression.","Date partitioning helps, but row-oriented JSON generally scans more data than a columnar format for analytical queries."],
 ["Write Parquet partitioned by a high-cardinality request_id instead of event_date.","High-cardinality partitions create excessive partition and file overhead and do not align with the query's common date predicate."]]],
[/Compact the data into appropriately sized Parquet files/i,[
 ["Increase the Glue crawler frequency so Athena receives file metadata more often.","Catalog freshness does not remove the small-files overhead that is slowing query planning and S3 access."],
 ["Add a second, more granular partition key and keep the existing tiny files unchanged.","More granular partitioning can create even more small files and metadata while leaving the core file-size problem unresolved."],
 ["Convert the tiny Parquet files to individually compressed JSON objects.","This retains the small-files problem and moves to a less efficient analytical format."]]],
[/Kinesis Data Streams on-demand mode/i,[
 ["Use provisioned mode and set a permanently high shard count based on the largest observed spike.","This can avoid throttling but overprovisions during normal periods and still requires capacity planning."],
 ["Use provisioned mode and run a custom Lambda that periodically splits or merges shards based on CloudWatch metrics.","A custom scaler is possible but adds operational logic that on-demand capacity avoids."],
 ["Replace Kinesis Data Streams with Data Firehose solely to avoid managing shard capacity.","Firehose has different consumption semantics and is not a drop-in replacement when applications need a Kinesis stream."]]],
[/partition pruning or pushdown predicates/i,[
 ["Read every partition first and apply a Spark DataFrame filter after the source scan.","Filtering after the scan can reduce later processing but does not avoid the initial I/O from irrelevant partitions."],
 ["Enable Glue job bookmarks and rely on the bookmark to select the requested region and date.","Bookmarks track previously processed data; they are not a substitute for predicate-based partition pruning."],
 ["Increase worker count so all partitions are scanned faster.","More workers may shorten a wasteful full scan but does not reduce the amount of unnecessary data read."]]],
[/Use AWS Step Functions/i,[
 ["Use AWS Glue Workflows to coordinate every Glue and Lambda branch in the pipeline.","Glue Workflows can orchestrate Glue-centric processes, but Step Functions is better suited to heterogeneous stateful workflows with rich branching, retries, and service integrations."],
 ["Use Amazon MWAA with an Airflow DAG for the entire workflow.","Airflow can orchestrate this workload, but it introduces an Airflow environment when the requirement can be met with a more directly managed state-machine service."],
 ["Use EventBridge Pipes to model the multi-step branching workflow and retain state between all steps.","Pipes is optimized for point-to-point event integration and enrichment, not general multi-state workflow orchestration."]]],
[/EventBridge Scheduler/i,[
 ["Use an always-running EC2 cron host that invokes the pipeline at 02:00.","This works, but it creates a server to patch and operate for a simple managed schedule."],
 ["Create a Step Functions execution that loops with a 24-hour Wait state and invokes the batch every day.","A looping state machine can be built, but it is unnecessary compared with a purpose-built managed scheduler."],
 ["Deploy an MWAA environment only to run a single daily scheduled task.","Airflow provides powerful orchestration but adds more infrastructure and cost than required for one simple schedule."]]],
[/Place Amazon SQS between/i,[
 ["Use Amazon SNS between the producer and worker with no queue subscription.","SNS provides push-based fan-out but does not by itself provide the durable backlog needed to absorb consumer slowdowns."],
 ["Use Amazon EventBridge to route events directly to the worker with retries only.","EventBridge is useful for event routing, but SQS provides a durable consumer-controlled buffer for burst absorption and backpressure."],
 ["Use Kinesis Data Streams with a single shard as the buffer regardless of event rate.","Kinesis can buffer streaming data, but one fixed shard can itself become the bottleneck and introduces stream-consumer semantics not required here."]]],
[/Amazon AppFlow/i,[
 ["Schedule a Lambda function to poll the SaaS REST API and write the records to S3.","Custom polling works but requires API pagination, throttling, authentication, retries, and maintenance that AppFlow manages for supported SaaS sources."],
 ["Build a custom AWS Glue connector for the SaaS API and run it on a schedule.","A custom connector adds development and maintenance when a managed AppFlow connector already supports the application."],
 ["Use AWS DMS to capture transaction-log changes from the SaaS application.","DMS is designed for supported database engines and transaction logs, not general SaaS application APIs."]]],
[/Use AWS DataSync/i,[
 ["Mount the on-premises NFS share on EC2 and run aws s3 sync on a schedule.","This can transfer files but requires the team to operate the host, scheduling, retry, verification, and scaling behavior."],
 ["Use AWS Transfer Family to expose an SFTP endpoint and rewrite the NFS workflow to push every file through SFTP.","Transfer Family is appropriate for managed file-transfer protocols, but it is not the most direct managed service for repeated NFS-to-S3 migration."],
 ["Use Snowball Edge for each recurring synchronization cycle.","Snowball is useful for large offline transfers, but recurring online synchronization is better served by DataSync."]]],
[/salting or another skew-aware repartitioning strategy/i,[
 ["Repartition the dataset again using only the same skewed key.","Repartitioning on the same hot key still sends the dominant key's rows to the same partition."],
 ["Increase the global shuffle partition count without changing how the dominant key is assigned.","More partitions do not split one key across multiple partitions when partitioning remains based on that key."],
 ["Cache the skewed dataset before the wide transformation.","Caching can avoid recomputation but does not redistribute the oversized key across tasks."]]],
[/Use coalesce when appropriate/i,[
 ["Use repartition to reduce the partition count, accepting a full shuffle of the dataset.","Repartition can produce the target count but usually performs a full shuffle; coalesce is often cheaper when only reducing partitions late in the pipeline."],
 ["Set spark.sql.shuffle.partitions to 1 after all shuffle stages have already completed.","Changing the shuffle setting after the relevant stages does not directly coalesce the existing output partitions."],
 ["Call repartition(1) before the final write for every dataset size.","Forcing one partition creates a single-task bottleneck and is not a scalable general solution."]]],
[/Athena partition projection/i,[
 ["Run MSCK REPAIR TABLE before every query to discover all new partitions.","MSCK can discover partitions but adds metadata operations and does not avoid maintaining partition metadata the way projection does for predictable schemes."],
 ["Use a Glue crawler after each new partition is written.","A crawler can register partitions, but frequent crawler runs add latency and cost when partition values can be projected from a known pattern."],
 ["Issue ALTER TABLE ADD PARTITION for each newly created date partition.","Manual or scripted partition registration works, but projection removes the need to register every predictable partition individually."]]],
[/S3 Lifecycle transitions/i,[
 ["Move all objects to S3 Intelligent-Tiering immediately and configure no lifecycle transitions.","Intelligent-Tiering is useful for unknown access patterns, but a known age-based pattern can be handled more directly with lifecycle transitions."],
 ["Keep all objects in S3 Standard and rely on multipart upload settings to reduce storage cost.","Multipart settings affect transfer behavior, not long-term storage-class cost."],
 ["Copy objects to a second Standard bucket after 30 days and delete the originals after one year.","This duplicates data and operational logic instead of using native lifecycle transitions."]]],
[/S3 Intelligent-Tiering/i,[
 ["Create fixed lifecycle transitions to Standard-IA after 30 days and Glacier after 90 days despite unpredictable access.","Fixed transitions require predicting access timing and can incur retrieval or transition costs when the pattern changes."],
 ["Keep everything in S3 Standard and review access logs quarterly to move objects manually.","Manual review creates operational effort and reacts slowly to changing access patterns."],
 ["Move all objects immediately to S3 One Zone-IA.","One Zone-IA changes resilience characteristics and is not appropriate solely because access patterns are unknown."]]],
[/Use RA3 node types/i,[
 ["Resize to more dense-compute nodes and keep all table data tied to local node storage.","Adding dense-compute nodes increases local capacity but does not provide the same separation of managed storage and compute as RA3."],
 ["Keep the current node family and unload older tables to S3 manually whenever disks fill.","Manual unload/reload adds operational work and breaks transparent access to the full warehouse dataset."],
 ["Move only the largest Redshift tables to DynamoDB and federate every analytical query.","DynamoDB is not a substitute for large relational analytical tables and changes the workload model substantially."]]],
[/distribution strategy on the join key/i,[
 ["Use EVEN distribution for both large tables regardless of the join pattern.","EVEN can balance storage but can require redistribution when the large tables are repeatedly joined on the same key."],
 ["Use ALL distribution for both multi-terabyte tables.","ALL replicates the full table to every node and is generally unsuitable for very large fact-style tables."],
 ["Choose unrelated DISTKEY columns that maximize cardinality independently in each table.","High cardinality alone does not co-locate matching join rows when the tables use different distribution keys."]]],
[/sort key including event_timestamp/i,[
 ["Use event_timestamp only as the DISTKEY and leave the table without a useful sort key.","Distribution affects row placement across nodes, while sort keys and zone maps are what directly help range-filter block pruning."],
 ["Create a materialized view for every possible timestamp range instead of defining a useful table sort order.","Materialized views can accelerate specific queries but do not replace an appropriate physical sort strategy for broad range filtering."],
 ["Run VACUUM before every query while keeping an unrelated sort key.","VACUUM maintains sort order but cannot make an unrelated sort key useful for the timestamp predicate."]]],
[/Redshift data sharing/i,[
 ["UNLOAD the producer tables to S3 every few minutes and COPY them into the consumer cluster.","This creates duplicated data and synchronization delay instead of live shared access."],
 ["Create Spectrum external tables over periodic S3 exports from the producer cluster.","Spectrum can query S3, but periodic exports are not the same as live governed sharing of Redshift data."],
 ["Give the consumer team credentials to connect directly to the producer database and query base tables.","Direct credential sharing couples teams to the producer cluster and does not provide the intended governed data-sharing model."]]],
[/Create a materialized view/i,[
 ["Rely only on the result cache and assume every repeated aggregation will have an identical query text and unchanged underlying data.","Result caching can help exact repeated queries, but a materialized view is a more explicit reusable precomputation for a recurring expensive aggregation."],
 ["Create a temporary table for the aggregation in every user session.","A per-session temporary table repeats the computation and is not a centrally maintained reusable object."],
 ["Increase WLM concurrency so more copies of the expensive aggregation run simultaneously.","More concurrency does not reduce the amount of computation required by each aggregation."]]],
[/Use Amazon DynamoDB/i,[
 ["Use Aurora Serverless v2 with a relational schema and indexes for every key-value request.","Aurora can provide low-latency SQL, but it is a relational engine and introduces a different scaling and data-model trade-off than a managed key-value store."],
 ["Use ElastiCache as the only system of record for all application data.","ElastiCache is primarily a caching/in-memory service and is not the default durable system of record for this requirement."],
 ["Use Athena over Parquet files in S3 for each online point lookup.","Athena is optimized for analytical SQL, not single-digit-millisecond operational key-value access."]]],
[/write sharding/i,[
 ["Switch the table to on-demand capacity but keep the same single hot partition key.","On-demand mode removes capacity planning but does not eliminate per-partition concentration caused by a poor key design."],
 ["Add DAX in front of the table while keeping the same write-heavy hot key.","DAX primarily accelerates reads and does not redistribute writes across DynamoDB partitions."],
 ["Increase the table's total write capacity while continuing to send nearly all writes to one key.","More table-level capacity does not fully solve a single hot logical partition that cannot use the table's distributed capacity effectively."]]],
[/global secondary index/i,[
 ["Create a local secondary index with a different partition key from the base table.","An LSI must use the same partition key as the base table, so it cannot provide the required alternate partition key."],
 ["Use a Scan with a FilterExpression on the alternate attribute.","A filtered scan still reads the table broadly and is not an efficient access pattern for repeated selective queries."],
 ["Add DAX and query the alternate attribute without creating an index.","DAX caches DynamoDB access but does not create a new queryable key schema."]]],
[/DynamoDB TTL/i,[
 ["Schedule a Lambda cleanup job every hour to scan the table and delete expired items.","This can work but adds scan cost and custom cleanup logic that native TTL avoids."],
 ["Use DynamoDB Streams to delete an item when its expiration attribute is first written.","Streams react to table changes; writing an expiration timestamp does not cause a future stream event at that timestamp."],
 ["Create a daily export to S3 and recreate the table without expired rows.","This is operationally heavy and unnecessary for routine item expiration."]]],
[/point-in-time recovery/i,[
 ["Create one on-demand backup at the end of each week.","Weekly snapshots leave large recovery gaps and do not support restoration to arbitrary recent points."],
 ["Enable DynamoDB Streams and assume the stream alone can restore the complete table to any timestamp.","Streams capture recent item changes but are not a managed point-in-time backup and restore feature."],
 ["Use a global table in a second Region as the only protection against accidental writes.","Global tables replicate writes, including accidental ones, and do not replace point-in-time recovery."]]],
[/Use Amazon Athena/i,[
 ["Provision Redshift Serverless and load all S3 data into local tables before analysts can run SQL.","This can provide SQL analytics but adds loading and warehouse resources when Athena can query the S3 data directly."],
 ["Use S3 Select for each analytical query across the entire multi-file dataset.","S3 Select works on individual objects and is not a general serverless SQL engine for querying a cataloged multi-object lake."],
 ["Create a Glue Spark job for every ad hoc SQL statement submitted by an analyst.","Glue is designed for data processing jobs, not low-friction interactive serverless SQL over S3."]]],
[/Use CTAS in Athena/i,[
 ["Use INSERT INTO an existing table even though the requirement is to create a new transformed table and storage layout.","INSERT INTO appends to an existing table; CTAS directly creates a new table from a query and can specify an efficient output format."],
 ["Use Athena UNLOAD to write files but do not create or register the resulting dataset as a table.","UNLOAD can export query results, but CTAS better matches the requirement to create a new queryable table."],
 ["Run SELECT and rely on the console result CSV as the downstream production dataset.","Console query results are not a robust managed transformation target for a production data pipeline."]]],
[/Athena workgroups/i,[
 ["Give each team a different named query while keeping all execution settings and limits shared.","Named queries save SQL text but do not isolate execution settings, output configuration, or usage controls."],
 ["Use IAM groups only and allow every query to run in the same default workgroup.","IAM controls permissions, but workgroups provide Athena-specific execution configuration, metrics, limits, and result controls."],
 ["Create different S3 prefixes for query results but keep one common unrestricted workgroup.","Separate prefixes alone do not provide workgroup-level cost controls and query governance."]]],
[/Redshift Spectrum external tables/i,[
 ["COPY all historical S3 data into Redshift local tables before each reporting cycle.","COPY provides local performance but duplicates large historical datasets and adds load operations when external querying is acceptable."],
 ["Run Athena separately and export every result back into Redshift before users can join it with warehouse tables.","This creates an extra query-and-transfer workflow instead of allowing Redshift to query external S3 data directly."],
 ["Use Redshift federated queries against S3 as though S3 were a PostgreSQL database endpoint.","Federated queries target supported external databases; Spectrum is the Redshift feature for S3 data-lake tables."]]],
[/CloudWatch Logs and metrics/i,[
 ["Send only job state-change events to EventBridge and use those events as the complete troubleshooting record.","State changes help automation, but they do not replace detailed job logs and operational metrics for troubleshooting."],
 ["Use CloudTrail management events as the primary source for Spark executor errors and transformation stack traces.","CloudTrail audits AWS API activity, not detailed Glue job application logs."],
 ["Enable an S3 access log on the input bucket and infer all ETL failures from object-read records.","S3 access logs can show requests but do not provide the Glue job's execution errors and metrics."]]],
[/IteratorAgeMilliseconds/i,[
 ["Monitor IncomingRecords and alert whenever producer throughput increases.","Producer rate does not directly indicate whether consumers are keeping up with the stream."],
 ["Monitor ReadProvisionedThroughputExceeded only.","Read throttling can contribute to lag, but it does not measure the actual age of records waiting for processing."],
 ["Monitor the stream retention period setting.","Retention is a configuration value, not a real-time measure of consumer backlog."]]],
[/CloudWatch alarm with an SNS/i,[
 ["Create an EventBridge rule for every Glue API call and manually inspect the event archive for failures.","EventBridge can react to state changes, but a metric alarm provides threshold-based operational alerting without manual inspection."],
 ["Rely on CloudTrail Lake queries that operators run at the end of each day.","CloudTrail is valuable for auditing, but delayed manual queries do not meet immediate operational alerting needs."],
 ["Use a dashboard only and require an operator to watch it continuously.","Dashboards provide visibility but not proactive notifications when a threshold is breached."]]],
[/Retry with exponential backoff/i,[
 ["Configure a fixed-delay retry every second with a very high maximum attempt count.","Aggressive fixed retries can amplify throttling and downstream pressure instead of allowing recovery time."],
 ["Catch the throttling error immediately and mark the entire workflow successful without retrying.","Catching can route errors, but treating a transient throttling failure as success loses required work."],
 ["Move the API call into Lambda and implement an unbounded tight retry loop inside the function.","A tight unbounded loop consumes compute, can worsen throttling, and lacks the controlled retry semantics available in Step Functions."]]],
[/dead-letter queue/i,[
 ["Increase the source queue visibility timeout indefinitely so failed messages remain invisible.","A longer visibility timeout delays redelivery but does not isolate poison messages for investigation after repeated failures."],
 ["Set maxReceiveCount to an extremely high value and keep retrying every failing message in the main queue.","This can cause poison messages to cycle for a long time and consume normal processing capacity."],
 ["Delete a message after the first failed attempt and record only a CloudWatch metric.","Deleting loses the event payload and prevents later inspection or replay."]]],
[/CloudFormation or another IaC/i,[
 ["Export console screenshots and use them as the production deployment runbook.","Screenshots document configuration but cannot reproducibly provision or review infrastructure changes."],
 ["Create resources manually in each environment and rely on naming conventions to keep them consistent.","Manual provisioning is prone to configuration drift and is difficult to version and reproduce."],
 ["Package only the Glue script in Git while configuring IAM and infrastructure manually.","Versioning code alone does not make the full pipeline infrastructure reproducible across environments."]]],
[/Use Amazon MWAA/i,[
 ["Run self-managed Airflow on a long-lived EC2 instance and patch the scheduler and webserver manually.","This preserves Airflow but retains the infrastructure-management burden that MWAA removes."],
 ["Replace the DAG with EventBridge Scheduler even though the workflow depends on complex Airflow operators and task dependencies.","Scheduler is appropriate for time-based triggers, not a direct replacement for a complex existing Airflow DAG."],
 ["Use Glue Workflows for every task, including non-Glue operators that depend on Airflow-specific behavior.","Glue Workflows is Glue-centric and may not replace an Airflow workflow that uses broader operators and dependency logic."]]],
[/DMS task metrics and CloudWatch logs/i,[
 ["Inspect only source database CPU and assume any replication latency must originate at the source.","Source CPU is useful context but does not isolate target latency, replication-instance pressure, or task-specific behavior."],
 ["Increase the DMS replication instance immediately without reviewing task latency metrics.","Scaling can help some bottlenecks, but metrics should identify whether the source, target, network, or replication instance is actually limiting throughput."],
 ["Use CloudTrail to inspect DMS API calls and infer row-level replication lag from them.","CloudTrail audits management activity but does not provide the replication task performance metrics needed for this diagnosis."]]],
[/Use AWS X-Ray/i,[
 ["Use CloudWatch Logs only and correlate every request manually across services using timestamps.","Logs can help, but distributed tracing is more direct for following a request path and attributing latency across supported services."],
 ["Use CloudTrail to trace end-to-end application latency between Lambda invocations.","CloudTrail records API activity, not application distributed traces and subsegment timing."],
 ["Use EventBridge Archive as a distributed tracing store.","Event archives retain events for replay but do not provide request-level service maps and traces."]]],
[/idempotent/i,[
 ["Disable retries so duplicate delivery can never occur.","Disabling retries sacrifices reliability and still does not guarantee that every upstream integration delivers exactly once."],
 ["Generate a new random transaction ID every time the same event is processed.","A new identifier prevents the consumer from recognizing a replay of the same logical event."],
 ["Increase the Lambda reserved concurrency to process duplicates faster.","Concurrency affects throughput, not duplicate side-effect prevention."]]],
[/CodePipeline\/CodeBuild/i,[
 ["Allow engineers to edit production Glue jobs directly after testing code locally.","Direct production edits bypass repeatable build, test, approval, and deployment controls."],
 ["Store release ZIP files in S3 and have an operator manually copy the chosen ZIP into each environment.","Artifact storage is useful, but manual promotion does not provide a complete controlled CI/CD process."],
 ["Use CloudFormation only for infrastructure but skip automated application tests and release stages.","IaC is important, but the requirement explicitly includes automated checks and promotion of application code through environments."]]],
[/job parameters or environment configuration/i,[
 ["Maintain a separate copy of the Glue script for each environment with bucket names hard-coded.","Multiple code copies create drift and make testing and promotion less reliable."],
 ["Infer the environment from the AWS account ID inside every transformation and hard-code the mapping in source code.","This still embeds environment configuration in code and becomes harder to manage as environments change."],
 ["Store the production S3 path in a module-level constant and overwrite the source file during deployment.","Rewriting source per environment is less reproducible than externalized runtime configuration."]]],
[/Athena query history and CloudWatch metrics/i,[
 ["Use only S3 Storage Lens to identify expensive Athena queries.","Storage Lens analyzes S3 storage and activity, not Athena query-level bytes scanned and execution statistics."],
 ["Enable CloudTrail and rank users by the number of StartQueryExecution API calls.","API call count does not show how much data each query scanned or how expensive it was."],
 ["Inspect the size of the Athena result files as a proxy for input bytes scanned.","Result size can be small even when a query scans a very large input dataset."]]],
[/Redshift system views and CloudWatch metrics/i,[
 ["Use only S3 access logs for UNLOAD operations to diagnose all warehouse query queueing.","S3 logs do not expose WLM queue wait, query execution, or cluster resource metrics."],
 ["Increase concurrency scaling immediately without first determining which queues and queries are waiting.","Concurrency scaling may help eligible workloads, but workload metrics should first confirm the nature of the bottleneck."],
 ["Use CloudTrail management events as the primary source for SQL execution-time analysis.","CloudTrail is an API audit trail, not the detailed SQL workload telemetry provided by Redshift system views."]]],
[/Grant only the required S3 actions/i,[
 ["Grant s3:* on the entire bucket because the Glue job runs inside a private subnet.","Network placement does not replace least-privilege authorization; the job should receive only the actions and prefixes it requires."],
 ["Grant read and write access to the whole AWS account's S3 resources and restrict only by bucket naming convention.","Naming conventions are not authorization boundaries and the resource scope is broader than necessary."],
 ["Attach PowerUserAccess to simplify future pipeline changes.","PowerUserAccess grants many unrelated permissions and violates the stated least-privilege requirement."]]],
[/SSE-KMS/i,[
 ["Use SSE-S3 because it encrypts objects at rest and provides the same customer-controlled KMS key policy and KMS audit behavior.","SSE-S3 provides server-side encryption but does not provide customer-managed KMS key policy control and KMS key-usage auditing."],
 ["Use client-side encryption with an application-managed key stored in the same S3 bucket.","Client-side encryption can be secure when designed well, but storing key material alongside data is inappropriate and does not meet the managed KMS-policy requirement."],
 ["Use a bucket policy that requires TLS but leave objects unencrypted at rest.","TLS protects data in transit; it does not satisfy the server-side at-rest encryption and KMS-control requirement."]]],
[/S3 gateway VPC endpoint/i,[
 ["Route private-subnet S3 traffic through a NAT gateway and an internet gateway.","This can reach S3 but incurs NAT processing and uses a public service path when a gateway endpoint can provide direct private routing."],
 ["Assign public IP addresses to the workload and restrict the bucket by source public IP.","Public addressing is unnecessary and conflicts with the private-subnet connectivity objective."],
 ["Create an interface endpoint to an EC2 proxy that forwards requests to S3.","A custom proxy adds components and cost when S3 supports a native gateway VPC endpoint for this routing pattern."]]],
[/cross-account IAM role with STS/i,[
 ["Create a long-lived IAM user in Account B and store its access keys in Account A.","Long-lived shared credentials increase rotation and exposure risk compared with temporary role credentials."],
 ["Add the Account A principal to the bucket policy but do not grant it any identity or role path that can obtain the required permissions.","Cross-account access requires compatible authorization on both sides; a role-assumption pattern provides controlled temporary credentials."],
 ["Make the bucket temporarily public and rely on an unguessable object prefix.","Obscurity is not authorization and public access violates the security requirement."]]],
[/Lake Formation permissions/i,[
 ["Manage every table and column using only individual S3 bucket policies.","S3 policies protect objects but do not provide the same centralized table-, column-, and catalog-aware lake governance."],
 ["Use Glue Data Catalog resource policies alone for all row- and column-level access decisions.","Catalog policies can control catalog resource access but are not a full substitute for Lake Formation's fine-grained data-lake authorization."],
 ["Create one S3 Access Point per table and use access-point policies as the complete table-governance system.","Access Points simplify S3 access patterns, but they do not provide Lake Formation's integrated catalog-level governance model."]]],
[/Lake Formation LF-Tags/i,[
 ["Create explicit table-by-table grants for every team and update each grant whenever a new table is created.","This works at small scale but does not meet the requirement for scalable classification-based authorization."],
 ["Use S3 object tags and bucket policies as the only mechanism for Data Catalog table permissions.","S3 tags govern object access patterns, not Lake Formation catalog resources and table-level permissions."],
 ["Create separate Glue databases for every sensitivity level and grant all-or-nothing database access.","Database-level grouping is coarser and less flexible than tag-based policies across many resources and dimensions."]]],
[/Use Amazon Macie/i,[
 ["Use AWS Config managed rules to inspect S3 bucket settings and infer whether individual objects contain PII.","Config evaluates resource configuration and compliance; it does not classify the contents of S3 objects for sensitive data."],
 ["Use GuardDuty S3 Protection to scan object contents for sensitive-data identifiers.","GuardDuty detects threats and suspicious activity; it is not the managed sensitive-data classification service for S3 content."],
 ["Use S3 Inventory to list object metadata and treat large objects as sensitive by default.","Inventory provides object metadata but does not inspect contents for PII or other sensitive-data patterns."]]],
[/Use AWS CloudTrail\.?$/i,[
 ["Use AWS Config as the complete record of every AWS API call made by users and roles.","Config records resource configuration and changes but is not the primary event history for all management API activity."],
 ["Use CloudWatch metrics to infer who made each management API request.","Metrics aggregate operational values and generally do not provide the principal-level API audit trail required by auditors."],
 ["Use VPC Flow Logs as the account-wide record of AWS control-plane API actions.","Flow Logs capture network flows, not AWS management API calls and identities."]]],
[/CloudTrail data events/i,[
 ["Enable only CloudTrail management events for the account and assume all S3 GetObject calls are included.","Object-level S3 operations are data events and are not covered simply by enabling management-event logging."],
 ["Use S3 server access logging only and treat it as a complete CloudTrail replacement for all required object audit fields.","S3 access logs can provide request records, but CloudTrail data events are the direct AWS API audit feature requested for object-level activity."],
 ["Enable AWS Config recording on the bucket to capture each GetObject and PutObject call.","Config tracks resource configuration, not individual S3 object data-plane API requests."]]],
[/Use AWS Secrets Manager/i,[
 ["Store the password in Systems Manager Parameter Store as a plain String parameter and implement rotation manually.","Parameter Store can hold configuration and SecureString secrets, but a plain String is inappropriate and automatic database-secret rotation is a Secrets Manager strength."],
 ["Encrypt the password with KMS and store the ciphertext directly in the Glue source repository.","KMS can encrypt the value, but embedding ciphertext in source still creates custom retrieval and rotation management."],
 ["Store the secret in a Lambda environment variable shared by all pipeline jobs.","Environment variables can be encrypted, but they are not a centralized rotation-oriented secret store for multiple consumers."]]],
[/service control policy/i,[
 ["Attach an IAM deny policy to the administrators in each member account and rely on account owners not to remove it.","Local administrators with sufficient permissions can change local IAM policies; an SCP provides an organization-level permissions boundary."],
 ["Create an AWS Config rule that detects CloudTrail being disabled and rely on remediation after the fact.","Config can detect or remediate noncompliance, but it is detective/corrective rather than the preventive organization-level guardrail requested."],
 ["Use a permissions boundary only on newly created IAM roles.","Permissions boundaries apply to identities that use them and do not by themselves set an organization-wide maximum for all principals in member accounts."]]],
[/S3 Object Lock/i,[
 ["Enable S3 Versioning and rely on users not to delete object versions during the retention period.","Versioning preserves versions but authorized users can still delete versions unless stronger retention controls are applied."],
 ["Use lifecycle rules to transition objects to Glacier and assume archival storage prevents deletion.","Storage class does not by itself enforce WORM retention against authorized deletion."],
 ["Enable MFA Delete as the only retention mechanism for a regulatory WORM requirement.","MFA Delete adds protection for certain versioning operations but is not equivalent to Object Lock retention modes designed for WORM controls."]]],
[/aws:SourceVpce/i,[
 ["Restrict the bucket policy by the private IP addresses currently assigned to the workloads.","Workload private IPs can change and S3 bucket policies do not use those VPC private addresses as a robust substitute for VPC endpoint conditions."],
 ["Allow the whole VPC CIDR in the bucket policy and assume that proves requests traversed the intended S3 endpoint.","A CIDR condition does not directly assert that the request came through the specific VPC endpoint required by the policy."],
 ["Use an IAM policy condition on the EC2 instance type instead of the network path.","Instance type does not establish that S3 requests originated through the required VPC endpoint."]]],
[/S3 Access Point/i,[
 ["Create a separate copy of the shared bucket for each application and synchronize objects between buckets.","This duplicates data and operational work instead of providing application-specific access policies over the same dataset."],
 ["Use one bucket policy with a growing set of application-specific statements and no dedicated access endpoint.","A bucket policy can implement access, but Access Points are specifically designed to simplify distinct application access patterns for shared buckets."],
 ["Create a CloudFront distribution for each internal application and use cache behaviors as the authorization boundary.","CloudFront is a content-delivery service and does not replace S3 Access Point policies for application-scoped data access."]]],
[/IAM Access Analyzer/i,[
 ["Use AWS Config to list resources that changed recently and assume a recent change means external access.","Configuration history is useful, but Access Analyzer specifically reasons about resource policies and external principals."],
 ["Use Trusted Advisor only to identify all possible cross-account resource-policy access paths.","Trusted Advisor provides best-practice checks but is not the dedicated policy-analysis engine for external access findings."],
 ["Review IAM users manually and ignore resource-based policies on S3, KMS, and other services.","External access can be granted through resource policies even when IAM user lists look normal."]]],
[/workgroup result encryption/i,[
 ["Encrypt only the source S3 dataset and leave the Athena query-result location without an enforced encryption setting.","Source encryption does not automatically guarantee that query result objects use the required encryption configuration."],
 ["Rely on each analyst to select an encryption option manually for every query.","Per-user manual configuration is inconsistent; workgroup enforcement provides centralized control."],
 ["Require HTTPS for Athena API calls but do not configure result encryption at rest.","TLS protects data in transit and does not replace encryption of result objects stored in S3."]]],
[/dynamic data masking/i,[
 ["Create separate physical copies of the table with pre-masked data for every user group.","This duplicates data and creates synchronization overhead that policy-based masking avoids."],
 ["Use a column-level GRANT that either reveals the original value or blocks the entire column for every user.","Column permissions can hide a column, but they do not provide the requirement to return a masked representation to authorized users."],
 ["Encrypt the column with KMS and give all querying users the same decrypt permission.","Encryption protects storage, but users with decrypt permission would still see the original value rather than a policy-based masked representation."]]],
[/KMS decrypt permission/i,[
 ["Grant s3:GetObject and assume S3 authorization automatically grants kms:Decrypt on the object's KMS key.","S3 and KMS evaluate separate permissions; S3 access alone does not imply permission to use the KMS key."],
 ["Add kms:Decrypt to the IAM policy but keep a KMS key policy that does not allow the principal or its account to use the key.","KMS authorization also depends on the key policy; an identity policy alone may not be sufficient when the key policy does not establish access."],
 ["Change the object's S3 storage class from Standard to Intelligent-Tiering.","Storage class has no effect on KMS decryption authorization."]]]
];
function applyRule(q){
  if(q.id<=65||q.correct.length!==1||q.difficulty==="Easy")return;
  const correct=q.choices[q.correct[0]];
  for(const [re,alts] of rules){
    if(re.test(correct)){
      q.choices=[correct,...alts.map(x=>x[0])];q.correct=[0];q.why=[q.why[q.correct[0]]||`Correct: ${q.explanation}`,...alts.map(x=>x[1])];
      return;
    }
  }
}
(window.QUESTIONS||[]).forEach(q=>{
  q.prompt=(q.prompt||"").replace(/\s*\[Scenario \d+\]\s*$/i,"");
  applyRule(q);
  if(q.id>65&&q.difficulty==="Hard"&&!/Choose the BEST answer/i.test(q.prompt)) q.prompt += " Consider the operational trade-offs carefully and choose the BEST answer.";
});
})();