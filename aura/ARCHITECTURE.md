# Architecture — Aura Skin Concierge on CROO (CAP)

How the project is built to win the **CROO Agent Hackathon**: a skincare concierge that composes value by hiring and paying specialist agents over the **CROO Agent Protocol (CAP)**. This doc covers (1) the A2A agent mesh, (2) the CAP order/payment state machine, (3) agent identity & SDK wiring, (4) the composability plan, (5) a criteria-aligned build order, and — as an appendix — (6) the perception models and how to enhance them.

> **Strategic note.** CROO scores CAP integration, A2A composability, and payment-state handling — **not** model accuracy. The CNNs already work. Hackathon effort goes into the agent/payment layer, not retraining models.

---

## 1. CAP in one screen (grounding)

CAP is *"the TCP/IP for Agents"* — a permissionless A2A standard on **Base**. Four capabilities:

| CAP capability | What it gives each agent | We use it for |
|---|---|---|
| **Identity** | a decentralized identity (DID) + wallet | every specialist + the concierge is addressable & payable |
| **Coordination** | standardized A2A and H2A transaction protocol | user→concierge (H2A) and concierge→specialists (A2A) |
| **Settlement** | automated on-chain payment execution | per-scan micropayments settle on Base |
| **Reputation** | verifiable service history + trust score | concierge picks specialists by price × reputation |

**Order lifecycle:** `Negotiate → Lock → Deliver → Clear → verify → (settle + reputation++) | dispute`.

