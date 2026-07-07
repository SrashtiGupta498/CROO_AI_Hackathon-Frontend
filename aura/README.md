# Aura Skin Concierge — an A2A skincare agent on CROO (CAP)

> A skincare **concierge agent** that, given a selfie and a goal, autonomously **hires and pays specialist agents on-chain** (skin-type, concern-detection, metrics, remedy-knowledge, routine-planning) via the **CROO Agent Protocol (CAP)** and returns a grounded, personalized ritual.
>
> Built for the **CROO Agent Hackathon** — *Build Agents. Compose Value.*

**Why this can't be done on a normal API marketplace:** a normal marketplace needs pre-negotiated accounts, API keys, and contracts with every provider. Here, the concierge **discovers, hires, and settles with agents permissionlessly, per micro-task**, and quality is enforced by on-chain reputation — so the diagnosis is assembled *on the fly* from whichever specialist agents are best and cheapest at that moment, including agents built by other teams.

---

## 1. What it is

A single user scan fans out into a **mesh of agent-to-agent (A2A) CAP orders**. The user pays the concierge once (H2A); the concierge pays each specialist per-use (A2A):

```
                         ┌─────────────────────────────┐
        selfie + goal    │   Aura Concierge Agent      │  ← H2A: user pays this one
   user ───────────────► │   (orchestrator, DID+wallet)│
                         └──────────────┬──────────────┘
                    hires & pays (A2A CAP orders), on-chain on Base
        ┌───────────────┬──────────────┼───────────────┬────────────────┐
        ▼               ▼              ▼                ▼                ▼
 ┌────────────┐  ┌────────────┐ ┌────────────┐  ┌──────────────┐ ┌──────────────┐
 │ Quality    │  │ Skin-Type  │ │ Concern    │  │ Skin-Metrics │ │ Remedy/RAG   │
 │ Gate Agent │  │ Agent(CNN) │ │ Agent(CNN) │  │ Agent (CV)   │ │ Knowledge Ag.│
 └────────────┘  └────────────┘ └────────────┘  └──────────────┘ └──────────────┘
                                                         │
                                          ┌──────────────┴───────────────┐
                                          ▼                              ▼
                                 ┌──────────────────┐          ┌───────────────────┐
                                 │ Routine-Planner  │          │  External agents  │
                                 │ Agent (LLM)      │          │  hired on CROO:   │
                                 └──────────────────┘          │  translate, derm- │
                                                               │  knowledge, image │
                                                               │  storage, commerce│
                                                               └───────────────────┘
```

Each arrow is a **CAP order** with the full `Negotiate → Lock → Deliver → Clear` lifecycle. One demo scan = **6–10 real CAP orders** — which directly feeds the "10+ real CAP orders" bonus and the A2A-composability score.

---

## 2. How this maps to the judging criteria

| Criterion | Weight | How this project scores |
|---|---|---|
| **Technical Execution** — robust CAP integration, reliable A2A, payment-state handling | **30%** | Every stage is a CAP-registered agent with a DID+wallet; the concierge drives the full `Negotiate→Lock→Deliver→Clear` state machine with idempotent orders, retries, and dispute handling. Each scan emits multiple real CAP orders on Base. |
| **A2A Composability** — number, diversity, depth of A2A relationships | **25%** | 6+ internal specialist agents **plus external agents hired on the CROO Agent Store** (translation, derm-knowledge, image storage, commerce). Bidirectional: our Skin-Analysis Agent is itself **listed for other agents to hire**. |
| **Innovation** — hard-to-replicate; worse on a normal API marketplace? | **20%** | Per-scan, permissionless assembly of a diagnosis from independently-priced, reputation-ranked agents. Impossible without accounts/keys/contracts on a normal marketplace. |
| **Usability & Real Adoption** — real users, retention | **15%** | Consumer skincare app with a real UI (React), skin-history memory, and daily-routine reminders → repeat scans → recurring CAP orders. |
| **Presentation** — demo clarity, README reproducibility | **10%** | This README + [ARCHITECTURE.md](ARCHITECTURE.md) + a one-command demo that prints the CAP order trail. |

---

## 2b. Submission gates (all 5 are mandatory) & tracks

Deadline **Jul 12, 2026, 21:30 GMT+5:30**. A BUIDL is only valid if **all five** are satisfied:

| # | Mandatory requirement | Status | Where |
|---|---|---|---|
| 1 | **Listed on CROO Agent Store** — discoverable by humans & agents | ☐ TODO | register Skin-Analysis Agent's service listing |
| 2 | **Integrated with CAP** — agent is callable & settles on-chain | ☐ TODO | `agents/` + Base wallet |
| 3 | **Open source** — public GitHub repo, permissive license | ✅ | [LICENSE](LICENSE) (MIT) |
| 4 | **Demo (≤5 min) + README** — setup, SDK methods used, integration notes | ◑ README done, video TODO | this file + [ARCHITECTURE.md](ARCHITECTURE.md) |
| 5 | **BUIDL filed on DoraHacks** — all fields complete | ☐ TODO | dorahacks.io |

**Tracks (max 2 per BUIDL):**
- **Primary — Open · Any A2A Agents:** a skincare concierge that composes specialist agents.
- **Secondary — Research & Intelligence Agents:** *paid analysis with verifiable sources* — the Skin-Analysis Agent returns a structured report and the Remedy/RAG agent cites its sources, which fits this track exactly.

> **Scope reality (9 days):** the five gates above are non-negotiable and one of them is *getting live on a marketplace*. **Ship one excellent, listed, callable, on-chain agent first** (the Skin-Analysis Agent). Add A2A depth (hiring other agents) only after all five gates pass. A live single agent beats an unlisted mesh.

