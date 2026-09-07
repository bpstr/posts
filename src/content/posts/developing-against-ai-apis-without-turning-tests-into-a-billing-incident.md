---
title: "Developing Against AI APIs Without Turning Tests Into a Billing Incident"
pubDate: 2026-09-07
description: "Practical rules for developing with OpenAI, Claude, and other metered AI APIs without leaking keys, burning credits in CI, or discovering an expensive agent loop too late."
author: "Jani Fent"
tags: [ai, api, testing, devops, security]
---

Building software on top of an AI API introduces a slightly unusual engineering problem:

**running the code costs money.**

That sounds obvious, but it changes how development, testing, CI, credentials, retries, and even coding-assistant instructions should be designed.

There is also an important distinction between personal AI subscriptions and API usage.

A ChatGPT subscription and OpenAI API usage are separate products with separate billing. Claude has a similar distinction, although paid Claude plans can optionally enable usage credits. Once the included Claude usage is exhausted, those credits can let Claude and Claude Code continue on consumption-based pricing at standard API rates until the normal usage window resets.

That makes the boundary slightly easier to miss. You may think you are simply continuing to use a product you already subscribe to while the account has actually switched to additional metered consumption.

When developing applications against AI systems, billing needs to be treated as part of the architecture.

## Start every project with a tiny spending limit

Before writing the first integration, configure billing limits.

For a personal experiment or early-stage project, something like **$5-$10 is usually enough to begin**.

Do not start by asking:

> How much API capacity might this application eventually need?

Start with:

> How much money am I willing to accidentally lose while this code is still experimental?

Then increase the limit deliberately.

A development project does not need access to the financial capacity of the entire organization.

This matters particularly with Anthropic because organization-level API caps can become very large. At the time of writing, Claude's standard Start, Build, and Scale tiers have monthly spend caps of $500, $1,000, and $200,000 respectively. Scale's $200,000 is not a universal default, but it is a useful reminder of how far an account can eventually grow if nobody deliberately narrows the project budget.

