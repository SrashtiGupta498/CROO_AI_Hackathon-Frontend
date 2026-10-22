import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchUserSummary,
  downloadAllReportsPdf,
  downloadUserReportsPdf,
  UserSummaryRow,
} from "../services/skinReports";
import {
  fetchRemedyUsageSummary,
  RemedyUsageSummary,
} from "../services/remedyUsage";
import { formatDate } from "../utils/datetime";
import { describeError } from "../services/errorMessage";

const fmtDate = (iso?: string) => formatDate(iso);

/**
 * Admin dashboard for AI skin-analysis reports. Shows how many users have been
 * analyzed, one row per user with their report count + latest result, a
 * per-user PDF download, and a "Download all as PDF" of every user's reports.
 * Backed by /skin/reports/summary, /skin/reports/user/:id/pdf and
 * /skin/reports/all/pdf (admin-guarded on the server).
 */
const AdminSkinReports = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<UserSummaryRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingUser, setDownloadingUser] = useState<string | null>(null);
  const [usage, setUsage] = useState<RemedyUsageSummary | null>(null);

  // Remedy-usage rollup (best-effort — never blocks the reports table).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchRemedyUsageSummary();
        if (alive) setUsage(data);
      } catch {
        /* usage panel is optional; ignore failures */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchUserSummary();
        if (!alive) return;
        setRows(data.users || []);
        setTotalUsers(data.totalUsers || 0);
      } catch (e: any) {
        if (!alive) return;
        setError(
          describeError(
            e,
            "Couldn't load reports. Are you signed in as an admin?",
          ),
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const totalReports = useMemo(
    () => rows.reduce((sum, r) => sum + (r.reportCount || 0), 0),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.userName, r.userEmail, r.latestSkinType, r.latestTopConcern]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const onDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      await downloadAllReportsPdf();
    } catch (e: any) {
      setError(describeError(e, "Couldn't download the combined PDF."));
    } finally {
      setDownloadingAll(false);
    }
  };

  const onDownloadUser = async (userId: string) => {
    setDownloadingUser(userId);
    try {
      await downloadUserReportsPdf(userId);
    } catch (e: any) {
      setError(describeError(e, "Couldn't download this user's PDF."));
    } finally {
      setDownloadingUser(null);
    }
  };

  return (
    <div className="ae-bg-paper min-h-screen px-6 md:px-10 py-14">
      <section className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-mocha/60 mb-2 flex items-center gap-1"
            >
              <span className="material-icons-round text-base">arrow_back</span>
              Back
            </button>
            <h1 className="text-3xl font-bold text-mocha">Skin Analysis Reports</h1>
            <p className="text-mocha/60 mt-1">
              Every user's AI skin-analysis results.
            </p>
          </div>
          <button
            onClick={onDownloadAll}
            disabled={downloadingAll || totalReports === 0}
            className="px-5 py-3 bg-primary text-white rounded-2xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-40 flex items-center gap-2"
          >
            <span className="material-icons-round text-xl">
              {downloadingAll ? "progress_activity" : "picture_as_pdf"}
            </span>
            {downloadingAll ? "Preparing…" : "Download all as PDF"}
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-cream border border-primary/10 rounded-2xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-mocha/50 font-semibold">
              Users analyzed
            </p>
            <p className="text-4xl font-bold text-mocha mt-1">{totalUsers}</p>
          </div>
          <div className="bg-cream border border-primary/10 rounded-2xl p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-mocha/50 font-semibold">
              Total reports
            </p>
            <p className="text-4xl font-bold text-mocha mt-1">{totalReports}</p>
          </div>
        </div>

        {/* Remedy usage rollup — how much each home remedy is actually used */}
        {usage && usage.remedies.length > 0 && (
          <div className="mb-8 rounded-2xl border border-primary/10 bg-cream shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-primary">spa</span>
                <h2 className="font-bold text-mocha">Home remedy usage</h2>
              </div>
              <p className="text-xs text-mocha/50">
                {usage.totalUses} uses · {usage.distinctRemedies} remedies
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-mocha/50 uppercase text-[11px] tracking-wider border-b border-primary/10">
                    <th className="px-5 py-3 font-semibold">Remedy</th>
                    <th className="px-4 py-3 font-semibold">Recommended for</th>
                    <th className="px-4 py-3 font-semibold text-center">Uses</th>
                    <th className="px-4 py-3 font-semibold text-center">Users</th>
                    <th className="px-4 py-3 font-semibold">Last used</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.remedies.slice(0, 25).map((r) => (
                    <tr
                      key={r.remedyName}
                      className="border-b border-primary/5 last:border-0 hover:bg-primary/5"
                    >
                      <td className="px-5 py-3 font-semibold text-mocha">
                        {r.remedyName}
                      </td>
                      <td className="px-4 py-3 capitalize text-mocha/70">
                        {r.target || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block min-w-7 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                          {r.totalUses}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-mocha/70">
                        {r.userCount}
                      </td>
                      <td className="px-4 py-3 text-mocha/60">
                        {fmtDate(r.lastUsedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, skin type or concern…"
          className="w-full mb-6 px-4 py-3 rounded-2xl border border-primary/15 bg-cream text-mocha placeholder:text-mocha/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {error && (
          <div className="mb-6 bg-[#b4413c]/8 border border-[#b4413c]/20 text-[#8f322e] rounded-2xl p-4 text-sm flex gap-2">
            <span className="material-icons-round text-[#b4413c]">error_outline</span>
            <span>{error}</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-mocha/50">
            <span className="material-icons-round animate-spin text-3xl">
              progress_activity
            </span>
            <p className="mt-2">Loading reports…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-mocha/50">
            <span className="material-icons-round text-4xl">inbox</span>
            <p className="mt-2">
              {rows.length === 0
                ? "No skin reports yet."
                : "No users match your search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-cream shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-mocha/50 uppercase text-[11px] tracking-wider border-b border-primary/10">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold text-center">Reports</th>
                  <th className="px-4 py-3 font-semibold">Latest skin type</th>
                  <th className="px-4 py-3 font-semibold">Latest concern</th>
                  <th className="px-4 py-3 font-semibold">Last analyzed</th>
                  <th className="px-4 py-3 font-semibold text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r._id}
                    className="border-b border-primary/5 last:border-0 hover:bg-primary/5"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-mocha">
                        {r.userName || "—"}
                      </p>
                      <p className="text-[11px] text-mocha/50">
                        {r.userEmail || r._id}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block min-w-7 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {r.reportCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-mocha/80">
                      {r.latestSkinType || "—"}
                    </td>
                    <td className="px-4 py-3 text-mocha/80">
                      {r.latestTopConcern || "—"}
                    </td>
                    <td className="px-4 py-3 text-mocha/60">
                      {fmtDate(r.latestAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDownloadUser(r._id)}
                        disabled={downloadingUser === r._id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold active:scale-95 transition-transform disabled:opacity-40"
                        title="Download this user's reports as PDF"
                      >
                        <span className="material-icons-round text-base">
                          {downloadingUser === r._id
                            ? "progress_activity"
                            : "download"}
                        </span>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminSkinReports;
