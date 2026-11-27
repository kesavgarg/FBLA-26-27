/**
 * Help assistant — a small, explainable question-answering feature.
 * ===================================================================
 * No AI service and no data leaves the browser. The assistant keeps a
 * list of answers (the "knowledge base"); each answer has keywords in
 * English and Spanish. To answer a question it:
 *   1. normalizes the text (lower case, no accents, no punctuation),
 *   2. splits it into words and drops filler words ("how", "do", "el"…),
 *   3. scores every answer: +3 for each keyword phrase found in the
 *      question (plurals count: "refills" → "refill", "allergies" →
 *      "allergy"), +1 for each question word that starts a keyword
 *      (so a typo like "refil" still matches "refill"),
 *   4. returns the best answer if it scores high enough, plus up to two
 *      related ones.
 * It only answers how to use the website — never medical questions.
 * ===================================================================
 */
import type { Locale } from "@/lib/i18n";

export type HelpEntry = {
  id: string;
  question: Record<Locale, string>;
  answer: Record<Locale, string>;
  keywords: string[]; // English and Spanish, lower case, no accents
  href?: string;
};

export const HELP_ENTRIES: readonly HelpEntry[] = [
  {
    id: "refill",
    question: { en: "How do I refill a prescription?", es: "¿Cómo resurto una receta?" },
    answer: {
      en: "Open Refills, find the prescription, and press Request refill. Choose a pickup time or delivery and send it. If a refill isn’t possible, the card says why (expired, no refills left, or one already in progress).",
      es: "Abra Resurtidos, busque la receta y presione Pedir resurtido. Elija una hora para recoger o entrega y envíela. Si no se puede, la tarjeta explica por qué (vencida, sin resurtidos o ya en proceso).",
    },
    keywords: ["refill", "renew", "more pills", "prescription", "resurtir", "resurto", "resurtido", "receta", "renovar"],
    href: "/account/prescriptions",
  },
  {
    id: "passkey",
    question: { en: "How do I sign in with Touch ID?", es: "¿Cómo entro con Touch ID?" },
    answer: {
      en: "First sign in with your password, then go to My account → Security and press Add passkey with Touch ID. Next time, press Sign in with passkey on the sign-in page and touch the sensor. Your fingerprint never leaves your device.",
      es: "Primero entre con su contraseña, luego vaya a Mi cuenta → Seguridad y presione Agregar llave con Touch ID. La próxima vez, presione Iniciar sesión con llave de acceso y toque el sensor. Su huella nunca sale de su dispositivo.",
    },
    keywords: ["touch id", "passkey", "fingerprint", "face id", "sign in", "login", "log in", "huella", "llave de acceso", "iniciar sesion", "entrar"],
    href: "/account/security",
  },
  {
    id: "recover",
    question: { en: "I can’t sign in. How do I get back into my account?", es: "No puedo entrar. ¿Cómo recupero mi cuenta?" },
    answer: {
      en: "Use Recover your account on the sign-in page. We email a one-time sign-in link; after you’re in, add a new passkey under Security. You can also sign in with your email and password.",
      es: "Use Recuperar su cuenta en la página de inicio. Le enviamos un enlace de un solo uso; después agregue una nueva llave de acceso en Seguridad. También puede entrar con su correo y contraseña.",
    },
    keywords: ["forgot", "password", "locked out", "recover", "lost", "cant sign in", "new phone", "olvide", "contrasena", "recuperar", "perdi"],
    href: "/recover",
  },
  {
    id: "cancel",
    question: { en: "How do I cancel an order?", es: "¿Cómo cancelo un pedido?" },
    answer: {
      en: "Open Orders, choose the order, and press Cancel order. You can cancel until the pharmacy starts preparing it; after that, call or ask the pharmacist. Cancelled items go back on the shelf.",
      es: "Abra Pedidos, elija el pedido y presione Cancelar pedido. Puede cancelar hasta que la farmacia empiece a prepararlo; después, pregunte al farmacéutico.",
    },
    keywords: ["cancel", "cancelled", "stop order", "undo order", "cancelar", "cancelo", "cancela", "anular"],
    href: "/account/orders",
  },
  {
    id: "track",
    question: { en: "Where is my order?", es: "¿Dónde está mi pedido?" },
    answer: {
      en: "Open Orders and choose the order. The tracker shows each step: Received, Being prepared, Ready for pickup or Out for delivery, then Completed. Pharmacy updates appear underneath.",
      es: "Abra Pedidos y elija el pedido. El seguimiento muestra cada paso: Recibido, En preparación, Listo para recoger o En camino, y Completado.",
    },
    keywords: ["where is my order", "order status", "track", "tracking", "status", "ready", "donde esta mi pedido", "donde esta", "estado", "seguimiento", "listo"],
    href: "/account/orders",
  },
  {
    id: "locked",
    question: { en: "Why can’t I buy a prescription item?", es: "¿Por qué no puedo comprar un producto con receta?" },
    answer: {
      en: "Prescription items stay locked until a doctor approves them for you. Start a symptom check; if it suggests seeing a clinician, send the request to the doctor. Once approved, the item unlocks for its first fill.",
      es: "Los productos con receta siguen bloqueados hasta que un médico los apruebe para usted. Haga una revisión de síntomas; si sugiere ver a un médico, envíe la solicitud. Al aprobarse, el producto se desbloquea.",
    },
    keywords: ["locked", "prescription required", "rx", "cant buy", "doctor", "approve", "bloqueado", "requiere receta", "medico", "aprobar"],
    href: "/account/health/check",
  },
  {
    id: "allergy",
    question: { en: "Why does it say “Blocked for your safety”?", es: "¿Por qué dice “Bloqueado por su seguridad”?" },
    answer: {
      en: "The product contains something on your allergy list (or in the same group, like penicillin). Check your allergies under Health. If the list is wrong, update it there; otherwise ask the pharmacist about alternatives.",
      es: "El producto contiene algo de su lista de alergias (o del mismo grupo, como la penicilina). Revise sus alergias en Salud o pregunte al farmacéutico por alternativas.",
    },
    keywords: ["allergy", "allergic", "blocked", "safety", "alergia", "alergico", "bloqueado", "seguridad"],
    href: "/account/health",
  },
  {
    id: "pickup",
    question: { en: "How do pickup and delivery work?", es: "¿Cómo funcionan la recogida y la entrega?" },
    answer: {
      en: "At checkout choose Pickup at the pharmacy (free, 116 W. Maple St., 30-minute windows, closed Sundays) or Home delivery (Cumming-area ZIP codes, free above the delivery threshold).",
      es: "Al pagar elija Recoger en la farmacia (gratis, 116 W. Maple St., horarios de 30 minutos, cerrado los domingos) o Entrega a domicilio (códigos postales de Cumming, gratis a partir del mínimo).",
    },
    keywords: ["pickup", "pick up", "delivery", "deliver", "time slot", "hours", "sunday", "zip", "recoger", "entrega", "domicilio", "horario", "domingo"],
    href: "/checkout",
  },
  {
    id: "tax",
    question: { en: "How is the total calculated?", es: "¿Cómo se calcula el total?" },
    answer: {
      en: "Total = items + sales tax on non-prescription items + delivery fee (if any). Prescription items aren’t taxed. Prices are fictional demo prices and payment is simulated.",
      es: "Total = productos + impuesto en productos sin receta + cargo de entrega (si aplica). Los productos con receta no pagan impuesto. Los precios son ficticios y el pago es simulado.",
    },
    keywords: ["total", "tax", "price", "fee", "cost", "pay", "payment", "card", "impuesto", "precio", "cargo", "pagar", "tarjeta"],
    href: "/cart",
  },
  {
    id: "budget",
    question: { en: "Can I set a spending limit?", es: "¿Puedo fijar un límite de gasto?" },
    answer: {
      en: "Yes. On the cart page, enter an amount under Spending limit. We show how much is left and stop checkout if the cart goes over it.",
      es: "Sí. En el carrito, ingrese una cantidad en Límite de gasto. Mostramos cuánto queda y no deja pagar si el carrito lo pasa.",
    },
    keywords: ["budget", "limit", "spend", "spending", "presupuesto", "limite", "gasto"],
    href: "/cart",
  },
  {
    id: "symptom",
    question: { en: "What does the symptom check do?", es: "¿Qué hace la revisión de síntomas?" },
    answer: {
      en: "It asks a few questions and suggests a possible next step: emergency (call 911), see a clinician (send a request to the doctor), or self-care (helpful store sections). It is a demonstration and not medical advice.",
      es: "Hace unas preguntas y sugiere un posible paso: emergencia (llamar al 911), ver a un médico (enviar una solicitud) o autocuidado (secciones útiles de la tienda). Es una demostración y no es consejo médico.",
    },
    keywords: ["symptom", "survey", "sick", "feel", "health check", "sintoma", "encuesta", "enfermo", "revision"],
    href: "/account/health/check",
  },
  {
    id: "watch",
    question: { en: "Does it connect to my Apple Watch?", es: "¿Se conecta con mi Apple Watch?" },
    answer: {
      en: "Not really — websites can’t read Apple Health. The symptom check shows how a future iPhone app could share a few numbers with your permission, using a clearly labelled simulated sample.",
      es: "No realmente: los sitios web no pueden leer Apple Health. La revisión muestra cómo una futura app de iPhone podría compartir algunos datos con su permiso, usando una muestra simulada.",
    },
    keywords: ["apple watch", "watch", "healthkit", "apple health", "heart rate", "steps", "reloj", "ritmo", "pasos"],
    href: "/account/health/check",
  },
  {
    id: "spanish",
    question: { en: "Can I use the site in Spanish?", es: "¿Puedo usar el sitio en español?" },
    answer: {
      en: "Yes. Press ES at the top of any page. Your choice is remembered on every page.",
      es: "Sí. Presione ES arriba en cualquier página. Su elección se recuerda en todas las páginas.",
    },
    keywords: ["spanish", "language", "espanol", "idioma", "ingles", "english"],
  },
  {
    id: "accessibility",
    question: { en: "How do I make the text bigger?", es: "¿Cómo agrando el texto?" },
    answer: {
      en: "Press the Accessibility button at the top of any page and turn on Larger text. You can also turn on High contrast and Reduce motion. Everything works with the keyboard too.",
      es: "Presione el botón de Accesibilidad arriba en cualquier página y active Texto más grande. También puede activar Alto contraste y Reducir movimiento.",
    },
    keywords: ["bigger", "larger", "text size", "font", "contrast", "accessibility", "see", "read", "grande", "letra", "contraste", "accesibilidad"],
  },
  {
    id: "privacy",
    question: { en: "Is my information safe? Is this a real pharmacy?", es: "¿Mi información está segura? ¿Es una farmacia real?" },
    answer: {
      en: "This is a student demonstration with fictional data — please don’t enter real health information. See Privacy by design for how access, sign-in and records are protected.",
      es: "Es una demostración estudiantil con datos ficticios; no ingrese información de salud real. Vea Privacidad desde el diseño para saber cómo se protegen el acceso y los registros.",
    },
    keywords: ["privacy", "safe", "secure", "real", "hipaa", "data", "privacidad", "seguro", "segura", "datos", "real"],
    href: "/privacy",
  },
];

