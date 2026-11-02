import API from "./api";

// Per-concern thumbs up/down on a stored scan. This is the cheap half of the
// feedback loop: no photo is kept, but every verdict is a real label on a real
// selfie — which is the one thing the training sets don't have.
// Backend: src/module/skin/report/skin-report.controller.ts

export type ConcernVerdict = "yes" | "no" | "unsure";
export type OverallVerdict = "accurate" | "partly" | "inaccurate";

export interface ConcernFeedbackItem {
  concern: string;
  verdict: ConcernVerdict;
}

export interface ReportFeedbackPayload {
  concerns: ConcernFeedbackItem[];
  overall?: OverallVerdict;
  note?: string;
}

/**
 * Submit (or replace) the user's verdict on one scan.
 * Requires a signed-in user — `reportId` only exists when the backend stored
 * the report, which it only does for authenticated uploads.
 */
export async function submitReportFeedback(
  reportId: string,
  payload: ReportFeedbackPayload,
): Promise<void> {
  await API.post(`/skin/reports/${reportId}/feedback`, payload);
}

/** Admin: per-concern false-alarm rate across every submitted verdict. */
export interface ConcernFeedbackStat {
  concern: string;
  confirmed: number;
  falseAlarm: number;
  unsure: number;
  missed: number;
  rated: number;
  falseAlarmRate: number | null;
}

export interface FeedbackStats {
  reportsWithFeedback: number;
  totalRated: number;
  overallFalseAlarmRate: number | null;
  concerns: ConcernFeedbackStat[];
}

export async function fetchFeedbackStats(): Promise<FeedbackStats> {
  const res = await API.get("/skin/reports/feedback/stats");
  return res.data?.data ?? res.data;
}
