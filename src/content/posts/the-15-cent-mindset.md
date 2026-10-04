---
title: "The 15-Cent Mindset: Building Cheaper, More Stable Software"
pubDate: 2026-10-04
description: "What low-margin lighter manufacturing can teach developers about repeated work, cumulative savings, and the connection between efficiency and reliability."
author: "bpstr"
tags: [software-engineering, performance, reliability, optimization]
---

A video about disposable lighters is an unlikely source of software engineering inspiration. Yet the idea behind [The 15-Cent Miracle, by @ericcrackschina](https://www.youtube.com/shorts/h7McXnWRCQY), has stayed with me: when the margin on a product is tiny, every repeated step deserves attention.

A fraction of a cent looks irrelevant until you multiply it by the production volume.

The manufacturing hub behind the story is **Shaodong, in China's Hunan province**. An [April 2025 report by Hunan Daily](https://m.voc.com.cn/portal/news/show?id=28344117) describes a tightly connected local supply chain and extensive investment in automation. At one manufacturer, it reports a reduction in labor cost per lighter from 0.10 yuan to 0.015 yuan. The company's chairman also reported more consistent product quality.

That combination is what interests me: lower cost **and** more predictable output, through better engineering of the process.

I want more of that thinking in software development. Not because every application needs to run on the cheapest possible server, but because small, recurring inefficiencies deserve more attention than their individual size suggests.

## The cost is small. The repetition is not.

Consider a hypothetical service handling one million operations per day.

A change removes four milliseconds of CPU work from each operation. That sounds unimpressive in a pull request. Across the workload, it is:

```text
1,000,000 operations × 0.004 CPU-seconds = 4,000 CPU-seconds per day
                                          ≈ 1.1 core-hours per day
                                          ≈ 33.3 core-hours per 30 days
```

Separately, removing 20 KB of unnecessary transferred data from each operation eliminates 20 GB of transfer per day, using decimal units. That assumes 20 KB actually disappears from the wire; trimming an uncompressed object by 20 KB does not necessarily save 20 KB after compression.

Neither calculation is a benchmark or a promise about a cloud bill. Four milliseconds of wall-clock latency is not necessarily four milliseconds of CPU time. Reserved capacity, billing increments, and the rest of the workload determine whether less consumption becomes an immediate cash saving.

But the work has still disappeared. You can retain the extra capacity, accommodate growth, or eventually provision less of it.

This is the useful manufacturing analogy. A small saving does not need to transform the product. It needs to occur often enough, last long enough, and cost little enough to establish.

I would assess an optimization roughly like this:

```text
net benefit over a chosen period
    = avoided resource cost + avoided operational work
      - implementation, verification, and maintenance cost
```

That last line matters. Spending a week on a rarely executed function can be a bad investment. Spending an hour removing a redundant operation from a heavily used path can be an excellent one.

The mistake is dismissing both because the individual saving looks small.

## Take apart one useful operation

A factory has a bill of materials and a production process. For software, I would start with an equivalent view of one completed user action.

What actually happens when someone opens a dashboard, saves a document, or runs an import?

Follow the operation through the browser, API, database, background jobs, and external services. Count the work: queries, allocations, serializations, transferred bytes, and attempts. Distinguish required work from work caused by the implementation.

Google's SRE chapter on [handling overload](https://sre.google/sre-book/handling-overload/) makes a related point: request counts alone are an unreliable measure of capacity because different requests can consume very different amounts of resources.

For an illustrative dashboard, the investigation might find this:

| What happens | What to investigate |
| --- | --- |
| Three widgets independently load the same summary. | Can identical in-flight reads share one result? |
| A list response includes document bodies that the list never uses. | Can its response contract omit those fields? |
| The same response is encoded again for each recipient. | Can equivalent recipients share immutable encoded bytes? |
| A navigation change leaves obsolete reads running. | Can cancellation reach the work, and can stale responses be ignored? |

These are questions, not automatic fixes. Two requests are only equivalent when their parameters, authorization scope, and freshness requirements match. A response shared across the wrong users is a security defect, not an optimization.

Suppose the three widgets really do need exactly the same resource. A shared loader can remove two reads. Giving that resource one explicit loading lifecycle can also remove competing interpretations of whether it is ready, missing, or failed.

That second benefit is easy to overlook. You have improved the resource path and simplified the behavior that developers need to reason about.

The smallest useful change is not always inside a tight loop. Sometimes it is deleting the reason the loop runs twice.

## Efficiency creates room before failure

The connection between cost and stability is more interesting than a lower average response time.

Google's SRE discussion of [cascading failures](https://sre.google/sre-book/addressing-cascading-failures/) explains how resource pressure can reinforce itself: CPU exhaustion slows requests, more requests remain in flight, memory pressure rises, deadlines expire, and retries add more load.

A small reduction in repeated work can interrupt that progression before the system reaches its limits. At the same incoming workload, less work per operation leaves more capacity available to absorb variation.

For a simplified example, assume a service uses 90% of its CPU capacity and all that consumption scales with request processing. Reducing CPU work per request by 10%, with traffic and capacity unchanged, brings utilization to approximately 81%.

That is nine percentage points of headroom. It is not a guarantee of any particular latency or availability improvement; another resource may become the bottleneck. It is a reason to measure what happens under load, not just congratulate ourselves on a faster function.

There is also a choice to make. You can spend the efficiency gain on lower infrastructure cost, retain it as additional safety margin, or split it between the two.

**You cannot remove all the freed capacity and also claim you kept it as reliability headroom.**

Cheaper and more stable software is possible, but the capacity decision has to preserve both goals.

## The boring details are worth engineering

Some improvements really are small changes inside the code. They should not need a dramatic architectural justification to be considered worthwhile.

Take repeated serialization. Imagine a service building an object, encoding it to JSON, decoding it in the next internal layer, and encoding it again for the response. If the middle conversion serves no boundary or validation requirement, keeping the typed value until the actual transport boundary is a reasonable experiment.

Likewise, a fan-out operation may be encoding identical content once per recipient. Encoding once is attractive when the payload is genuinely identical and immutable. Recipient-specific permissions, redaction, or formatting must remain intact.

Allocation deserves the same attention. Building an intermediate collection only to copy it into another collection may be easy to remove without introducing cleverness. The [Go garbage collector guide](https://go.dev/doc/gc-guide#Eliminating_heap_allocations) explains why allocation rate matters to GC frequency and recommends identifying allocation hotspots before changing them.

The win is not simply a smaller allocation counter. It can include less collector work, although the guide cautions that the relationship with latency is more complicated than the relationship with throughput.

I would start by eliminating unnecessary objects before introducing a shared object pool. A pool that retains oversized buffers or makes ownership harder to understand may trade one cost for another.

The same reasoning applies outside Go: identify the actual cost in the runtime you use, then make the least complicated change that removes it. Do not assume a technique transfers unchanged between memory models.

What I like about these changes is their narrowness. We can explain what disappears, test the behavior that remains, and compare the result without turning the application into a different architecture.

## Retries are part of the production cost

A failed attempt is still work. Its cost belongs to the operation that triggered it.

Consider a hypothetical call chain with three layers, each allowing three total attempts. If every layer exhausts its attempts, one original operation can cause up to 27 attempts at the deepest dependency.

Each retry policy may look reasonable in isolation. Their composition is the problem.

There is a useful concrete example in Marc Brooker's AWS article on [exponential backoff and jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/). In its simulation of 100 clients competing to update a shared object, adding jitter reduced the call count by more than half and improved completion time compared with exponential backoff without jitter.

That is a simulation under specific contention conditions, not a universal production result. Still, it shows exactly the kind of improvement worth looking for: a small change to retry timing removes wasted work and helps the system finish sooner.

For a real application, I would trace every layer that can retry, establish a bounded end-to-end attempt budget and deadline, and verify which failures are safe to retry. Mutations need protection against duplicate effects; a timeout does not prove the original attempt did nothing. [HTTP semantics explicitly distinguish idempotent operations](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2) for this reason.

Keep the distinction between useful recovery and repeated failure visible in the measurements. A retry that succeeds can be valuable. A retry storm is not extra throughput.

## Keep the improvement after the next release

A one-off optimization is useful. An optimization that becomes the default implementation is much more valuable.

Once a shared request path is proven, make it the reference for equivalent features. Once a list has a deliberately small response contract, protect that contract. Explain why a serialization boundary exists so the next change does not add the conversion back.

This does not require forcing one architecture onto unrelated problems. It requires preserving what was learned about a particular kind of work.

I would keep a short evidence record with each optimization: the operation being measured, its workload, the before-and-after result, the behavior that must remain unchanged, and any new maintenance burden. Include cold and warm runs where caching matters, and enough repetitions to separate a gain from measurement noise.

Then protect the appropriate property. Query-count assertions can catch a redundant read returning. Response-contract tests can stop unused fields creeping back in. Retry tests can exercise timeouts and duplicate delivery. Performance measurements can track allocations, memory, and latency distributions on representative workloads.

Do not turn a noisy timing measurement into an exact millisecond assertion on an unpredictable shared CI runner. Test deterministic properties deterministically; evaluate performance with a suitable benchmark setup and tolerances.

Also measure the whole operation again after each change. Savings overlap. Reducing allocations may reduce CPU time too; those are not automatically two separate financial savings. Improving a component by 20% does not improve the whole application by 20%.

The denominator should be useful, correct output. Track attempted, completed, failed, and rejected work alongside cost, so dropping more requests cannot masquerade as efficiency.

## Do not make the product worse to make the graph better

There is a version of cost optimization I do not find inspiring at all: quietly reducing what the user receives.

A dashboard is faster because half its content no longer loads. A service makes fewer permission checks because somebody removed them. Memory use falls because important results are discarded. A system looks cheaper because it no longer records enough evidence to diagnose failures.

Those changes may reduce resource consumption. They have not demonstrated a cheaper implementation of the same useful outcome.

Lazy loading, sampling, and degraded responses can be legitimate product or operational decisions. They need explicit requirements and evaluation of the trade-off. They should not be smuggled into a performance patch as though nothing changed.

I want micro-optimization to mean less waste, not less responsibility. Correctness, security, accessibility, and the required user experience are constraints on the work.

The same rule applies to the development process. Reusing a valid build artifact or removing duplicate test-fixture setup is worth investigating. Deleting tests merely to reduce CI minutes changes the assurance you are buying. Compare the cost of a successfully verified change, not just the duration of a pipeline.

That also rules out saving a little compute by creating a large maintenance problem. The engineer debugging the clever shortcut next month is part of the cost model.

## A habit, not a rescue project

What inspires me about the lighter story is the willingness to take an ordinary process seriously.

A software team does not need to wait for a billing incident or a rewrite to do that. Pick a frequently repeated operation. Understand its cost. Remove one unnecessary step. Verify the result. Make the improved path easy to reuse.

Then do it again where the evidence says it is worthwhile.

Not every improvement will reduce the next invoice. Some will delay a capacity upgrade. Some will make overload less likely. Others will remove a source of confusing behavior or repeated debugging. The strongest changes earn more than one of those benefits without adding much complexity.

Over time, that is a different kind of engineering progress: the same useful product, delivered with less recurring cost and fewer avoidable ways to fail.

The question I want to ask more often is simple:

**If this work does not improve the result, why are we still paying to repeat it?**

---

*The title borrows the video's “15-cent” framing, not an audited per-unit cost including every shipping destination and tariff. Factory details are attributed to the dated report above. The software arithmetic and dashboard examples are illustrative, not measurements from a production system.*
