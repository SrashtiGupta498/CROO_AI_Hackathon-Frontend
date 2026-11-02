import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { describeError } from "../services/errorMessage";
import { AppDispatch, RootState } from "../store/store";
import {
  fetchCategories,
  fetchSubCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CategoryInput,
} from "../store/categories/categories.action";
import { uploadSingleImage, toAbsoluteUrl } from "../services/uploadImage";

// Backend returns raw Mongo docs (`_id`); the typed slice exposes `id`. Read both.
type Cat = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  isFeatured?: boolean;
  postsCount?: number;
  parentCategory?: string | null;
};

const getId = (c: Cat) => String(c._id || c.id || "");

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const emptyForm = (): CategoryInput => ({
  name: "",
  slug: "",
  description: "",
  icon: "",
  coverImage: "",
  isFeatured: false,
});

// Small reusable form used for both top-level categories and subcategories.
const CategoryForm = ({
  initial,
  busy,
  submitLabel,
  compact,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CategoryInput>;
  busy?: boolean;
  submitLabel: string;
  compact?: boolean;
  onSubmit: (values: CategoryInput) => void;
  onCancel?: () => void;
}) => {
  const toast = useToast();
  const [form, setForm] = useState<CategoryInput>({
    ...emptyForm(),
    ...initial,
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [uploadingCover, setUploadingCover] = useState(false);

  const set = (patch: Partial<CategoryInput>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  // Upload the cover image from the user's device and store its URL.
  const onCoverFile = async (file?: File) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadSingleImage(file);
      if (url) set({ coverImage: url });
    } catch (err: any) {
      console.error(err);
      toast.error(describeError(err, "Couldn't upload that image."));
    } finally {
      setUploadingCover(false);
    }
  };

  const onName = (name: string) =>
    set(slugTouched ? { name } : { name, slug: slugify(name) });

  const submit = () => {
    const name = form.name.trim();
    const slug = slugify(form.slug || form.name);
    if (!name || !slug) return;
    onSubmit({ ...form, name, slug });
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label className="ae-label">Name</label>
        <input
          className="ae-input"
          value={form.name}
          onChange={(e) => onName(e.target.value)}
          placeholder="e.g. Skin Care"
        />
      </div>
      <div>
        <label className="ae-label">Slug</label>
        <input
          className="ae-input"
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set({ slug: slugify(e.target.value) });
          }}
          placeholder="skin-care"
        />
      </div>
      {!compact && (
        <>
          <div className="sm:col-span-2">
            <label className="ae-label">Description</label>
            <textarea
              className="ae-input resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Short description of this category"
            />
          </div>
          <div>
            <label className="ae-label">Icon</label>
            <input
              className="ae-input"
              value={form.icon}
              onChange={(e) => set({ icon: e.target.value })}
              placeholder="fa fa-leaf or URL"
            />
          </div>
          <div>
            <label className="ae-label">Cover image</label>
            {form.coverImage ? (
              <div className="relative">
                <img
                  src={toAbsoluteUrl(form.coverImage)}
                  alt=""
                  className="w-full h-24 object-cover rounded-[var(--ae-r-md)] border border-line"
                />
                <button
                  type="button"
                  onClick={() => set({ coverImage: "" })}
                  className="absolute top-2 right-2 bg-ink/70 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                className={`ae-input flex items-center justify-center gap-2 cursor-pointer text-sage font-semibold ${
                  uploadingCover ? "opacity-60 cursor-wait" : ""
                }`}
              >
                {uploadingCover ? "Uploading…" : "Upload from device"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingCover}
                  className="hidden"
                  onChange={(e) => {
                    onCoverFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <label className="flex items-center gap-2.5 text-sm text-ink sm:col-span-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.isFeatured)}
              onChange={(e) => set({ isFeatured: e.target.checked })}
              className="rounded border-line text-sage focus:ring-sage/30"
            />
            Featured category
          </label>
        </>
      )}
      <div className="sm:col-span-2 flex gap-2.5">
        <button
          onClick={submit}
          disabled={busy || !form.name.trim()}
          className="ae-btn ae-btn-sm ae-btn-primary"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="ae-btn ae-btn-sm ae-btn-outline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

const CategoryManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { categories, loading, subByParent, subLoading } = useSelector(
    (state: RootState) => state.category,
  );
  const { currentUser } = useSelector((state: RootState) => state.user);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate("/Login");
      return;
    }
    dispatch(fetchCategories());
  }, [currentUser, dispatch, navigate]);

  const list = useMemo(
    () => (Array.isArray(categories) ? (categories as Cat[]) : []),
    [categories],
  );

  // Run a thunk, surface its error, and refresh the relevant list(s).
  const run = async (action: any, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const res = await dispatch(action);
      if (res.meta.requestStatus === "rejected") {
        setError(
          typeof res.payload === "string" ? res.payload : "Action failed",
        );
        return false;
      }
      after?.();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (values: CategoryInput) =>
    run(createCategory(values), () => dispatch(fetchCategories()));

  const handleUpdate = (id: string, values: CategoryInput) =>
    run(updateCategory({ id, changes: values }), () => {
      setEditingId(null);
      dispatch(fetchCategories());
    });

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this category? This cannot be undone.")) return;
    run(deleteCategory(id), () => dispatch(fetchCategories()));
  };

  const toggleSubs = (id: string) => {
    setAddingSubFor(null);
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    dispatch(fetchSubCategories(id));
  };

  const handleCreateSub = (parentId: string, values: CategoryInput) =>
    run(createCategory({ ...values, parentCategory: parentId }), () => {
      setAddingSubFor(null);
      dispatch(fetchSubCategories(parentId));
    });

  const handleDeleteSub = (parentId: string, id: string) => {
    if (!window.confirm("Delete this subcategory?")) return;
    run(deleteCategory(id), () => dispatch(fetchSubCategories(parentId)));
  };

  if (!currentUser) return null;

  return (
    <div className="ae-bg-paper min-h-screen px-6 md:px-10 py-14">
      <section className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-12">
          <div>
            <span className="ae-eyebrow">Admin Studio</span>
            <h1 className="ae-h3 text-4xl mt-2.5">Categories</h1>
            <p className="mt-2 text-sm text-[var(--ae-muted)]">
              Create and organise categories and their subcategories.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/content-editor")}
            className="ae-btn ae-btn-sm ae-btn-outline"
          >
            ← Content Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-8 rounded-[var(--ae-r-md)] border border-[#b4413c]/25 bg-[#b4413c]/5 px-4 py-3 text-sm text-[#b4413c]">
            {error}
          </div>
        )}

        {/* Create new top-level category */}
        <div className="ae-card p-6 md:p-8 mb-12">
          <h2 className="ae-h3 text-xl mb-6">New category</h2>
          <CategoryForm
            submitLabel="Create category"
            busy={busy}
            onSubmit={handleCreate}
          />
        </div>

        {/* Existing categories */}
        <div className="flex items-baseline justify-between mb-4">
          <span className="ae-eyebrow">All categories</span>
          {!loading && list.length > 0 && (
            <span className="text-xs text-[var(--ae-muted)]">
              {list.length} {list.length === 1 ? "category" : "categories"}
            </span>
          )}
        </div>

        <div className="ae-card divide-y divide-line">
          {loading ? (
            <p className="p-8 text-sm text-[var(--ae-muted)]">
              Loading categories…
            </p>
          ) : list.length === 0 ? (
            <p className="p-8 text-sm text-[var(--ae-muted)]">
              No categories yet.
            </p>
          ) : (
            list.map((cat) => {
              const id = getId(cat);
              const isEditing = editingId === id;
              const isExpanded = expandedId === id;
              const subs = (subByParent?.[id] as Cat[] | undefined) || [];

              return (
                <div key={id} className="p-6 md:p-8">
                  {isEditing ? (
                    <CategoryForm
                      submitLabel="Save changes"
                      busy={busy}
                      initial={{
                        name: cat.name,
                        slug: cat.slug,
                        description: cat.description,
                        icon: cat.icon,
                        coverImage: cat.coverImage,
                        isFeatured: cat.isFeatured,
                      }}
                      onSubmit={(values) => handleUpdate(id, values)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="ae-h3 text-lg">{cat.name}</h3>
                          <span className="text-xs text-[var(--ae-muted)]">
                            /{cat.slug}
                          </span>
                          {cat.isFeatured && (
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-sage border border-sage/30 px-2 py-0.5 rounded-full">
                              Featured
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <p className="mt-1.5 text-sm text-[var(--ae-muted)] line-clamp-1">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          onClick={() => toggleSubs(id)}
                          className={`ae-btn ae-btn-sm ${isExpanded ? "ae-btn-dark" : "ae-btn-outline"}`}
                        >
                          {isExpanded ? "Hide" : "Subcategories"}
                        </button>
                        <button
                          onClick={() => {
                            setExpandedId(null);
                            setEditingId(id);
                          }}
                          className="ae-btn ae-btn-sm ae-btn-outline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(id)}
                          disabled={busy}
                          className="ae-btn ae-btn-sm ae-btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subcategories panel */}
                  {isExpanded && !isEditing && (
                    <div className="mt-6 pl-4 border-l-2 border-sage/20">
                      {subLoading?.[id] ? (
                        <p className="text-sm text-[var(--ae-muted)]">
                          Loading subcategories…
                        </p>
                      ) : subs.length === 0 ? (
                        <p className="text-sm text-[var(--ae-muted)]">
                          No subcategories yet.
                        </p>
                      ) : (
                        <ul className="flex flex-col">
                          {subs.map((sub) => {
                            const subId = getId(sub);
                            return (
                              <li
                                key={subId}
                                className="group flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-0"
                              >
                                <span className="text-sm text-ink">
                                  {sub.name}
                                  <span className="text-xs text-[var(--ae-muted)] ml-2">
                                    /{sub.slug}
                                  </span>
                                </span>
                                <button
                                  onClick={() => handleDeleteSub(id, subId)}
                                  disabled={busy}
                                  className="text-xs font-semibold text-[#b4413c] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:pointer-events-none"
                                >
                                  Delete
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {addingSubFor === id ? (
                        <div className="mt-5">
                          <CategoryForm
                            compact
                            submitLabel="Add subcategory"
                            busy={busy}
                            onSubmit={(values) => handleCreateSub(id, values)}
                            onCancel={() => setAddingSubFor(null)}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingSubFor(id)}
                          className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-sage hover:text-sage-dark transition-colors"
                        >
                          + Add subcategory
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default CategoryManager;
