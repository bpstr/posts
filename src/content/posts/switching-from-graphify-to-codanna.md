---
title: "Why I'm Switching from Graphify to Codanna"
pubDate: 2026-09-10
description: "Moving local code intelligence to Codanna for a growing codebase, with honest first-index observations and a focus on useful agent context."
author: "Jani Fent"
tags: [ai, codanna, graphify, developer-tools]
---

[Graphify](https://github.com/Graphify-Labs/graphify) appealed to me because I wanted coding agents to understand a codebase, not rediscover it through endless searches.

But as Assign grew, my Graphify setup became slow and unreliable enough to interrupt development. There are now roughly **5,500 indexable files**, alongside hundreds of Markdown architecture documents, briefs, and roadmaps.

The tool meant to help understand the project was becoming another thing to troubleshoot.

So I'm switching local code intelligence to **Codanna**. This is a migration in progress, not a benchmark victory announcement.

## Why Codanna

[Codanna](https://github.com/bartolli/codanna) is a Rust-based local code-intelligence tool with a CLI and persistent MCP server. It combines symbol search, semantic retrieval, call relationships, and change-impact analysis.

The interesting part is not just Rust. Its contextual search can return a symbol's signature, documentation, callers, callees, and impact information together. That is closer to what I need an agent to understand before changing code than another list of matching filenames.

For Assign, [document retrieval](https://docs.codanna.sh/features/document-search) was another deciding factor. Architecture lives in Markdown as much as in source code. Codanna can index those files into searchable collections:

```bash
codanna documents add-collection architecture ./architecture
codanna documents index --collection architecture
```

That is a separate setup step: finishing the code index does not automatically make all architecture documents searchable.

## The first index is not free

The initial local embedding pass is still running as I write this. It is making progress, but my Mac has become unpleasantly slow during indexing.

At one checkpoint, the process was using roughly **240% CPU**, with about **66 MB of index data** written. Those are observations from an unfinished run, not a completed benchmark. The disk figure says nothing about resident memory.

Choosing a Rust implementation does not establish that the whole workload will use less memory. Parsing, embedding inference, and serving queries are different costs. Codanna also supports an [external embedding backend](https://docs.codanna.sh/features/semantic-search), but I have not tested that path yet.

The real question is how it behaves after bootstrap, during ordinary development.

## Code intelligence is not agent memory

I am replacing my local retrieval setup, not assuming every Graphify capability has a Codanna equivalent.

Finding relevant code and documentation is one job. Remembering why we rejected an approach, what a previous agent verified, or where an interrupted task stopped is another.

I still want explicit, durable records for decisions and task checkpoints. A searchable specification is not proof that its implementation exists.

## Better context, fewer reminders

The next integration step is to make retrieval feel natural in my Codex workflow.

I do not want every request to start with “please call the MCP server.” My goal is a small integration layer that supplies relevant code, documents, and task context when useful, while leaving deeper exploration available to the agent.

That is planned work, not something installing Codanna has magically completed.

## What will make the switch worthwhile

I will judge this by warm query latency, idle and peak memory across all related processes, incremental updates, and retrieval accuracy on questions I already know the answers to. Handling file deletions and branch changes correctly matters too.

The goal is not a more impressive index.

**It is an agent that understands the next change without making the developer wait.**
