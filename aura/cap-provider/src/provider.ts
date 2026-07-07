/**
 * Aura CAP provider — the on-chain edge of the skin-analysis agent.
 *
 * Aura's identity, wallet, and "skin-analysis" service are created in the CROO
 * Dashboard (that is what issues CROO_SDK_KEY). This process is pure runtime: it
 * listens for orders on that service and drives the provider side of the CAP
 * lifecycle using @croo-network/sdk.
 *
 *   NegotiationCreated ─► acceptNegotiation()      (backend submits createOrder on-chain)
 *   OrderPaid          ─► run analysis ─► deliverOrder()   (or rejectOrder() to refund)
 *   OrderCompleted     ─► delivery verified, escrow settles to Aura's wallet
 *
 * Payment (escrow + settlement in USDC on Base) is handled entirely by CAP; we
 * never touch keys here — the SDK-Key authorizes the backend to act for Aura's
 * account-abstraction wallet.
 */

import {
  AgentClient,
  DeliverableType,
  EventType,
  type Event,
  type Negotiation,
} from "@croo-network/sdk";

import { getConfig } from "./config.js";
import { runAnalysis, type AnalysisReport } from "./analyze.js";

const cfg = getConfig();

const client = new AgentClient(
  { baseURL: cfg.baseURL, wsURL: cfg.wsURL, rpcURL: cfg.rpcURL },
  cfg.sdkKey,
);

// Requirements parsed at accept time, keyed by orderId so we have them at
// delivery time without a round-trip. Cleared once the order is delivered.
const pendingParams = new Map<string, Record<string, unknown>>();

/** Turn a negotiation's free-form `requirements` string into analysis params. */
function parseRequirements(requirements: string | undefined): Record<string, unknown> {
  if (!requirements) return {};
  try {
    const parsed = JSON.parse(requirements);
    return parsed && typeof parsed === "object" ? parsed : { goal: String(parsed) };
  } catch {
    return { goal: requirements }; // not JSON — treat as a plain-text goal
  }
}

/**
 * Acceptance policy. Kept permissive for the hackathon: accept any well-formed
 * negotiation. The real gate is the quality check at delivery time, which
 * refunds bad captures. Tighten here to price-check or rate-limit later.
 */
function shouldAccept(_neg: Negotiation): boolean {
  return true;
}

async function onNegotiationCreated(e: Event): Promise<void> {
  const negId = e.negotiation_id;
  if (!negId) return;
  try {
    const neg = await client.getNegotiation(negId);
    if (!shouldAccept(neg)) {
      await client.rejectNegotiation(negId, "declined by provider policy");
      console.log(`↩︎  rejected negotiation ${negId}`);
      return;
    }

    // Fund-transfer services need the receive address at accept time.
    const res = cfg.providerFundAddress
      ? await client.acceptNegotiationWithFundAddress(negId, cfg.providerFundAddress)
      : await client.acceptNegotiation(negId);

    const orderId = res.order.orderId;
    pendingParams.set(orderId, parseRequirements(neg.requirements));
    console.log(`✓  accepted ${negId} → order ${orderId} (awaiting payment)`);
  } catch (err) {
    console.error(`✗  negotiation ${negId} failed:`, (err as Error).message);
  }
}

async function onOrderPaid(e: Event): Promise<void> {
  const orderId = e.order_id;
  if (!orderId) return;
  try {
    // Recover params if we missed the accept (e.g. restarted between events).
    let params = pendingParams.get(orderId);
    if (!params) {
      const order = await client.getOrder(orderId);
      const neg = await client.getNegotiation(order.negotiationId);
      params = parseRequirements(neg.requirements);
    }

    console.log(`⚙  order ${orderId} paid — running analysis…`);
    const report: AnalysisReport = await runAnalysis(cfg.pythonBin, params);

    // Cost-aware behavior: an unusable photo is rejected and the escrow refunds.
    if (report.usable === false) {
      await client.rejectOrder(orderId, "unusable image: failed quality gate");
      console.log(`↩︎  order ${orderId} refunded (bad capture)`);
      pendingParams.delete(orderId);
      return;
    }

    const result = await client.deliverOrder(orderId, {
      deliverableType: DeliverableType.Text,
      deliverableText: JSON.stringify(report),
    });
    pendingParams.delete(orderId);
    console.log(`📦  delivered ${orderId} (tx ${result.txHash})`);
  } catch (err) {
    console.error(`✗  delivery for ${orderId} failed:`, (err as Error).message);
  }
}

function onOrderCompleted(e: Event): void {
  console.log(`💰  order ${e.order_id} completed — settled to Aura's wallet`);
}

async function main(): Promise<void> {
  console.log("Aura CAP provider starting…");
  console.log(`   API : ${cfg.baseURL}`);
  console.log(`   WS  : ${cfg.wsURL}`);

  const stream = await client.connectWebSocket();

  stream.on(EventType.NegotiationCreated, (e) => void onNegotiationCreated(e));
  stream.on(EventType.OrderPaid, (e) => void onOrderPaid(e));
  stream.on(EventType.OrderCompleted, (e) => onOrderCompleted(e));
  stream.on(EventType.OrderExpired, (e) =>
    console.warn(`⌛ order ${e.order_id} expired`),
  );

  console.log("listening for orders on the 'skin-analysis' service. Ctrl+C to stop.");

  const shutdown = () => {
    console.log("\nshutting down…");
    stream.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("fatal:", (err as Error).message);
  process.exit(1);
});
