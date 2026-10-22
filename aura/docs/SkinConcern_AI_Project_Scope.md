# Facial Skin Concern Detection — Project Scope

**Product:** Mobile app that uses the phone camera to detect visible facial skin concerns (acne, dark spots, pigmentation, redness, etc.) and suggests general remedies.
**Model approach:** CNN with EfficientNet backbone (transfer learning), multi-label classification + optional localization.
**Context:** Real product / mobile / flexible timeline.

---

## 1. What the product does (in one line)

User takes (or uploads) a selfie → model detects which skin concerns are present, how severe, and where → app shows results and maps each concern to general, non-medical skincare guidance.

---

## 2. Concerns to detect

Build this as **multi-label** (a face can have several at once), not single-class. Recommended starting set — each is *visible* and has at least some public data:

| Concern | Visible? | Data availability | Notes |
|---|---|---|---|
| Acne (and severity grade) | Strong | Good (ACNE04, DermNet) | Severity grading is a great demo feature |
| Dark spots / hyperpigmentation | Strong | Moderate | Overlaps with pigmentation; often needs custom labeling |
| Uneven skin tone | Medium | Weak | Very lighting-sensitive; highest bias risk |
| Redness / rosacea | Medium | Moderate (DermNet) | Shifts heavily with white balance |
| Dark circles (under-eye) | Medium | Weak | Mostly custom-labeled |
| Wrinkles / fine lines | Medium | Weak | Optional, add later |

**Recommendation:** Launch with **acne (graded), dark spots/pigmentation, redness** as the core three — they're the most visible and best-supported by data. Add uneven tone, dark circles, and wrinkles in a second phase once your data pipeline works.

---

## 3. Model architecture

- **Backbone:** EfficientNet — use **EfficientNet-Lite0/Lite4** or EfficientNet-B0 for mobile (small, fast, designed for on-device).
- **Head:** Multi-label output — one sigmoid per concern (independent yes/no probabilities), trained with binary cross-entropy. *Do not* use softmax/single-class.
- **Severity (acne):** Either a separate ordinal output (mild/moderate/severe) or a count of detected spots.
- **Optional localization (Phase 2):** Object detection (YOLO) or segmentation to *locate and count* acne spots / dark patches. This is what makes the demo impressive ("12 spots detected, here") and maps cleanly to remedies. Worth doing given your flexible timeline.
- **Training:** Transfer learning — start from ImageNet weights, freeze early layers, fine-tune the rest on your skin data. Heavy augmentation (brightness, white-balance, rotation, crop) to fight lighting/camera variance.

---

## 4. Data strategy (the make-or-break part)

There is **no single dataset** covering all these concerns on faces. Plan to combine + label.

**Public datasets to start from:**
- **ACNE04** — acne images with severity grades. Best fit for the acne component.
- **DermNet / DermNet NZ** — wide range of skin conditions (acne, pigmentation, rosacea).
- **Fitzpatrick17k** — skin conditions *labeled by skin tone* (Fitzpatrick I–VI). **Critical for measuring and fixing skin-tone bias.**
- **ISIC Archive** — large dermatology image set (more lesion/mole-focused, use selectively).
- **SCIN (Google, dermatology)** — crowdsourced skin images, more diverse skin tones.

**You will likely need to build a custom dataset** for dark circles, uneven tone, and real-world selfie conditions (phone cameras, indoor lighting, makeup). Plan for:
- A labeling guideline doc (what counts as "moderate" acne, etc.) so labels are consistent.
- Multiple labelers + agreement checks, ideally one dermatology-informed reviewer.
- Consent/licensing for any face images you collect — important for a real product (see §7).

**Data realism:** Train and validate on *phone selfies in varied lighting*, not just clean clinical photos. A model trained only on clinical images will fail on real users.

---

## 5. Skin-tone bias — treat as a first-class requirement

