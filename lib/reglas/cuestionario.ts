// lib/reglas/cuestionario.ts
// Motor de recomendación de reglas de riesgo. CÓDIGO PURO Y DETERMINISTA:
// sin IA, sin Supabase, sin React. Misma entrada -> misma salida.
//
// Entrada: alertas del onboarding + 6 respuestas del cuestionario (a/b/c).
// Salida: reglas activas (máx. 6), reglas sugeridas y emociones que activan la pausa guiada.
//
// TODOS los números (1%, 2%, 3%, 4%, 6%, +25%) son PROVISIONALES: no están validados con datos.
// Cuando se validen, documentarlos en DECISIONES.md.

export const MAX_REGLAS_ACTIVAS = 6;

export type Opcion = "a" | "b" | "c";

export type AlertaOnboarding =
  | "urgencia_ingresos"
  | "capital_necesario"
  | "riesgo_martingala"
  | "riesgo_sobreoperacion"
  | "tendencia_paralisis";

const ALERTAS_CONOCIDAS: readonly string[] = [
  "urgencia_ingresos",
  "capital_necesario",
  "riesgo_martingala",
  "riesgo_sobreoperacion",
  "tendencia_paralisis",
];

// P1 salida · P2 cadencia · P3 FOMO · P4 racha ganadora · P5 tolerancia mensual · P6 preparación
export type RespuestasCuestionario = {
  salida: Opcion;
  cadencia: Opcion;
  fomo: Opcion;
  racha: Opcion;
  tolerancia: Opcion;
  preparacion: Opcion;
};

export type EntradaCuestionario = {
  // Se aceptan strings para no acoplarse al formato exacto de lib/onboarding.ts;
  // lo desconocido se ignora.
  alertas: readonly string[];
  respuestas: RespuestasCuestionario;
};

export type ModoRegla = "aviso" | "pausa_guiada";

type Comun = {
  modo: ModoRegla;
  // Cantidad de señales que la respaldan. Informativo; el modo se deriva de aquí
  // salvo en "stop_definido", donde lo fija la pregunta 1 directamente.
  senales: number;
  // Explicaciones para mostrar "te la sugerimos porque...". Descriptivas, no clínicas.
  porque: string[];
};

export type ReglaRecomendada =
  | (Comun & { id: "riesgo_operacion"; riesgoPct: number; techoPct: number })
  | (Comun & { id: "tope_posicion"; topePct: number })
  | (Comun & { id: "stop_definido" })
  | (Comun & { id: "operaciones_periodo"; max: number; periodo: "semana" | "dia" })
  | (Comun & { id: "perdida_periodo"; limitePct: number; periodo: "mes" | "semana" })
  | (Comun & {
      id: "tamano_entre_operaciones";
      // null = sin tope para ese caso
      maxAumentoTrasPerdidaPct: number | null;
      maxAumentoTrasGananciaPct: number | null;
    })
  | (Comun & { id: "consultar_calibrador" });

export type IdRegla = ReglaRecomendada["id"];

export type DetalleEmocionPausa = "frustrado" | "fomo" | "euforico";

export type RecomendacionReglas = {
  // base (3) + periodo (2) + como máximo 1 de conducta -> nunca más de MAX_REGLAS_ACTIVAS
  activas: ReglaRecomendada[];
  // Regla de conducta con señales que no entró al cupo; el usuario puede cambiarla por la activa.
  sugeridas: ReglaRecomendada[];
  // "mal" (estado) siempre dispara la pausa; el resto depende de las respuestas.
  emocionesConPausa: { estados: "mal"[]; detalles: DetalleEmocionPausa[] };
};

function esOpcion(v: unknown): v is Opcion {
  return v === "a" || v === "b" || v === "c";
}

function validar(respuestas: RespuestasCuestionario): void {
  const claves = ["salida", "cadencia", "fomo", "racha", "tolerancia", "preparacion"] as const;
  for (const clave of claves) {
    if (!esOpcion(respuestas[clave])) {
      throw new Error(`Respuesta inválida o faltante en "${clave}": ${String(respuestas[clave])}`);
    }
  }
}

// 0 señales -> no aplica; 1 -> aviso; 2 o más -> pausa guiada.
function modoPorSenales(senales: number): ModoRegla {
  return senales >= 2 ? "pausa_guiada" : "aviso";
}

