---
title: "The Forgotten Schema: potentialAction and the Agentic Web"
pubDate: 2026-08-25
description: "Schema.org already has a vocabulary for things websites can do. potentialAction may be one missing semantic layer between crawlable content and agent-discoverable capabilities."
author: "Jani Fent"
tags: [ai, web, schema-org, agents]
image:
  url: "https://images.unsplash.com/photo-1655993810480-c15dccf9b3a0?auto=format&fit=crop&w=1600&q=80"
  alt: "Abstract geometric network of connected nodes"
  credit: "D koi"
  creditUrl: "https://unsplash.com/photos/3d-wireframe-polyhedron-with-metallic-spheres-COFXWa6LJdw"
---

A few years ago, giving an LLM access to the web felt like a breakthrough.

Now we are rapidly moving to the next problem: not just letting models **read** websites, but letting them understand what websites can **do**.

That difference matters.

Search engines learned to index pages, links, products, recipes, jobs, events, prices, and other structured content. But an agent trying to use a website still often falls back to the equivalent of pretending to be a person: inspect the DOM, find a button, fill a form, click, wait, and hope the page still looks the same tomorrow.

Meanwhile, developers are building thousands of MCP servers so models can call structured tools directly.

MCP is useful. But manually finding, installing, configuring, authenticating, and maintaining an MCP integration for every site feels strangely familiar.

It feels a little like registering a website in a directory and choosing a category before search engines learned how to discover the web themselves.

There may already be an overlooked bridge between those two worlds.

