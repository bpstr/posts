---
title: "Why Is the Sky Blue? A Better Test for a Thousand-Agent Idea"
pubDate: 2026-10-05
description: "Extending the MAS research with MacNet's runner, internal delegation, binary communication, shared state, cognitive prompt processing, and an evidence graph—using a simple question instead of a generated game."
author: "bpstr"
tags: [multi-agent-systems, agentic-development, macnet, architecture, research]
---

A thousand agents should be able to answer a simple question. The more interesting test is whether they know when one good answer is enough.

For the next step in the [evidence-driven multi-agent research](/evidence-driven-multi-agent-systems), I am replacing the game-building demonstration in our discussion with a question whose basic answer we can inspect:

**Why is the sky blue?**

Not “write a program that explains the sky.” Not “build a physics simulator.” Just explain the phenomenon, accurately and clearly, with evidence.

The point is to expose the machinery: how the request becomes inquiries, how an agent asks another agent for help, which state is shared, and what happens when a convincing explanation contains a mistake. The [technical research extension](https://github.com/bpstr/posts/blob/main/research/macnet-cognitive-coordination.md) contains the source audit, state contracts, and experiment design. No thousand-agent inference experiment has been run for this article.

## MacNet makes the question concrete

[MacNet](https://arxiv.org/html/2406.07155v3) is relevant prior work, not just a name for a hypothetical swarm. Its study describes DAG-organized collaboration at thousand-agent scale. That does not establish that the public runner launches a thousand simultaneous workers or that such a population is useful for every question.

I inspected the [`macnet` implementation at a fixed revision](https://github.com/OpenBMB/ChatDev/tree/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63). Its graph generator, execution loop, prompts, and output handling give us specific implementation boundaries to work from.

The [`run.py` default](https://github.com/OpenBMB/ChatDev/blob/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63/run.py) asks for a Gomoku game. Changing that string is not enough. The [configuration](https://github.com/OpenBMB/ChatDev/blob/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63/config.yaml) still asks for Python files, while the [execution path](https://github.com/OpenBMB/ChatDev/blob/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63/graph.py) parses code, merges programs, and can execute generated code for feedback.

A proper explanation example needs text artifacts, explanation-oriented prompts, claim checking, and an answer file. It also needs the compiler path removed or disabled in code. A prompt saying “do not execute anything” is not the same protection.

Our replacement is therefore an explicit text-task adaptation, not a claim that an unchanged upstream command already supports it. The [MacNet reference](https://github.com/bpstr/agentic-development/blob/main/infrastructure/orchestration/frameworks/macnet.md) identifies the required changes.

## Start with one question, not a thousand essays

The original request is stored unchanged. An interpretation record adds the working scope: Earth's clear daytime sky, an ordinary observer, and a short accessible explanation. The system must retain that these are assumptions, not words the user necessarily supplied.

Several initial inquiries could proceed independently. One checks what sunlight contains. Another investigates scattering by air molecules. Another checks common explanations for factual shortcuts. Their outputs need not be complete answers. A useful output could be a supported claim, a missing assumption, or a question for another pathway.

[NASA's introductory explanation](https://spaceplace.nasa.gov/blue-sky/en/) supplies a straightforward foundation: sunlight contains different colours, and shorter-wavelength light is scattered more strongly by air molecules than longer-wavelength red light. Blue light reaches our eyes from many directions across the sky.

Now suppose an investigator writes, “The sky is blue because blue is the shortest wavelength.” That is not an acceptable simplification. A checker can flag the violet counterexample and ask a colour-perception inquiry to investigate the missing qualification. It should not invent a detailed answer simply to finish the debate.

This is the kind of branching I want to investigate: an agent discovers a specific gap and delegates a bounded question. It does not create another agent merely because the configured maximum has not been reached.

## Delegation should carry a question and its boundaries

An internal delegation record might say: investigate whether the scattering explanation accounts for perceived colour; use these source references; preserve this task revision; return a checked claim or an unresolved issue; consume this reserved budget.

That is more useful than copying the entire conversation and saying “you are the optics expert.” The proposed contract makes purpose, evidence, authority, and completion visible to the runtime.

The recipient can be a local object, a worker in another process, or an independently hosted agent. Those are deployment choices, not different levels of intelligence. [A2A already defines multiple transport bindings](https://a2a-protocol.org/latest/specification/), including gRPC, while [Protocol Buffers](https://protobuf.dev/programming-guides/proto3/) supplies a binary serialization format for typed records.

Binary communication is worth measuring for serialization and network overhead. It does not magically transmit an abstract concept into another model's hidden state. The receiver still has to decode the record and construct useful model context. Sending fewer bytes and asking the model to read fewer tokens are separate improvements.

## Shared state must preserve disagreement

The tempting shortcut is one shared answer that every worker keeps improving. I would avoid it as the primary record. Which worker wins when two updates arrive together? What happens when an old task resumes? Where does the rejected explanation go?

Instead, the proposed system keeps private inquiry state separate from a shared claim ledger. Each claim retains its evidence and revision. A correction supersedes an earlier claim rather than deleting the history. A source change invalidates the findings that depended on it, not every unrelated inquiry.

A separate coordination ledger owns leases, budgets, and cancellation. Claiming a task requires an atomic operation; writing an identifier into a prompt does not reserve anything. Checkpoints and receipts make it possible to distinguish a worker that never started from an operation that completed before its acknowledgement was lost. [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence) is one concrete reference for persisted execution state, not a substitute for designing these rules.

A renderer eventually turns accepted claims into prose. It does not get special authority to settle a disputed scientific point merely because it writes last. Scheduling ownership and intellectual authority are different responsibilities.

## A shared graph should answer useful questions

There are several graphs here, and mixing them together would hide important distinctions.

The domain graph relates concepts such as light, wavelength, scattering, and observation. The inquiry graph records who is investigating what. The evidence graph records which source supports or contradicts a claim. The communication graph records subscriptions and deliveries.

Only the last graph says a message arrived. Arrival is not verification.

A worker should be able to ask, “Which claims depend on this source?” or “Has anyone checked this objection independently?” Those queries justify explicit relationships. Ten copies of the same passage should not look like ten independent pieces of evidence. [W3C's provenance model](https://www.w3.org/TR/prov-o/) offers vocabulary for keeping derivation visible.

The graph is not a shared mind. It is an inspectable record that helps the next inquiry retrieve relevant evidence without importing every earlier conversation. Its ingestion, permission checks, correction handling, and retrieval quality still need to be engineered.

## Cognitive processing means changing the work, not pretending to be a brain

In this proposal, cognitive prompt processing means preserving intent, selecting context, identifying uncertainty, creating inquiries, requesting checks, and revising the work as evidence arrives. A pathway can finish with “this is already established” or “this remains unresolved.” It does not owe us another essay.

[CoALA](https://arxiv.org/abs/2309.02427) provides a useful research framework for language-agent memory, actions, and decisions. Structured reasoning research also offers [tree](https://arxiv.org/abs/2305.10601) and [graph](https://arxiv.org/abs/2308.09687) approaches to exploring intermediate results. Those precedents do not prove that the proposed combination improves answers; they help identify which mechanisms to test.

Work sharing should reduce needless duplication without suppressing replication. Two agents independently checking the same claim may be exactly what catches an error. A temporary reservation can discourage duplicate retrieval, but the first confident answer must not be allowed to terminate all objections.

## What the thousand-agent experiment would actually test

The [public generator](https://github.com/OpenBMB/ChatDev/blob/e7a35824fd683ffe8fc237e28ecc47d7b1a5da63/generate_graph.py) can describe a thousand-node topology. That is different from a thousand simultaneously active requests. A large logical population can use a smaller serving pool, and many pathways may remain paused or never be admitted.

For this sky question, forcing every slot to produce text would defeat the point. A competent single-agent answer is a strong baseline. A useful adaptive system might identify a missing qualification, verify it, and stop after a few inquiries.

The proposed evaluation separates three questions: does coordination improve the answer, can the runtime manage a large population safely, and does binary transport make communication cheaper? A successful synthetic scheduling test answers only the second. Lower network traffic answers only part of the third.

The answer-quality experiment needs held-out problems, unfamiliar evidence, matched resource limits, and comparisons against independent candidates with a verifier. It must count failed attempts, duplicated evidence, extra reading, and synthesis costs—not just the final successful calls.

For the simple demonstration, the acceptance criteria are deliberately ordinary: explain molecular scattering, do not blame the ocean, do not claim blue is the shortest visible wavelength, do not confuse scattering with absorption, and do not turn the response into software. Where an additional qualification is not verified, retain the uncertainty rather than inventing it.

The ambitious idea survives this simpler example. What changes is the success condition.

**Not “we ran a thousand agents,” but “the system found what was missing, checked it, shared it with the right inquiry, and stopped when the answer was sufficient.”**