const STOP_WORDS = new Set([
  "how", "do", "does", "i", "a", "an", "the", "to", "my", "is", "it", "can", "what", "why", "where", "and", "or", "of", "in", "on", "for", "me", "with", "this", "be",
  "como", "que", "el", "la", "los", "las", "un", "una", "mi", "es", "de", "en", "por", "puedo", "se", "y", "o", "con", "lo", "al", "del",
]);

/** Lower-case, remove accents and punctuation, collapse spaces. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type HelpMatch = { entry: HelpEntry; score: number };

/** A word plus its simple singular forms: "allergies" → ["allergies", "allergie", "allergy"]. */
function forms(word: string): string[] {
  const out = [word];
  if (word.endsWith("ies")) out.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("es")) out.push(word.slice(0, -2));
  if (word.endsWith("s")) out.push(word.slice(0, -1));
  return out;
}

/** Score every entry for a question and return them best-first (score > 0). */
export function rankHelpEntries(question: string, entries: readonly HelpEntry[] = HELP_ENTRIES): HelpMatch[] {
  const text = ` ${normalizeText(question)} `;
  const words = text.trim().split(" ").filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const results: HelpMatch[] = [];

  for (const entry of entries) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const singleWordHit = !keyword.includes(" ") && words.some((w) => forms(w).includes(keyword));
      if (text.includes(` ${keyword} `) || (keyword.includes(" ") && text.includes(keyword)) || singleWordHit) score += 3;
      else if (words.some((w) => keyword.split(" ").some((k) => k.startsWith(w.slice(0, Math.max(4, w.length - 2))) && w.length >= 4))) score += 1;
    }
    if (score > 0) results.push({ entry, score });
  }
  return results.sort((a, b) => b.score - a.score);
}

/** The best answer (if confident enough) and up to two related questions. */
export function answerQuestion(question: string): { best: HelpEntry | null; related: HelpEntry[] } {
  if (normalizeText(question).length < 2) return { best: null, related: [] };
  const ranked = rankHelpEntries(question);
  const best = ranked[0] && ranked[0].score >= 2 ? ranked[0].entry : null;
  const related = ranked.filter((m) => m.entry !== best).slice(0, 2).map((m) => m.entry);
  return { best, related };
}
