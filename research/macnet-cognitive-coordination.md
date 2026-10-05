# From MacNet to adaptive cognitive coordination

Research extension, 2026-10-05. This develops the [evidence-driven MAS proposal](../src/content/posts/evidence-driven-multi-agent-systems.md), with a [plain-language sky-blue walkthrough](../src/content/posts/why-is-the-sky-blue-a-macnet-research-example.md). The [original proposal](../src/content/posts/distributed-micro-agents-original-proposal.md) remains unchanged.

**Evidence boundary:** the MacNet paper and a pinned public implementation were inspected. No MacNet inference run, thousand-agent deployment, transport benchmark, or Cognitive Mesh performance experiment was performed. The architecture below is a research proposal, not a description of capabilities already implemented by MacNet.

## What the MacNet experience contributes

The [MacNet paper, revision 3](https://arxiv.org/html/2406.07155v3), organizes collaboration as a directed acyclic graph. Actors occupy nodes, critics occupy edges, and refined artifacts move forward instead of complete conversations. The authors report collaboration beyond a thousand agents, topology-dependent results, and saturation in their scaling experiments. These are results for the studied configurations, not a universal agent-count prescription.

The most useful engineering question is what to retain and what to change. Retain explicit dependencies and bounded artifact exchange. Investigate replacing fixed traversal with selective, evolving inquiries, while preserving recoverability and independent verification. That is an extension of the design, not a newly discovered MacNet feature.

### Paper, public runner, and proposed system are different objects

The source audit uses [OpenBMB/ChatDev at `e7a35824fd683ffe8fc237e28ecc47d7b1a5da63`](https://github.com/OpenBMB/ChatDev/tree/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63), the inspected `macnet` branch revision. It includes changes made after the paper revision, so the checkout must not be treated as an exact reproduction package for every reported experiment.

| Capability | What the inspected public path establishes | Proposed extension |
| --- | --- | --- |
| Graph construction | `generate_graph.py` produces configurable DAGs; `graph.py` adds boundary nodes. | Register logical inquiries separately from serving capacity. |
| Execution | `Graph.execute` invokes optimization in synchronous nested loops. | A bounded ready queue, concurrent workers, and explicit completion barriers. |
| Delegation | Local function calls follow graph edges. | Dynamic child inquiries with scoped authority, budgets, and cancellation. |
| Communication | Code artifacts and suggestions pass through objects and local files. | Typed internal messages; optional Protobuf/gRPC across process boundaries. |
| State | Node solutions, predecessor solutions, and filesystem logs. | Versioned task and claim records, leases, checkpoints, and recovery receipts. |
| Shared knowledge | Predecessor artifacts are available to downstream processing. | A provenance-aware claim graph with selective retrieval and correction. |
| Default task | Software generation and code aggregation. | Explanatory prose with evidence references and no generated-code execution. |

Source locations: [`run.py`](https://github.com/OpenBMB/ChatDev/blob/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63/run.py), [`generate_graph.py`](https://github.com/OpenBMB/ChatDev/blob/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63/generate_graph.py), [`graph.py`](https://github.com/OpenBMB/ChatDev/blob/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63/graph.py), and [`config.yaml`](https://github.com/OpenBMB/ChatDev/blob/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63/config.yaml). These observations concern this execution path, not every experiment or later implementation bearing the MacNet name.

## What a thousand-agent runner must count

A graph parameter, a logical agent, a live request, and a model replica are separate quantities. The paper's conceptual actor-plus-critic count is `|V| + |E|`; `--node_num` in the public generator counts graph nodes.

For the inspected generator's 1,000-node binary tree, arithmetic gives 999 original edges. The runner adds an input node and an output node, connecting the original root and 500 leaves: 1,002 runtime `Node` objects and 1,500 edges. Before those boundary additions, the paper's counting convention would assign 1,999 actor/critic roles. None of these numbers is the actual number of inference calls or concurrent requests; review, aggregation, retries, and transient agent construction affect that accounting.

The generator's `net` topology is also a DAG: it inserts only `u < v` edges. At 1,000 nodes this means 499,500 edges, not the 999,000 deliveries in a bidirectional all-to-all round. Always identify the graph and execution assumptions behind a complexity claim.

For the proposed runner, record at least:

- registered, admitted, ready, running, blocked, completed, cancelled, and failed logical inquiries;
- actual model calls, retries, peak concurrent calls, context tokens, generated tokens, and model versions;
- delivered messages and bytes, artifact reads, storage growth, queue waits, and time to a verified answer.

A population limit of 1,000 and an active-call limit of 16 would be two independent configuration choices, not evidence of an optimal setting. A system can retain many paused pathways while admitting few requests. On shared hardware, concurrency still competes for compute and per-request state; [PagedAttention](https://arxiv.org/abs/2309.06180) is relevant serving research, not a guarantee that arbitrarily many active contexts are cheap.

The scheduler should reserve resources before dispatch, cap branch depth and cumulative work, and join or cancel children explicitly. A child must consume its parent's remaining authority and run budget rather than acquire a fresh unlimited budget. Admission must be transactional under concurrent delegation. Large, small, local, remote, and mixed model pools remain legitimate experimental choices.

## Internal delegation and binary communication

Use native typed objects within a process when that is sufficient. At a process boundary, [Protocol Buffers](https://protobuf.dev/programming-guides/proto3/) can serialize application records and [gRPC](https://grpc.io/docs/what-is-grpc/core-concepts/) can provide request, response, and streaming operations. At an interoperability boundary, the [A2A specification](https://a2a-protocol.org/latest/specification/) already includes a gRPC binding alongside its other bindings. A private worker bus does not need an A2A server for every local inquiry.

A minimal internal contract needs a run ID, message ID, parent inquiry, recipient, task revision, evidence snapshot, purpose, deadline, and budget reservation. For example, this is a **proposed application record, not an A2A wire object**:

```json
{
  "schema_version": 1,
  "message_id": "msg-24",
  "run_id": "sky-001",
  "parent_inquiry_id": "scattering",
  "recipient_inquiry_id": "colour-perception",
  "operation": "investigate",
  "task_revision": 1,
  "evidence_snapshot": "snapshot-7",
  "question": "Does wavelength-dependent scattering alone explain the perceived colour?",
  "evidence_refs": ["claim:short-wavelengths", "source:nasa-sky"],
  "budget_reservation_id": "reservation-24",
  "deadline_unix_ms": 1791205200000
}
```

The deadline is illustrative, not a scheduled operation. Authentication supplies the actual sender and tenant; identifiers inside a payload do not grant permission. The receiver resolves artifact references under that authority. The reservation is validated against the authoritative ledger, not trusted because the message contains its ID.

Distinguish transport receipt, task admission, and verified completion. Retries need stable operation IDs and duplicate handling. Apply size limits, deadlines, queue backpressure, schema compatibility rules, and cancellation propagation. gRPC flow control is not a replacement for a run-wide inference budget. Peer messages remain untrusted data, even when the sender is another approved agent.

Binary transport does not bypass prompt construction. A worker decodes a record, retrieves authorized evidence, and builds model-readable context. Lower wire size does not imply fewer model input tokens. Embeddings are useful retrieval representations; exchanging arbitrary latent states between different models requires an explicitly compatible learned interface and separate validation. This proposal does not assume such an interface exists.

[AutoGen's distributed runtime documentation](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/framework/distributed-agent-runtime.html) provides an implementation reference for hosted workers and gRPC communication; its experimental status and lifecycle boundaries should be checked before adoption.

## Advanced state management without a shared mutable answer

Separate six stores or logical state classes, even when one database hosts several of them.

| State class | Ownership and consistency requirement |
| --- | --- |
| Original request and constraints | Immutable revisions; a model-generated interpretation cannot silently replace them. |
| Private inquiry state | Local goal, selected context, pending dependencies, and checkpoints; scoped access. |
| Coordination ledger | Authoritative reservations, leases, cancellation, and completion transitions. |
| Shared claim/evidence ledger | Append findings; retain support, objections, source revisions, and verification history. |
| Domain state | Business records and permissions; changes only through authorized application operations. |
| Artifacts and retrieval indexes | Immutable source/output artifacts; rebuildable indexes with explicit freshness. |

Use snapshot reads for a coherent evidence view and conditional updates for conflicting writes. A worker may publish against an expected task revision and lease epoch. A resumed old worker must not overwrite a newer attempt after its lease has expired. Merely storing a version number does not enforce this rule; the mutation boundary must compare it atomically.

Do not reject every result whenever unrelated evidence is added. Track the dependencies a result actually used. A changed user constraint may supersede a whole task, while correction of one source may invalidate only dependent claims. Record that distinction so recovery does not repeatedly restart all 1,000 inquiries.

Persist a dispatch intent before an external effect and its receipt afterward. A transactional outbox can couple a state change to eventual message publication; the consumer still deduplicates delivery. After a crash, an ambiguous timeout must trigger reconciliation, not automatic repetition of a potentially completed effect. Checkpoint model responses, tool receipts, source revisions, and application versions as needed to resume without pretending nondeterministic inference is reproducible by replay alone.

[PostgreSQL's isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html) supplies concrete consistency semantics; [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence) illustrates checkpoints, threads, and stores. Neither makes an arbitrary multi-agent application correct automatically.

[CRDTs](https://arxiv.org/abs/1805.06358) are relevant when replicas must merge updates without coordination. Their convergence properties depend on the chosen data type and update rules. They do not make contradictory scientific assertions jointly true, nor automatically protect budget or authorization invariants. Keep competing claims as competing records; use suitable transactional coordination for scarce reservations and consequential decisions.

## Cognitive prompt processing as an operational design

Here, **cognitive prompt processing** names a proposed application process: turning one request into evolving, evidence-seeking inquiries. It is not a claim about neurons, consciousness, or access to a model's private reasoning.

The input stage preserves the original question, extracts explicit constraints, records uncertain interpretations, and proposes separable inquiries. Each pathway receives a local question and sufficient context, not an instruction to independently write the entire answer. Its useful output may be a source, contradiction, assumption, calculation, dependency request, or justified termination.

A pathway can retrieve more evidence, fork a distinct question, request a check, pause, or finish. New messages enter at a supported decision boundary; an ordinary in-flight generation does not accept arbitrary external changes to its hidden state. The system exchanges short rationale summaries and inspectable evidence, not complete private chain-of-thought transcripts.

[CoALA](https://arxiv.org/abs/2309.02427) provides a framework for memory, action, and decision processes in language agents. [Tree of Thoughts](https://arxiv.org/abs/2305.10601) and [Graph of Thoughts](https://arxiv.org/abs/2308.09687) provide precedents for structured exploration and combination of intermediate results. Search states in those methods are not automatically independently permissioned software agents.

The proposed improvement is selective allocation: dispatch another pathway because it could resolve a specific uncertainty, not because the system has unused agent slots. Preserve an exploration route for concepts absent from the current index. A reference graph can suggest questions; failure to retrieve a node is not proof that a topic is irrelevant.

Temporary work reservations can discourage duplicate searches. They should be scoped, expiring, and reversible, with a separate allowance for independent replication. An early confident claim must not be able to silence its critics. Operational ownership of deadlines and budgets is different from authority to decide what is true.

## Shared knowledge graph: four graphs, not one

Keep the following edge meanings separate, whether stored in different databases or typed within one system:

| Graph | Example relationship |
| --- | --- |
| Reference/domain graph | Atmospheric scattering relates to wavelength and observation geometry. |
| Inquiry graph | The scattering inquiry requested a colour-perception check. |
| Claim/evidence graph | A source supports a claim; an objection challenges it; a revision supersedes it. |
| Communication graph | One worker is subscribed to a topic or received a particular message. |

A delivered claim is not a verified claim. Two connected concepts are not necessarily causally related. A child inquiry is not independent supporting evidence merely because it has a new ID.

Ingestion should preserve the source and its version, extract candidate claims, resolve entity identities conservatively, attach provenance, validate permitted schema transitions, and only then update derived indexes. Record supporting passages, assumptions, authoring activity, and relevant time information. [W3C PROV-O](https://www.w3.org/TR/prov-o/) offers useful provenance vocabulary; provenance explains derivation, not factual validity.

Retrieval begins with the current task, access scope, and evidence revision. Find candidate entities or claims through lexical/vector search, expand a bounded set of relevant edges, and fetch the underlying passages before constructing context. Include unresolved contradictions and source corrections when relevant. Entity summaries must remain traceable to sources. A repeated claim copied by ten workers still has one underlying source unless independent evidence was obtained.

On source correction or deletion, traverse derivation links to mark affected claims, summaries, and caches stale; preserve necessary audit history within retention policy. Permission changes must propagate to retrieval and derived content, not merely to the original document. Track event sequence or revision lag so a worker knows when an index trails the authoritative ledger.

A graph database is optional. Relational records can implement these semantics; [Spanner Graph](https://cloud.google.com/spanner/docs/graph/overview) is one possible graph-capable backend. Storage selection should follow query, consistency, isolation, and operational requirements. Neither a vector index nor graph storage by itself is a correctness mechanism.

## Replace the game example with an explanatory task

The research example is now **“Why is the sky blue?”**, scoped to Earth's clear daytime sky and an accessible explanation. It is deliberately not a software-generation request.

The upstream default cannot be adapted correctly by replacing just the CLI task string. `config.yaml` requires Python code; `agent_deployment` hardcodes a programmer persona in the default path; `Codes` parses code blocks; aggregation expects programs; the compiler branch can execute generated `main.py`; final output writes code files. A text adapter must change all those paths, disable generated-code execution structurally, and emit `answer.md` plus evidence records. The [MacNet technical entry](https://github.com/bpstr/agentic-development/blob/main/infrastructure/orchestration/frameworks/macnet.md) maps those changes to source locations. This research does not claim that adapter has been implemented upstream.

An illustrative execution starts with independent inquiries into sunlight, atmospheric scattering, and common misconceptions. A scattering finding can trigger a targeted question about colour perception: does the simple explanation incorrectly imply that blue is the shortest visible wavelength? The new inquiry returns a correction or a source requirement rather than an entire competing essay. A source checker verifies the causal claim; a renderer expresses accepted claims without erasing unresolved qualifications.

[NASA's explanation](https://spaceplace.nasa.gov/blue-sky/en/) supports the introductory answer: sunlight includes different colours, and air molecules scatter shorter-wavelength light more strongly than longer-wavelength red light, sending more blue light toward observers from across the sky. Longer atmospheric paths help explain redder sunsets. For this simple example, the perception question is an explicit additional verification target, not permission to invent a detailed explanation or imply that only blue light scatters.

Use an acceptance rubric: correct daylight setting; molecular scattering rather than ocean reflection; shorter-versus-longer wavelength explanation; no assertion that blue is the shortest visible wavelength; distinguish scattering from absorption; readable prose; source-supported claims. The output is an explanation, not a program.

## Experiments that would change the design

Separate **answer efficacy**, **runtime capacity**, and **transport efficiency**.

For efficacy, compare a competent single agent, independent candidates with a verifier, a fixed artifact-passing DAG, and adaptive inquiries with selective communication. Match available evidence, acceptance criteria, and resource limits; also compare cost at matched quality. Use unfamiliar evidence packets and held-out problems, not only a fact already familiar to most models. Ablate delegation, shared state, graph retrieval, communication, and verification separately.

For capacity, admit up to 1,000 logical inquiries under different active-call caps. Inject worker loss, duplicate delivery, stale lease completion, source retraction, conflicting claims, and cancellation. Synthetic/mock responses can validate scheduling mechanics without inference, but must never be reported as 1,000 reasoning agents successfully answering a question.

For transport, compare identical message contents, delivery guarantees, and workload under JSON and binary encoding. Measure CPU, wire bytes, tail latency, and backpressure independently from model input tokens and answer quality. A serialization win should not be relabelled a reasoning win.

The sky question is an easy negative control: a correct low-cost baseline leaves little room for an expensive mesh to improve. Adaptive early stopping is a useful result, not a failure to exploit all agents. Record unsupported claims, useful new evidence, preserved minority corrections, omissions, cost per accepted answer, and recovery failures. A larger network earns its place only when a measured benefit survives these comparisons.
