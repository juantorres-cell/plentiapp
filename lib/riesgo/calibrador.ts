// src/lib/riesgo/calibrador.ts
// Capa 1: calibrador de riesgo. Funciones PURAS (sin red, sin Supabase, sin IA).
// El código decide; nada aquí predice precios.

export type Vela = { high: number; low: number; close: number };

/**
 * ATR de Wilder. Necesita al menos (periodo + 1) velas ordenadas de la más
 * antigua a la más reciente. Devuelve null si no hay datos suficientes o válidos.
 */
export function atr(velas: Vela[], periodo = 14): number | null {
  if (!Number.isInteger(periodo) || periodo < 1) return null;
  if (!Array.isArray(velas) || velas.length < periodo + 1) return null;
  if (velas.some((v) => !isFinite(v.high) || !isFinite(v.low) || !isFinite(v.close))) return null;

  const tr: number[] = velas.map((v, i) => {
    if (i === 0) return v.high - v.low;
    const pc = velas[i - 1].close;
    return Math.max(v.high - v.low, Math.abs(v.high - pc), Math.abs(v.low - pc));
  });

  // ATR inicial = media simple de los primeros `periodo` TR; luego suavizado de Wilder.
  let a = tr.slice(0, periodo).reduce((s, x) => s + x, 0) / periodo;
  for (let i = periodo; i < tr.length; i++) {
    a = (a * (periodo - 1) + tr[i]) / periodo;
  }
  return a;
}

/** Aproximación del rango semanal a partir del ATR diario (√5 sesiones). */
export function atrSemanalAprox(atrDiario: number): number {
  return atrDiario * Math.sqrt(5);
}

/** stop = entrada − k × ATR. k se fija de ANTEMANO (no ajustar viendo resultados). */
export function stopPorAtr(entrada: number, atrValor: number, k = 2): number {
  return entrada - k * atrValor;
}

export type ResultadoPosicion =
  | {
      ok: true;
      cantidad: number;
      limiteActivo: "riesgo" | "tope_portafolio";
      distanciaPorAccion: number;
      distanciaPct: number;
      cantidadPorRiesgo: number; // máximo permitido solo por la regla del riesgo
      cantidadPorTope: number; // máximo permitido solo por el tope por posición
      perdidaMaximaUsd: number; // cantidad × distancia (si el stop se ejecuta en su precio)
      perdidaMaximaPct: number; // sobre el capital
      montoInvertido: number;
    }
  | { ok: false; motivo: "datos_invalidos" | "stop_no_menor_a_entrada" | "cantidad_cero"; detalle: string };

/**
 * cantidad = floor( min( capital×riesgo% / (entrada−stop),  capital×tope% / entrada ) )
 * Solo compra (sin cortos), sin fraccionarios.
 */
export function calcularPosicion(p: {
  capital: number;
  entrada: number;
  stop: number;
  riesgoPct?: number; // default 1
  topePct?: number; // default 5
}): ResultadoPosicion {
  const { capital, entrada, stop } = p;
  const riesgoPct = p.riesgoPct ?? 1;
  const topePct = p.topePct ?? 5;

  if (![capital, entrada, stop, riesgoPct, topePct].every((x) => isFinite(x)) || capital <= 0 || entrada <= 0 || stop <= 0 || riesgoPct <= 0 || topePct <= 0) {
    return { ok: false, motivo: "datos_invalidos", detalle: "Todos los valores deben ser números positivos." };
  }
  if (stop >= entrada) {
    return { ok: false, motivo: "stop_no_menor_a_entrada", detalle: "Para una compra, el stop debe quedar por debajo de la entrada." };
  }

  const distancia = entrada - stop;
  const cantidadPorRiesgo = Math.floor((capital * (riesgoPct / 100)) / distancia);
  const cantidadPorTope = Math.floor((capital * (topePct / 100)) / entrada);
  const cantidad = Math.min(cantidadPorRiesgo, cantidadPorTope);

  if (cantidad < 1) {
    return { ok: false, motivo: "cantidad_cero", detalle: "Con estas reglas no alcanza ni para 1 acción." };
  }

  return {
    ok: true,
    cantidad,
    limiteActivo: cantidadPorRiesgo < cantidadPorTope ? "riesgo" : "tope_portafolio",
    distanciaPorAccion: distancia,
    distanciaPct: (distancia / entrada) * 100,
    cantidadPorRiesgo,
    cantidadPorTope,
    perdidaMaximaUsd: cantidad * distancia,
    perdidaMaximaPct: ((cantidad * distancia) / capital) * 100,
    montoInvertido: cantidad * entrada,
  };
}