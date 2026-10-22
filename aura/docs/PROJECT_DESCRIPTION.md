# Aura Skin Concierge — a paid, callable skincare agent on CROO

> **⚠️ Superseded — see [AuraAI.md](AuraAI.md) for the canonical project description.**
> That version merges this document's CAP substance with the AuraAI product story,
> and reconciles every claim to what actually runs today. This file is kept for
> reference (it retains the detailed CAP integration notes below).

**Tracks:** Open · Any A2A Agents (primary) · Research & Intelligence Agents (secondary)
**Protocol:** CROO Agent Protocol (CAP) · **Settlement:** Base · **SDK:** `@croo-network/sdk`

---

## The problem

Thousands of developers have shipped capable AI agents, but almost none can *earn*. A skincare-analysis model sitting behind a private API has no identity, no wallet, no way to be discovered, and no way to get paid per use — and no way for **other** agents to hire it as a building block. The commerce layer simply doesn't exist. CROO is building that layer, and Aura is a real, consumer-grade agent built to live on it.

## What Aura is (one line)

**Aura is a paid, on-chain skincare agent: give it a selfie and a goal, and it returns a structured skin analysis (type, concerns, tone, redness/brightness) plus a personalized, source-cited organic-care routine — callable by humans through an app and by other agents through CAP, settling every job on-chain.**

## What the agent actually does

1. **Input** — a selfie (image) and an optional goal (e.g. "reduce acne, gentle/organic only").
2. **Quality gate** — verifies a usable face photo (face present, in focus, well-lit) before spending compute or the caller's money. A bad photo is rejected and refunded — cost-aware agent behavior.
3. **Perception** — three specialist analyses run over the face:
   - **Skin type** (EfficientNet-B0 CNN): dry / oily / normal / combination, with confidence.
   - **Skin concerns** (patch-based CNN): acne, blackheads, dark spots, pigmentation, pores, redness, wrinkles — each with a severity and the facial regions affected.
   - **Skin metrics** (classical computer vision): ITA° skin tone, redness (CIELAB a\*), brightness (CIELAB L\*), plus a photometric dark-circle estimate. These are deterministic measurements, not guesses.
4. **Grounded guidance** — an LLM planner turns the structured result into an AM/PM routine and organic-ingredient recommendations. Remedies are retrieved from a curated knowledge base (a DIY-recipe library, an organic-oils database, and a natural-beauty reference), so advice is **cited, not hallucinated**.
5. **Output** — a structured JSON report + human-readable routine, delivered back through the CAP order and settled on-chain.

Throughout, Aura gives **cosmetic guidance only — never a medical diagnosis** — and defers anything medical-looking to a dermatologist.

## How Aura uses CAP (the four capabilities)

- **Identity** — Aura registers on CROO and receives a decentralized identity (DID) and an account-abstraction wallet with a programmable treasury. It is a first-class, addressable economic actor.
- **Coordination** — Aura accepts both **H2A** orders (a human using the Aura app) and **A2A** orders (another agent hiring it as a dependency), through the standardized CAP order flow.
- **Settlement** — every job is a real transaction: terms are locked in escrow, the result is delivered, and payment settles automatically on **Base**.
- **Reputation** — each completed, verified job builds Aura's on-chain service history and trust score, so callers can rank it by proven quality, not marketing.

**Order lifecycle:** `Negotiate → Lock (escrow) → Deliver → Clear → verify → settle + reputation` (or dispute on a failed check). Delivery includes verifiable signals — the quality gate returns measured sharpness/exposure numbers; the concern model returns coverage counts — so verification is real, not rubber-stamped. Orders are idempotent (keyed by order id) so retries never double-charge.

## A2A composability — why this is a network, not an app

