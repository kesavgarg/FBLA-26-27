/**
 * Allergy and interaction checks — FICTIONAL DEMONSTRATION DATA.
 * ===================================================================
 * The tables below are a deliberately tiny, hand-built example to show
 * how a pharmacy system can warn staff and doctors. They are NOT
 * medically complete and must not be used for real decisions.
 *
 * Allergy check  → BLOCK (also enforced in the database for purchases
 *                  and doctor approvals, see allergy_conflict()).
 * Interaction    → WARN (shown to the doctor, pharmacist and customer).
 * ===================================================================
 */

/** Ingredient → drug class (mirrors the ingredient_classes table). */
export const INGREDIENT_CLASS: Readonly<Record<string, string>> = {
  amoxicillin: "penicillin",
  aspirin: "nsaid",
  ibuprofen: "nsaid",
  naproxen: "nsaid",
};

/** Pairs of ingredients/classes that get a caution note (demo examples). */
export const INTERACTION_RULES: ReadonlyArray<{ a: string; b: string; note: string }> = [
  { a: "nsaid", b: "lisinopril", note: "Pain relievers in this group may affect some blood pressure medicines. Ask the pharmacist." },
  { a: "nsaid", b: "nsaid", note: "Two pain relievers from the same group. Ask the pharmacist before taking both." },
  { a: "acetaminophen", b: "acetaminophen", note: "More than one product contains acetaminophen. Check total amounts with the pharmacist." },
  { a: "dextromethorphan", b: "benzonatate", note: "Two cough medicines. Ask the pharmacist which one to use." },
];

/** An ingredient plus its class, lower-cased, for matching. */
function tagsFor(ingredient: string): string[] {
  const name = ingredient.trim().toLowerCase();
  const drugClass = INGREDIENT_CLASS[name];
  return drugClass ? [name, drugClass] : [name];
}

/**
 * Does any allergy match this ingredient, directly or by class?
 * Returns the allergy that matched, or null.
 */
export function findAllergyConflict(ingredient: string | null | undefined, allergies: readonly string[]): string | null {
  if (!ingredient) return null;
  const tags = tagsFor(ingredient);
  return allergies.find((allergy) => tags.includes(allergy.trim().toLowerCase())) ?? null;
}

export type InteractionWarning = { between: [string, string]; note: string };

/**
 * Compare every pair of ingredients (new items + current medicines) against
 * the rule table. A nested loop over a short list; each pair is checked once.
 */
export function findInteractions(ingredients: readonly string[]): InteractionWarning[] {
  const cleaned = ingredients.map((name) => name.trim().toLowerCase()).filter(Boolean);
  const warnings: InteractionWarning[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < cleaned.length; i += 1) {
    for (let j = i + 1; j < cleaned.length; j += 1) {
      const left = tagsFor(cleaned[i]);
      const right = tagsFor(cleaned[j]);
      for (const rule of INTERACTION_RULES) {
        const matches =
          (left.includes(rule.a) && right.includes(rule.b)) || (left.includes(rule.b) && right.includes(rule.a));
        const key = `${[cleaned[i], cleaned[j]].sort().join("+")}:${rule.note}`;
        if (matches && !seen.has(key)) {
          seen.add(key);
          warnings.push({ between: [cleaned[i], cleaned[j]], note: rule.note });
        }
      }
    }
  }
  return warnings;
}