Anthropic also lets organizations set their own lower spend limits and workspace-level limits. See the current [Claude API rate and spend limit documentation](https://platform.claude.com/docs/en/api/rate-limits) before relying on any particular number.

OpenAI similarly supports organization and project spend controls. One detail worth checking carefully is whether you configured a notification threshold or an enforced hard limit. A budget alert is useful, but it is not the same thing as a circuit breaker. OpenAI's current [project management documentation](https://help.openai.com/en/articles/9186755-managing-your-work-in-the-api-platform-with-projects) explicitly distinguishes monitoring-only spend limits from enforced limits.

If your project should spend at most $10, configure something that actually prevents it from quietly becoming a $10,000 experiment.

## Prepaid credits are not automatically a spending limit

Prepaid billing can be useful during development because it makes cost visible up front.

But check the recharge configuration.

OpenAI's current prepaid billing flow has a $5 minimum initial purchase, defaults the initial amount to $10, and enables auto-reload by default during setup unless you turn it off. Its documentation also warns that usage may not stop instantly when the prepaid balance reaches zero because billing processing can lag.

That means a $10 credit purchase does not necessarily mean the system can only spend $10.

Whenever I configure a new AI project, I want to know four things:

- what balance exists
- whether it can automatically refill
- what the monthly reload limit is
- what actually stops requests after my intended budget is exhausted

Do not assume those are the same setting.

See OpenAI's current [prepaid API billing documentation](https://help.openai.com/en/articles/8264644) for the exact behavior.

## Use local AI proxies during development

One of the best ways I have found to reduce AI development costs is to avoid the production API for most local work.

Codex and Claude Code already provide authenticated local AI runtimes. A small localhost compatibility layer can expose those runtimes using an OpenAI- or Anthropic-shaped API.

The architecture is simple:

```text
application
    ↓
localhost compatibility API
    ↓
local proxy
    ↓
Codex or Claude Code
    ↓
existing local authenticated session
```

For Codex, a concrete example is [mehdic/codex-proxy](https://github.com/mehdic/codex-proxy). It wraps the official `codex app-server` over stdio JSON-RPC and exposes OpenAI-style `/v1/responses` and `/v1/chat/completions` endpoints on localhost while leaving authentication to the official Codex CLI.

### Minimal Codex proxy setup

The current setup requires Node.js 20+ and an authenticated Codex CLI session.

First install and verify Codex:

```bash
npm install -g @openai/codex
codex login
codex exec "Reply OK only."
```

Then install and start the proxy:

```bash
git clone https://github.com/mehdic/codex-proxy.git
cd codex-proxy
npm install
npm run build
npm start
```

By default it binds to:

```text
http://127.0.0.1:3466
```

You can verify the process without invoking a model:

```bash
curl http://127.0.0.1:3466/health
```

Then try a local OpenAI-style request:

```bash
curl http://127.0.0.1:3466/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-5.5",
    "messages": [
      {"role": "user", "content": "Reply OK only."}
    ]
  }'
```

For an existing OpenAI-compatible client, point its base URL at:

```text
http://127.0.0.1:3466/v1
```

If the client insists on an API-key field, a local placeholder such as `local` is enough; the proxy delegates the real authentication to your already authenticated Codex CLI session rather than asking you to copy Codex OAuth tokens into another application.

Once it is running, the repository also provides:

```bash
npm run smoke
```

for a small localhost smoke test covering health, model discovery, a non-streaming request, and a streaming request.

Keep this service bound to localhost unless you deliberately add your own authentication and security boundary. Codex is an agent runtime with native capabilities, not just a text completion server. The proxy itself defaults to `127.0.0.1` and conservative Codex sandbox settings for a reason.

For Claude Code, projects such as [oliverox/claude-proxy](https://github.com/oliverox/claude-proxy) invoke Claude Code and expose an Anthropic-compatible `/v1/messages` endpoint locally.

This pattern is extremely useful at the beginning of a project.

You can develop:

- prompt construction
- conversation handling
- streaming
- response parsing
- structured output handling
- UI behavior
- provider abstractions
- error handling
- basic tool orchestration

without purchasing additional API credits for every iteration.

It also makes experimentation easier. You can change a prompt, inspect how the application reacts, restart the process, and repeat without mentally attaching a dollar value to every local request.

## A local proxy is not the production API

There is an important limitation.

A compatibility proxy is a development tool, not proof that your application behaves correctly against the real provider.

Codex and Claude Code are agent runtimes. Their behavior is not identical to calling the public OpenAI or Anthropic APIs directly.

Parameters may be translated or ignored. Streaming events can differ. Tool calls may behave differently. Authentication is different. The actual model behind the subscription may differ from the model you will use in production.

Treat local proxies as a cheap development environment, not a perfect provider emulator.

A useful testing model is:

```text
unit tests
    ↓
deterministic fake provider

local integration tests
    ↓
Codex / Claude Code compatibility proxy

explicit provider qualification
    ↓
real paid API
```

Most automated tests should never reach the third layer.

## Never let normal CI call a paid AI API

This deserves a hard rule.

**Normal CI jobs should not have permission to call paid LLM APIs.**

Not "we usually avoid it."

Not "the tests currently mock it."

They should not be able to do it.

This matters even more now that coding assistants generate large parts of test suites.

Ask an agent to thoroughly test an OpenAI integration and it may quite reasonably produce a beautiful matrix covering:

```text
models × prompts × streaming modes × tools × retries × response formats
```

From a traditional software-testing perspective, that can look excellent.

From a billing perspective, it can be a disaster.

A test suite that performs 200 paid model calls on every pull request is not just a test suite anymore.

It is a recurring invoice.

Parameterization, retries, parallel execution, long contexts, and agent loops can multiply that consumption surprisingly quickly.

## Put the rule in AGENTS.md

This is important enough to belong in repository-level coding-agent instructions.

If you use `AGENTS.md`, `CLAUDE.md`, or another persistent instruction file, explicitly tell coding assistants that paid provider calls are forbidden in normal tests and CI.

For example:

```md
## Paid AI API safety

Tests and CI MUST NOT call paid external AI APIs.

Never use real OpenAI, Anthropic, Gemini, or other metered API
credentials in automated tests.

Use mocked providers, deterministic fakes, recorded fixtures, or
approved localhost development adapters instead.

Live provider tests must be explicitly marked and must never run as
part of the default test or CI command.

Do not introduce tests that require OPENAI_API_KEY,
ANTHROPIC_API_KEY, or equivalent paid credentials in CI.

Do not add automatic retries around paid provider tests.

Any real-provider verification must require an explicit manual command
and a deliberately configured low-cost project credential.
```

The exact wording is less important than making the constraint visible.

Coding agents optimize for the requirements they can see. If cost safety is an architectural requirement, put it next to the rest of the architecture.

## Make paid verification deliberately inconvenient

There are still situations where calling the real provider is necessary.

API contracts change. Models behave differently. Structured output needs occasional verification. Streaming implementations need to be checked against reality.

Those checks should require an explicit escape hatch.

For example:

```bash
ALLOW_PAID_AI_TESTS=1 ./bin/test-ai-provider
```

I prefer requiring both:

```text
ALLOW_PAID_AI_TESTS=1
+
an explicit paid-provider command
```

Running:

```bash
npm test
```

or:

```bash
composer test
```

should never be enough to spend money.

The developer should have to intentionally enter the paid-testing path.

## Remove real credentials from CI

The easiest paid API call to prevent is the one that cannot authenticate.

If a test job does not need production AI access, do not inject the secret.

Use separate credentials for development, staging, and production, preferably scoped to separate provider projects or workspaces.

Avoid one organization-wide API key copied into every environment.

For normal CI, go further and block outbound access to provider endpoints where practical.

That gives you several independent barriers:

```text
test uses fake provider
        ↓
no paid API secret available
        ↓
paid-provider feature flag disabled
        ↓
provider network access blocked
```

Any one control can fail without immediately creating a bill.

## Treat retries as spending

Retries deserve special attention.

Traditional HTTP infrastructure often encourages automatic retries:

```text
request failed
→ retry
→ exponential backoff
→ retry again
```

With a metered AI request, every successful retry is another inference.

Now add concurrency:

```text
50 queued jobs
× 3 attempts
× long context
× expensive model
```

A small application bug can suddenly become hundreds of model executions.

Retry policies for AI providers should therefore be conservative and observable.

Know which errors are safe to retry. Limit attempts. Limit concurrent requests. Stop retrying billing and quota errors. Always have an upper bound on how much work one logical operation may perform.

## Agent loops need their own budget

Agentic applications make this even more important.

An ordinary completion has one obvious cost boundary.

An agent might do:

```text
reason
→ call tool
→ inspect result
→ reason
→ search
→ reason
→ retry tool
→ summarize
```

One user action can become dozens of model calls.

Every agent execution should therefore have explicit limits such as:

```text
max model calls
max tool calls
max execution time
max input tokens
max output tokens
max agent steps
max monetary budget
```

Never allow this:

```text
while (!done) {
    callModel();
}
```

to become the financial architecture of your application.

## Keep API keys boring

AI API credentials should be handled exactly like other production secrets.

Do not commit them. Do not place them in frontend JavaScript. Do not paste them into issue descriptions. Do not put them into fixtures. Do not send them to coding assistants unnecessarily.

Create project-specific credentials. Use restricted permissions where available. Rotate credentials after exposure. Delete keys belonging to abandoned experiments.

If a project is no longer running, its credential probably should not still be active.

## Inspect provider dashboards regularly

Automated monitoring is useful, but I still recommend periodically opening the provider dashboard.

Look at:

```text
projects
workspaces
API keys
usage
spend
models
recent activity
billing limits
```

Old experiments are easy to forget.

A project you abandoned three months ago may still have a valid key inside an old deployment. A staging worker may still be running. An integration test may have quietly switched from a fake provider back to production.

Provider dashboards are one of the easiest places to spot those mistakes.

## Log enough information to explain the bill

When an AI bill increases, you should be able to answer why.

At minimum, internally track enough metadata to attribute usage to something meaningful:

```text
provider
model
feature
environment
request type
input tokens
output tokens
agent execution
workspace or user where appropriate
```

Do not blindly log complete prompts or responses if they contain sensitive data.

But a bill containing only:

```text
$483.72
```

is not useful observability.

You want to be able to explain whether the money went to document analysis, agent execution, chat, background processing, retries, or something else.

Cost is now an application metric.

Treat it like one.

## The safest AI request is the one you never send

AI APIs make experimentation incredibly easy.

That ease can hide the fact that inference is a metered external dependency.

The goal is not to become afraid of calling models. The goal is to make accidental usage difficult.

My default setup for a new AI-powered project is increasingly simple:

```text
small enforced platform budget
        +
local development proxy
        +
deterministic test provider
        +
no paid credentials in CI
        +
explicit real-provider verification
        +
bounded retries and agent loops
        +
separate project credentials
        +
regular usage inspection
```

Then production access is something the application earns gradually.

AI development becomes much more comfortable once pressing **run tests** can no longer create a billing incident.

## Further reading

- [OpenAI: Managing projects in the API platform](https://help.openai.com/en/articles/9186755-managing-your-work-in-the-api-platform-with-projects)
- [OpenAI: Setting up and managing prepaid API billing](https://help.openai.com/en/articles/8264644)
- [Anthropic: Claude API rate and spend limits](https://platform.claude.com/docs/en/api/rate-limits)
- [Anthropic: Usage credits for paid Claude plans](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)
- [mehdic/codex-proxy](https://github.com/mehdic/codex-proxy)
- [oliverox/claude-proxy](https://github.com/oliverox/claude-proxy)