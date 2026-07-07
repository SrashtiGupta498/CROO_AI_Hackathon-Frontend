/**
 * Environment configuration for the CAP provider.
 *
 * Loads a sibling `.env` (no dependency — a tiny parser below) and validates the
 * variables the provider actually needs, failing fast with an actionable message
 * so a missing SDK-Key never turns into a confusing runtime error mid-order.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Minimal `.env` loader: `KEY=value`, `#` comments, ignores blanks. */
function loadDotEnv(): void {
  const envPath = resolve(__dirname, "..", ".env");
  let text: string;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return; // no .env — rely on the ambient environment
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "" || v.includes("REPLACE_ME")) {
    throw new Error(
      `Missing required env var ${name}. Copy cap-provider/.env.example to ` +
        `cap-provider/.env and fill it in (values come from the CROO Dashboard).`,
    );
  }
  return v;
}

export interface AuraConfig {
  baseURL: string;
  wsURL: string;
  sdkKey: string;
  rpcURL?: string;
  pythonBin: string;
  /** Set only for services registered with require_fund_transfer=true. */
  providerFundAddress?: string;
  /** Requester example only. */
  targetServiceId?: string;
}

let cached: AuraConfig | undefined;

export function getConfig(): AuraConfig {
  if (cached) return cached;
  loadDotEnv();
  cached = {
    baseURL: required("CROO_API_URL"),
    wsURL: required("CROO_WS_URL"),
    sdkKey: required("CROO_SDK_KEY"),
    rpcURL: process.env.BASE_RPC_URL || undefined,
    pythonBin: process.env.PYTHON_BIN || "python",
    providerFundAddress: process.env.CROO_PROVIDER_FUND_ADDRESS || undefined,
    targetServiceId: process.env.CROO_TARGET_SERVICE_ID || undefined,
  };
  return cached;
}
