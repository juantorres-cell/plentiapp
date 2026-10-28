// lib/microlecciones.ts
// Micro-lecciones: textos fijos y cortos, activados por el comportamiento real del usuario.
// Lógica PURA: sin red, sin Supabase, sin IA. El código decide cuándo aparece cada lección
// y qué cifra del usuario la acompaña; el texto explicativo no cambia.
//
// Dos tipos:
//  - "emocion": explica una emoción que el usuario acaba de declarar (no necesita historial).
//  - "conducta": nace de un patrón de su historial o de lo que está armando en este momento.
//
// Tono: descriptivo y práctico, nunca clínico ni etiquetas sobre la persona.

import {
  DETALLES,
  ESTADOS,
  type Detalle,
  type Estado,
  type Patrones,
} from "./patrones";

export type Leccion = {
  id: string;
  tipo: "emocion" | "conducta";
  titulo: string;
  /** Explicación fija. */
  texto: string;
  /** La cifra del usuario que activó la lección (calculada por código). */
  dato?: string;
  /** Menor = más importante. */
  prioridad: number;
};

const ETIQUETA_ESTADO: Record<Estado, string> = { bien: "Bien", medio: "Medio", mal: "Mal" };
const ETIQUETA_DETALLE: Record<Detalle, string> = {
  tranquilo: "Tranquilo",
  ansioso: "Ansioso",
  euforico: "Eufórico",
  frustrado: "Frustrado",
  miedo: "Con miedo",
  fomo: "Con FOMO",
};

const dinero = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const veces = (n: number) => (n === 1 ? "vez" : "veces");

// ---------- Lecciones de emoción (fijas) ----------

const EMOCION: Record<Exclude<Detalle, "tranquilo"> | "mal", { titulo: string; texto: string }> = {
  euforico: {
    titulo: "Cuando te sientes eufórico",
    texto:
      "La euforia suele hacer que el riesgo se vea más pequeño de lo que es y que cualquier freno parezca innecesario. " +
      "Es una emoción que a menudo empuja a subir el tamaño o a saltarse reglas. Antes de abrir, vuelve a leer tu regla " +
      "y tu «me equivoco si»: si esas dos cosas no han cambiado, la decisión sigue siendo sólida; si lo único que cambió " +
      "es cómo te sientes, espera.",
  },
  fomo: {
    titulo: "Cuando sientes FOMO",
    texto:
      "El FOMO es el miedo a quedarte fuera de un movimiento que ya pasó. Suele aparecer después de ver subir un precio, " +
      "justo cuando entrar es más caro. Pregúntate: ¿abriría esta operación si no hubiera visto la subida? ¿Cuál era mi plan " +
      "antes de verla?",
  },
  frustrado: {
    titulo: "Cuando estás frustrado",
    texto:
      "La frustración, sobre todo después de una pérdida, empuja a «recuperar» rápido: operar más grande o más seguido. " +
      "Recuperar no es una razón para operar; tu tesis sí lo es. Si tu tesis es la misma que antes de la pérdida, sigue valiendo. " +
      "Si la razón es recuperar, espera.",
  },
  ansioso: {
    titulo: "Cuando te sientes ansioso",
    texto:
      "La ansiedad suele llevar a revisar el precio sin parar y a mover el stop o cerrar antes de lo planeado. " +
      "Define desde ahora cuándo vas a revisar la operación (tu fecha de revisión) y cuándo no. " +
      "Una posición más pequeña también baja la tensión.",
  },
  miedo: {
    titulo: "Cuando sientes miedo",
    texto:
      "El miedo puede llevarte a no operar aunque tu plan lo indique, o a salirte al primer movimiento en contra. " +
      "Tu stop ya define cuánto estás dispuesto a perder: si esa cifra te incomoda, reduce la cantidad en vez de " +
      "saltarte el stop o la operación.",
  },
  mal: {
    titulo: "Cuando tu ánimo está bajo",
    texto:
      "Con el ánimo bajo, las decisiones tienden a ser más impulsivas o a evitarse del todo. " +
      "No operar esta semana también es una decisión válida, y registrarla en tu diario cuenta para ver tus patrones.",
  },
};

/** Lección para la emoción que el usuario acaba de declarar. Prioriza la emoción concreta. */
export function leccionDeEmocion(estado: Estado | null, detalle: Detalle | null): Leccion | null {
  if (detalle && detalle !== "tranquilo") {
    const l = EMOCION[detalle];
    return { id: `emocion:${detalle}`, tipo: "emocion", titulo: l.titulo, texto: l.texto, prioridad: 1 };
  }
  if (estado === "mal") {
    const l = EMOCION.mal;
    return { id: "emocion:mal", tipo: "emocion", titulo: l.titulo, texto: l.texto, prioridad: 1 };
  }
  return null;
}

// ---------- Lecciones de conducta (activadas por datos) ----------

type GrupoRegla = {
  tipo: "estado" | "detalle";
  clave: Estado | Detalle;
  etiqueta: string;
  superaron: number;
  calculables: number;
};

