import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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
  const [form, setForm] = useState<CategoryInput>({ ...emptyForm(), ...initial });
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
      alert(err?.message || "Image upload failed.");
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

  const input =
    "w-full px-3 py-2 rounded-xl border border-[#d8ddd8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e7a]/35";

  return (
    <div className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
      <div>
        <label className="block text-xs font-bold text-[#6b8e7a] mb-1">Name</label>
        <input
          className={input}
          value={form.name}
          onChange={(e) => onName(e.target.value)}
          placeholder="e.g. Skin Care"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-[#6b8e7a] mb-1">Slug</label>
        <input
          className={input}
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
            <label className="block text-xs font-bold text-[#6b8e7a] mb-1">Description</label>
            <textarea
              className={input}
              rows={2}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Short description of this category"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6b8e7a] mb-1">Icon</label>
            <input
              className={input}
              value={form.icon}
              onChange={(e) => set({ icon: e.target.value })}
              placeholder="fa fa-leaf or URL"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6b8e7a] mb-1">Cover image</label>
            {form.coverImage ? (
              <div className="relative">
                <img
                  src={toAbsoluteUrl(form.coverImage)}
                  alt=""
                  className="w-full h-28 object-cover rounded-xl border border-[#d8ddd8]"
                />
                <button
                  type="button"
                  onClick={() => set({ coverImage: "" })}
                  className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                className={`${input} flex items-center justify-center gap-2 cursor-pointer text-[#6b8e7a] font-semibold ${
                  uploadingCover ? "opacity-60 cursor-wait" : ""
                }`}
              >
                {uploadingCover ? "Uploading…" : "Upload cover from device"}
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
          <label className="flex items-center gap-2 text-sm text-[#1a1c1b] sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(form.isFeatured)}
              onChange={(e) => set({ isFeatured: e.target.checked })}
            />
            Featured category
          </label>
        </>
      )}
      <div className="sm:col-span-2 flex gap-3">
        <button
          onClick={submit}
          disabled={busy || !form.name.trim()}
          className="px-5 py-2.5 rounded-full bg-[#6b8e7a] text-white text-xs font-bold tracking-[0.08em] uppercase disabled:opacity-50"
        >
          {busy ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-2.5 rounded-full border border-[#1a1c1b] text-[#1a1c1b] text-xs font-bold tracking-[0.08em] uppercase"
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
        setError(typeof res.payload === "string" ? res.payload : "Action failed");
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

  const card = "bg-white border border-[#e3e7e5] rounded-3xl";

  return (
    <div className="min-h-screen bg-[#f5f8f7] px-6 md:px-10 py-10">
      <section className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#6b8e7a] font-bold uppercase">
              Admin Studio
            </p>
            <h1 className="text-3xl md:text-5xl mt-2 font-[Playfair_Display] text-[#1a1c1b]">
              Categories
            </h1>
            <p className="mt-2 text-[#5c6057] max-w-2xl">
              Create and organise categories and their subcategories.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/content-editor")}
            className="px-5 py-3 rounded-2xl border border-[#6b8e7a] text-[#6b8e7a] text-sm font-bold tracking-[0.04em] whitespace-nowrap"
          >
            ← Content Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Create new top-level category */}
        <div className={`${card} p-5 md:p-6 mb-8`}>
          <h2 className="text-lg font-bold text-[#1a1c1b] mb-4">New category</h2>
          <CategoryForm submitLabel="Create category" busy={busy} onSubmit={handleCreate} />
        </div>

        {/* Existing categories */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className={`${card} p-8 text-[#6b7b6f]`}>Loading categories...</div>
          ) : list.length === 0 ? (
            <div className={`${card} p-8 text-[#6b7b6f]`}>No categories yet.</div>
          ) : (
            list.map((cat) => {
              const id = getId(cat);
              const isEditing = editingId === id;
              const isExpanded = expandedId === id;
              const subs = (subByParent?.[id] as Cat[] | undefined) || [];

              return (
                <div key={id} className={`${card} p-5 md:p-6`}>
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
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-[Playfair_Display] text-[#1a1c1b]">
                            {cat.name}
                          </h3>
                          {cat.isFeatured && (
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b8e7a] bg-[#eaf1ec] px-2 py-1 rounded-full">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#7c857a] mt-1">/{cat.slug}</p>
                        {cat.description && (
                          <p className="mt-2 text-sm text-[#5c6057]">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleSubs(id)}
                          className="px-4 py-2 rounded-full border border-[#6b8e7a] text-[#6b8e7a] text-xs font-bold uppercase tracking-[0.08em]"
                        >
                          {isExpanded ? "Hide" : "Subcategories"}
                        </button>
                        <button
                          onClick={() => {
                            setExpandedId(null);
                            setEditingId(id);
                          }}
                          className="px-4 py-2 rounded-full bg-[#1a1c1b] text-white text-xs font-bold uppercase tracking-[0.08em]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(id)}
                          disabled={busy}
                          className="px-4 py-2 rounded-full border border-red-300 text-red-600 text-xs font-bold uppercase tracking-[0.08em]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subcategories panel */}
                  {isExpanded && !isEditing && (
                    <div className="mt-5 border-t border-[#eef2ee] pt-5">
                      {subLoading?.[id] ? (
                        <p className="text-sm text-[#6b7b6f]">Loading subcategories...</p>
                      ) : subs.length === 0 ? (
                        <p className="text-sm text-[#6b7b6f]">No subcategories yet.</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {subs.map((sub) => {
                            const subId = getId(sub);
                            return (
                              <li
                                key={subId}
                                className="flex items-center justify-between gap-3 bg-[#f5f8f7] rounded-xl px-4 py-2"
                              >
                                <span className="text-sm text-[#1a1c1b]">
                                  {sub.name}
                                  <span className="text-xs text-[#7c857a] ml-2">/{sub.slug}</span>
                                </span>
                                <button
                                  onClick={() => handleDeleteSub(id, subId)}
                                  disabled={busy}
                                  className="text-xs font-bold uppercase tracking-[0.08em] text-red-600"
                                >
                                  Delete
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {addingSubFor === id ? (
                        <div className="mt-4">
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
                          className="mt-4 px-4 py-2 rounded-full bg-[#6b8e7a] text-white text-xs font-bold uppercase tracking-[0.08em]"
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
