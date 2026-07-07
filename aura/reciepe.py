import fs from "fs/promises";

const inputPath = "E:\\convert\\diy_skincare.json";
const outputPath = "public/data/diy-recipes.json";

type SourceDoc = {
  title: string;
  summary?: string;
  intro_paragraphs?: string[];
  ingredients_paragraphs?: string[];
  instructions_paragraphs?: string[];
  other_paragraphs?: string[];
};

type Recipe = {
  id: string;
  title: string;
  category: string;
  level: string;
  description: string;
  time: string;
  servings: string;
  highlights: string[];
  hero: string;
  ingredients: { name: string; note: string; img: string }[];
  steps: string[];
};

function slugify(value: string, index: number) {
  return `${value || "recipe"}-${index + 1}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pickTimeOrServing(text: string, key: "time" | "servings") {
  if (key === "time") {
    const m = text.match(/(\d+\s*(?:min|mins|minutes|hr|hrs|hours)\b.*?)/i);
    return m ? m[1].toUpperCase() : "N/A";
  }
  const m = text.match(/(\d+\s*(?:serving|servings)|for\s+\d+\s+persons?)/i);
  return m ? m[0].toUpperCase() : "N/A";
}

function parseIngredientLine(line: string) {
  // Handles "Aloe Vera Gel - soothing gel" and "Aloe Vera Gel: soothing gel"
  const match = line.split(/[-–:]/, 2);
  const name = match[0]?.trim() || line.trim();
  const note = match[1]?.trim() || "";
  return {
    name,
    note,
    img:
      "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg",
  };
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function toRecipe(doc: SourceDoc, index: number): Recipe {
  const title = doc.title?.trim() || `Recipe ${index + 1}`;
  const descSource =
    doc.summary?.trim() ||
    doc.intro_paragraphs?.join(" ") ||
    doc.other_paragraphs?.slice(0, 1).join(" ") ||
    "";

  const ingredientsText =
    (doc.ingredients_paragraphs ?? [])
      .flatMap((p) => p.split(/\n|;|,\s(?=[A-Z])/))
      .map((l) => l.trim())
      .filter(Boolean);

  const steps =
    doc.instructions_paragraphs?.filter(Boolean).length
      ? uniqueNonEmpty(doc.instructions_paragraphs || [])
      : uniqueNonEmpty(doc.other_paragraphs || []);

  const highlights = uniqueNonEmpty([
    ...(doc.other_paragraphs || []).slice(0, 3),
  ]);

  const combined = `${descSource} ${steps.join(" ")}`;

  return {
    id: slugify(title, index),
    title,
    category: "DIY",
    level: "Beginner",
    description: descSource || "Homemade DIY skincare recipe from the book.",
    time: pickTimeOrServing(combined, "time"),
    servings: pickTimeOrServing(combined, "servings"),
    highlights: highlights.length
      ? highlights.map((h) => h.slice(0, 60))
      : ["Handmade", "Natural", "Easy to try"],
    hero:
      "https://www.transparenttextures.com/patterns/natural-paper.png",
    ingredients: ingredientsText.map((l) => parseIngredientLine(l)),
    steps: steps,
  };
}

async function main() {
  const raw = JSON.parse(await fs.readFile(inputPath, "utf-8"));
  const docs = raw.documents || raw; // supports both wrapped/unwrapped formats
  const recipes = docs.map((d: SourceDoc, i: number) => toRecipe(d, i));
  await fs.writeFile(outputPath, JSON.stringify(recipes, null, 2), "utf-8");
  console.log(`Saved ${recipes.length} recipes to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});