Most skin datasets skew toward lighter skin, and "uneven tone / redness / dark spots" detection degrades on darker skin. For a real product this is both an ethics and a quality issue.

- Track performance **per Fitzpatrick group (I–VI)**, not just overall accuracy.
- Deliberately balance training data across skin tones; oversample or collect more dark-skin examples.
- Report a per-tone accuracy table as a core metric. If accuracy gaps are large, the product isn't ready.

---

## 6. Remedy / recommendation layer

Keep this **rule-based, not learned** — there's no dataset for "remedies," and a lookup is safer and more controllable.

- Each detected concern → curated general guidance (e.g., acne → gentle non-comedogenic cleanser, avoid picking, see a dermatologist if severe; dark spots → daily sunscreen, vitamin C, niacinamide; redness → fragrance-free gentle products, patch-test).
- Keep advice **general and lifestyle-level**. Do **not** recommend prescription medication or diagnose.
- Optionally personalize by severity (mild vs. severe acne → different urgency).

---

## 7. Medical & regulatory cautions (because it's a real product)

- **Add a clear, persistent disclaimer:** "This app provides general skincare information, not medical advice or diagnosis. Consult a dermatologist for medical concerns." Acne, rosacea, and pigmentation can be medical conditions.
- **Avoid diagnostic claims.** Say "possible signs of…" not "you have…". Diagnostic claims can pull you into medical-device regulation (FDA/CE), which is a much heavier path.
- **Privacy:** Faces are biometric/sensitive data. Decide early — on-device inference (no upload) is the most privacy-friendly and a strong selling point. If images leave the device, you need consent, secure storage, and a privacy policy.
- **Don't store user photos** unless you have explicit consent and a reason to.

---

## 8. Build phases

**Phase 0 — Validation (before heavy building)**
Collect ~100–200 real selfies, hand-label them, and check whether each concern is even reliably detectable on phone photos. Kills bad assumptions early.

**Phase 1 — Core model**
Acne (graded) + dark spots + redness. EfficientNet multi-label classifier. Train on ACNE04 + DermNet + Fitzpatrick17k. Establish per-skin-tone metrics.

**Phase 2 — Localization + more concerns**
Add spot detection/counting (YOLO/segmentation), plus uneven tone, dark circles, wrinkles. Build/expand custom dataset.

**Phase 3 — Mobile app**
On-device inference (EfficientNet-Lite via TensorFlow Lite / Core ML). Camera capture, results screen, rule-based remedy layer, disclaimer.

**Phase 4 — Hardening**
Bias audit across skin tones, varied-lighting robustness testing, privacy/consent flow, beta testing on real users.

---

## 9. Success metrics

- **Per-concern:** precision/recall and F1 (not just accuracy — concerns are imbalanced).
- **Acne severity:** agreement with ground-truth grade (e.g., within-1-grade accuracy).
- **Fairness:** accuracy gap across Fitzpatrick I–VI should be small (set a target, e.g., < 5–10%).
- **Real-world:** performance on a held-out set of *real phone selfies*, not clinical images.
- **Latency:** on-device inference fast enough for a smooth camera experience (e.g., < 1s).

---

## 10. Honest risks

1. **Data is the bottleneck**, not the model. Most of the effort is collecting/labeling diverse, real-world face images.
2. **Lighting and camera variance** can silently dominate the signal — especially for redness and uneven tone.
3. **Skin-tone bias** is likely unless actively corrected.
4. **Regulatory line:** stay on the "general information / cosmetic" side; diagnostic claims trigger medical-device rules.
5. **Uneven tone & dark circles** are the weakest/hardest — consider dropping or deferring if data is poor.

---

## 11. Recommended first move

Do **Phase 0** this week: gather ~150 varied real selfies (different skin tones, lighting), label them for acne / dark spots / redness, and confirm the signal is there before investing in full training. If it holds up, proceed to the core EfficientNet model on the three anchor concerns.
