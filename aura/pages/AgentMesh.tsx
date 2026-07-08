import React, { useEffect, useRef, useState } from "react";
import {
  getCapStatus,
  callAgent,
  callSkinAgent,
  type CapStatus,
  type A2ACallResult,
  type A2ASkinResult,
} from "../services/capA2A";

// Agent-to-Agent (A2A) console. Aura hires another agent's CROO service, the
// platform pays on-chain, and the provider's delivery comes back. Two modes:
//   • Skin selfie — upload a face, hire a skin-analysis agent, render the result
//   • Custom call — any service id + free-form requirements JSON
// Exercises the requester side of CAP (backend: src/module/cap).

type Mode = "skin" | "custom";

const baseScan = (hash?: string) =>
  hash ? `https://basescan.org/tx/${hash}` : undefined;

const short = (s?: string, n = 8) =>
  !s ? "—" : s.length <= n * 2 + 1 ? s : `${s.slice(0, n)}…${s.slice(-n)}`;

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-primary/10 last:border-0">
    <span className="text-xs font-semibold uppercase tracking-wider text-mocha/60">
      {label}
    </span>
    <span className="text-sm text-mocha text-right break-all">{children}</span>
  </div>
);

const TxLink: React.FC<{ hash?: string }> = ({ hash }) => {
  const url = baseScan(hash);
  if (!url) return <span className="text-mocha/40">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-primary hover:underline font-mono"
    >
      {short(hash)}
    </a>
  );
};

