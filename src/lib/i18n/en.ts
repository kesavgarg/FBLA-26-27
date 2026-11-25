/**
 * English dictionary.
 *
 * Every user-facing string lives here (and in es.ts) instead of inside
 * components, so the whole site can switch language from one cookie.
 * The `Dictionary` type is derived from this object, which means the
 * Spanish file must contain exactly the same keys or TypeScript will fail.
 */
export const en = {
  meta: {
    title: "Goodson Drug Co. — Order online",
    description:
      "Order pharmacy essentials, request refills and track pickups from Goodson Drug Co. in downtown Cumming. A student demonstration project.",
  },
  brand: {
    name: "Goodson Drug Co.",
    motto: "We Serve to Serve Again.",
    /** Translation of the motto shown under it (empty in English). */
    mottoNote: "",
    since: "Serving Cumming since 1959",
    address: "116 W. Maple St., Cumming, GA 30040",
    founded: "Founded by Jim Goodson Sr.",
    reopened: "Reopened on W. Maple St.",
  },
  home: {
    heroTitle: "Your hometown pharmacy, now open online",
    heroBody:
      "Order everyday health essentials, refill prescriptions and choose pickup or delivery from downtown Cumming.",
    heroNote: "Pickup at 116 W. Maple St. · Closed Sundays",
    refillLabel: "Prescription refills",
    refillTitle: "Refill in three taps, pick up on your way home",
    refillBody: "No phone tree and no waiting on hold. Your pharmacist sees the request the moment you send it.",
    refillSteps: [
      { title: "Sign in with Touch ID", body: "Your fingerprint unlocks your account. No password to remember." },
      { title: "Choose your prescription", body: "We show which ones can be refilled and how many refills are left." },
      { title: "Pick a time", body: "Choose a 30-minute pickup window or delivery around Cumming." },
    ],
    refillCta: "Sign in to refill",
    heritageTitle: "Downtown Cumming’s pharmacy since 1959",
    heritageBody:
      "The Goodson family has filled prescriptions on Maple Street for more than sixty years. This project imagines how that service could work online.",
    heritage: [
      { year: "1959", text: "Jim Goodson Sr. opens the pharmacy on July 24, across from today’s courthouse annex." },
      { year: "1970", text: "The store moves to 116 W. Maple St., where it still stands." },
      { year: "2025", text: "After a November 2024 fire, it reopens on December 29 at the same address." },
    ],
  },
  demo: {
    banner:
      "Student demo with fictional patients, products and prices. Not affiliated with or endorsed by Goodson Drug Co.",
    notMedicalAdvice: "Demo only. Not medical advice.",
  },
  nav: {
    skip: "Skip to content",
    home: "Home",
    shop: "Shop",
    refills: "Refills",
    health: "Health",
    orders: "Orders",
    about: "About",
    help: "Help",
    signIn: "Sign in",
    signOut: "Sign out",
    account: "My account",
    staff: "Staff",
    doctor: "Doctor",
    owner: "Owner",
    menu: "Menu",
    closeMenu: "Close menu",
    mainNav: "Main navigation",
  },
  prefs: {
    language: "Language",
    english: "English",
    spanish: "Español",
    accessibility: "Accessibility",
    largeText: "Larger text",
    highContrast: "High contrast",
    reduceMotion: "Reduce motion",
    saved: "Display settings saved",
  },
  roles: {
    customer: "Customer",
    staff: "Pharmacy staff",
    doctor: "Doctor (simulated prescriber)",
    owner: "Owner",
  },
  auth: {
    welcomeTitle: "Welcome back",
    welcomeBody: "Sign in with the fingerprint or face you already use to unlock this device.",
    passkeyButton: "Sign in with passkey",
    passkeyWorking: "Waiting for Touch ID…",
    passkeyHint:
      "On a Mac, your browser will ask for Touch ID. Your fingerprint never leaves your device.",
    orPassword: "Or use your email and password",
    email: "Email",
    password: "Password",
    passwordHint: "At least 10 characters.",
    passwordButton: "Sign in with password",
    noAccount: "New to Goodson online?",
    createAccount: "Create an account",
    forgot: "Can’t sign in?",
    recoverLink: "Recover your account",
    registerTitle: "Create your account",
    registerBody:
      "Set up your account in two steps: your details, then a passkey so you can sign in with Touch ID next time.",
    fullName: "Full name",
    dateOfBirth: "Date of birth",
    phone: "Phone (optional)",
    agreeDemo: "I understand this is a student demo and I will only enter fictional information.",
    registerButton: "Create account",
    haveAccount: "Already have an account?",
    passkeySetupTitle: "Add a passkey",
    passkeySetupBody:
      "A passkey lets you sign in with Touch ID instead of typing a password. Your device keeps your fingerprint; we only receive a secure key that proves it’s you.",
    passkeySetupButton: "Add passkey with Touch ID",
    passkeySetupSkip: "Skip for now",
    passkeyAdded: "Passkey added. Next time, sign in with Touch ID.",
    passkeyList: "Your passkeys",
    passkeyNone: "No passkeys yet. Add one to sign in with Touch ID.",
    passkeyRemove: "Remove",
    passkeyRemoved: "Passkey removed.",
    passkeyCreated: "Added",
    passkeyLastUsed: "Last used",
    passkeyNever: "Never",
    recoverTitle: "Recover your account",
    recoverBody:
      "Enter your email and we’ll send a one-time sign-in link. After you’re in, add a new passkey from Security settings.",
    recoverButton: "Email me a sign-in link",
    recoverSent: "If that email has an account, a sign-in link is on its way. It expires in 1 hour.",
    backToSignIn: "Back to sign in",
    signedOut: "You’ve signed out.",
    security: "Security",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    required: "This field is required.",
    email: "Enter an email like name@example.com.",
    passwordShort: "Use at least 10 characters.",
    passwordLong: "Use 72 characters or fewer.",
    nameShort: "Enter your full name (at least 2 characters).",
    nameLong: "Use 80 characters or fewer.",
    nameChars: "Use letters, spaces, apostrophes and hyphens only.",
    dobInvalid: "Enter a real date.",
    dobFuture: "Date of birth can’t be in the future.",
    dobTooYoung: "Account holders must be 13 or older. Add children as family members instead.",
    dobTooOld: "Check the year — that date is more than 120 years ago.",
    phone: "Enter a 10-digit US phone number, like 770-555-0123.",
    agree: "Please confirm you’ll only use fictional information.",
    badCredentials: "That email and password don’t match an account.",
    emailTaken: "An account with that email already exists. Try signing in instead.",
    passkeyCancelled: "Passkey sign-in was cancelled. Try again when you’re ready.",
    passkeyUnsupported:
      "This browser can’t use passkeys. Use Safari or Chrome on a recent Mac, or sign in with your password.",
    passkeyUnknown:
      "We didn’t recognise that passkey on this site. Sign in with your password, then add a new passkey.",
    passkeyDisabled: "Passkey sign-in isn’t turned on for this server yet. Use your password for now.",
    tooManyRequests: "Too many attempts. Wait a minute and try again.",
    notAllowed: "You don’t have access to that page.",
    signInRequired: "Please sign in to continue.",
    pageMissing: "We couldn’t find that page.",
  },
  account: {
    greeting: "Hello",
    roleLabel: "Signed in as",
    securityTitle: "Security",
    securityBody: "Manage the passkeys that let you sign in with Touch ID.",
  },
  footer: {
    disclaimer:
      "Independent student project for the FBLA Introduction to Programming event. Goodson Drug Co. does not use, sponsor or endorse this software. All patient data, prescriptions, products and prices are fictional.",
    privacy: "Privacy by design",
    help: "Help center",
    about: "About Goodson",
  },
};

/** The shape every language dictionary must match. */
export type Dictionary = typeof en;
