---
title: "Common Pitfalls When Starting a PHP Project"
pubDate: 2026-08-11
description: "Practical mistakes that make a new PHP codebase harder to maintain, test, deploy, and evolve—and the boring defaults that prevent them."
author: "Jani Fent"
tags: [php, architecture, testing, devops]
image:
  url: "https://images.unsplash.com/photo-1489875347897-49f64b51c1f8?auto=format&fit=crop&w=1600&q=80"
  alt: "MacBook displaying PHP and SQL code"
  credit: "Caspar Camille Rubin"
  creditUrl: "https://unsplash.com/photos/macbook-pro-with-images-of-computer-language-codes-fPkvU7RDmCo"
---

Starting a PHP project is easy. Starting one that is still pleasant to work on six months later is much harder.

Most early mistakes do not look dangerous. The application boots. The first endpoint works. The first database table exists. Everyone is moving quickly.

Then the small decisions start accumulating: environments drift apart, dependencies become difficult to replace, background jobs behave differently in production, configuration is scattered across the codebase, and nobody is quite sure which checks are required before a change can be merged.

The best time to prevent those problems is before they become architecture.

Here are the pitfalls I would avoid when starting a modern PHP project.

## 1. Not defining the runtime explicitly

"It runs on PHP" is not a runtime specification.

A project should make its assumptions explicit from the beginning:

- supported PHP version or version range
- required PHP extensions
- database engine and supported version
- cache, queue, and search services if they are part of the application
- operating-system-level dependencies
- expected web server or runtime model where relevant

Composer should enforce the PHP version and extension requirements it can enforce. Local development should use the same major runtime assumptions as production.

The goal is simple: a developer should not discover an undocumented runtime dependency only after a deployment fails.

## 2. Treating environment configuration as an afterthought

Configuration has a habit of spreading.

A database host starts in `.env`. A feature flag appears as a direct `getenv()` call. A timeout is hard-coded in a service. An API URL is copied into a command. Soon the application has no single answer to the question: *what can be configured?*

Keep a clear boundary between code and environment-specific configuration.

A good configuration system should make it obvious:

- which values are required
- which values have safe defaults
- which values are secrets
- which values differ between environments
- what happens when a required value is missing

Failing clearly during boot is usually better than discovering an invalid configuration halfway through a request.

And never commit real secrets just because the repository is private today.

## 3. Installing dependencies before understanding why they are needed

Composer makes adding packages wonderfully easy. That is exactly why dependency discipline matters.

Every dependency introduces another API, release cycle, security surface, upgrade path, and architectural assumption.

Before adding one, ask:

1. What problem does it solve?
2. Is that problem large enough to justify a dependency?
3. Is the package actively maintained?
4. Can it be isolated behind a small boundary if it becomes important infrastructure?
5. What happens if we need to replace it later?

This does not mean rebuilding libraries that the ecosystem already solves well. It means avoiding dependency-by-default development.

A short `composer.json` is not automatically better, but every line in it should have a reason to exist.

## 4. Abstracting code before there is anything to abstract

This is one of the easiest ways to make a new project look sophisticated while making it harder to understand.

You probably do not need an interface, factory, strategy, adapter, repository, manager, provider, and resolver for a piece of code that currently has one implementation and ten lines of behavior.

Abstractions are valuable when they protect a real boundary or remove real duplication. They are expensive when they merely predict a future that may never arrive.

A useful rule is:

> Start concrete. Introduce an abstraction when the code can explain why it needs one.

There are exceptions. External systems, storage, payments, queues, search engines, and other infrastructure boundaries often deserve isolation early because replacement and testing are realistic concerns.

But applying design patterns mechanically is not architecture. Architecture is deciding where change should be cheap.

## 5. Waiting to add static analysis and coding standards

The easiest day to introduce automated quality checks is the first day.

Once a codebase contains hundreds of existing violations, turning on stricter analysis becomes a cleanup project. If the baseline is clean from the beginning, every pull request only needs to avoid making it worse.

At minimum, decide early how the project handles:

- formatting
- coding standards
- static analysis
- unit and integration tests
- Composer validation

The exact tools matter less than making the checks reproducible.

A developer should be able to run the same important checks locally that CI will run remotely.

For example, a project might expose a single command such as:

```bash
composer test
```

and make that command run the project's agreed quality gate.

The command is boring. That is a feature.

## 6. Designing the database only for today's screen

A database schema is not just a way to make the current form save successfully.

Early schema decisions should consider:

- nullability
- unique constraints
- foreign keys
- indexes
- data ownership
- timestamps and lifecycle
- deletion behavior
- expected query patterns

