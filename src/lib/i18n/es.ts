import type { Dictionary } from "./en";
import { esHealth } from "./es-health";
import { esInfo } from "./es-info";
import { esShop } from "./es-shop";

/**
 * Spanish dictionary. Typed as `Dictionary`, so a missing or extra key is a
 * compile error. Translations use plain, neutral Latin American Spanish.
 */
export const es: Dictionary = {
  ...esShop,
  ...esHealth,
  ...esInfo,
  meta: {
    title: "Goodson Drug Co. — Pedidos en línea",
    description:
      "Pida productos de farmacia, solicite resurtidos y siga sus pedidos de Goodson Drug Co. en el centro de Cumming. Proyecto estudiantil de demostración.",
  },
  brand: {
    name: "Goodson Drug Co.",
    motto: "We Serve to Serve Again.",
    mottoNote: "Servimos para volver a servir.",
    since: "Al servicio de Cumming desde 1959",
    address: "116 W. Maple St., Cumming, GA 30040",
    founded: "Fundada por Jim Goodson Sr.",
    reopened: "Reabrió en W. Maple St.",
  },
  home: {
    shortcutsTitle: "Accesos rápidos",
    shortcuts: {
      track: { title: "Seguir un pedido", body: "Vea dónde está su pedido, paso a paso." },
      check: { title: "Revisar sus síntomas", body: "Unas preguntas y un posible siguiente paso. Solo demostración." },
      help: { title: "Hacer una pregunta", body: "El asistente responde en inglés o español." },
    },
    readStory: "Lea nuestra historia",
    heroTitle: "Su farmacia de siempre, ahora en línea",
    heroBody:
      "Pida productos de salud, resurta recetas y elija recoger o entrega a domicilio desde el centro de Cumming.",
    heroNote: "Recoja en 116 W. Maple St. · Cerrado los domingos",
    refillLabel: "Resurtido de recetas",
    refillTitle: "Resurta en tres toques y recoja de camino a casa",
    refillBody:
      "Sin menús telefónicos ni esperas. Su farmacéutico ve la solicitud en cuanto la envía.",
    refillSteps: [
      { title: "Entre con Touch ID", body: "Su huella abre su cuenta. No hay contraseña que recordar." },
      { title: "Elija su receta", body: "Le mostramos cuáles se pueden resurtir y cuántos resurtidos quedan." },
      { title: "Elija una hora", body: "Escoja un horario de 30 minutos para recoger o entrega en Cumming." },
    ],
    refillCta: "Entrar para resurtir",
    heritageTitle: "La farmacia del centro de Cumming desde 1959",
    heritageBody:
      "La familia Goodson ha surtido recetas en Maple Street por más de sesenta años. Este proyecto imagina cómo ese servicio podría funcionar en línea.",
    heritage: [
      { year: "1959", text: "Jim Goodson Sr. abre la farmacia el 24 de julio, frente al actual anexo del juzgado." },
      { year: "1970", text: "La tienda se muda a 116 W. Maple St., donde sigue hoy." },
      { year: "2025", text: "Tras un incendio en noviembre de 2024, reabre el 29 de diciembre en la misma dirección." },
    ],
  },
  demo: {
    banner:
      "Demostración estudiantil con pacientes, productos y precios ficticios. No está afiliada ni respaldada por Goodson Drug Co.",
    notMedicalAdvice: "Solo demostración. No es consejo médico.",
  },
  nav: {
    skip: "Saltar al contenido",
    home: "Inicio",
    shop: "Tienda",
    refills: "Resurtidos",
    health: "Salud",
    orders: "Pedidos",
    about: "Nosotros",
    help: "Ayuda",
    signIn: "Iniciar sesión",
    signOut: "Cerrar sesión",
    account: "Mi cuenta",
    staff: "Personal",
    doctor: "Médico",
    owner: "Dueño",
    menu: "Menú",
    closeMenu: "Cerrar menú",
    mainNav: "Navegación principal",
  },
  prefs: {
    language: "Idioma",
    english: "English",
    spanish: "Español",
    accessibility: "Accesibilidad",
    largeText: "Texto más grande",
    highContrast: "Alto contraste",
    reduceMotion: "Reducir movimiento",
    saved: "Preferencias de pantalla guardadas",
  },
  roles: {
    customer: "Cliente",
    staff: "Personal de farmacia",
    doctor: "Médico (prescriptor simulado)",
    owner: "Dueño",
  },
  auth: {
    welcomeTitle: "Bienvenido de nuevo",
    welcomeBody: "Inicie sesión con la huella o el rostro que ya usa para desbloquear este dispositivo.",
    passkeyButton: "Iniciar sesión con llave de acceso",
    passkeyWorking: "Esperando Touch ID…",
    passkeyHint:
      "En una Mac, su navegador le pedirá Touch ID. Su huella nunca sale de su dispositivo.",
    orPassword: "O use su correo y contraseña",
    email: "Correo electrónico",
    password: "Contraseña",
    passwordHint: "Al menos 10 caracteres.",
    passwordButton: "Iniciar sesión con contraseña",
    noAccount: "¿Es nuevo en Goodson en línea?",
    createAccount: "Crear una cuenta",
    forgot: "¿No puede iniciar sesión?",
    recoverLink: "Recuperar su cuenta",
    registerTitle: "Cree su cuenta",
    registerBody:
      "Configure su cuenta en dos pasos: sus datos y luego una llave de acceso para entrar con Touch ID la próxima vez.",
    fullName: "Nombre completo",
    dateOfBirth: "Fecha de nacimiento",
    phone: "Teléfono (opcional)",
    agreeDemo: "Entiendo que es una demostración estudiantil y solo ingresaré información ficticia.",
    registerButton: "Crear cuenta",
    haveAccount: "¿Ya tiene una cuenta?",
    passkeySetupTitle: "Agregar una llave de acceso",
    passkeySetupBody:
      "Una llave de acceso le permite entrar con Touch ID en lugar de escribir una contraseña. Su dispositivo guarda su huella; nosotros solo recibimos una clave segura que confirma que es usted.",
    passkeySetupButton: "Agregar llave con Touch ID",
    passkeySetupSkip: "Omitir por ahora",
    passkeyAdded: "Llave de acceso agregada. La próxima vez, entre con Touch ID.",
    passkeyList: "Sus llaves de acceso",
    passkeyNone: "Aún no tiene llaves de acceso. Agregue una para entrar con Touch ID.",
    passkeyRemove: "Quitar",
    passkeyRemoved: "Llave de acceso eliminada.",
    passkeyCreated: "Agregada",
    passkeyLastUsed: "Último uso",
    passkeyNever: "Nunca",
    recoverTitle: "Recuperar su cuenta",
    recoverBody:
      "Ingrese su correo y le enviaremos un enlace de acceso de un solo uso. Después, agregue una nueva llave de acceso en Seguridad.",
    recoverButton: "Enviarme un enlace de acceso",
    recoverSent:
      "Si ese correo tiene una cuenta, el enlace va en camino. Vence en 1 hora.",
    backToSignIn: "Volver a iniciar sesión",
    signedOut: "Ha cerrado sesión.",
    security: "Seguridad",
  },
  errors: {
    ...esShop.orderErrors,
    ...esHealth.healthErrors,
    generic: "Algo salió mal. Inténtelo de nuevo.",
    required: "Este campo es obligatorio.",
    email: "Ingrese un correo como nombre@ejemplo.com.",
    passwordShort: "Use al menos 10 caracteres.",
    passwordLong: "Use 72 caracteres o menos.",
    nameShort: "Ingrese su nombre completo (al menos 2 caracteres).",
    nameLong: "Use 80 caracteres o menos.",
    nameChars: "Use solo letras, espacios, apóstrofos y guiones.",
    dobInvalid: "Ingrese una fecha real.",
    dobFuture: "La fecha de nacimiento no puede ser futura.",
    dobTooYoung:
      "El titular debe tener 13 años o más. Agregue a los niños como familiares.",
    dobTooOld: "Revise el año: esa fecha es de hace más de 120 años.",
    phone: "Ingrese un teléfono de EE. UU. de 10 dígitos, como 770-555-0123.",
    agree: "Confirme que solo usará información ficticia.",
    badCredentials: "Ese correo y contraseña no coinciden con ninguna cuenta.",
    emailTaken: "Ya existe una cuenta con ese correo. Intente iniciar sesión.",
    passkeyCancelled: "Se canceló el inicio con llave de acceso. Inténtelo cuando esté listo.",
    passkeyUnsupported:
      "Este navegador no admite llaves de acceso. Use Safari o Chrome en una Mac reciente, o entre con su contraseña.",
    passkeyUnknown:
      "No reconocimos esa llave de acceso en este sitio. Entre con su contraseña y agregue una nueva.",
    passkeyDisabled:
      "El inicio con llave de acceso aún no está activado en este servidor. Use su contraseña por ahora.",
    tooManyRequests: "Demasiados intentos. Espere un minuto e inténtelo de nuevo.",
    notAllowed: "No tiene acceso a esa página.",
    signInRequired: "Inicie sesión para continuar.",
    pageMissing: "No encontramos esa página.",
  },
  account: {
    greeting: "Hola",
    roleLabel: "Sesión iniciada como",
    securityTitle: "Seguridad",
    securityBody: "Administre las llaves de acceso que le permiten entrar con Touch ID.",
  },
  footer: {
    disclaimer:
      "Proyecto estudiantil independiente para el evento FBLA Introduction to Programming. Goodson Drug Co. no usa, patrocina ni respalda este software. Todos los datos de pacientes, recetas, productos y precios son ficticios.",
    privacy: "Privacidad desde el diseño",
    help: "Centro de ayuda",
    about: "Sobre Goodson",
  },
};
