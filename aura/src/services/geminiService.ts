import API from "./api";

// Gemini calls go through the NestJS backend (/v1/ai/*), which holds the API
// key server-side. The key used to be inlined into this bundle by Vite, where
// anyone loading the site could read it. Responses are wrapped as
// { status, message, data }, so we unwrap with `res.data?.data ?? res.data`.

export class GeminiService {
  /**
   * Multi-turn chat reply. Sends the transcript (not just the latest message)
   * so follow-ups like "how often?" resolve; `reportSummary` (the user's latest
   * scan) is folded into the system prompt server-side. Returns null on failure
   * so the page can show its own fallback text.
   */
  async getChatReply(
    history: { role: "user" | "bot"; text: string }[],
    reportSummary?: string | null,
  ): Promise<string | null> {
    try {
      const res = await API.post("/ai/chat", {
        history,
        ...(reportSummary ? { reportSummary } : {}),
      });
      const data = res.data?.data ?? res.data;
      return data?.reply ?? null;
    } catch (error) {
      console.error("Gemini chat error:", error);
      return null;
    }
  }

  /** Admin-only: derive compact article metadata JSON from raw content. */
  async getArticleStructure(input: {
    title?: string;
    subtitle?: string;
    content: string;
  }): Promise<unknown> {
    const res = await API.post("/ai/article-structure", input);
    return res.data?.data ?? res.data;
  }
}
