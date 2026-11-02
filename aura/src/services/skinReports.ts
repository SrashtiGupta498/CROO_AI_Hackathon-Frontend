import API from "./api";
import { API_BASE } from "./config";
import type { SelfieAnalysis, SkinAdvice } from "./skinAnalysis";

// Reads the skin-report endpoints added to the NestJS backend
// (src/module/skin/skin-report.controller.ts). Backend responses are wrapped as
// { status, message, data }, so we unwrap with `res.data?.data ?? res.data`.

export interface SkinReport {
  _id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  skinType?: string;
  topConcern?: string;
  source?: "advice" | "selfie";
  analysis?: SelfieAnalysis;
  advice?: SkinAdvice;
  createdAt?: string;
}

export interface AllReports {
  totalReports: number;
  totalUsers: number;
  page: number;
  limit: number;
  items: SkinReport[];
}

export interface UserSummaryRow {
  _id: string; // userId
  userEmail?: string;
  userName?: string;
  reportCount: number;
  latestSkinType?: string;
  latestTopConcern?: string;
  latestAt?: string;
}

export interface UserSummary {
  totalUsers: number;
  users: UserSummaryRow[];
}

/** Admin: every user's reports (paginated) + user/report counts. */
export async function fetchAllReports(
  page = 1,
  limit = 20,
): Promise<AllReports> {
  const res = await API.get("/skin/reports/all", { params: { page, limit } });
  return res.data?.data ?? res.data;
}

/** Admin: one row per user with report count + latest summary. */
export async function fetchUserSummary(): Promise<UserSummary> {
  const res = await API.get("/skin/reports/summary");
  return res.data?.data ?? res.data;
}

/** The signed-in user's own reports (paginated). */
export async function fetchMyReports(page = 1, limit = 20) {
  const res = await API.get("/skin/reports", { params: { page, limit } });
  return res.data?.data ?? res.data;
}

/** Trigger a PDF download in the browser via a temporary object URL. */
async function downloadPdf(path: string, filename: string): Promise<void> {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: user?.AccessToken
      ? { Authorization: `Bearer ${user.AccessToken}` }
      : {},
  });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Admin: download the combined PDF of ALL users' reports. */
export function downloadAllReportsPdf(): Promise<void> {
  return downloadPdf("/skin/reports/all/pdf", "all-users-skin-reports.pdf");
}

/** Download one user's reports as a PDF (self or admin). */
export function downloadUserReportsPdf(userId: string): Promise<void> {
  return downloadPdf(
    `/skin/reports/user/${userId}/pdf`,
    `skin-reports-${userId}.pdf`,
  );
}
