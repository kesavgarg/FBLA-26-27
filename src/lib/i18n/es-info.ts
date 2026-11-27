import type { enInfo } from "./en-info";

/** Spanish text for About / Heritage, Privacy by design and the Help center. */
export const esInfo: typeof enInfo = {
  about: {
    title: "Sobre Goodson",
    eyebrow: "En el centro de Cumming desde 1959",
    heading: "Una farmacia familiar que se reconstruyó y reabrió en la misma esquina",
    intro:
      "Por más de sesenta años, Goodson Drug Co. ha surtido recetas en Maple Street con una promesa impresa en cada etiqueta. Este proyecto estudiantil imagina cómo ese mismo servicio podría funcionar en línea.",
    mottoLabel: "El lema en cada etiqueta de receta",
    philosophyTitle: "Un servicio al que la gente regresa",
    philosophy: [
      { title: "Conocer al cliente", body: "Una farmacia familiar funciona porque la gente conoce a su farmacéutico por su nombre. Pedir en línea debe conservar eso, no reemplazarlo." },
      { title: "Fácil para todos", body: "Muchos clientes de años son mayores. Texto grande, palabras claras y un resurtido en tres pasos importan más que funciones llamativas." },
      { title: "Estar presente después de tiempos difíciles", body: "Después de que un incendio cerró el edificio, la farmacia siguió atendiendo desde un local temporal y volvió a su dirección original." },
    ],
    timelineTitle: "Momentos clave",
    timeline: [
      { year: "1959", title: "Fundación", body: "Jim Goodson Sr. abre la farmacia el 24 de julio, al otro lado de la calle de su ubicación actual — terreno que hoy es el anexo del juzgado del condado de Forsyth." },
      { year: "1970", title: "Se muda a W. Maple St.", body: "La tienda se muda a 116 W. Maple St. La familia también abre el Bull Dog Inn en el local, un guiño a sus lazos con la Universidad de Georgia." },
      { year: "Años 70", title: "Registros por computadora", body: "Según se informa, una de las primeras farmacias de Georgia en llevar sus registros por computadora." },
      { year: "2005", title: "Aliada de la salud comunitaria", body: "Registrada como farmacia contratada de Georgia Highlands Medical Services (Cumming Family Health Center) en el programa federal 340B." },
      { year: "2019", title: "Sesenta años", body: "La prensa local celebra el 60.º aniversario de la tienda, todavía dirigida por la familia Goodson." },
      { year: "Nov. 2024", title: "Incendio", body: "Un incendio cierra el edificio. La farmacia sigue atendiendo desde un local temporal." },
      { year: "29 dic. 2025", title: "De regreso a casa", body: "Goodson Drug Co. reabre en su dirección original, 116 W. Maple St." },
    ],
    projectTitle: "Sobre este proyecto",
    projectBody:
      "Este sitio es un proyecto estudiantil independiente para el evento FBLA Introduction to Programming. Goodson Drug Co. no lo usa, patrocina ni respalda. Los productos, precios, pacientes y médicos de este sitio son ficticios.",
    sources: "Fuentes: Forsyth County News (60.º aniversario; incendio de 2024; reapertura de diciembre de 2025), listados públicos de negocios, base de datos HRSA 340B — según la guía de investigación del proyecto. Los datos pueden cambiar.",
    visit: "Visítenos",
  },
  privacy: {
    title: "Privacidad desde el diseño",
    intro: "Cómo este proyecto estudiantil protege la información, y lo que una farmacia real aún necesitaría.",
    sections: [
      { title: "Solo datos ficticios", body: "Cada paciente, receta, médico, producto y precio es inventado. Nunca ingrese información de salud real. El sitio no cumple con HIPAA y no es una farmacia real." },
      { title: "Acceso según el rol", body: "Clientes, personal de farmacia, un médico simulado y el dueño ven solo lo que su trabajo necesita. Registrarse siempre crea un cliente; solo el dueño puede otorgar otros roles, y nunca a sí mismo." },
      { title: "Solo la información necesaria", body: "El médico ve la revisión de síntomas, alergias y medicamentos de una solicitud, no sus pedidos. El personal ve los pedidos y las revisiones de seguridad, no su diario de síntomas." },
      { title: "Revisado en tres lugares", body: "Cada página y acción revisa su rol en el servidor; la seguridad por filas de la base de datos limita qué registros ve cada persona; y los cambios sensibles (pago, recetas, decisiones) se ejecutan dentro de funciones de la base de datos que vuelven a revisar." },
      { title: "Registro de auditoría", body: "Las decisiones del médico, cambios de pedidos y resurtidos, cambios de inventario, cambios de rol y exportaciones se registran con quién y cuándo. No se pueden editar ni borrar." },
      { title: "Inicio de sesión seguro", body: "Las llaves de acceso permiten entrar con Touch ID o Face ID. Su huella nunca sale de su dispositivo; el sitio guarda solo una clave pública. Las contraseñas se guardan como hashes de un solo sentido en Supabase Auth." },
      { title: "Sin datos de tarjetas", body: "El pago es simulado. El sitio nunca pide ni guarda números de tarjeta." },
      { title: "Límites de un proyecto estudiantil", body: "Un sistema real necesitaría médicos con licencia, revisión legal, hospedaje y acuerdos tipo HIPAA, proveedores reales de correo y SMS, y una revisión de seguridad independiente." },
    ],
  },
  help: {
    title: "Centro de ayuda",
    intro: "Haga una pregunta con sus palabras o vea las preguntas comunes abajo.",
    assistantTitle: "Pregunte al asistente",
    assistantHint: "Pruebe “¿Cómo resurto una receta?” o “How do I cancel an order?”",
    assistantLabel: "Su pregunta",
    ask: "Preguntar",
    thinking: "Buscando…",
    noMatch: "No encontré una respuesta. Pruebe otras palabras o elija una de las preguntas de abajo.",
    didYouMean: "Preguntas relacionadas",
    open: "Ir allí",
    disclaimer: "El asistente responde preguntas sobre cómo usar este sitio. No da consejos médicos. En una emergencia, llame al 911.",
    faqTitle: "Preguntas comunes",
    suggestions: ["¿Cómo resurto?", "Entrar con Touch ID", "Cancelar un pedido", "¿Por qué está bloqueado?"],
  },
};