const ESCALONES_PERDIDA = [2, 4, 6] as const;

export function recomendarReglas(entrada: EntradaCuestionario): RecomendacionReglas {
  const r = entrada.respuestas;
  validar(r);

  const alertas = new Set<string>(entrada.alertas.filter((a) => ALERTAS_CONOCIDAS.includes(a)));
  const martingala = alertas.has("riesgo_martingala");
  const sobreoperacion = alertas.has("riesgo_sobreoperacion");
  const capitalOUrgencia = alertas.has("capital_necesario") || alertas.has("urgencia_ingresos");

  const motivoCapital =
    "Según tus respuestas del onboarding, este dinero te hace falta pronto o esperas ingresos de él.";

  // ── 1. Riesgo por operación (base) ───────────────────────────────────────────
  const riesgo: ReglaRecomendada = {
    id: "riesgo_operacion",
    modo: "aviso",
    senales: 0,
    riesgoPct: 1,
    techoPct: 2,
    porque: ["Regla base de Plenti: ninguna operación arriesga más del 1% de tu capital."],
  };

  // ── 2. Tope por posición (base) ──────────────────────────────────────────────
  const tope: ReglaRecomendada = {
    id: "tope_posicion",
    modo: "aviso",
    senales: capitalOUrgencia ? 1 : 0,
    topePct: capitalOUrgencia ? 3 : 5,
    porque: capitalOUrgencia
      ? ["Regla base. Bajó de 5% a 3% de tu capital por posición.", motivoCapital]
      : ["Regla base de Plenti: una sola posición no pasa del 5% de tu capital."],
  };

  // ── 3. Stop definido (base; modo según pregunta 1) ───────────────────────────
  const motivoSalida: Record<Opcion, string> = {
    a: "Dijiste que defines y anotas tu salida antes de entrar.",
    b: "Dijiste que antes de entrar solo tienes una idea aproximada de tu salida.",
    c: "Dijiste que decides tu salida sobre la marcha.",
  };
  const stop: ReglaRecomendada = {
    id: "stop_definido",
    modo: r.salida === "a" ? "aviso" : "pausa_guiada",
    senales: r.salida === "a" ? 0 : 1,
    porque: [motivoSalida[r.salida]],
  };

  // ── 4. Operaciones por periodo (valor según pregunta 2; modo por señales) ────
  const cadencia: { max: number; periodo: "semana" | "dia"; texto: string } =
    r.cadencia === "a"
      ? { max: 1, periodo: "semana", texto: "Dijiste que piensas operar una vez por semana." }
      : r.cadencia === "b"
        ? { max: 3, periodo: "semana", texto: "Dijiste que piensas operar 2 o 3 veces por semana." }
        : {
            max: 1,
            periodo: "dia",
            texto: "Dijiste que piensas operar casi a diario: una operación por día (la regla del 1111).",
          };
  const senalesOperaciones = (sobreoperacion ? 1 : 0) + (r.fomo === "c" ? 1 : 0);
  const porqueOperaciones = [cadencia.texto];
  if (sobreoperacion) {
    porqueOperaciones.push("Según tus respuestas del onboarding, bajo presión sientes la necesidad de hacer algo.");
  }
  if (r.fomo === "c") {
    porqueOperaciones.push("Dijiste que entrarías rápido a una acción que sube para no quedarte fuera.");
  }
  const operaciones: ReglaRecomendada = {
    id: "operaciones_periodo",
    modo: modoPorSenales(senalesOperaciones),
    senales: senalesOperaciones,
    max: cadencia.max,
    periodo: cadencia.periodo,
    porque: porqueOperaciones,
  };

  // ── 5. Pérdida del periodo (valor según pregunta 5; modo por señales) ────────
  const indiceTolerancia = r.tolerancia === "a" ? 0 : r.tolerancia === "b" ? 1 : 2;
  const indiceFinal = capitalOUrgencia ? Math.max(0, indiceTolerancia - 1) : indiceTolerancia;
  const mensual = ESCALONES_PERDIDA[indiceFinal] ?? 2;
  const semanal = r.cadencia === "c";
  const limite = semanal ? Math.max(1, mensual / 2) : mensual;
  const motivoTolerancia: Record<Opcion, string> = {
    a: "Dijiste que podrías perder hasta 2% de tu capital en un mes sin que te afecte.",
    b: "Dijiste que podrías perder entre 3% y 6% de tu capital en un mes sin que te afecte.",
    c: "Dijiste que podrías perder más de 6% en un mes; el techo de Plenti es 6%.",
  };
  const porquePerdida = [motivoTolerancia[r.tolerancia]];
  if (capitalOUrgencia) porquePerdida.push("Bajó un escalón. " + motivoCapital);
  if (semanal) porquePerdida.push("Como piensas operar casi a diario, el límite se mide por semana (la mitad del mensual).");
  const senalesPerdida = (capitalOUrgencia ? 1 : 0) + (r.tolerancia === "a" ? 1 : 0);
  const perdida: ReglaRecomendada = {
    id: "perdida_periodo",
    modo: modoPorSenales(senalesPerdida),
    senales: senalesPerdida,
    limitePct: limite,
    periodo: semanal ? "semana" : "mes",
    porque: porquePerdida,
  };

  // ── 6. Regla de conducta: UN solo cupo ───────────────────────────────────────
  // Tamaño entre operaciones
  const senalesTamano = (martingala ? 1 : 0) + (r.racha === "b" ? 1 : r.racha === "c" ? 2 : 0);
  const porqueTamano: string[] = [];
  if (martingala) {
    porqueTamano.push("Según tus respuestas del onboarding, tras una pérdida tiendes a operar más grande para recuperar.");
  }
  if (r.racha === "b") porqueTamano.push("Dijiste que tras dos ganancias seguidas subirías un poco el tamaño.");
  if (r.racha === "c") porqueTamano.push("Dijiste que tras dos ganancias seguidas subirías bastante el tamaño.");
  const tamano: ReglaRecomendada | null =
    senalesTamano > 0
      ? {
          id: "tamano_entre_operaciones",
          modo: modoPorSenales(senalesTamano),
          senales: senalesTamano,
          maxAumentoTrasPerdidaPct: martingala || r.racha === "c" ? 0 : null,
          maxAumentoTrasGananciaPct: r.racha === "b" || r.racha === "c" ? 25 : null,
          porque: porqueTamano,
        }
      : null;

  // Consultar el calibrador antes de abrir
  const senalesCalibrador =
    (r.preparacion === "b" ? 1 : r.preparacion === "c" ? 2 : 0) + (r.salida === "c" ? 1 : 0);
  const porqueCalibrador: string[] = [];
  if (r.preparacion === "b") porqueCalibrador.push("Dijiste que analizas entre 10 y 30 minutos antes de abrir.");
  if (r.preparacion === "c") porqueCalibrador.push("Dijiste que analizas menos de 10 minutos antes de abrir.");
  if (r.salida === "c") porqueCalibrador.push("Dijiste que decides tu salida sobre la marcha.");
  const calibrador: ReglaRecomendada | null =
    senalesCalibrador > 0
      ? {
          id: "consultar_calibrador",
          modo: modoPorSenales(senalesCalibrador),
          senales: senalesCalibrador,
          porque: porqueCalibrador,
        }
      : null;

  // Prioridad del cupo: con alerta de martingala o racha (c), el cupo es para Tamaño aunque
  // Calibrador sume más señales. Si no, gana quien tenga más señales; en empate, Tamaño.
  const reservaParaTamano = martingala || r.racha === "c";
  let conducta: ReglaRecomendada | null = null;
  const sugeridas: ReglaRecomendada[] = [];
  if (tamano && calibrador) {
    const gana = reservaParaTamano || senalesTamano >= senalesCalibrador ? "tamano" : "calibrador";
    conducta = gana === "tamano" ? tamano : calibrador;
    sugeridas.push(gana === "tamano" ? calibrador : tamano);
  } else {
    conducta = tamano ?? calibrador;
  }

  const activas: ReglaRecomendada[] = [riesgo, tope, stop, operaciones, perdida];
  if (conducta) activas.push(conducta);

  // ── Emociones que activan la pausa guiada ────────────────────────────────────
  const detalles: DetalleEmocionPausa[] = [];
  if (martingala) detalles.push("frustrado");
  if (r.fomo === "c") detalles.push("fomo");
  if (r.racha === "c") detalles.push("euforico");

  return {
    activas,
    sugeridas,
    emocionesConPausa: { estados: ["mal"], detalles },
  };
}