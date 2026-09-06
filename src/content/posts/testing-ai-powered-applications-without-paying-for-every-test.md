---
title: "Testing AI-Powered Applications Without Paying for Every Test"
pubDate: 2026-09-07
description: "A practical testing architecture for AI applications: deterministic fakes, fixtures, local model proxies, explicit provider checks, evals, cost guards, and CI that cannot accidentally spend money."
author: "Jani Fent"
tags: [ai, testing, api, ci, architecture]
---

Testing an AI-powered application is not the same as testing a normal HTTP integration.

The provider may be nondeterministic. The model may change. Responses may be semantically correct while differing completely in wording. Tool calls introduce another state machine. Agent loops can multiply one test into dozens of requests.

And unlike most test dependencies, every request may cost money.

The obvious response is to mock everything.

That is safe, but incomplete.

The opposite response is to run the whole suite against OpenAI or Claude so the tests are "real."

That is realistic, but financially reckless and often more flaky than useful.

The testing strategy I prefer is a layered one where **each test uses the cheapest environment capable of proving the behavior it cares about**.

The result looks roughly like this:

```text
pure unit tests
        ↓
deterministic provider fake
        ↓
recorded provider fixtures
        ↓
localhost Codex / Claude Code adapter
        ↓
explicit real-provider qualification
        ↓
production observability and evals
```

The most important property of this stack is simple:

**the normal test command never spends money.**

## Start by separating your application from the provider

If OpenAI or Anthropic SDK calls are scattered throughout the application, AI testing becomes unnecessarily difficult.

Put a small boundary around the provider.

For example:

```ts
interface LanguageModel {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

The application should talk to this interface rather than directly constructing provider SDK calls everywhere.

Behind it you can have:

```text
OpenAIProvider
AnthropicProvider
FakeProvider
RecordedProvider
LocalProxyProvider
```

The point is not abstraction for its own sake.

The boundary gives testing somewhere to attach.

It also gives production somewhere to implement:

- retries
- timeouts
- token accounting
- cost accounting
- provider routing
- logging
- rate limiting
- request IDs
- model policy
- circuit breakers

An AI provider is infrastructure. Treat it like infrastructure.

## Layer 1: test everything deterministic without an LLM

A surprising amount of an AI feature does not require an AI model to test.

Consider a document-analysis pipeline:

```text
load document
→ choose passages
→ construct prompt
→ call model
→ parse structured response
→ validate result
→ store assessment
```

Only one step actually needs a model.

The rest can and should be normal deterministic tests.

Test things such as:

- prompt construction
- message ordering
- system instruction selection
- context truncation
- token-budget decisions
- model selection
- tool definitions
- JSON-schema generation
- response parsing
- validation
- persistence
- authorization
- retry decisions
- fallback decisions
- error handling
- usage accounting

These tests should be fast, boring, and cheap.

If changing one string in a prompt requires 500 real API requests to know whether the application still boots, the architecture is working against you.

## Layer 2: build a deterministic fake provider

The most useful AI testing tool is usually not a smarter model.

It is a very stupid model that does exactly what the test says.

A fake provider can return predefined responses based on the request:

```ts
const provider = new FakeProvider()
  .when({ intent: 'classify-ticket' })
  .respond({ category: 'billing', confidence: 0.94 });
```

Or it can simply consume queued responses:

```ts
provider.queue([
  assistantText('I need more information.'),
  toolCall('lookup_customer', { id: 'cus_123' }),
  assistantJson({ status: 'resolved' }),
]);
```

This lets you test agent orchestration without asking a model to improvise the scenario every time.

You can deterministically verify:

```text
model asks for tool
→ application executes tool
→ tool result is returned
→ model receives result
→ final answer is persisted
```

You can also simulate failure cases that are hard to reproduce with a real provider:

```text
429
500
timeout
invalid JSON
truncated stream
unknown tool
malformed tool arguments
context overflow
quota exceeded
```

A good fake makes edge cases easier to test than the happy path.

## Make the fake strict

A fake provider should not merely return canned text regardless of what the application sends.

That can hide broken integrations.

Have it assert important request properties:

```text
expected model
expected system prompt
required message
required tool schema
maximum context size
response format
```

Then a test can fail because the application unexpectedly changed the provider contract.

This is much more useful than a mock that answers "OK" to everything.

## Layer 3: use recorded fixtures for provider-shaped responses

There is still value in seeing what a real provider actually returns.

Streaming frames, tool calls, usage metadata, refusal structures, structured output, and error payloads all have details worth preserving.

One approach is to make a small number of deliberate real requests during development and store sanitized responses as fixtures.

For example:

```text
tests/fixtures/openai/
  responses-text.json
  responses-tool-call.json
  responses-structured-output.json
  rate-limit-error.json