Do not add indexes blindly, but do not wait for production to discover that your most common lookup requires a full table scan either.

Migrations should be part of normal development from the beginning. Manual production database edits create invisible state, and invisible state eventually becomes an incident.

Seeders, factories, or fixtures are also worth establishing early if developers and tests need representative data.

## 7. Forgetting that background work can fail twice

Queues and scheduled jobs often arrive shortly after the initial application skeleton. The common mistake is implementing only the successful execution path.

A background operation may:

- start and crash halfway through
- be retried
- execute twice
- lose a network connection after the remote system completed the request
- receive the same event more than once

That means idempotency should be considered before important jobs reach production.

If running the same job twice can charge someone twice, send something twice, or corrupt state, the job needs a deliberate strategy for duplicate execution.

The same thinking applies to webhook handlers and integrations.

"It normally runs once" is not a reliability guarantee.

## 8. Adding logging only after something breaks

`try/catch` is not observability.

When an unexpected production failure occurs, you should be able to answer basic questions without reproducing it locally:

- What failed?
- When did it fail?
- Which request or job triggered it?
- Which user or entity was involved, where safe and appropriate to record?
- What external service was being called?
- Was this the first failure or one of many?

Establish structured logging and exception reporting early enough that new code naturally participates in them.

Be equally deliberate about what **not** to log. Passwords, tokens, authorization headers, personal data, and raw third-party payloads can turn an innocent debug statement into a security problem.

## 9. Choosing between "no tests" and "test everything"

Both extremes can waste time.

A new project does not need a test for every getter. It does need confidence around behavior that would be expensive to break.

Start with tests around things such as:

- business rules
- permissions
- authentication boundaries
- calculations
- state transitions
- integrations
- important queries
- regression-prone behavior

Use integration tests where framework behavior and infrastructure matter. Use smaller unit tests where isolated domain behavior benefits from them.

The goal is not a coverage percentage that looks impressive on a badge. The goal is being able to change important code without guessing whether you broke the application.

## 10. Letting local development become a different application

"Works on my machine" usually means the machine is carrying undocumented configuration.

Local development does not need to reproduce production byte-for-byte, but the differences should be intentional.

Watch for drift in:

- PHP versions and extensions
- database engines
- filesystem behavior
- queues
- caching
- email delivery
- case sensitivity
- environment variables

Containerized development is one solution, not the only solution. A well-documented native setup can also work.

What matters is reproducibility.

A new developer should not need a week of archaeology to discover the machine-specific rituals required to boot the application.

## 11. Treating security as a pre-launch checklist

Security decisions are being made from the first line of code whether you call them security decisions or not.

Authentication, authorization, input validation, file handling, secret storage, dependency management, session configuration, database access, and external HTTP calls all create boundaries that should be considered while they are implemented.

It is much cheaper to establish safe defaults than to perform a desperate security retrofit immediately before launch.

This also includes dependency updates. A project needs a repeatable way to discover and evaluate vulnerable packages rather than hoping someone notices an advisory.

Security should be a property of the development process, not a ceremony at the end of it.

## 12. Having no definition of "ready"

A pull request that passes review on one day should not require a completely different set of unwritten checks the next day.

Define the minimum quality gate early.

For example:

```text
- dependencies install from a clean checkout
- configuration example is current
- code format passes
- static analysis passes
- automated tests pass
- migrations work from a clean database
- no secrets are committed
- relevant documentation is updated
```

The list should evolve with the application. Its job is not bureaucracy. Its job is making quality repeatable.

## 13. Neglecting the README because "everyone knows the project"

They do until they do not.

A useful README for a new PHP project does not need to be enormous. It should answer the questions required to start working:

- What is this application?
- What does it require?
- How do I install dependencies?
- How do I configure it?
- How do I initialize the database?
- How do I run it?
- How do I run tests and quality checks?
- Where should I look for deeper documentation?

Writing this down also tests the quality of the setup itself. If the installation instructions require twenty unexplained manual steps, the documentation has discovered an engineering problem.

## Start boring

A healthy PHP project does not need an impressive architecture diagram on day one.

It needs explicit runtime requirements, predictable configuration, sensible dependency boundaries, automated quality checks, reproducible environments, useful logs, migrations, targeted tests, and enough documentation that another developer can understand how the application works.

Complexity will arrive by itself. Business rules will grow. Integrations will appear. Performance constraints will become real. Requirements will change.

Do not manufacture that complexity in advance.

Start with a codebase that is boring to install, boring to test, boring to deploy, and boring to understand.

That kind of boring tends to age very well.
