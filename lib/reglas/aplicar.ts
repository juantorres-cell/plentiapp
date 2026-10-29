// lib/reglas/aplicar.ts
// Puente entre la recomendación (cuestionario.ts) y el resto de la app. CÓDIGO PURO:
//  - columnasLegacy: traduce la recomendación a las columnas que /operar ya lee en profiles.
//  - construirConfig / construirRespuestasGuardadas: forma de los dos jsonb nuevos de profiles.
//  - describirRegla: textos para mostrar cada regla, y si /operar ya la hace cumplir hoy.

import type {
  DetalleEmocionPausa,
  ModoRegla,
  RecomendacionReglas,
  ReglaRecomendada,
  RespuestasCuestionario,
  IdRegla,
} from "./cuestionario";

// ── Columnas actuales de profiles (lo que /operar ya lee) ────────────────────────
// No incluye base_calculo_riesgo: esa es una elección del usuario y no se toca.
export type ColumnasLegacy = {
  regla_1_activa: boolean;
  riesgo_maximo_pct: number;
  limite_portafolio_activa: boolean;
  limite_portafolio_pct: number;
  una_operacion_semana_activa: boolean;
};

function encontrar<I extends IdRegla>(
  reglas: ReglaRecomendada[],
  id: I
): Extract<ReglaRecomendada, { id: I }> | undefined {
  return reglas.find((r): r is Extract<ReglaRecomendada, { id: I }> => r.id === id);
}

export function columnasLegacy(recomendacion: RecomendacionReglas): ColumnasLegacy {
  const riesgo = encontrar(recomendacion.activas, "riesgo_operacion");
  const tope = encontrar(recomendacion.activas, "tope_posicion");
  const operaciones = encontrar(recomendacion.activas, "operaciones_periodo");

  return {
    regla_1_activa: true,
    riesgo_maximo_pct: riesgo?.riesgoPct ?? 1,
    limite_portafolio_activa: true,
    limite_portafolio_pct: tope?.topePct ?? 5,
    // La regla actual solo sabe decir "una operación por semana": 3 por semana o 1 por día no caben.
    una_operacion_semana_activa: operaciones ? operaciones.max === 1 && operaciones.periodo === "semana" : false,
  };
}

// ── Forma de los dos jsonb nuevos ────────────────────────────────────────────────
export type RespuestasGuardadas = {
  version: 1;
  respondido_en: string;
  respuestas: RespuestasCuestionario;
  alertas_onboarding: string[];
};

export type ReglasConfig = {
  version: 1;
  origen: "cuestionario";
  aplicada_en: string;
  activas: ReglaRecomendada[];
  sugeridas: ReglaRecomendada[];
  emocionesConPausa: RecomendacionReglas["emocionesConPausa"];
};

// La fecha se inyecta (ISO) para que la función sea pura y comprobable.
export function construirRespuestasGuardadas(
  respuestas: RespuestasCuestionario,
  alertas: readonly string[],
  ahoraISO: string
): RespuestasGuardadas {
  return { version: 1, respondido_en: ahoraISO, respuestas: { ...respuestas }, alertas_onboarding: [...alertas] };
}

export function construirConfig(recomendacion: RecomendacionReglas, ahoraISO: string): ReglasConfig {
  return {
    version: 1,
    origen: "cuestionario",
    aplicada_en: ahoraISO,
    activas: [...recomendacion.activas],
    sugeridas: [...recomendacion.sugeridas],
    emocionesConPausa: {
      estados: [...recomendacion.emocionesConPausa.estados],
      detalles: [...recomendacion.emocionesConPausa.detalles] as DetalleEmocionPausa[],
    },
  };
}

// ── Textos ───────────────────────────────────────────────────────────────────────
export type DescripcionRegla = {
  titulo: string;
  detalle: string;
  // true solo si /operar ya hace cumplir esta regla hoy. Al implementar cada regla nueva
  // en /operar, cambiar aquí su valor para que la pantalla deje de decir "próximamente".
  seAplicaHoy: boolean;
};

export function describirRegla(regla: ReglaRecomendada): DescripcionRegla {
  switch (regla.id) {
    case "riesgo_operacion":
      return {
        titulo: "Riesgo por operación",
        detalle: `Ninguna operación arriesga más del ${regla.riesgoPct}% de tu capital.`,
        seAplicaHoy: true,
      };
    case "tope_posicion":
      return {
        titulo: "Tope por posición",
        detalle: `Una sola posición no pasa del ${regla.topePct}% de tu capital.`,
        seAplicaHoy: true,
      };
    case "stop_definido":
      return {
        titulo: "Stop definido",
        detalle: "Cada operación se abre con un stop loss definido antes de enviarla.",
        seAplicaHoy: false,
      };
    case "operaciones_periodo": {
      const cantidad = regla.max === 1 ? "1 operación" : `${regla.max} operaciones`;
      const unidad = regla.periodo === "semana" ? "por semana" : "por día (la regla del 1111)";
      return {
        titulo: "Operaciones por periodo",
        detalle: `Máximo ${cantidad} ${unidad}.`,
        seAplicaHoy: regla.max === 1 && regla.periodo === "semana",
      };
    }
    case "perdida_periodo":
      return {
        titulo: "Pérdida máxima del periodo",
        detalle: `Límite de pérdida acumulada: ${regla.limitePct}% de tu capital por ${
          regla.periodo === "mes" ? "mes" : "semana"
        }.`,
        seAplicaHoy: false,
      };
    case "tamano_entre_operaciones": {
      const partes: string[] = [];
      if (regla.maxAumentoTrasPerdidaPct !== null) {
        partes.push(
          regla.maxAumentoTrasPerdidaPct === 0
            ? "Después de una pérdida no subes el tamaño de tu posición."
            : `Después de una pérdida subes el tamaño como máximo ${regla.maxAumentoTrasPerdidaPct}%.`
        );
      }
      if (regla.maxAumentoTrasGananciaPct !== null) {
        partes.push(`Después de una ganancia subes el tamaño como máximo ${regla.maxAumentoTrasGananciaPct}%.`);
      }
      return { titulo: "Tamaño entre operaciones", detalle: partes.join(" "), seAplicaHoy: false };
    }
    case "consultar_calibrador":
      return {
        titulo: "Consultar el calibrador antes de abrir",
        detalle: "Antes de abrir una operación, revisa lo que calcula el calibrador para ese activo.",
        seAplicaHoy: false,
      };
  }
}

export function etiquetaModo(modo: ModoRegla): string {
  return modo === "pausa_guiada" ? "Pausa guiada" : "Aviso";
}