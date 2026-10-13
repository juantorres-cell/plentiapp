// lib/operaciones.ts
// Lógica PURA del registro de operaciones (sin red, sin Supabase, sin IA).

export type Hipotesis = {
  observo: string; // hechos verificables
  tesis: string; // por qué (tuya)
  me_equivoco_si: string; // condición concreta que la refuta
  cuando_reviso: string; // fecha YYYY-MM-DD
};

/** Convierte texto de un input a número. Acepta coma decimal. null si está vacío o no es número. */
export function numero(s: string): number | null {
  const t = (s ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const MIN_TESIS = 10;
const MIN_REFUTACION = 8;

/**
 * errores: bloquean el guardado. avisos: solo informan.
 * No juzga el contenido de la tesis: solo exige que exista y que la condición de error sea concreta.
 */
export function validarHipotesis(h: Hipotesis): { errores: string[]; avisos: string[] } {
  const errores: string[] = [];
  const avisos: string[] = [];
  const tesis = h.tesis.trim();
  const refuta = h.me_equivoco_si.trim();
  const observo = h.observo.trim();

  if (tesis.length < MIN_TESIS) errores.push("Escribe tu tesis: por qué crees que esta operación tiene sentido.");
  if (refuta.length < MIN_REFUTACION) errores.push("Escribe en qué caso te equivocarías (“me equivoco si…”).");

  if (refuta.length >= MIN_REFUTACION && !/\d/.test(refuta)) {
    avisos.push("“Me equivoco si” no incluye ningún número (precio o fecha). Una condición concreta se puede comprobar después.");
  }
  if (observo.length === 0) {
    avisos.push("No anotaste hechos que observas. Sin datos verificables, la tesis es solo una opinión.");
  } else if (!/\d/.test(observo)) {
    avisos.push("Lo que observas no incluye números. Cita al menos un dato (precio, media, porcentaje).");
  }
  if (h.cuando_reviso.trim() === "") avisos.push("No fijaste cuándo vas a revisar la hipótesis.");

  return { errores, avisos };
}

/** Lunes siguiente a la semana de la operación: semana (lunes) + 7 días. Aritmética en UTC. */
export function fechaRevisionPorDefecto(semana: string): string {
  const d = new Date(`${semana}T00:00:00Z`);
  if (isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** ¿Coincidió el usuario con lo que calculó el sistema? null = no se puede comparar. */
export function compararConCalibrador(
  usuario: { cantidad: number | null; stop: number | null },
  sistema: { cantidad: number | null; stop_sugerido: number | null } | null
): { cantidad: boolean | null; stop: boolean | null } | null {
  if (!sistema) return null;
  return {
    cantidad:
      sistema.cantidad != null && usuario.cantidad != null ? usuario.cantidad === sistema.cantidad : null,
    stop:
      sistema.stop_sugerido != null && usuario.stop != null
        ? Math.abs(usuario.stop - sistema.stop_sugerido) <= 0.01 + 1e-9
        : null,
  };
}