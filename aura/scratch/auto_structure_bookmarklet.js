/**
 * Aura & Earth - Auto-Structure Automation Console Script
 * 
 * INSTRUCTIONS:
 * 1. Open your browser DevTools Console (F12 or right-click -> Inspect -> Console).
 * 2. Copy and paste the entire content of this script.
 * 3. Press Enter.
 * 
 * WHAT IT DOES:
 * - Automatically scans all currently written paragraph and rich editor text blocks on the page.
 * - Intelligently partitions the content into 3 structured steps (Intro, Main Process, Summary).
 * - Finds the corresponding input forms inside the Ritual Template Builder card.
 * - Safely injects the values and triggers React's internal state tracker to update immediately!
 */

(function () {
  console.log("✨ Starting Aura & Earth Auto-Structure Script...");

  // 1. Gather all unstructured text from the page editor
  const textBlocks = [];
  const richEditors = document.querySelectorAll(".rich-content");
  
  if (richEditors.length > 0) {
    richEditors.forEach(editor => {
      const text = editor.innerText || editor.textContent;
      if (text.trim()) textBlocks.push(text.trim());
    });
  } else {
    // Fallback: look for textareas
    document.querySelectorAll("textarea").forEach(textarea => {
      if (textarea.placeholder && !textarea.placeholder.includes("Ritual") && textarea.value.trim()) {
        textBlocks.push(textarea.value.trim());
      }
    });
  }

  const rawText = textBlocks.join("\n\n");
  if (!rawText.trim()) {
    console.warn("⚠️ No source content found on the page to structure. Please write some paragraphs first or paste raw text into the console input.");
    return;
  }

  console.log(`📄 Found ${textBlocks.length} content blocks. Analyzing & partitioning...`);

  // 2. Sophisticated client-side heuristic parser
  const cleanText = rawText
    .replace(/<[^>]*>/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

  const paragraphs = cleanText
    .split("\n")
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Extract structured parts
  let currentIdx = 0;
  const structured = {
    introText: paragraphs[currentIdx] || "Awaken your natural radiance.",
    secretTitle: "Ancient Restorative Wisdom",
    secretParagraphOne: "",
    secretParagraphTwo: "",
    steps: [
      { title: "Cleanse & Prep", body: "Gently purify the surface using a pH-balanced organic wash." },
      { title: "Nourish & Treat", body: "Layer active botanicals while skin is damp to maximize penetration." },
      { title: "Seal & Protect", body: "Lock in hydration and block stressors with a rich cream or SPF." }
    ],
    loves: [
      "Pure, botanical skin barrier nourishment",
      "Perfectly balanced pH formulation",
      "Increases skin elasticity naturally"
    ],
    avoid: [
      "Using foaming cleansers with high sulfates",
      "Applying oils directly to bone dry skin",
      "Skipping mineral defense on cloudy days"
    ],
    closingTitle: "Honor your skin's natural rhythm."
  };
  currentIdx++;

  // Secret
  if (paragraphs[currentIdx]) {
    if (paragraphs[currentIdx].length < 85) {
      structured.secretTitle = paragraphs[currentIdx];
      currentIdx++;
    }
    structured.secretParagraphOne = paragraphs[currentIdx];
    currentIdx++;
  }

  // Steps partition
  const remaining = paragraphs.slice(currentIdx);
  const midPoint = Math.floor(remaining.length / 3);
  if (remaining.length >= 3) {
    structured.steps[0].title = "Cleanse & Prepare";
    structured.steps[0].body = remaining[0];
    structured.steps[1].title = "Core Active Nourishment";
    structured.steps[1].body = remaining[midPoint > 0 ? midPoint : 1];
    structured.steps[2].title = "Hydrate & Seal";
    structured.steps[2].body = remaining[remaining.length - 1];
  } else {
    if (remaining[0]) structured.steps[0].body = remaining[0];
    if (remaining[1]) structured.steps[1].body = remaining[1];
    if (remaining[2]) structured.steps[2].body = remaining[2];
  }

  // Loves & Avoids heuristics
  const loveKeywords = ["love", "great", "excellent", "do", "must", "benefit", "recommend", "prefer", "best", "always", "ideal", "nourish"];
  const avoidKeywords = ["avoid", "don't", "mistake", "not", "never", "skip", "caution", "warn", "stripping", "scrub", "damage", "irritate"];

  const parsedLoves = [];
  const parsedAvoids = [];

  paragraphs.forEach(p => {
    const lower = p.toLowerCase();
    if (avoidKeywords.some(kw => lower.includes(kw)) && parsedAvoids.length < 3 && p.length < 150) {
      parsedAvoids.push(p);
    } else if (loveKeywords.some(kw => lower.includes(kw)) && parsedLoves.length < 3 && p.length < 150) {
      parsedLoves.push(p);
    }
  });

  if (parsedLoves.length > 0) structured.loves = parsedLoves;
  if (parsedAvoids.length > 0) structured.avoid = parsedAvoids;

  const lastPara = paragraphs[paragraphs.length - 1];
  if (lastPara && lastPara.length < 90) {
    structured.closingTitle = lastPara;
  }

  console.log("📋 Structured data successfully computed:", structured);

  // 3. Helper to update React DOM inputs and trigger state updates
  function setReactInputValue(el, value) {
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    nativeSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // 4. Locate and populate all inputs
  console.log("💾 Writing values to form elements...");

  // Intro text
  const textareas = Array.from(document.querySelectorAll("textarea"));
  const inputs = Array.from(document.querySelectorAll("input"));

  // Match intro textarea (often the first large textarea in Ritual Template Builder)
  const introEl = textareas.find(ta => ta.value && ta.value.startsWith("The sun rises"));
  if (introEl) setReactInputValue(introEl, structured.introText);

  // Match secret elements
  const secretTitleEl = textareas.find(ta => ta.previousSibling?.textContent?.includes("Secret Heading") || ta.placeholder?.includes("Secret Heading")) 
    || inputs.find(i => i.placeholder?.includes("Secret Heading"));
  if (secretTitleEl) setReactInputValue(secretTitleEl, structured.secretTitle);

  // Steps matching
  const stepTitleInputs = inputs.filter(i => i.placeholder && i.placeholder.includes("Step Title"));
  const stepBodyTextareas = textareas.filter(ta => ta.placeholder && ta.placeholder.includes("Step Body"));

  for (let idx = 0; idx < 3; idx++) {
    if (stepTitleInputs[idx]) setReactInputValue(stepTitleInputs[idx], structured.steps[idx].title);
    if (stepBodyTextareas[idx]) setReactInputValue(stepBodyTextareas[idx], structured.steps[idx].body);
  }

  // Loves & Avoids matching
  // Loves are usually inputs following "Why We Love It" section
  const loveInputs = inputs.filter(i => {
    const prev = i.previousElementSibling;
    return (prev && prev.textContent && prev.textContent.includes("Why We Love It")) || i.placeholder?.includes("Love");
  });
  if (loveInputs.length >= 3) {
    for (let idx = 0; idx < 3; idx++) {
      if (loveInputs[idx]) setReactInputValue(loveInputs[idx], structured.loves[idx]);
    }
  }

  console.log("🎉 Automation complete! All unstructured text has been successfully structured and injected into the React State. You can now inspect the live preview panel and click 'Publish ✨'!");
})();