tests/fixtures/anthropic/
  message-text.json
  message-tool-use.json
  stream-events.json
```

Your parser and adapter tests can then replay those responses indefinitely for free.

Fixtures are particularly good for catching provider-SDK regressions because they preserve the shape of real responses while removing network and billing from the test loop.

Do not store secrets, private prompts, customer data, or sensitive model outputs in fixtures.

Sanitize them before committing.

## Treat fixtures as protocol samples, not truth

Recorded responses eventually become old.

Provider APIs evolve.

SDKs normalize fields differently.

Models begin emitting new structures.

That means fixtures should be versioned and occasionally regenerated deliberately.

A useful header or metadata file can record:

```text
provider: openai
api: responses
captured: 2026-09-07
sdk: 6.x
model_family: production-chat
purpose: structured-output-contract
```

You do not need to regenerate fixtures every week.

You do need to know what they represent.

## Layer 4: use local model proxies for behavioral development

Deterministic fakes prove orchestration.

They do not tell you whether a prompt produces a sensible result.

For local development, a compatibility proxy around Codex or Claude Code provides a useful middle layer.

Your application still sends API-shaped requests:

```text
application
→ localhost API
→ proxy
→ Codex or Claude Code
```

but you can iterate using the authenticated local tooling you already have rather than buying separate API credits for every prompt experiment.

For example, [mehdic/codex-proxy](https://github.com/mehdic/codex-proxy) exposes OpenAI-style endpoints over the official Codex app-server, while [oliverox/claude-proxy](https://github.com/oliverox/claude-proxy) exposes an Anthropic-style Messages endpoint backed by Claude Code.

These adapters are extremely useful for:

- prompt development
- conversation UX
- response handling
- tool-flow prototyping
- streaming UI work
- exploratory manual tests
- early agent behavior

They should not be mistaken for exact production-provider emulators.

Their value is cheap feedback, not perfect protocol parity.

## Layer 5: keep real-provider tests explicit and tiny

Eventually the real API must be tested.

Otherwise you can build a beautifully tested adapter for an API that no longer behaves the way your fixtures say it does.

But real-provider verification should be a separate class of operation.

I like an explicit command such as:

```bash
ALLOW_PAID_AI_TESTS=1 ./bin/provider-check openai
```

or:

```bash
ALLOW_PAID_AI_TESTS=1 ./bin/provider-check anthropic
```

These checks should be intentionally small.

They might verify:

```text
basic text response
structured response
one tool call
streaming
usage metadata
known error behavior
```

They should not generate a combinatorial matrix over every model, prompt, option, and retry mode.

The purpose is provider qualification, not exhaustive application testing.

Everything exhaustive should already have happened against deterministic layers below it.

## Do not hide paid calls inside "integration tests"

Names matter because developers build habits around commands.

If this command:

```bash
npm run test:integration
```

can unexpectedly spend $40, somebody will eventually run it without realizing what it does.

Prefer vocabulary that makes the consequence obvious:

```text
test
integration
local-ai
provider-check
paid-provider-check
```

The paid path should sound paid.

It should also require a deliberately scoped development credential with a small enforced provider budget.

## CI should be financially inert

Normal CI should have no paid OpenAI, Anthropic, Gemini, or equivalent credentials.

That alone prevents an enormous class of mistakes.

But I prefer defense in depth.

A strong CI configuration can combine:

```text
no real provider secret
+
AI_PROVIDER=fake
+
paid test flag absent
+
provider domains blocked
```

Even if a future coding assistant writes:

```ts
new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
```

inside a test, there should be nothing useful for it to authenticate with.

## Add an egress guard

The strongest form of "CI must not call paid APIs" is to make the network policy agree.

Where your runner environment allows it, block outbound traffic to paid provider endpoints during the normal test job.

The exact mechanism depends on your CI system and runner environment, but the principle is portable:

```text
application test
    ↓
network policy
    ↓
