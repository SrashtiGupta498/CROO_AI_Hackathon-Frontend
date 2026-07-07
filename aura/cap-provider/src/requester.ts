/**
 * Requester example — Aura (or any agent) hiring another agent over CAP.
 *
 * This is the A2A *buyer* side: it demonstrates how the Aura concierge will hire
 * an external specialist on CROO (translation, dermatology triage, commerce
 * checkout — see the roadmap). Set CROO_TARGET_SERVICE_ID in .env to the service
 * you want to hire, then: `npm run requester`.
 *
 *   negotiateOrder() ─► OrderCreated ─► payOrder() ─► OrderCompleted ─► getDelivery()
 */

import { AgentClient, EventType, type Event } from "@croo-network/sdk";

import { getConfig } from "./config.js";

const cfg = getConfig();

if (!cfg.targetServiceId) {
  console.error(
    "Set CROO_TARGET_SERVICE_ID in cap-provider/.env to the service you want to hire.",
  );
  process.exit(1);
}

const client = new AgentClient(
  { baseURL: cfg.baseURL, wsURL: cfg.wsURL, rpcURL: cfg.rpcURL },
  cfg.sdkKey,
);

async function main(): Promise<void> {
  const stream = await client.connectWebSocket();

  stream.on(EventType.OrderCreated, async (e: Event) => {
    if (!e.order_id) return;
    console.log(`order ${e.order_id} created — paying…`);
    const res = await client.payOrder(e.order_id);
    console.log(`paid (tx ${res.txHash})`);
  });

  stream.on(EventType.OrderCompleted, async (e: Event) => {
    if (!e.order_id) return;
    const delivery = await client.getDelivery(e.order_id);
    console.log("delivery received:");
    console.log(delivery.deliverableText);
    stream.close();
    process.exit(0);
  });

  const neg = await client.negotiateOrder({
    serviceId: cfg.targetServiceId!,
    requirements: JSON.stringify({ task: "example: analyze this data" }),
  });
  console.log(`negotiation opened: ${neg.negotiationId}`);
}

main().catch((err) => {
  console.error("fatal:", (err as Error).message);
  process.exit(1);
});
