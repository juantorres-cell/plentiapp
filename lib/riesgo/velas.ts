// lib/riesgo/velas.ts
// Limpieza PURA de velas diarias antes de calcular el ATR. Sin red.
import type { Vela } from "./calibrador";

export type QuoteCruda = {
  date: Date | string | number;
  high: number | null;
  low: number | null;
  close: number | null;
};

const TZ = "America/New_York";

/** Fecha (YYYY-MM-DD) y hora (0-23) en Nueva York para un instante dado. */
export function fechaHoraNY(d: Date): { fecha: string; hora: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const hora = parseInt(get("hour"), 10) % 24; // "24" -> 0 en algunos runtimes
  return { fecha: `${get("year")}-${get("month")}-${get("day")}`, hora };
}

/**
 * - Ordena de antigua a reciente.
 * - Descarta velas con datos nulos/no finitos.
 * - Descarta la vela de HOY (hora NY) si el mercado aún no cerró (antes de las 16:00 NY):
 *   es una vela incompleta y distorsionaría el ATR.
 * Devuelve las velas completas, la fecha de la última (asOf) y si se descartó una parcial.
 */
export function limpiarVelas(
  quotes: QuoteCruda[],
  ahora: Date = new Date()
): { velas: Vela[]; asOf: string | null; descartoParcial: boolean } {
  const filas = (quotes ?? [])
    .map((q) => ({ t: new Date(q.date), high: q.high, low: q.low, close: q.close }))
    .filter(
      (q) =>
        !isNaN(q.t.getTime()) &&
        q.high != null && q.low != null && q.close != null &&
        isFinite(q.high) && isFinite(q.low) && isFinite(q.close) &&
        q.high >= q.low
    )
    .sort((a, b) => a.t.getTime() - b.t.getTime());

  const hoy = fechaHoraNY(ahora);
  let descartoParcial = false;
  if (filas.length > 0) {
    const ultima = fechaHoraNY(filas[filas.length - 1].t);
    if (ultima.fecha === hoy.fecha && hoy.hora < 16) {
      filas.pop();
      descartoParcial = true;
    }
  }

  const asOf = filas.length ? fechaHoraNY(filas[filas.length - 1].t).fecha : null;
  return {
    velas: filas.map((f) => ({ high: f.high as number, low: f.low as number, close: f.close as number })),
    asOf,
    descartoParcial,
  };
}

/** Días de calendario entre dos fechas YYYY-MM-DD. */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}