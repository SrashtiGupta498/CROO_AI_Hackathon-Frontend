import API from "./api";

// A2A (agent-to-agent) calls over CAP. Aura acts as the *requester*: it hires
// another agent's CROO service, the platform pays on-chain, and the provider's
// delivery comes back. The backend (BLOGS_WITHAI-master/src/module/cap) does the
// negotiate → pay → await-delivery lifecycle; here we just call it.
//
// Backend responses are wrapped as { status, message, data }, so we unwrap with
// `res.data?.data ?? res.data` (same convention as services/skinAnalysis.ts).

export interface CapStatus {
  /** Requester agent connected — A2A calls are possible. */
  requesterReady: boolean;
  /** Per-scan H2A on-chain settlement is on. */
  settlementEnabled: boolean;
}

export interface A2ACallResult {
  negotiationId: string;
  orderId: string;
  status: string;
  price: string;
  paymentToken: string;
  txHashes: { create: string; pay: string; deliver: string };
  delivery: { type: string; text: string; schema: string };
}

export interface A2ASkinResult extends A2ACallResult {
  /** Parsed provider delivery (the skin analysis JSON), or the raw string. */
  analysis: unknown;
}

/** Is the CAP requester wired up on the server? (safe booleans, no auth needed) */
export async function getCapStatus(): Promise<CapStatus> {
  const res = await API.get("/cap/status");
  return res.data?.data ?? res.data;
}

/** Hire an arbitrary CAP service with free-form requirements (requires login). */
export async function callAgent(
  serviceId: string,
  requirements: Record<string, unknown>
): Promise<A2ACallResult> {
  const res = await API.post(
    "/cap/call",
    { serviceId, requirements },
    { timeout: 180_000 } // negotiate → pay → deliver can take a while on-chain
  );
  return res.data?.data ?? res.data;
}

/**
 * Hire a skin-analysis agent to analyze a selfie over A2A (requires login).
 * `serviceId` is optional — the backend falls back to its CROO_TARGET_SERVICE_ID.
 */
export async function callSkinAgent(
  file: File | Blob,
  serviceId?: string,
  advice = true
): Promise<A2ASkinResult> {
  const form = new FormData();
  form.append("image", file);
  if (serviceId) form.append("serviceId", serviceId);
  form.append("advice", String(advice));

  const res = await API.post("/cap/call/skin", form, { timeout: 180_000 });
  return res.data?.data ?? res.data;
}