---

## 3. The agents (each is CAP-registered: DID + wallet + service listing)

| Agent | Role | Pays / is paid | Backed by |
|---|---|---|---|
| **Aura Concierge** | Orchestrator; H2A entry point; runs the plan→hire→settle loop | receives H2A order; places A2A orders | LLM planner + CAP SDK |
| **Quality-Gate Agent** | Validates the selfie (face/blur/exposure) before spending on analysis | paid per scan | OpenCV (`quality.py`) |
| **Skin-Type Agent** | Classifies `dry/oily/normal/combination` | paid per scan | EfficientNet-B0 (`predict.py`) |
| **Concern Agent** | Detects `acne, dark_spots, pigmentation, redness, pores, …` + severity | paid per scan | patch CNN (`face_analysis.py`) |
| **Skin-Metrics Agent** | ITA° tone, redness, brightness | paid per scan | OpenCV/CIELAB (`skin_metrics.py`) |
| **Remedy/RAG Agent** | Grounded organic-remedy retrieval (no hallucination) | paid per query | vector store over the remedy KB + PDF |
| **Routine-Planner Agent** | Assembles AM/PM ritual from all results | paid per plan | LLM (`gemini_agent.py`) |
| *(external)* | translation / derm-knowledge / storage / commerce agents on CROO | hired A2A | other teams' agents |

> The perception models (CNNs + CV) already exist and work — see §5. The hackathon work is **wrapping each as a CAP agent and wiring the A2A payment mesh**, not retraining models.

---

## 4. The CAP order lifecycle (payment-state handling)

Every A2A hop implements the CAP lifecycle explicitly (this is the 30%-weighted part):

```
Negotiate ──► Lock ──► Deliver ──► Clear ──► [verify] ─┬─► Settle + reputation++   (pass)
   │            │          │                            └─► Dispute flow            (fail)
   │            │          └── specialist returns result + proof
   │            └── funds escrowed on Base; order id is idempotency key
   └── concierge requests price/terms from the specialist's service listing
```

Implementation notes:
- **Idempotency:** the CAP order id keys every request so retries never double-charge or double-run.
- **Failure handling:** a specialist that fails verification triggers the dispute path; the concierge can re-hire an alternative agent (composability + resilience).
- **State log:** every order's state transitions are persisted and printed by the demo for judges/CROO's aggregated order data.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full state machine, the DID/wallet setup, and the SDK wiring.

---

## 5. Tech stack

**Agent layer (CROO / CAP)**
- CROO Agent Protocol SDK (agent identity DID + wallet, service registration, A2A orders), settlement on **Base**
- Order-lifecycle orchestration (`Negotiate → Lock → Deliver → Clear`), on-chain reputation

**Perception (packaged inside the specialist agents)** — `ml-service/`
- PyTorch + `timm` EfficientNet-B0 (skin-type + concern CNNs), OpenCV (face detect, skin mask, CIELAB metrics), FastAPI serving
- `google-generativeai` (Gemini) for planning/advice; RAG vector store for grounded remedies

**Consumer app** — `aura/`
- React 19 + TypeScript, Vite 6, Tailwind CSS 4, Redux Toolkit, React Router 7, Axios

---

## 6. Run locally

### A. Perception service (the specialist agents' compute)
```bash
cd ml-service
pip install -r requirements.txt
python -m uvicorn src.api:app --port 8000 --reload
curl http://localhost:8000/health
```

### B. CAP agents (identity, wallet, service registration)
```bash
# 1. install the CROO SDK and set env (agent wallet key, RPC, CAP endpoint)
#    cp .env.example .env   &&   fill CROO_* / BASE_RPC_URL / AGENT_PRIVATE_KEY
# 2. register each agent's service on-chain (one-time)
npm run cap:register        # registers Concierge + specialists (DIDs + listings)
# 3. run the concierge agent (drives the A2A order mesh)
npm run agent:concierge
```
*(Exact SDK calls live in `agents/` — see ARCHITECTURE.md §3. Wallet keys are never committed.)*

### C. Consumer frontend
```bash
cd aura
npm install
npm run dev
```

### Demo: prove the CAP orders
```bash
npm run demo:scan -- ./sample_selfie.jpg
# runs one scan end-to-end and prints the CAP order trail:
#   order#1 quality-gate   Negotiate→Lock→Deliver→Clear ✓ settled 0.0001 ETH
#   order#2 skin-type      ...
#   ... (6–10 orders per scan)
```

---

## 7. Privacy & safety

Cosmetic guidance only — **never a medical diagnosis** (persistent disclaimer on every AI surface). Faces are biometric data: uploads are validated and **not stored** without consent; the pipeline echoes only a filename/byte-count, never raw bytes. On-chain, only order metadata and reputation are public — **no face data ever touches the chain.**

---

## 8. Repository map

```
agents/                   # CAP agent wrappers (DID, wallet, service listing, order lifecycle)  ← hackathon core
ml-service/               # perception models the specialist agents call
  └── src/                # quality, predict (skin-type CNN), face_analysis (concern CNN),
                          # skin_metrics (CV), gemini_agent (LLM)
aura/                     # React consumer app (H2A entry → concierge)
  ├── pages/SkinAnalysis.tsx   # selfie → concierge → result
  ├── services/skinAnalysis.ts # calls the concierge agent
  └── data/remedies.ts         # remedy KB (feeds the RAG agent)
ARCHITECTURE.md           # A2A mesh, CAP state machine, model internals, roadmap
```
