/* Helpers to read a post's category / subcategory names for display.
   The backend populates `categoryId` and `subCategories` with { name, slug }
   objects; older/static data may use a plain `category` string. */

const isObjectId = (v: string) => /^[a-f0-9]{24}$/i.test(v);

export const getCategoryName = (post: any): string => {
  const c = post?.categoryId ?? post?.category;
  if (!c) return "";
  if (typeof c === "object") return c.name || "";
  // A plain string that isn't a raw Mongo id is treated as a display label.
  return isObjectId(c) ? "" : c;
};

export const getSubcategoryNames = (post: any): string[] => {
  const subs = post?.subCategories;
  if (!Array.isArray(subs)) return [];
  return subs
    .map((s: any) => (typeof s === "object" ? s.name : isObjectId(s) ? "" : s))
    .filter(Boolean);
};