const AgentMesh: React.FC = () => {
  const [status, setStatus] = useState<CapStatus | null>(null);
  const [statusErr, setStatusErr] = useState(false);
  const [mode, setMode] = useState<Mode>("skin");

  const [serviceId, setServiceId] = useState("");
  const [requirements, setRequirements] = useState(
    '{\n  "task": "example",\n  "text": "hello agent"\n}'
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<A2ACallResult | A2ASkinResult | null>(null);

  useEffect(() => {
    getCapStatus()
      .then(setStatus)
      .catch(() => setStatusErr(true));
  }, []);

  const onPick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const run = async () => {
    setError(null);
    setResult(null);

    if (mode === "custom" && !serviceId.trim()) {
      setError("Enter a target service id.");
      return;
    }
    if (mode === "skin" && !file) {
      setError("Choose a selfie to analyze.");
      return;
    }

    let parsedReq: Record<string, unknown> = {};
    if (mode === "custom") {
      try {
        parsedReq = JSON.parse(requirements || "{}");
      } catch {
        setError("Requirements must be valid JSON.");
        return;
      }
    }

    setBusy(true);
    try {
      const res =
        mode === "skin"
          ? await callSkinAgent(file!, serviceId.trim() || undefined)
          : await callAgent(serviceId.trim(), parsedReq);
      setResult(res);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "The A2A call failed. Is the provider agent running and funded?"
      );
    } finally {
      setBusy(false);
    }
  };

  const skinAnalysis =
    result && "analysis" in result ? (result as A2ASkinResult).analysis : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-mocha flex items-center gap-2">
          <span className="material-icons-round text-primary">hub</span>
          Agent Mesh · A2A Console
        </h1>
        <p className="text-sm text-mocha/60 mt-1">
          Hire another AI agent over CROO CAP. The platform negotiates, pays in
          USDC on Base, and returns the provider's delivery.
        </p>
      </header>

      {/* CAP readiness banner */}
      <div className="mb-6">
        {statusErr ? (
          <Banner tone="warn">
            Couldn't reach the backend at <code>/v1/cap/status</code>. Start the
            API server.
          </Banner>
        ) : !status ? (
          <Banner tone="muted">Checking CAP status…</Banner>
        ) : status.requesterReady ? (
          <Banner tone="ok">
            Requester agent connected — A2A calls are live.
            {status.settlementEnabled
              ? " Per-scan settlement is also on."
              : ""}
          </Banner>
        ) : (
          <Banner tone="warn">
            CAP requester not configured on the server. Set{" "}
            <code>CROO_API_URL</code>, <code>CROO_WS_URL</code> and{" "}
            <code>CROO_REQUESTER_SDK_KEY</code>. Calls will fail until then.
          </Banner>
        )}
      </div>

      {/* Mode toggle */}
      <div className="inline-flex rounded-full bg-primary/10 p-1 mb-5">
        {(["skin", "custom"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              mode === m
                ? "bg-primary text-white shadow"
                : "text-mocha/70 hover:text-mocha"
            }`}
          >
            {m === "skin" ? "Skin selfie" : "Custom call"}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl shadow-sm border border-primary/10 p-5 space-y-4">
        {mode === "skin" ? (
          <>
            <div
              onClick={() => fileInput.current?.click()}
              className="cursor-pointer border-2 border-dashed border-primary/30 rounded-xl p-6 text-center hover:bg-primary/5 transition"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="selfie"
                  className="mx-auto max-h-52 rounded-lg object-cover"
                />
              ) : (
                <div className="text-mocha/50">
                  <span className="material-icons-round text-4xl">
                    add_a_photo
                  </span>
                  <p className="text-sm mt-2">Tap to choose a selfie</p>
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </div>
            <Field label="Skin-analysis service id (optional)">
              <input
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                placeholder="defaults to server's CROO_TARGET_SERVICE_ID"
                className="input"
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Target service id">
              <input
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                placeholder="svc_…"
                className="input"
              />
            </Field>
            <Field label="Requirements (JSON)">
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={6}
                spellCheck={false}
                className="input font-mono text-xs"
              />
            </Field>
          </>
        )}

        <button
          onClick={run}
          disabled={busy}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold shadow disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <span className="material-icons-round animate-spin text-lg">
                progress_activity
              </span>
              Negotiating · paying · awaiting delivery…
            </>
          ) : (
            <>
              <span className="material-icons-round text-lg">bolt</span>
              Run A2A call
            </>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-primary/10 p-5">
          <h2 className="font-bold text-mocha mb-3 flex items-center gap-2">
            <span className="material-icons-round text-green-600">
              verified
            </span>
            On-chain result
          </h2>
          <Row label="Order">
            <span className="font-mono">{short(result.orderId, 10)}</span>
          </Row>
          <Row label="Status">
            <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
              {result.status}
            </span>
          </Row>
          <Row label="Price">
            {result.price
              ? `${result.price} ${short(result.paymentToken, 4)}`
              : "—"}
          </Row>
          <Row label="Create tx">
            <TxLink hash={result.txHashes?.create} />
          </Row>
          <Row label="Pay tx">
            <TxLink hash={result.txHashes?.pay} />
          </Row>
          <Row label="Deliver tx">
            <TxLink hash={result.txHashes?.deliver} />
          </Row>

          <h3 className="font-semibold text-mocha mt-5 mb-2 text-sm uppercase tracking-wider">
            Delivery
          </h3>
          <pre className="bg-primary/5 rounded-lg p-3 text-xs text-mocha overflow-auto max-h-96">
            {skinAnalysis
              ? JSON.stringify(skinAnalysis, null, 2)
              : result.delivery.schema ||
                result.delivery.text ||
                "(empty delivery)"}
          </pre>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border: 1px solid rgb(0 0 0 / 0.1);
          border-radius: 0.75rem;
          padding: 0.6rem 0.8rem;
          font-size: 0.875rem;
          outline: none;
          background: #fff;
        }
        .input:focus { border-color: var(--color-primary, #b98a6a); }
      `}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="text-xs font-semibold uppercase tracking-wider text-mocha/60 mb-1 block">
      {label}
    </span>
    {children}
  </label>
);

const Banner: React.FC<{
  tone: "ok" | "warn" | "muted";
  children: React.ReactNode;
}> = ({ tone, children }) => {
  const styles: Record<string, string> = {
    ok: "bg-green-50 text-green-800 border-green-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    muted: "bg-primary/5 text-mocha/70 border-primary/10",
  };
  return (
    <div className={`text-sm rounded-xl border px-4 py-3 ${styles[tone]}`}>
      {children}
    </div>
  );
};

export default AgentMesh;
