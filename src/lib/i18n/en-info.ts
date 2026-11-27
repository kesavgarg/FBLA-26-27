/**
 * English text for About / Heritage, Privacy by design and the Help center.
 * Business history is public reporting summarized in the project research
 * guide (Forsyth County News; business listings; HRSA 340B database) and
 * should be confirmed with the business before presenting.
 */
export const enInfo = {
  about: {
    title: "About Goodson",
    eyebrow: "Downtown Cumming since 1959",
    heading: "A family pharmacy that rebuilt and reopened on the same corner",
    intro:
      "For more than sixty years, Goodson Drug Co. has filled prescriptions on Maple Street with one promise printed on every label. This student project imagines how that same service could work online.",
    mottoLabel: "The motto on every prescription label",
    philosophyTitle: "Service people come back for",
    philosophy: [
      { title: "Know the customer", body: "A family pharmacy works because people know their pharmacist by name. Online ordering should keep that, not replace it." },
      { title: "Make it easy for everyone", body: "Many long-time customers are older. Large text, plain words and a three-step refill matter more than flashy features." },
      { title: "Be there after hard times", body: "After a fire closed the building, the pharmacy kept serving from a temporary location and came back to its original address." },
    ],
    timelineTitle: "Milestones",
    timeline: [
      { year: "1959", title: "Founded", body: "Jim Goodson Sr. opens the pharmacy on July 24, across the street from today’s location — ground that is now the Forsyth County Courthouse Annex." },
      { year: "1970", title: "Moves to W. Maple St.", body: "The store moves to 116 W. Maple St. The family also opens the Bull Dog Inn in the space, a nod to its University of Georgia ties." },
      { year: "1970s", title: "Early computer records", body: "Reportedly one of the first pharmacies in Georgia to keep its records by computer." },
      { year: "2005", title: "Community health partner", body: "Listed as a contract pharmacy for Georgia Highlands Medical Services (Cumming Family Health Center) in the federal 340B program." },
      { year: "2019", title: "Sixty years", body: "Local coverage marks the store’s 60th anniversary, still run by the Goodson family." },
      { year: "Nov 2024", title: "Fire", body: "A fire closes the building. The pharmacy keeps serving customers from a temporary location." },
      { year: "Dec 29, 2025", title: "Back home", body: "Goodson Drug Co. reopens at its original address, 116 W. Maple St." },
    ],
    projectTitle: "About this project",
    projectBody:
      "This website is an independent student project for the FBLA Introduction to Programming event. Goodson Drug Co. does not use, sponsor or endorse it. Products, prices, patients and doctors on this site are fictional.",
    sources: "Sources: Forsyth County News (60th anniversary; 2024 fire; December 2025 reopening), public business listings, HRSA 340B database — as summarized in the project’s research guide. Facts may change.",
    visit: "Visit",
  },
  privacy: {
    title: "Privacy by design",
    intro: "How this student project protects information — and what a real pharmacy would still need.",
    sections: [
      { title: "Fictional data only", body: "Every patient, prescription, doctor, product and price is made up. Please never enter real health information. The site is not HIPAA compliant and is not a real pharmacy." },
      { title: "Role-based access", body: "Customers, pharmacy staff, a simulated doctor and the owner each see only what their job needs. Signing up always creates a customer; only the owner can grant other roles, and never to themselves." },
      { title: "Minimum necessary information", body: "The doctor sees the symptom check, allergies and medicines for one request — not your orders. Staff see order details and safety checks, not your symptom journal." },
      { title: "Checked in three places", body: "Every page and action checks your role on the server; the database’s Row Level Security limits which rows each person can read; and sensitive changes (checkout, prescriptions, decisions) run inside database functions that check again." },
      { title: "Audit log", body: "Doctor decisions, order and refill changes, stock changes, role changes and exports are recorded with who and when. Entries can’t be edited or deleted." },
      { title: "Secure sign-in", body: "Passkeys let you sign in with Touch ID or Face ID. Your fingerprint never leaves your device; the site stores only a public key. Passwords are stored as one-way hashes by Supabase Auth." },
      { title: "No card details", body: "Payment is simulated. The site never asks for or stores card numbers." },
      { title: "Limits of a student project", body: "A real deployment would need licensed clinicians, legal review, HIPAA-grade hosting and agreements, real email and SMS providers, and an independent security review." },
    ],
  },
  help: {
    title: "Help center",
    intro: "Ask a question in your own words, or browse the common questions below.",
    assistantTitle: "Ask the help assistant",
    assistantHint: "Try “How do I refill a prescription?” or “¿Cómo cancelo un pedido?”",
    assistantLabel: "Your question",
    ask: "Ask",
    thinking: "Looking…",
    noMatch: "I couldn’t find an answer to that. Try different words, or pick one of the questions below.",
    didYouMean: "Related questions",
    open: "Go there",
    disclaimer: "The assistant answers questions about using this website. It does not give medical advice. For an emergency, call 911.",
    faqTitle: "Common questions",
    suggestions: ["How do I refill?", "Sign in with Touch ID", "Cancel an order", "Why is an item locked?"],
  },
};