Sources: [cap.croo.network](https://cap.croo.network/), [CROO Network Docs](https://docs.croo.network/), [Chainwire launch](https://chainwire.org/2026/04/15/croo-launches-croo-agent-protocol-powering-the-autonomous-agent-commerce/).

---

## 2. The A2A agent mesh

```
                                   USER
                                    │  selfie + goal ("clear acne, gentle/organic")
                          H2A CAP order (user pays once)
                                    ▼
                    ┌───────────────────────────────────┐
                    │        AURA CONCIERGE AGENT        │
                    │  DID + wallet · LLM planner        │
                    │  plan → hire → observe → settle    │
                    └───────────────┬───────────────────┘
     A2A CAP orders (concierge pays each specialist per-use, on Base)
   ┌──────────┬──────────┬──────────┼──────────┬──────────────┬───────────────┐
   ▼          ▼          ▼          ▼          ▼              ▼               ▼
 Quality   Skin-Type  Concern   Skin-Metrics Remedy/RAG   Routine-       External
 Gate      Agent      Agent     Agent        Agent        Planner Agent  agents (CROO
 Agent     (CNN)      (CNN)     (CV)         (retrieval)  (LLM)          Agent Store)
   │                                              │                            │
 gate: if the selfie fails, the concierge         │                     translate / derm-
 STOPS and refunds — no wasted spend        grounded remedies           knowledge / image
                                            (cited, no hallucination)    storage / commerce
```

**Ordering logic in the concierge (the "agent loop"):**
1. **Plan** — read the goal, decide which specialists are needed.
2. **Hire cheap gate first** — pay the Quality-Gate Agent; if it rejects, stop and refund (cost control = good agent behavior).
3. **Fan out** — place parallel A2A orders to Skin-Type, Concern, Metrics agents.
4. **Compose** — pass results to the Remedy/RAG + Routine-Planner agents.
5. **Reflect** — a guardrail check (no medical claims, every remedy cited); re-hire an alternative agent if one fails verification.
6. **Return** the ritual; all orders settle on-chain.

**Why the split matters for scoring:** each specialist is an independent DID with its own price and reputation, so the mesh has real **A2A depth** (multi-hop: concierge → planner → RAG) and **diversity** (CV, CNN, LLM, retrieval, plus external agents), not just one app calling one API.

---

## 3. CAP order & payment state machine (the 30% criterion)

Every A2A hop is a first-class CAP order. Model it explicitly:

```
        ┌───────────┐  terms agreed   ┌────────┐  funds escrowed  ┌──────────┐
  ─────►│ NEGOTIATE │────────────────►│  LOCK  │─────────────────►│ DELIVER  │
        └───────────┘                 └────────┘                  └────┬─────┘
              │ price/terms from                                        │ result + proof
              │ the service listing                                     ▼
              │                                                   ┌──────────┐
              │                                                   │  CLEAR   │
              │                                                   └────┬─────┘
              │                                                        │ automated verify
              │                            pass ┌────────────────┬─────┘ fail
              │                                 ▼                ▼
              │                         ┌──────────────┐  ┌──────────────┐
              └────── retry (same ──────│   SETTLE +   │  │   DISPUTE    │
                      order id)         │ reputation++ │  │  → re-hire   │
                                        └──────────────┘  │  alternative │
                                                          └──────────────┘
```

**Engineering requirements (what judges check):**
- **Idempotency** — the CAP order id is the idempotency key; retries never double-charge or re-run delivery.
- **Escrow discipline** — funds lock before `Deliver`; settle only after `Clear` + verify.
- **Verification** — each specialist returns a checkable proof (e.g. quality-gate returns pass/fail + measured numbers; concern-agent returns coverage counts) so `verify` is real, not rubber-stamped.
- **Dispute path** — a failed verification routes to dispute and the concierge re-hires an alternative agent (this is also A2A resilience).
- **Observability** — persist and print every state transition; expose a `/orders` view so CROO's aggregated order data and your demo both show the trail.
- **Backpressure/timeouts** — a specialist that never delivers times out into dispute, not a hang.

---

## 4. Agent identity, wallet & SDK wiring

Per the CAP developer flow (add SDK → configure env → deploy agent wallet → register service; wallet verified on-chain):

```
agents/
├── common/
│   ├── capClient.ts       # thin wrapper around the CROO SDK (init identity, place/accept orders)
│   ├── wallet.ts          # loads AGENT_PRIVATE_KEY, connects to Base RPC
│   └── orderMachine.ts    # the Negotiate→Lock→Deliver→Clear state machine (idempotent)
├── concierge/
│   └── index.ts           # H2A intake + plan→hire→settle loop
├── specialists/
│   ├── qualityGate.ts     # wraps ml-service /predict quality; accepts A2A orders, delivers proof
│   ├── skinType.ts        # wraps ml-service skin-type CNN
│   ├── concern.ts         # wraps ml-service concern CNN
│   ├── metrics.ts         # wraps ml-service skin metrics
│   ├── remedyRag.ts       # RAG over data/remedies.ts + PDF
│   └── routinePlanner.ts  # LLM routine assembly
└── register.ts            # one-time: register every agent's service listing (DID + price + schema)
```

Env (never commit keys):
```
CROO_CAP_ENDPOINT=...
BASE_RPC_URL=...
AGENT_PRIVATE_KEY=...          # per-agent wallet
GEMINI_API_KEY=...
```

> Fill the exact SDK method names from the current CAP SDK docs — the shapes above (`capClient`, service listing with price+schema, order state machine) match CAP's documented model (Identity/DID+wallet, service registration, `Negotiate→Lock→Deliver→Clear`).

---

## 5. Composability plan — maximizing the 25%

A2A score = **number × diversity × depth** of relationships. Concrete levers:

1. **Breadth (number).** Ship all 6 internal specialists as separate DIDs → 6+ A2A edges per scan.
2. **Depth (multi-hop).** Concierge → Routine-Planner → Remedy/RAG is a 3-hop chain (an agent that hires another agent). Depth beats a flat fan-out.
3. **Diversity (kinds).** CV + CNN + LLM + retrieval + on-chain commerce = heterogeneous agent types.
4. **External composition (the big one).** Hire agents built by *other* teams on the CROO Agent Store:
   - a **translation agent** → serve non-English users,
   - a **dermatology-knowledge / triage agent** → escalate medical-looking cases,
   - an **image-storage agent** → consented history storage,
   - a **commerce/checkout agent** → let users buy the recommended organic products (revenue + real orders).
5. **Be hireable (bidirectional).** List the **Skin-Analysis Agent** publicly so *other* agents (e.g. a wellness concierge, a beauty-commerce bot) can hire *you*. Inbound A2A relationships = depth + real adoption + more CAP orders.

**CAP-order volume for the bonus:** one scan ≈ 6–10 A2A orders. Run a handful of real demo scans + publish the agent for inbound orders → comfortably clears "10+ real CAP orders."

---

## 6. Build order (criteria-weighted — do in this sequence)

| # | Milestone | Serves | Why now |
|---|---|---|---|
| **1** | One agent (Skin-Type) fully CAP-registered: DID, wallet, service listing, accepts an A2A order end-to-end on Base testnet | Tech Exec (30%) | Proves the hardest part — real on-chain order/settlement — before scaling |
| **2** | Concierge places an A2A order to that agent with the full `Negotiate→Lock→Deliver→Clear` machine + idempotency + dispute path | Tech Exec (30%) | This is the payment-state-handling the rubric weights most |
| **3** | Wrap the remaining specialists (quality, concern, metrics) as CAP agents; concierge fans out | A2A (25%) | Breadth + diversity of relationships |
| **4** | Add the Remedy/**RAG** agent (grounded, cited) + Routine-Planner → multi-hop chain | A2A depth (25%), Innovation (20%) | Depth + a hard-to-replicate, grounded product |
| **5** | Hire ≥1 **external** CROO agent (translation or commerce) | A2A diversity (25%), Adoption (15%) | Composition with other teams is the differentiator |
| **6** | List your Skin-Analysis Agent for inbound hire; wire skin-history memory + daily reminders | Adoption (15%) | Retention + inbound CAP orders |
| **7** | One-command demo that prints the CAP order trail; polish README | Presentation (10%) | Reproducibility is explicitly scored |

**If you only ship milestones 1–4, you have a real CAP-native A2A product.** 5–7 win the margins.

---

## 7. Innovation narrative (the 20%)

Frame it exactly as the rubric asks — *"impossible or much worse on a normal API marketplace":*

> "Aura assembles each skin diagnosis on the fly by hiring independent specialist agents per scan and settling with them on-chain per micro-task. On a normal API marketplace this needs a pre-negotiated account, API key, and contract with every provider, and prices/quality are fixed by static listings. On CAP, the concierge discovers specialists permissionlessly, pays only for what it uses, swaps in a cheaper or higher-reputation agent per request, and can even hire agents that didn't exist when we shipped — including other teams'. The product literally gets better as the network grows."

---

## Appendix A — Perception models (already built; inside the specialist agents)

The specialist agents wrap an existing FastAPI pipeline. Not the hackathon focus, but here's what runs and how it could improve later.

| Model | Type | Backbone | Output |
|---|---|---|---|
| Skin-type | CNN | EfficientNet-B0 (`timm`, 224px, softmax) | `combination, dry, normal, oily` + confidence |
| Concern | patch CNN | EfficientNet-B0 | `acne, blackheads, dark_spots, pigmentation, pores, redness, wrinkles, clear` + severity + regions |
| Skin metrics | classical CV | OpenCV + CIELAB | ITA° tone, redness (a\*), brightness (L\*) |
| Dark circles | photometric | CIELAB L\* delta | severity + score |
| Quality gate | classical CV | Haar + Laplacian | face / resolution / sharpness / exposure |
| Advice | LLM | Gemini | explain / routine / product |

**Concern pipeline detail:** detect face (Haar) → split into named regions → tile into patches → drop tiles <55% skin (YCrCb+HSV mask) → batch-classify → aggregate **coverage → severity** with conf floor 0.55 and noise floor (≥2 patches, ≥4% coverage).

**Post-hackathon model enhancements (deprioritized for CROO):**
1. Concern head **softmax → multi-label sigmoid** (co-occurring concerns per patch).
2. **Confidence calibration** (temperature scaling) so the numbers agents act on are trustworthy.
3. **MediaPipe FaceMesh landmarks** instead of Haar → exact under-eye/cheek regions.
4. **YOLO spot detection + acne severity head** for a high-wow localized demo.
5. Datasets to improve them: **ACNE04** (acne+severity), **Fitzpatrick17k** (tone fairness), **SCIN**, **DermNet**, plus a **custom tone-balanced real-selfie set**. Track per-Fitzpatrick-tone accuracy (target gap < 5–10%).

## Appendix B — Data & fairness

If/when models are retrained: no single dataset covers all concerns on real faces; combine ACNE04 + DermNet + Fitzpatrick17k + SCIN and collect real phone selfies across skin tones. Report per-concern F1 and per-tone accuracy — not overall accuracy.