/** El grupo de emoción en que más se superó la regla (mínimo 2 veces y la mitad o más de los casos). */
function grupoReglaMasAlto(p: Patrones): GrupoRegla | null {
  const candidatos: GrupoRegla[] = [];
  ESTADOS.forEach((e) => {
    const c = p.reglas_por_emocion.por_estado[e];
    if (c.suficiente) candidatos.push({ tipo: "estado", clave: e, etiqueta: ETIQUETA_ESTADO[e], ...pick(c) });
  });
  DETALLES.forEach((d) => {
    const c = p.reglas_por_emocion.por_detalle[d];
    if (c.suficiente) candidatos.push({ tipo: "detalle", clave: d, etiqueta: ETIQUETA_DETALLE[d], ...pick(c) });
  });
  const validos = candidatos.filter((g) => g.superaron >= 2 && g.superaron / g.calculables >= 0.5);
  if (validos.length === 0) return null;
  validos.sort(
    (a, b) => b.superaron / b.calculables - a.superaron / a.calculables || b.superaron - a.superaron
  );
  return validos[0];
}

function pick(c: { superaron: number; calculables: number }) {
  return { superaron: c.superaron, calculables: c.calculables };
}

type ComparacionEmocion = {
  peor: { clave: Estado; etiqueta: string; n: number; promedio: number };
  mejor: { clave: Estado; etiqueta: string; n: number; promedio: number };
};

/** Solo entre grupos con muestra suficiente: el de peor promedio (negativo) frente al mejor. */
function peorFrenteAlMejor(p: Patrones): ComparacionEmocion | null {
  const grupos = ESTADOS.map((e) => ({ clave: e, etiqueta: ETIQUETA_ESTADO[e], ...p.emocion_vs_resultado.por_estado[e] }))
    .filter((g) => g.suficiente)
    .map((g) => ({ clave: g.clave, etiqueta: g.etiqueta, n: g.n, promedio: g.promedio }));
  if (grupos.length < 2) return null;
  const orden = grupos.slice().sort((a, b) => a.promedio - b.promedio);
  const peor = orden[0];
  const mejor = orden[orden.length - 1];
  if (peor.promedio >= 0 || mejor.promedio <= peor.promedio) return null;
  return { peor, mejor };
}

const LECCION_TAMANO = (pct: number) =>
  "Subir el tamaño para recuperar rápido (la Martingala) es una trampa común: una racha de pérdidas puede crecer mucho más que " +
  `la anterior. Tu regla del ${pct}% existe para ese momento. Mide cada operación por separado, no por lo que acabas de perder.`;

const LECCION_CALIBRADOR = (pct: number) =>
  `La cantidad del calibrador sale de tu regla del ${pct}% y de cuánto se mueve la acción. Comprar más es arriesgar más de lo que ` +
  "decidiste cuando estabas tranquilo. Si quieres otra cantidad, hazlo de forma consciente (acercando el stop o revisando tu regla " +
  "en Reglas), no solo subiendo el número de acciones.";

/** Lecciones de conducta según el historial. Para mostrarlas todas (por ejemplo en el perfil). */
export function leccionesDeConducta(p: Patrones): Leccion[] {
  const out: Leccion[] = [];
  const at = p.reglas_por_emocion.aumento_tras_perdida;
  if (at.suficiente && at.veces >= 2) {
    out.push({
      id: "conducta:tamano_tras_perdida",
      tipo: "conducta",
      titulo: "Subir el tamaño después de perder",
      dato: `Después de una pérdida subiste el tamaño ${at.veces} de ${at.oportunidades} ${veces(at.oportunidades)}.`,
      texto: LECCION_TAMANO(p.regla_pct),
      prioridad: 10,
    });
  }

  const g = grupoReglaMasAlto(p);
  if (g) {
    out.push({
      id: "conducta:regla_con_emocion",
      tipo: "conducta",
      titulo: "Tu regla de riesgo y cómo te sientes",
      dato: `Cuando marcaste «${g.etiqueta}» superaste tu regla ${g.superaron} de ${g.calculables} ${veces(g.calculables)}.`,
      texto:
        `Tu regla del ${p.regla_pct}% está para cuando el criterio se nubla. Si notas esta emoción, mira primero el riesgo en ` +
        "dólares y la cantidad máxima del calibrador, y recién después decide.",
      prioridad: 11,
    });
  }

  const csc = p.calibrador.cantidad_sobre_calibrador;
  if (csc.suficiente && csc.veces >= 2) {
    out.push({
      id: "conducta:cantidad_sobre_calibrador",
      tipo: "conducta",
      titulo: "Más acciones de las que calculó el calibrador",
      dato: `Compraste más de lo que calculó el calibrador ${csc.veces} de ${csc.calculables} ${veces(csc.calculables)}.`,
      texto: LECCION_CALIBRADOR(p.regla_pct),
      prioridad: 12,
    });
  }

  const c = peorFrenteAlMejor(p);
  if (c) {
    out.push({
      id: "conducta:resultado_segun_emocion",
      tipo: "conducta",
      titulo: "Tus resultados según cómo te sientes",
      dato:
        `Cuando marcaste «${c.peor.etiqueta}»: promedio ${dinero(c.peor.promedio)} en ${c.peor.n} operaciones. ` +
        `Cuando marcaste «${c.mejor.etiqueta}»: ${dinero(c.mejor.promedio)} en ${c.mejor.n}.`,
      texto:
        "Es una asociación con pocos datos, no una causa. Si se repite, vale la pena preguntarte qué cambia en cómo decides " +
        "cuando te sientes así. En esos días, «No voy a operar» también es una opción.",
      prioridad: 13,
    });
  }

  const sd = p.semanas.solo_check_in;
  if (sd >= 1) {
    out.push({
      id: "conducta:semanas_sin_decision",
      tipo: "conducta",
      titulo: "Registra también las semanas en que no operas",
      dato: `${sd} ${sd === 1 ? "semana tiene" : "semanas tienen"} check-in pero ninguna decisión registrada.`,
      texto:
        "No operar es una decisión, y solo cuenta para tus patrones si la registras con «No voy a operar». " +
        "Así Plenti puede ver qué haces cuando decides esperar.",
      prioridad: 14,
    });
  }

  return out.sort((a, b) => a.prioridad - b.prioridad);
}

