# AuraAI — Giving Everyone a Skincare Expert in Their Pocket

**A paid, on-chain team of skincare AI agents.** Give it a selfie; it returns a
verified skin analysis and a personalized, evidence-grounded routine — callable
by humans through an app and by other agents through the CROO Agent Protocol
(CAP), settling every job on-chain.

**Hackathon:** CROO · **Tracks:** Any A2A Agents (primary) · Research & Intelligence (secondary)
**Protocol:** CAP · **Settlement:** USDC on Base · **SDK:** `@croo-network/sdk`

---

## The Story Behind AuraAI

Walk into any beauty store or open any shopping app and you'll find thousands of
skincare products. Every bottle promises brighter skin, fewer breakouts, or a
youthful glow. But one question stays unanswered:

> *"Which one is actually right for my skin?"*

Most people don't know. So they rely on influencers, viral trends, random
reviews, or dermatologist consultations that aren't always affordable or
accessible.

Current AI skincare apps aren't much better. Some bury users in questionnaires.
Others scan a selfie and hand back a score — *82/100* — without explaining what
the number means, why it was given, or how the recommendation was reached.

People don't need another AI prediction. They need an AI that **understands,
explains, and earns their trust** — and, increasingly, one that other software
can *call on* to do the same. That's why we built AuraAI.

## Our Vision

We believe AI shouldn't replace experts — it should make expert knowledge
accessible to everyone.

AuraAI isn't a single skin classifier. It behaves like a **team of specialists
working together behind the scenes.** And on AuraAI those specialists are not a
metaphor: each is a real agent with its own identity and wallet that **discovers,
hires, and pays the others per task** over CAP. One simple selfie becomes
personalized, research-backed guidance — assembled, priced, and settled on-chain
by a small economy of cooperating agents.

Instead of asking *"What is your skin type?"*, AuraAI asks
*"What is your skin trying to tell us?"*

## How AuraAI Thinks

A good dermatologist doesn't glance at your face and immediately sell you a
product. They observe, verify, compare — *then* recommend. AuraAI follows the
same philosophy, one specialist agent per step.

### Step 1 — Can we trust this image?

Before any prediction, the **Image Quality Agent** checks that the selfie is
actually usable — face present, in focus, well-lit, right angle, sufficient
resolution. A poor capture is **rejected and the caller is refunded** before a
cent is spent on analysis. Even the smartest model can't produce reliable
results from bad input, and a cost-aware agent shouldn't charge for one.

### Step 2 — Understanding your skin

Once the image passes, a trained computer-vision model classifies skin type —
**oily, dry, combination, or normal** — with a confidence score. This becomes
the foundation for everything that follows. *(Real, trained model.)*

### Step 3 — Looking beyond skin type

Oily skin doesn't always mean acne; dry skin doesn't always mean a damaged
barrier. Real skin is more complex, so the **Skin Concern Agent** analyzes many
concerns at once — acne, blackheads, dark spots, pigmentation, enlarged pores,
redness, wrinkles, and dark circles — each with a severity and the regions
affected, from a trained multi-concern model. Not one generic label; a complete
picture. *(Real, trained model.)*

### Step 4 — Measuring what a model can't see alone

Deep learning is powerful but not infallible. AuraAI pairs it with classical
computer vision to measure **objective** signals — skin-tone (ITA°), redness
(CIELAB a\*), brightness (CIELAB L\*), texture, contrast, and a photometric
dark-circle estimate. These are measurements, not guesses, and they anchor the
model's predictions in something verifiable. *(Real.)*

### Step 5 — Grounded guidance, not guesswork

Rather than let a language model free-associate skincare advice, AuraAI grounds
its reasoning in a **curated organic-care knowledge base** — a DIY-recipe
library, an organic-oils database, and a natural-beauty reference — so
recommendations trace back to real ingredients and methods, not a model's
memory. Every suggestion comes with the *why*.

### Step 6 — Verification before recommendation

The biggest failure of modern AI is **confidence without certainty.** AuraAI
builds verification into the protocol itself. Every specialist's delivery
carries **verifiable signals** — the quality agent returns measured sharpness and
exposure numbers; the concern model returns coverage counts and regions — so
when one agent's work is accepted and paid, that acceptance is checked against
real evidence, not rubber-stamped. Work that fails its check is disputed and
refunded rather than passed downstream. Trust is earned through verification.

### Step 7 — A routine built for you

Now AuraAI understands your skin, and it composes a routine designed for it —
and explains every choice:

- **Morning:** gentle cleanser → targeted serum → moisturizer → sunscreen
- **Night:** cleanser → treatment → moisturizer
- **Weekly:** exfoliation, recovery masks, barrier repair

No black-box scores. Only transparent guidance you can act on.

### A note on safety