api.openai.com       DENY
api.anthropic.com    DENY
```

You can also add a lightweight test that fails if known provider domains appear in unexpected HTTP requests.

This is especially valuable in agent-written codebases because it protects against future accidental regressions rather than relying on every generated test author remembering the rule.

## Add a reusable cost guard to the provider boundary

Provider budgets should not exist only in dashboards.

Your own application can enforce them too.

A small cost guard can sit before every model request:

```text
request
→ estimate work
→ check execution budget
→ check feature budget
→ check workspace/user budget
→ provider
```

Depending on the application, the guard can enforce:

- maximum requests per operation
- maximum input tokens
- maximum output tokens
- maximum total tokens
- maximum agent steps
- maximum parallel calls
- maximum retry count
- maximum estimated cost
- maximum daily feature spend

You do not need perfect price estimation for this to be useful.

Even rough ceilings prevent runaway behavior.

Provider billing limits protect the account.

Application cost guards protect individual workflows.

You want both.

## Test the cost guard itself

Cost controls are production logic and deserve tests.

For example:

```text
Given an execution budget of $0.20
When completed calls have consumed $0.18
And the next call is estimated at $0.08
Then the call is rejected before reaching the provider
```

Also test:

```text
retry cannot exceed operation budget
sub-agent inherits parent budget
parallel branches share the same budget
cancelled operation stops new model calls
quota failure is not retried forever
```

One of the most dangerous AI bugs is not an incorrect answer.

It is a correct loop with no economic stopping condition.

## Retry storms deserve dedicated tests

Retries are usually written as reliability logic.

For AI systems, they are also billing logic.

Test the retry policy deterministically with the fake provider.

For example:

```text
attempt 1 → 500
attempt 2 → 500
attempt 3 → success
```

Verify the exact number of calls.

Then test errors that should not retry:

```text
invalid request
insufficient quota
hard spend limit reached
invalid credentials
unsupported model
```

A retry policy that blindly treats every failure as temporary can convert a provider outage or billing limit into a request storm.

## Agent loops need a test harness

Agents introduce another layer of nondeterminism because the model decides what to do next.

The solution is not to test the whole loop only against a live model.

Build a deterministic agent harness.

A scripted fake can simulate turns such as:

```text
1. call search_documents(query="refund policy")
2. call get_customer(id="123")
3. call issue_refund(amount=20)
4. return final answer
```

Your tests can then verify:

- allowed tools
- tool argument validation
- permission checks
- maximum steps
- repeated-tool detection
- loop detection
- human approval boundaries
- cancellation
- final-state persistence
- cost accounting

You can even test pathological model behavior:

```text
call search
call search
call search
call search
...
```

and prove that the runtime terminates it after the configured limit.

## Test semantics differently from protocol

There are two very different questions:

> Did the application call the provider correctly?

and:

> Did the model produce a good answer?

Do not mix them into one test.

Protocol behavior belongs in deterministic tests.

Model quality belongs in evals.

This distinction removes a lot of flaky tests.

## Do not assert exact prose

This is usually a bad AI test:

```ts
expect(response.text).toBe('The customer is eligible for a refund.');
```

A perfectly valid model might answer:

```text
Yes. This customer qualifies for the refund.
```

Instead, test deterministic structure where possible.

For structured outputs:

```ts
expect(result).toMatchObject({
  eligible: true,
  reasonCode: 'WITHIN_WINDOW',
});
```

For free-form outputs, use eval criteria such as:

```text
mentions refund eligibility
contains no invented policy
cites supplied evidence
contains no prohibited action
```

The test method should match the property you actually care about.

## Build eval datasets like real test fixtures

Model-quality evaluation works much better when examples are maintained as an explicit dataset.

For example:

```text
evals/refund-policy/
  simple-eligible.json
  outside-window.json
  missing-order-date.json
  conflicting-policy-docs.json
  malicious-user-instruction.json
```

Each case can contain:

```json
{
  "input": {},
  "expected": {
    "mustMention": [],
    "mustNotClaim": [],
    "requiredEvidence": [],
    "expectedDecision": "..."
  }
}
```

Then provider or prompt changes can be evaluated against a stable set of product expectations.

That is much more informative than asking whether the exact output string stayed unchanged.

## Version prompts

Prompts are production code.

If changing a system instruction changes behavior, you need to know which version produced an evaluation result.

Track at least:

```text
prompt identifier
prompt version
model
provider
relevant generation settings
application version
```

Then a regression can be described precisely:

```text
refund-agent prompt v17
with model family B
reduced evidence-citation pass rate from 96% to 82%
```

Without prompt versioning, eval history quickly becomes difficult to interpret.

## Keep evals separate from the normal test suite

An eval may legitimately use a model many times.

That does not mean it belongs in `npm test`.

I prefer a clear separation:

```text
npm test
    deterministic, free

