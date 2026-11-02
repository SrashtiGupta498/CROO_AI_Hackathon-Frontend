/* ════════════════════════════════════════════════════════════
   useStoryEditor — central state management for the editor.
   Owns the Story object plus every mutation helper the UI needs.
   ════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Story,
  StoryBlock,
  BlockType,
  BeautyInsight,
  FAQItem,
  SourceItem,
} from "./story.types";
import {
  createEmptyStory,
  createEmptyBlock,
  uid,
  slugify,
  countWords,
  estimateReadingTime,
} from "./blockTypes";
import { StoryService } from "./story.service";

export interface UseStoryEditor {
  story: Story;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  savedFlash: boolean;
  error: string | null;
  dirty: boolean;
  isNew: boolean;
  wordCount: number;
  readingTime: number;

  updateField: <K extends keyof Story>(key: K, value: Story[K]) => void;
  updateSeo: <K extends keyof Story["seo"]>(
    key: K,
    value: Story["seo"][K],
  ) => void;

  // blocks
  addBlock: (type: BlockType) => void;
  updateBlock: (id: string, patch: Partial<StoryBlock>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, dir: -1 | 1) => void;
  duplicateBlock: (id: string) => void;

  // string-list helpers (highlights, tags, keywords)
  addToList: (key: "highlights" | "tags", value?: string) => void;
  updateInList: (
    key: "highlights" | "tags",
    index: number,
    value: string,
  ) => void;
  removeFromList: (key: "highlights" | "tags", index: number) => void;
  addKeyword: (value?: string) => void;
  updateKeyword: (index: number, value: string) => void;
  removeKeyword: (index: number) => void;

  // beauty insights
  addInsight: () => void;
  updateInsight: (id: string, patch: Partial<BeautyInsight>) => void;
  removeInsight: (id: string) => void;

  // faq
  addFaq: () => void;
  updateFaq: (id: string, patch: Partial<FAQItem>) => void;
  removeFaq: (id: string) => void;

  // sources
  addSource: () => void;
  updateSource: (id: string, patch: Partial<SourceItem>) => void;
  removeSource: (id: string) => void;

  save: (status?: Story["status"]) => Promise<Story | null>;
  deletePost: () => Promise<boolean>;
  reset: () => void;
}

export function useStoryEditor(storyId?: string): UseStoryEditor {
  const isNew = !storyId || storyId === "new";

  const [story, setStory] = useState<Story>(createEmptyStory());
  const [currentId, setCurrentId] = useState<string | undefined>(
    isNew ? undefined : storyId,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  /* Load existing story (skipped for new stories). */
  useEffect(() => {
    let active = true;
    if (isNew) {
      setStory(createEmptyStory());
      setCurrentId(undefined);
      return;
    }
    setLoading(true);
    setError(null);
    StoryService.getById(storyId!)
      .then((s) => {
        if (!active) return;
        setStory({ ...createEmptyStory(), ...s });
        setCurrentId(s.id || storyId);
      })
      .catch((e: any) => {
        if (!active) return;
        setError(
          e?.response?.data?.message || e?.message || "Failed to load story",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storyId, isNew]);

  const mutate = useCallback((updater: (prev: Story) => Story) => {
    setStory((prev) => updater(prev));
    setDirty(true);
  }, []);

  const updateField = useCallback<UseStoryEditor["updateField"]>(
    (key, value) => mutate((prev) => ({ ...prev, [key]: value })),
    [mutate],
  );

  const updateSeo = useCallback<UseStoryEditor["updateSeo"]>(
    (key, value) =>
      mutate((prev) => ({ ...prev, seo: { ...prev.seo, [key]: value } })),
    [mutate],
  );

  /* ── Blocks ── */
  const addBlock = useCallback(
    (type: BlockType) =>
      mutate((prev) => ({
        ...prev,
        blocks: [...prev.blocks, createEmptyBlock(type)],
      })),
    [mutate],
  );

  const updateBlock = useCallback(
    (id: string, patch: Partial<StoryBlock>) =>
      mutate((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === id ? ({ ...b, ...patch } as StoryBlock) : b,
        ),
      })),
    [mutate],
  );

  const removeBlock = useCallback(
    (id: string) =>
      mutate((prev) => ({
        ...prev,
        blocks: prev.blocks.filter((b) => b.id !== id),
      })),
    [mutate],
  );

  const moveBlock = useCallback(
    (id: string, dir: -1 | 1) =>
      mutate((prev) => {
        const idx = prev.blocks.findIndex((b) => b.id === id);
        const next = idx + dir;
        if (idx < 0 || next < 0 || next >= prev.blocks.length) return prev;
        const blocks = [...prev.blocks];
        [blocks[idx], blocks[next]] = [blocks[next], blocks[idx]];
        return { ...prev, blocks };
      }),
    [mutate],
  );

  const duplicateBlock = useCallback(
    (id: string) =>
      mutate((prev) => {
        const idx = prev.blocks.findIndex((b) => b.id === id);
        if (idx < 0) return prev;
        const copy = { ...prev.blocks[idx], id: uid("blk") } as StoryBlock;
        const blocks = [...prev.blocks];
        blocks.splice(idx + 1, 0, copy);
        return { ...prev, blocks };
      }),
    [mutate],
  );

  /* ── String lists (highlights / tags) ── */
  const addToList = useCallback(
    (key: "highlights" | "tags", value = "") =>
      mutate((prev) => ({ ...prev, [key]: [...prev[key], value] })),
    [mutate],
  );
  const updateInList = useCallback(
    (key: "highlights" | "tags", index: number, value: string) =>
      mutate((prev) => ({
        ...prev,
        [key]: prev[key].map((v, i) => (i === index ? value : v)),
      })),
    [mutate],
  );
  const removeFromList = useCallback(
    (key: "highlights" | "tags", index: number) =>
      mutate((prev) => ({
        ...prev,
        [key]: prev[key].filter((_, i) => i !== index),
      })),
    [mutate],
  );

  /* ── SEO keywords ── */
  const addKeyword = useCallback(
    (value = "") =>
      mutate((prev) => ({
        ...prev,
        seo: { ...prev.seo, keywords: [...prev.seo.keywords, value] },
      })),
    [mutate],
  );
  const updateKeyword = useCallback(
    (index: number, value: string) =>
      mutate((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          keywords: prev.seo.keywords.map((k, i) => (i === index ? value : k)),
        },
      })),
    [mutate],
  );
  const removeKeyword = useCallback(
    (index: number) =>
      mutate((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          keywords: prev.seo.keywords.filter((_, i) => i !== index),
        },
      })),
    [mutate],
  );

  /* ── Beauty insights ── */
  const addInsight = useCallback(
    () =>
      mutate((prev) => ({
        ...prev,
        beautyInsights: [
          ...prev.beautyInsights,
          { id: uid("ins"), type: "ingredient", title: "", content: "" },
        ],
      })),
    [mutate],
  );
  const updateInsight = useCallback(
    (id: string, patch: Partial<BeautyInsight>) =>
      mutate((prev) => ({
        ...prev,
        beautyInsights: prev.beautyInsights.map((i) =>
          i.id === id ? { ...i, ...patch } : i,
        ),
      })),
    [mutate],
  );
  const removeInsight = useCallback(
    (id: string) =>
      mutate((prev) => ({
        ...prev,
        beautyInsights: prev.beautyInsights.filter((i) => i.id !== id),
      })),
    [mutate],
  );

  /* ── FAQ ── */
  const addFaq = useCallback(
    () =>
      mutate((prev) => ({
        ...prev,
        faq: [...prev.faq, { id: uid("faq"), question: "", answer: "" }],
      })),
    [mutate],
  );
  const updateFaq = useCallback(
    (id: string, patch: Partial<FAQItem>) =>
      mutate((prev) => ({
        ...prev,
        faq: prev.faq.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      })),
    [mutate],
  );
  const removeFaq = useCallback(
    (id: string) =>
      mutate((prev) => ({ ...prev, faq: prev.faq.filter((f) => f.id !== id) })),
    [mutate],
  );

  /* ── Sources ── */
  const addSource = useCallback(
    () =>
      mutate((prev) => ({
        ...prev,
        sources: [...prev.sources, { id: uid("src"), title: "", url: "" }],
      })),
    [mutate],
  );
  const updateSource = useCallback(
    (id: string, patch: Partial<SourceItem>) =>
      mutate((prev) => ({
        ...prev,
        sources: prev.sources.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
      })),
    [mutate],
  );
  const removeSource = useCallback(
    (id: string) =>
      mutate((prev) => ({
        ...prev,
        sources: prev.sources.filter((s) => s.id !== id),
      })),
    [mutate],
  );

  /* ── Derived values ── */
  const wordCount = useMemo(() => countWords(story), [story]);
  const readingTime = useMemo(() => estimateReadingTime(story), [story]);

  /* ── Persist ── */
  const save = useCallback<UseStoryEditor["save"]>(
    async (status) => {
      setSaving(true);
      setError(null);
      try {
        const payload: Story = {
          ...story,
          status: status ?? story.status,
          readingTime: estimateReadingTime(story),
          seo: {
            ...story.seo,
            slug: story.seo.slug || slugify(story.title),
            metaTitle: story.seo.metaTitle || story.title,
            metaDescription:
              story.seo.metaDescription || story.subtitle || story.quickAnswer,
          },
        };

        const result = currentId
          ? await StoryService.update(currentId, payload)
          : await StoryService.create(payload);

        const merged = { ...payload, ...result };
        setStory(merged);
        if (merged.id) setCurrentId(merged.id);
        setDirty(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2200);
        return merged;
      } catch (e: any) {
        setError(
          e?.response?.data?.message || e?.message || "Failed to save story",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [story, currentId],
  );

  /* ── Delete ── */
  const deletePost = useCallback<UseStoryEditor["deletePost"]>(async () => {
    if (!currentId) return false;
    setDeleting(true);
    setError(null);
    try {
      await StoryService.remove(currentId);
      return true;
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to delete story",
      );
      return false;
    } finally {
      setDeleting(false);
    }
  }, [currentId]);

  const reset = useCallback(() => {
    setStory(createEmptyStory());
    setDirty(false);
    setError(null);
  }, []);

  return {
    story,
    loading,
    saving,
    deleting,
    savedFlash,
    error,
    dirty,
    isNew,
    wordCount,
    readingTime,
    updateField,
    updateSeo,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    duplicateBlock,
    addToList,
    updateInList,
    removeFromList,
    addKeyword,
    updateKeyword,
    removeKeyword,
    addInsight,
    updateInsight,
    removeInsight,
    addFaq,
    updateFaq,
    removeFaq,
    addSource,
    updateSource,
    removeSource,
    save,
    deletePost,
    reset,
  };
}

export default useStoryEditor;
