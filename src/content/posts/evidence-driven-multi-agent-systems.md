---
title: "From Agent Swarms to Evidence-Driven Multi-Agent Systems"
pubDate: 2026-10-05
description: "A practical reformulation of distributed micro-agents: independent exploration, selective communication, verifiable findings, and a cost model that does not depend on brain metaphors."
author: "bpstr"
tags: [multi-agent-systems, agentic-development, architecture, verification]
---

A hundred agents agreeing on a broken patch have not made the patch correct. A single agent producing a reproducible counterexample may be more useful than the entire conversation.

That is the distinction I want at the center of multi-agent design: **more independent evidence, not merely more participants.**

The [original proposal](/distributed-micro-agents-original-proposal) imagined hundreds or thousands of specialized reasoning streams, exchanging discoveries and combining their work. There is a worthwhile engineering hypothesis here. The comparisons to cortical columns and synthetic neurogenesis are not necessary to make it interesting.

My revised hypothesis is narrower and testable:

> For tasks with separable uncertainties, a bounded network of specialized agents may produce better verified outcomes than a single agent or an independent ensemble, provided its additional evidence outweighs the cost of coordination.

This is a proposed design, not a measured result. The [claim-by-claim fact-check](https://github.com/bpstr/posts/blob/main/research/multi-agent-systems-fact-check.md) separates the original's supported observations, overstatements, and speculation. A [technical MAS reference](https://github.com/bpstr/agentic-development/blob/main/infrastructure/orchestration/multi-agent-systems.md) develops the implementation boundaries.

## Keep the architecture. Loosen the brain analogy.

The [global neuronal workspace model](https://pubmed.ncbi.nlm.nih.gov/9826734/) describes specialized processors and broader information availability through a distributed workspace. That can inspire an engineering design with local workers and selective broadcasting. It does not establish that an agent graph implements biological cognition.

Nor is the neuroscience settled in the way the original suggests. A [2025 adversarial collaboration](https://pmc.ncbi.nlm.nih.gov/articles/PMC12137136/) found support for some predictions of global neuronal workspace and integrated information theories while challenging important predictions of both. This is not evidence that either theory is wholly false; it is a reason not to treat a loose software analogy as a demonstrated scientific equivalence.

Creating another agent session does not create neurons or establish consciousness. Retiring an unhelpful worker is a scheduling decision, not evidence of biological synaptic pruning. An aggregator is not a prefrontal cortex because it writes the final answer.

There is also no need to describe an ordinary transformer response as one static forward pass. [Autoregressive generation](https://arxiv.org/html/1706.03762v7) repeatedly conditions on preceding tokens. An agent network changes the surrounding computation and information flow; it need not change the model's weights or internal architecture.

## Specialize the work, not just the persona

Consider an illustrative investigation of stale data appearing after navigation. Instead of creating twenty variations of a “senior engineer,” assign distinct questions.

One worker reconstructs the state-transition sequence. Another searches for counterexamples to the suspected race condition. A third examines the API contract and ordering guarantees. A fourth designs a regression test. Each starts from the same versioned task specification, but receives the evidence and tools appropriate to its question.

These approaches are deliberately different; they are not mathematically orthogonal. Separate prompts do not guarantee independent errors.

Even a single model can generate multiple candidate paths. [Self-consistency](https://arxiv.org/abs/2203.11171) demonstrated that useful diversity can come from repeated sampling and aggregation without a communicating agent society. That is a baseline a more elaborate system must beat.

My proposed default is therefore **independent exploration first, targeted exchange second**. Workers record their initial findings before seeing peer conclusions. Only a contradiction, missing dependency, or reusable discovery should trigger additional communication. The purpose is to preserve opportunities for independent discovery without forbidding useful collaboration.

## Make disagreement actionable

An agent should return a finding that another worker can inspect, not a persuasive paragraph that becomes accepted through repetition.

For the navigation example, a useful finding would identify the affected code revision, the events needed to reproduce the issue, the observed state, and a test that distinguishes the proposed cause from alternatives. A useful objection would show where that explanation fails.

The resulting loop is simple:

```text
Versioned task and acceptance criteria
    → bounded independent investigations
    → candidate findings with evidence references
    → targeted challenges to disputed claims
    → verification against tests, sources, or explicit criteria
    → synthesis that preserves unresolved disagreements
```

This is an application workflow, not an A2A wire format or a claim about cognition.

There is evidence that debate can help: [Du and colleagues](https://arxiv.org/abs/2305.14325) reported improvements on their reasoning and factuality tasks. But [Debate or Vote?](https://arxiv.org/abs/2508.17536) found that majority voting explained most of the gains in its seven-benchmark evaluation. Neither result establishes a universal winner.

The design implication is to test what the conversation contributes beyond extra attempts. Did a challenge reveal a new failing test? Did a worker retrieve a missing source? Or did several agents merely adopt the most confident answer?

Consensus can be an output policy. It is not a correctness oracle. Tests can also be incomplete, and model-based judges can share the errors of the agents they judge. Keep that uncertainty in the result.

## Use a sparse network with an explicit owner

The original contrasts decentralized agents with a master-worker hierarchy, then introduces an aggregation layer. In practice, I would start with a hybrid: specialists can exchange relevant evidence, while a small control plane enforces budgets, permissions, termination, and ownership of consequential changes.

That control plane need not be another language model. Admission checks, task identifiers, deadlines, message validation, and write authorization can be ordinary application code.

Workers publish bounded findings to a shared evidence store. Findings reference immutable artifacts rather than copying the entire discussion. Subscriptions route them to relevant workers. Hypotheses remain distinguishable from checked observations, and both retain their source revision.

A graph is useful when relationships such as “contradicts,” “depends on,” or “supersedes” answer real queries. It is not a prerequisite. A small system may need only ordinary records, an event log, and artifact storage. A vector index can help retrieval, but similarity does not validate a claim.

For code changes, give each candidate an isolated branch or worktree and one authorized integration path. An agent message must not silently widen permissions or overwrite another candidate. Process cancellation, stale-result rejection, and duplicate-delivery handling belong in the runtime, not in an appeal to the agents to behave responsibly.

## Count messages, tokens, and elapsed time separately

The original's claim that 200 agents necessarily multiply cost and latency exponentially is incorrect.

Assume a fixed population of `N` agents, `R` rounds, one inference call per agent per round, and bounded request sizes. There are `N × R` worker calls, plus routing, verification, and synthesis. That is linear in each variable, not exponential.

Communication can still become expensive. If each agent sends one message to every other agent per round, there are `N × (N - 1)` directed deliveries. With 200 agents, that is 39,800 deliveries. Limiting each agent to three recipients gives at most 600 peer deliveries under the same one-message-per-edge assumption, excluding separate control and aggregation traffic.

Those are illustrative counts, not measured performance gains. A sparse graph may need more rounds to propagate evidence, and a shared broadcast service still pays for delivery to its subscribers.

Token cost depends on what each call actually reads and produces. Replaying every transcript makes the bounded-context assumption false. Small messages on the wire can still become large repeated model inputs.

Elapsed time is different again. With enough serving capacity, independent calls overlap; dependent rounds, tool waits, verification, and synthesis remain on the critical path. With limited capacity, queues and contention dominate. Unbounded recursive task spawning can grow exponentially with depth, but that is a separate execution policy—not an inherent property of MAS.

This is why I would budget active calls, cumulative tokens, outgoing deliveries, context size, tool attempts, and elapsed time independently.

## Lightweight agents do not require a new brain-like protocol

An agent can be a small logical state record rather than a dedicated process or model replica. Many agent states can share a model-serving pool. Active contexts still consume resources: the [PagedAttention work](https://arxiv.org/abs/2309.06180) explains why inference-time key-value cache management matters to serving throughput.

Small, distilled, or quantized models are candidates to benchmark, not prerequisites for the architecture. A cheap worker that creates many invalid candidates can make the complete system more expensive to verify. Compare cost per accepted outcome, including failures and retries, rather than cost per model call alone.

The communication premise also needs updating. The [A2A specification](https://a2a-protocol.org/latest/specification/) already defines JSON-RPC, gRPC, and HTTP+JSON bindings. Binary serialization changes transport; it does not give a receiving model direct understanding of arbitrary hidden-state vectors or reduce the semantic evidence it must process.

Existing frameworks are not limited to heavy role-play. [AutoGen Core](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/index.html) documents actor-style agents and asynchronous messaging. [CrewAI Flows](https://docs.crewai.com/en/concepts/flows) supplies stateful, event-driven control flow. [LangChain's multi-agent documentation](https://docs.langchain.com/oss/python/langchain/multi-agent) describes context isolation, routing, and custom LangGraph workflows. These are implementation options, not proofs of a quality advantage.

## Make scale earn its place

Thousand-agent collaboration is not an entirely new proposal. [MacNet](https://arxiv.org/abs/2406.07155) studied collaboration networks extending beyond a thousand agents, organized as directed acyclic graphs. That is prior art for scale—not evidence that a thousand simultaneously active, asynchronously negotiating workers are the best production design.

More recent [agent-scaling research](https://arxiv.org/abs/2512.08296) found that outcomes depended on the task and coordination architecture, with negative results as well as gains. Its observations are evidence about the evaluated configurations, not universal thresholds for choosing an agent count.

For a first experiment, I would compare one competent agent, independent candidates with a verifier, a small specialist team, and the same team with targeted debate. Keep tools, task information, acceptance criteria, and total resource limits comparable. Also compare systems at matched output quality; equal token budgets are not equal hardware cost when models differ.

Try small populations before large ones. Measure accepted outcomes, regressions, unsupported claims, time to a verified result, resource consumption, and coordination failures. Record whether disagreement uncovered anything new.

If a larger network beats those baselines reproducibly, it has earned more capacity. If the improvement disappears once the simpler baseline gets the same budget, the additional architecture has not justified itself.

The interesting frontier is not making software sound like a brain. It is learning **which additional computation actually changes what the system can reliably establish**.