npm run test:integration
    deterministic services and fixtures, free

npm run test:local-ai
    localhost Codex/Claude adapter, developer-invoked

./bin/provider-check
    tiny paid provider verification, explicit

./bin/eval
    quality evaluation, explicitly budgeted
```

This makes cost visible in the command taxonomy itself.

## Estimate the maximum cost before an eval starts

If an eval is going to make 2,000 model calls, discovering that after launching it is too late.

Before execution, calculate or at least approximate:

```text
number of cases
× repetitions per case
× models
× expected input tokens
× maximum output tokens
```

Then print a budget summary:

```text
Cases:              120
Models:             2
Repetitions:        3
Maximum requests:   720
Estimated max cost: $18.40
Configured budget:  $20.00
```

Require an explicit confirmation or flag for expensive runs.

For automated internal eval infrastructure, reject runs whose configured maximum exceeds the evaluation budget.

## Record cost attribution alongside quality

A model can improve an eval while making the feature economically unusable.

That is still a regression.

Evaluation results should therefore include both quality and efficiency dimensions:

```text
accuracy
coverage
hallucination rate
latency
input tokens
output tokens
model calls
tool calls
estimated cost
```

Then a change can be evaluated as a tradeoff:

```text
+2.5% answer quality
+61% token usage
+43% latency
```

Whether that is acceptable is a product decision.

At least the decision is visible.

## Production is also part of the test system

No pre-production suite can perfectly reproduce how users interact with a model.

Production therefore needs observability strong enough to detect behavioral and financial regressions.

Track dimensions such as:

```text
provider
model
feature
prompt version
request count
input tokens
output tokens
cached tokens where available
latency
retry count
tool count
agent step count
estimated/provider-reported cost
```

Aggregate by feature and environment.

If the bill rises, you should be able to explain why.

If an agent suddenly needs twice as many steps to complete the same task, that should appear as an operational regression even if users have not complained yet.

## Add anomaly detection to cost metrics

A simple threshold can catch surprisingly serious bugs.

Examples:

```text
agent average steps > 12
provider calls/request > 8
feature daily spend > $50
retry rate > 5%
output tokens/request > historical p99
```

The exact numbers depend on the application.

The important part is treating cost spikes like latency spikes or error-rate spikes.

They are production incidents.

## A practical repository policy

The testing rules can be made explicit in `AGENTS.md` or equivalent instructions:

```md
## AI testing policy

The default test suite MUST be deterministic and financially inert.

- Never call paid AI providers from normal tests or CI.
- Never inject paid provider API keys into ordinary CI jobs.
- Use FakeProvider for application and agent orchestration tests.
- Use sanitized recorded fixtures for provider response parsing.
- Local AI adapters may be used only by explicit developer commands.
- Real-provider checks must require ALLOW_PAID_AI_TESTS=1.
- Real-provider checks must use a low-budget development project.
- Do not add automatic retries to paid provider checks.
- Every agent test must have a maximum step count.
- Every production agent execution must have bounded calls and budget.
- Evals are separate from unit/integration tests and must declare a budget.
```

This is useful for humans.

It is even more useful for coding agents, because it prevents an assistant from helpfully generating a 400-case live API matrix when asked to improve test coverage.

## The final testing model

A mature AI application should not have one category called "AI tests."

It should have several layers with different jobs:

```text
UNIT
Prove deterministic application logic.
Cost: zero.

FAKE PROVIDER
Prove orchestration, tools, retries, failures, and agent control flow.
Cost: zero.

RECORDED FIXTURES
Prove parsing and provider protocol assumptions.
Cost: zero.

LOCAL AI
Explore prompts and model behavior during development.
Cost: covered by the local authenticated tool/subscription environment.

PROVIDER CHECK
Prove that the production provider still satisfies the small API contract you depend on.
Cost: tiny, explicit, budgeted.

EVAL
Measure model quality against product expectations.
Cost: explicit and separately budgeted.

PRODUCTION OBSERVABILITY
Detect real-world quality, latency, loop, and spending regressions.
Cost: part of the product and continuously measured.
```

The architecture is more work than simply putting an API key into the test environment.

But it gives you something much better: fast tests, reproducible failures, realistic provider coverage, measurable model quality, and a financial boundary around experimentation.

That is the testing standard AI applications need.

Not because API calls are prohibitively expensive.

Because **unbounded API calls are**.