- **Aura is hireable.** Listed on the CROO Agent Store, any other agent can call it: a beauty-commerce bot that needs to recommend products for a customer's skin, a wellness concierge assembling a health plan, or a virtual try-on agent — all can hire Aura as a paid dependency instead of building skin analysis themselves.
- **Aura hires others.** Aura composes value by paying specialist agents per job — a knowledge/RAG agent for grounded remedies, and (as the network grows) external agents on CROO: a translation agent to serve non-English users, a dermatology-triage agent to escalate medical-looking cases, and a commerce/checkout agent so users can actually buy the recommended organic products. Aura literally gets better as the marketplace grows — including from agents that didn't exist when we shipped.

## Why this is hard to replicate on a normal API marketplace (innovation)

On a conventional marketplace you need a pre-negotiated account, API key, and contract with **every** provider, and prices and quality are fixed by static listings. On CAP, Aura discovers specialists permissionlessly, pays only for what it uses per micro-task, can swap in a cheaper or higher-reputation agent per request, and can hire agents built by other teams — all settled on-chain with reputation as the quality signal. A skincare diagnosis is assembled **on the fly** from independently-priced, reputation-ranked agents. That composition, priced and settled per call without any prior relationship, is only possible on an agent-commerce protocol.

## Real users, day one (adoption)

Aura isn't a sandbox demo. It ships with a real consumer product — a React skincare app (selfie analysis, ingredient library, DIY recipes, daily-ritual planner) — that drives genuine H2A traffic to the agent. Skin-history memory plus routine reminders bring users back for repeat scans, and every scan is a real CAP order. The human app and the A2A marketplace feed the same agent, so adoption and composability compound.

## Tech stack

- **Agent / commerce layer:** CROO Agent Protocol via `@croo-network/sdk` (account-abstraction wallet + DID and priced service registered in the CROO Dashboard; the SDK drives the runtime order lifecycle), settlement in USDC on Base.
- **Perception service (Python, FastAPI):** PyTorch + `timm` EfficientNet-B0 (skin-type and concern CNNs), OpenCV (face detection, skin masking, CIELAB metrics), Pillow.
- **Reasoning:** LLM planner (Gemini) over the structured analysis; retrieval-grounded remedy knowledge base.
- **Consumer app:** React 19 + TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Router.

## Integration notes / SDK methods used

The Aura agent (`cap-provider/`) is a thin Node adapter that fronts the Python analysis mesh (`cap-mesh/`). Aura's AA wallet + DID and its priced `skin-analysis` service are registered once in the CROO Dashboard (which issues the SDK-Key); `@croo-network/sdk` then drives the runtime:
- client init with the SDK-Key (`AgentClient`) + WebSocket event stream,
- incoming-order handling: `acceptNegotiation` (backend submits `createOrder` on-chain),
- the order lifecycle: pay (escrow) → `deliverOrder` result → settle on-chain, with `rejectOrder` refunding a failed quality gate.

On each paid order, the adapter parses the caller's requirements, runs the mesh (which composes the scan by paying specialist agents A2A), and returns the structured report through `deliverOrder`. No face data is ever written on-chain — only order metadata and reputation are public.

## Safety & privacy

Cosmetic guidance only, with a persistent disclaimer on every surface. Faces are biometric data: uploads are validated (type + size) and not stored without consent; the pipeline echoes only a filename/byte-count, never raw image bytes. On-chain state carries order metadata and reputation only — never user images.

## Roadmap

- **Now (hackathon):** ship the Skin-Analysis Agent — listed, callable, settling on-chain; wire the Concierge to hire it (A2A); run real orders.
- **Next:** add external A2A dependencies (translation, commerce checkout), skin-history memory, and inbound listings for other agents to hire Aura.
- **Later:** improve the models (multi-label concern head, confidence calibration, landmark-based regions, tone-fairness across Fitzpatrick I–VI) and add localized spot detection for a richer report.

---

**Links:** GitHub: `<add public repo URL>` · Demo video: `<add ≤5-min video>` · Agent Store listing: `<add>` · License: MIT.
