---
title: "Understanding Legacy Codebases Before Asking AI to Change Them"
pubDate: 2026-09-06
description: "A practical approach to reconstructing features, flows, settings, UI surfaces, and change maps so coding agents can work from a persistent model of a mature codebase."
author: "Jani Fent"
tags: [ai, architecture, legacy-code, graphify]
image:
  url: "https://images.unsplash.com/photo-1775994121044-247049a5c569?auto=format&fit=crop&w=1600&q=80"
  alt: "Retro computer screen showing source code"
  credit: "Bernd Dittrich"
  creditUrl: "https://unsplash.com/photos/retro-computer-screen-with-coding-text-and-text-SGcXwyLgPEw"
---

Coding agents are getting very good at writing code.

Understanding an unfamiliar codebase is still a different problem.

Give an agent a feature request in a mature repository and it can search for symbols, follow imports, and inspect relevant files. But the difficult questions are usually more conceptual:

- Where does this feature actually begin?
- Which UI surfaces expose it?
- Which setting changes its behavior?
- What happens between an admin changing a value and a user seeing the result?
- Which components are reused elsewhere?
- What will probably break if this logic changes?

That information usually exists in the codebase, but it is distributed across routes, services, components, configuration, events, database models, and tests.

I started building [understand-code](https://github.com/bpstr/understand-code) to reconstruct that missing layer.

## From source code to a Codebase Spec

The goal is not to generate a prettier README.

`understand-code` explores an existing repository and builds a structured Markdown specification describing how the software actually works.

Think of it as automated architecture reconstruction.

Instead of producing documentation for every file, it tries to identify higher-level concepts:

```text
FEATURE
FLOW
ENTRYPOINT
UI_SURFACE
SETTING
DATA_ENTITY
EVENT
PERMISSION
INTEGRATION
```

Then it connects those concepts back to source evidence.

A feature might eventually look like this:

```text
Checkout
 ├─ exposed at → CheckoutPage
 ├─ entered through → POST /checkout
 ├─ implemented by → CheckoutService
 ├─ affected by → guest_checkout
 ├─ writes → Order
 ├─ emits → OrderCreated
 └─ verified by → CheckoutTest
```

This is much closer to the mental model an experienced developer builds when joining an unfamiliar project.

## The interesting part is not dependency mapping

Source graphs are extremely useful, but an import graph alone does not explain product behavior.

Consider a setting like:

```text
Admin → Enable guest checkout
```

Understanding the feature might require following:

```text
Admin UI
  ↓
Settings API
  ↓
workspace settings
  ↓
settings cache
  ↓
checkout policy
  ↓
authentication requirement
  ↓
checkout UI
```

There may be no single source file containing that explanation.

That relationship has to be discovered from multiple pieces of evidence. These are the connections I am most interested in extracting.

## Graphify provides the structural foundation

This project fits particularly well with [Graphify](https://github.com/Graphify-Labs/graphify).

Graphify turns source code into a queryable graph of definitions, calls, imports, and other relationships.

That gives `understand-code` a deterministic structural foundation.

Instead of asking an LLM to repeatedly scan an entire repository, the workflow can look more like:

```text
source code
    ↓
Graphify
    ↓
structural code graph
    ↓
understand-code
    ↓
semantic Codebase Spec
```

Graphify can answer questions such as:

> What calls this service?

> Where is this symbol defined?

> How are these modules connected?

`understand-code` works one abstraction level higher:

> What product feature do these modules implement together?

> Which runtime flow connects them?

> Which settings influence that behavior?

> Where should an engineer start when changing this feature?

The two forms of knowledge complement each other.

## Then index the documentation too

The especially interesting part is the feedback loop.

The generated specification is Markdown, so it can live alongside the source code and be indexed again.

```text
code
 ↓
Graphify
 ↓
Understand Code
 ↓
Markdown Codebase Spec
 ↓
Graphify
```

The resulting knowledge graph can contain both implementation structure and higher-level concepts.

Instead of retrieving ten loosely related code chunks for a task about pricing, an agent could first retrieve:

```text
feature.pricing
flow.price-calculation
setting.tax-display-mode
ui.checkout-price-summary
```

Those concepts then lead back to the exact implementation.

This gives coding agents something much closer to a persistent mental model of the repository.

## Specialized discovery agents

I do not want this to be one giant prompt saying:

> Understand this repository.

The current design uses specialized discovery roles for areas such as:

- repository and framework mapping
- entrypoint discovery
- domain and feature discovery
- UI surface mapping
- runtime flow tracing
- settings and feature-flag tracing
- data lifecycle analysis
- event and background-job analysis
- permissions and integrations
- test evidence
- agent instruction auditing

Deterministic tools should extract facts whenever possible.

LLMs are then used for the part they are good at: recognizing concepts and relationships across those facts.

## Evidence matters

Automatically generated architecture documentation has an obvious danger: plausible explanations that are not actually true.

Findings should therefore carry provenance and confidence.

For example:

```text
EXTRACTED
CORROBORATED
INFERRED
UNKNOWN
```

If code directly proves a relationship, record it.

If implementation and tests both establish a behavior, confidence increases.

If the system can only infer something, say so.

And if the repository cannot answer an architectural question, create a knowledge gap instead of inventing an explanation.

For coding agents, knowing what is unknown can be as valuable as knowing what is known.

## Documentation that helps with the next change

A feature document should not stop at explaining what a feature does.

It should also contain a change map:

```text
Changing totals?
→ start with PricingService

Changing guest access?
→ inspect CheckoutPolicy and guest_checkout

Changing checkout presentation?
→ inspect CheckoutPage and PriceSummary
```

That turns documentation into an index for future engineering work.

## Keeping it alive

Generated documentation is useless if it becomes stale after a week.

`understand-code` is therefore intended to support incremental updates.

After a significant code change, the workflow can compare Git changes with the updated code graph, identify which semantic entities may have changed, and rediscover only those areas.

A seven-line feature-flag change may be more important than a two-thousand-line formatting change, so update decisions should be semantic rather than based only on changed line counts.

This also makes the project useful as a final step after an agent completes a feature or refactor.

## Agent readiness is part of codebase readiness

The project will also inspect files such as:

```text
AGENTS.md
CLAUDE.md
CONTRIBUTING.md
README.md
CI configuration
project scripts
```

The question is not simply whether agent instructions exist. It is whether they are useful.

An enormous `AGENTS.md` containing architecture explanations, generic programming advice, and outdated commands can be worse than a short file that points agents toward reliable project knowledge.

The detailed system model belongs in the Codebase Spec. Agent instructions should stay concise.

## The bigger idea

Coding agents should not have to rediscover a mature software system from scratch every time they receive a task.

A repository can carry a persistent, machine-readable understanding of itself.

Graphify provides the structural graph. `understand-code` adds the feature, behavior, and architecture layer.

Together they can provide agents with much better context before the first line of code is changed.

The project is still at the beginning, and I am particularly interested in testing it against messy, under-documented legacy projects: the repositories where building a reliable mental model consumes the most engineering time.

The repository is public: [github.com/bpstr/understand-code](https://github.com/bpstr/understand-code).
