/**
 * Bridge from the CAP provider to the Python agent mesh.
 *
 * The real analysis lives in `../cap-mesh` (perception + remedy + the internal
 * A2A concierge). Rather than reimplement it in TypeScript, we shell out to
 * `python -m mesh.analyze_cli`, passing the caller's requirements as JSON on
 * stdin and reading the structured report as JSON on stdout. One source of
 * truth for the analysis, called identically by human (app) and agent (CAP)
 * traffic.
 */

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// cap-provider/src -> ../../cap-mesh
const MESH_DIR = resolve(__dirname, "..", "..", "cap-mesh");

/** Analysis timeout — a scan should be well under this; guards a hung worker. */
const TIMEOUT_MS = 60_000;

export interface AnalysisReport {
  usable: boolean;
  quality?: Record<string, unknown>;
  skin_type?: Record<string, unknown>;
  concerns?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  advice?: string;
  source?: string;
  disclaimer?: string;
  a2a?: Record<string, unknown>;
  error?: string;
}

export function runAnalysis(
  pythonBin: string,
  params: Record<string, unknown>,
): Promise<AnalysisReport> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(pythonBin, ["-m", "mesh.analyze_cli"], {
      cwd: MESH_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`analysis timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));

    child.on("error", (e) => {
      clearTimeout(timer);
      reject(
        new Error(
          `failed to start '${pythonBin}' (${e.message}). Set PYTHON_BIN in .env ` +
            `to a Python that can import ../cap-mesh.`,
        ),
      );
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const text = out.trim();
      if (!text) {
        reject(new Error(`analysis produced no output (exit ${code}). stderr: ${err.trim()}`));
        return;
      }
      try {
        const report = JSON.parse(text) as AnalysisReport;
        // analyze_cli exits 1 with {"error": ...} on failure — surface it.
        if (report.error) reject(new Error(`analysis error: ${report.error}`));
        else resolvePromise(report);
      } catch {
        reject(new Error(`analysis returned non-JSON (exit ${code}): ${text.slice(0, 500)}`));
      }
    });

    child.stdin.write(JSON.stringify(params));
    child.stdin.end();
  });
}