AuraAI gives **cosmetic guidance only — never a medical diagnosis** — with the
disclaimer on every surface, and defers anything medical-looking to a
dermatologist. Faces are biometric data: uploads are validated and **not stored
without consent**; the pipeline echoes only a filename and byte-count, never raw
image bytes. On-chain, only **order metadata and reputation** are public —
**your face never touches the chain.**

## What Makes AuraAI a CROO Agent (not just an app)

This is the part that makes AuraAI live on CROO rather than behind a private API.
CAP gives each agent four things a normal API can't:

- **Identity & wallet.** AuraAI registers on CROO and receives a decentralized
  identity (DID) and an account-abstraction wallet. It's a first-class economic
  actor, not an endpoint.
- **Coordination (H2A *and* A2A).** It accepts orders from a human using the Aura
  app **and** from other agents hiring it as a dependency — through one
  standardized CAP order flow: `negotiate → accept → pay (escrow) → deliver →
  settle`.
- **Settlement.** Every job is a real transaction — terms escrowed, result
  delivered, payment settled automatically in **USDC on Base.**
- **Reputation.** Each completed, verified job builds AuraAI's on-chain service
  history, so callers can rank it by proven quality instead of marketing.

**AuraAI is hireable.** Listed on the CROO Agent Store, any other agent — a
beauty-commerce bot, a wellness concierge, a virtual try-on agent — can pay to
call it instead of building skin analysis themselves.

**AuraAI hires others.** Internally, the concierge composes each scan by
**paying its specialist agents per micro-task** — quality, skin type, concerns,
metrics, and remedy — each an independently priced, reputation-ranked agent.
Running one scan end-to-end produces a chain of **settled A2A orders**, on-chain
proof that the analysis was assembled by an economy of agents, not a monolith.
As the CROO network grows, AuraAI can swap in cheaper or higher-reputation
specialists — including ones built by other teams — per request. That
composition, priced and settled per call with no prior relationship, is only
possible on an agent-commerce protocol.

## Why AuraAI Is Different

Most skincare apps answer one question: *"What skin type do you have?"*
AuraAI answers five:

1. What does your skin look like?
2. Why does it look that way?
3. How confident are we in the analysis?
4. What should you do next?
5. Why is that recommendation right for you?

— and then does something no prediction engine does: it **charges for the answer,
verifies it, settles on-chain, and stakes its reputation on it.** That turns AI
from a prediction engine into a *trusted, economically accountable*
decision-support system.

## Technical Architecture

```text
                 Human (Aura app)          Another agent (A2A)
                        │                          │
                        └───────────┬──────────────┘
                                    ▼
                          CAP order (via @croo-network/sdk)
                                    ▼
                          AuraAI Concierge Agent
                                    │  hires + pays per task ↓
        ┌───────────────┬──────────┼───────────┬───────────────┐
        ▼               ▼          ▼            ▼               ▼
  Image Quality    Skin Type   Skin Concern   CV Metrics    Remedy /
     Agent           Agent        Agent         Agent      Guidance Agent
        └───────────────┴──────────┴───────────┴───────────────┘
                                    ▼
                    Verified delivery → settle (USDC on Base)
                                    ▼
                     Reputation + listing on CROO Agent Store
```

Every agent owns one task, which makes the system modular, explainable,
independently improvable — and independently *hireable and priced.*

## Roadmap

- **Now:** the five specialist agents above run and settle real CAP orders;
  AuraAI is listed and callable; the concierge composes each scan A2A.
- **Next:**
  - a dedicated **Verification Agent** that cross-references CV measurements, model
    predictions, scientific sources, and ingredient compatibility before advice
    ships;
  - a **Shopping Agent** — a natural *external* CAP hire — that matches products by
    skin type, concern, active ingredients, and budget (ingredient-compatibility
    first, brand-neutral);
  - true **retrieval-augmented generation** over the curated knowledge base;
  - skin-history memory and routine reminders for repeat scans.
- **Later:** richer concern localization, confidence calibration, and tone
  fairness across Fitzpatrick I–VI; more external A2A dependencies
  (translation, dermatology triage, checkout).

## Why This Matters

Millions of people struggle to understand their skin. Some spend years on
products that don't work; others never start because they don't know how.
Professional advice is valuable but not always affordable or accessible. AuraAI
bridges that gap — combining computer vision, specialized agents, grounded
research, and transparent reasoning to put personalized skincare guidance in
anyone's pocket.

And by making each of those specialists a real, paid, verifiable agent on CROO,
we're doing something more: giving expert skin analysis an **identity, a price,
and a reputation** — so it can be trusted, hired, and improved by an entire
network, not just one app.

Our mission is simple: **help people understand their skin before telling them
what to buy.** Because the future of AI isn't about generating more answers —
it's about generating answers people can *trust.*

---

**Links:** GitHub: `<add repo URL>` · Demo video: `<add ≤5-min video>` · Agent Store listing: `<add>` · License: MIT.
