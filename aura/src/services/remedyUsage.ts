import API from "./api";

// Talks to the NestJS remedy-usage endpoints (src/module/skin/remedy-usage.*).
// Lets a signed-in user mark a recommended home remedy as "used", see their own
// usage history, and (admin) see aggregate usage across all users. Responses are
// wrapped as { status, message, data }, so we unwrap with `res.data?.data ?? res.data`.

export interface LogRemedyInput {
  remedyName: string;
  target?: string; // concern / skin-type the remedy was recommended for
  source?: "gemini" | "static";
  reportId?: string;
}

export interface MyRemedyRow {
  remedyName: string;
  count: number;
  target?: string;
  lastUsedAt?: string;
}

export interface MyRemedyUsage {
  total: number;
  remedies: MyRemedyRow[];
  recent: Array<{
    _id: string;
    remedyName: string;
    target?: string;
    source?: string;
    createdAt?: string;
  }>;
}

export interface RemedyUsageSummaryRow {
  remedyName: string;
  totalUses: number;
  userCount: number;
  target?: string;
  lastUsedAt?: string;
}

export interface RemedyUsageSummary {
  totalUses: number;
  distinctRemedies: number;
  remedies: RemedyUsageSummaryRow[];
}

/** Read the signed-in user's display name from local session (for the log snapshot). */
function currentUserName(): string | undefined {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "null");
    const name = [u?.FirstName, u?.LastName].filter(Boolean).join(" ");
    return name || u?.Name || undefined;
  } catch {
    return undefined;
  }
}

/** Log one "I used this" tap. Requires a signed-in user. */
export async function logRemedyUse(input: LogRemedyInput) {
  const res = await API.post("/skin/remedy-usage", {
    ...input,
    userName: currentUserName(),
  });
  return res.data?.data ?? res.data;
}

/** The signed-in user's own remedy-usage history + per-remedy counts. */
export async function fetchMyRemedyUsage(): Promise<MyRemedyUsage> {
  const res = await API.get("/skin/remedy-usage/mine");
  return res.data?.data ?? res.data;
}

/** Admin: aggregate usage counts per remedy across all users. */
export async function fetchRemedyUsageSummary(): Promise<RemedyUsageSummary> {
  const res = await API.get("/skin/remedy-usage/summary");
  return res.data?.data ?? res.data;
}