// ---------- Lecciones mientras arma una operación ----------

export type SituacionOperar = {
  estado: Estado | null;
  detalle: Detalle | null;
  /** Tamaño en dinero de la posición que está armando (precio de referencia × cantidad). */
  monto: number | null;
  cantidad: number | null;
  /** Cantidad que calculó el calibrador para este activo, si lo consultó. */
  cantidadCalibrador: number | null;
  reglaPct: number;
};

/**
 * Máximo 2 lecciones. Primero lo que está pasando ahora (situacional), luego lo del historial
 * solo si coincide con la emoción actual. Sin historial suficiente, solo salen las situacionales.
 */
export function leccionesDeOperacion(p: Patrones | null, s: SituacionOperar): Leccion[] {
  const out: Leccion[] = [];

  const u = p?.ultima_operacion;
  if (
    u &&
    u.estado === "cerrada" &&
    u.resultado !== null &&
    u.resultado < 0 &&
    s.monto !== null &&
    u.monto !== null &&
    s.monto > u.monto
  ) {
    out.push({
      id: "conducta:tamano_tras_perdida",
      tipo: "conducta",
      titulo: "Subir el tamaño después de perder",
      dato: `Tu última operación cerró con ${dinero(u.resultado)}. Esta posición (${dinero(s.monto)}) es mayor que la anterior (${dinero(u.monto)}).`,
      texto: LECCION_TAMANO(s.reglaPct),
      prioridad: 2,
    });
  }

  if (s.cantidad !== null && s.cantidadCalibrador !== null && s.cantidad > s.cantidadCalibrador) {
    out.push({
      id: "conducta:cantidad_sobre_calibrador",
      tipo: "conducta",
      titulo: "Más acciones de las que calculó el calibrador",
      dato: `Estás por comprar ${s.cantidad} y el calibrador calculó ${s.cantidadCalibrador}.`,
      texto: LECCION_CALIBRADOR(s.reglaPct),
      prioridad: 3,
    });
  }

  if (p) {
    const g = grupoReglaMasAlto(p);
    const coincide = g && (g.tipo === "estado" ? g.clave === s.estado : g.clave === s.detalle);
    if (g && coincide) {
      out.push({
        id: "conducta:regla_con_emocion",
        tipo: "conducta",
        titulo: "Tu regla de riesgo y cómo te sientes",
        dato: `Cuando marcaste «${g.etiqueta}» superaste tu regla ${g.superaron} de ${g.calculables} ${veces(g.calculables)}.`,
        texto:
          `Tu regla del ${p.regla_pct}% está para cuando el criterio se nubla. Si notas esta emoción, mira primero el riesgo en ` +
          "dólares y la cantidad máxima del calibrador, y recién después decide.",
        prioridad: 4,
      });
    }

    const c = peorFrenteAlMejor(p);
    if (c && s.estado === c.peor.clave) {
      out.push({
        id: "conducta:resultado_segun_emocion",
        tipo: "conducta",
        titulo: "Tus resultados según cómo te sientes",
        dato:
          `Cuando marcaste «${c.peor.etiqueta}»: promedio ${dinero(c.peor.promedio)} en ${c.peor.n} operaciones. ` +
          `Cuando marcaste «${c.mejor.etiqueta}»: ${dinero(c.mejor.promedio)} en ${c.mejor.n}.`,
        texto:
          "Es una asociación con pocos datos, no una causa. Si se repite, vale la pena preguntarte qué cambia en cómo decides " +
          "cuando te sientes así. En esos días, «No voy a operar» también es una opción.",
        prioridad: 5,
      });
    }
  }

  const vistos = new Set<string>();
  return out
    .sort((a, b) => a.prioridad - b.prioridad)
    .filter((l) => (vistos.has(l.id) ? false : (vistos.add(l.id), true)))
    .slice(0, 2);
}