Its name is [`potentialAction`](https://schema.org/potentialAction).

## We taught crawlers nouns, but mostly ignored the verbs

Schema.org is usually associated with structured data for search engines.

A page can declare:

- this is a `Product`
- this is an `Offer`
- this is an `Event`
- this is a `Recipe`
- this is a `JobPosting`
- this organization has this address
- this product costs this amount

Search engines can consume that data without trying to infer everything from rendered HTML.

That model became so normal that developers routinely add JSON-LD specifically to improve how pages are understood by crawlers and search interfaces.

But Schema.org does not only describe entities and properties.

It also has an entire [`Action`](https://schema.org/Action) vocabulary.

Its documentation describes `potentialAction` as a way to represent an action that can be taken on a thing. The Actions documentation goes even further: the purpose is to describe the **capability to perform an action in the future, and how that capability can be exercised**.

That work dates back to 2014.

Some of the action types sound surprisingly relevant in an agentic web:

- [`SearchAction`](https://schema.org/SearchAction)
- [`RegisterAction`](https://schema.org/RegisterAction)
- [`AddAction`](https://schema.org/AddAction)
- [`BuyAction`](https://schema.org/BuyAction)
- `ReserveAction`
- `ApplyAction`
- `SubscribeAction`
- `FollowAction`

The vocabulary is not obscure in the sense of being unused. Schema.org currently reports `potentialAction` on more than 10 million domains in Google's web index.

What feels overlooked is the bigger idea behind it.

We spent a decade using structured data mostly to answer:

> What is on this page?

Agents increasingly need another answer:

> What can I do here?

## Put structured actions next to the buttons

Consider the most ordinary website interaction possible.

A human sees:

```html
<button>Add to cart</button>
```

The meaning is obvious to us because we understand the page, the product, the button label, the cart concept, and the surrounding interface.

A browser agent can often figure it out too. Modern models are remarkably good at operating websites through the DOM or screenshots.

But that is still inference.

The site already knows exactly what the button does.

Why make the agent rediscover it?

A website could expose the same idea structurally alongside the human interface:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Example Sofa",
  "potentialAction": {
    "@type": "BuyAction",
    "target": "https://shop.example/products/example-sofa"
  }
}
```

This is not yet a complete machine-safe checkout API. That distinction is important.

But semantically, the page has now declared something much richer than "this is a product".

It has declared:

> This product can be bought.

The same pattern can exist at different levels of the site.

A website could advertise:

```text
SearchAction
RegisterAction
```

A product page could add:

```text
AddAction
BuyAction
```

A cart could expose:

```text
change quantity
remove item
apply coupon
checkout
```

Checkout could expose:

```text
set delivery address
choose shipping method
choose payment method
place order
```

An order could expose:

```text
track
cancel
return
```

Instead of teaching an agent one enormous hard-coded workflow, the application could continuously answer:

> Here is the current state, and here are the valid actions from here.

That starts to look less like browser automation and more like a navigable graph of capabilities.

## An agent should not need an IKEA plugin before it can use IKEA

This is where today's MCP experience still feels early.

A typical model today can only use a service structurally if someone has already connected the relevant integration or MCP server.

The flow is often roughly:

```text
know the service
    ↓
find its MCP server
    ↓
install or connect it
    ↓
authenticate it
    ↓
inspect its tools
    ↓
use it
```

That makes sense while the ecosystem is young.

But it is not how the web became universal.

You do not select every website you want Google to search.

You do not install a crawler integration before a search engine can discover a public product page.

A mature agentic web should be closer to:

```text
crawl
  ↓
discover capabilities
  ↓
index them
  ↓
match user intent
  ↓
authorize when necessary
  ↓
invoke the live site
```

The user should be able to say:

> Register an account on example.com and fill in my usual details.

Or:

> Find me a sofa under €1,000 that can be delivered to Budapest this week.

Or, from a hands-free interface:

> Order the same printer toner I bought last time, but use the cheapest seller that can deliver tomorrow.

The agent should not be limited to the small set of websites the user manually installed beforehand.

It should be able to discover which sites support the required operations.

## Search what the web can do

This suggests a new kind of index.

Traditional search engines roughly index things such as:

```text
URL
text
links
entities
structured data
freshness
```

An action-aware crawler could additionally build a capability index:

```text
site
  ├─ SearchAction
  ├─ RegisterAction
  ├─ BuyAction
  ├─ supported regions
  ├─ authentication requirements
  ├─ input schema
  ├─ side effects
  └─ execution endpoint or protocol
```

Now a query such as:

> Buy me a new sofa.

does not mean the agent must skip browsing or immediately purchase the first thing it sees.

It means the system can first ask a new search question:

> Which known sites sell sofas and expose the operations required to search, inspect availability, calculate delivery, and eventually purchase one?

The content index still matters.

The agent needs product descriptions, dimensions, reviews, pricing, return policies, images, delivery information, and all the other material we already retrieve with search and RAG.

But the capability index adds another dimension:

> Which providers can actually perform the next step?

That is where a graph representation becomes interesting.

```text
Shop A
  ├─ sells → Sofa
  ├─ operates_in → Hungary
  ├─ supports → search
  ├─ supports → delivery_quote
  ├─ supports → register
  └─ supports → checkout

Shop B
  ├─ sells → Sofa
  ├─ operates_in → Hungary
  ├─ supports → search
  └─ supports → checkout
```

A model does not need every site to use exactly the same method name.

One API might call an operation `placeOrder`, another `checkout`, and another `createPurchase`.

LLMs are unusually good at recognizing that these may represent similar intents.

That changes one of the old problems of the Semantic Web: useful interoperability no longer requires every participant to agree on a perfect global ontology before anything works.

A shared vocabulary still helps enormously, but semantic normalization can be fuzzy instead of all-or-nothing.

## Chrome is already moving toward structured website actions

This is not entirely hypothetical.

Chrome's experimental [WebMCP](https://developer.chrome.com/docs/ai/webmcp) work is explicitly about exposing structured website tools to browser agents.

Its declarative API can turn ordinary HTML forms into machine-visible tools by annotating the form with a tool name and description while using the existing fields as parameters.

Conceptually, a form can remain perfectly normal for humans:

```html
<form action="/search">
  <input name="query">
  <button>Search</button>
</form>
```

while also describing its purpose to an agent:

```html
<form
  action="/search"
  toolname="searchProducts"
  tooldescription="Search products in our catalog"
>
```

The human gets the UI.

The agent gets a structured tool.

Same website. Same business operation. Two interfaces.

WebMCP is experimental and the details may change, but the direction is important: browser vendors are already exploring the idea that websites should explicitly expose actions instead of forcing agents to reconstruct them from pixels and DOM structure.

Schema.org's old action vocabulary suddenly looks much less academic in that environment.

## potentialAction is not the execution protocol

There is an important trap here.

Adding `BuyAction` to JSON-LD must **not** mean:

> Any crawler may now charge this customer's card.

Semantic discovery and trusted execution are separate problems.

A useful agentic action layer needs at least four pieces.

### 1. Discovery

A crawler needs to know that an action exists.

This could come from page-level structured data, WebMCP declarations, an MCP server card, OpenAPI metadata, a well-known capability document, or something we have not standardized yet.

The exact transport matters less than making the capability discoverable without a user manually installing it first.

### 2. Semantics

The agent needs to understand the meaning of the operation.

What does it do?

What object does it affect?

What arguments does it require?

Is it a read, a reversible mutation, or an irreversible financial commitment?

Schema.org Actions are interesting here because they give us an existing shared vocabulary instead of starting from zero.

### 3. Execution

The agent needs a reliable way to perform the action.

That might be:

- WebMCP in the active browser session
- remote MCP
- REST
- GraphQL
- an ordinary HTML form
- another agent protocol

Again, the user should not care.

The semantic operation is more important than the wire format.

### 4. Authorization

This is the difficult part.

Reading a product catalog and buying a product are not equivalent operations.

A host might allow:

```text
READ
search products
inspect pricing
check availability
```

without interruption, while requiring trusted confirmation for:

```text
WRITE
create account
change address
```

and stronger confirmation for:

```text
COMMIT
place order
transfer money
sign agreement
```

The permission dialog should come from the trusted browser or agent runtime, not from persuasive text generated by the model or website.

Authentication, delegated authority, consent, audit trails, replay protection, and prompt injection are where the real engineering work begins.

## The action graph should change with the session

The most interesting version is not a static list of every possible command a site has ever implemented.

Actions should be contextual.

Before authentication:

```text
login
register
search
```

After login:

```text
view orders
update profile
search
```

On a product:

```text
add to cart
check delivery
buy
```

After an item enters the cart:

```text
change quantity
remove
checkout
```

During checkout:

```text
choose shipping
choose payment
place order
```

After purchase:

```text
track
cancel
return
```

Each response gives the agent the valid next operations.

There is an old web architecture idea hiding in here: hypermedia. Instead of a client memorizing every route and state transition, the server tells it what can happen next.

Agents make that model much more interesting because they can reason about the semantics of the available actions instead of merely following fixed links.

## The crawler should index capability, not live state

A global capability index does not need to mirror every site's constantly changing database.

The index only needs to know things such as:

```text
this site can search products
this site can quote delivery
this site can register users
this site can create orders
this site operates in Hungary
```

Then the agent asks the live provider for volatile information:

```text
current price
current stock
available delivery slots
current shipping cost
current order state
```

That separation is important.

Search answers:

> Who might be able to do this?

The live application answers:

> What is true right now?

## There would be an immediate incentive to implement it

Here is the thought experiment I keep coming back to.

Imagine a major LLM provider announced tomorrow:

> We discover and prefer correctly declared structured actions when deciding whether an agent can use a website.

I suspect implementation would spread incredibly quickly.

The same teams already adding structured data for SEO, rich results, GEO, or AEO would suddenly have another reason to annotate their sites:

> Make sure agents know what our application can do.

That could turn agent capability metadata into the equivalent of today's crawlability and structured-data hygiene.

To be clear: this is **not** a claim that OpenAI, Google, or another major provider currently treats `potentialAction` as a universal agent ranking signal.

The point is that the incentive mechanism already exists.

Businesses want to be discoverable wherever users express intent.

If agent interfaces become another major place where that intent appears, websites will optimize for being understood there too.

## The Yahoo version and the Google version

The current ecosystem often looks like this:

```text
MCP marketplace

[ ] GitHub
[ ] Slack
[ ] Shopify
[ ] Booking
[ ] Example Store

Install integrations
```

That may be necessary today.

But it feels like the Yahoo-directory version of the agentic web.

The more interesting version is:

```text
User: Do X.

Agent:
1. understands X
2. searches an index of capabilities
3. discovers relevant providers
4. retrieves current structured information
5. negotiates authentication and permission
6. executes the required actions
7. asks the user only when judgment or consent is required
```

No manual server directory.

No prerequisite that the user already knew which integration to install.

No requirement that every site expose the same transport.

Just a web whose capabilities are as discoverable as its content.

## We may already have part of the vocabulary

The final agentic web will almost certainly require more than Schema.org.

We still need better answers for:

- automatic capability discovery
- input and output schemas
- authentication
- delegated permissions
- session state
- safe side effects
- payment authorization
- action versioning
- spam and deceptive capability declarations
- trust and ranking
- reliable invocation

MCP, WebMCP, OpenAPI, browser security models, and future protocols can all contribute pieces.

But I find `potentialAction` fascinating because it shows that one of the core ideas was already sitting in the web's structured-data vocabulary long before LLM agents made the use case obvious.

We became very good at telling machines what our pages **are**.

The next step may be teaching them what our sites **can do**.

That is a much bigger change than another rich snippet.

It is the beginning of an executable web.
