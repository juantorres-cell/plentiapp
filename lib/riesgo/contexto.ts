// lib/riesgo/contexto.ts
// Capa 2: contexto técnico DESCRIPTIVO. Funciones puras, sin red ni IA.
// Describe hechos del gráfico. NO predice ni recomienda comprar/vender.
// Los umbrales de abajo están FIJADOS DE ANTEMANO: no se ajustan viendo resultados.
import type { Vela } from "./calibrador";

export const BARRAS_12_SEMANAS = 60; // ~12 semanas de mercado
export const BARRAS_52_SEMANAS = 252; // ~1 año de mercado
export const UMBRAL_EN_LINEA_PCT = 0.5; // |distancia a la media| menor a esto = "en línea"
export const UMBRAL_PENDIENTE_PCT = 0.5; // cambio de la SMA200 en 20 barras menor a esto = "plana"
export const BARRAS_PENDIENTE = 20;
export const UMBRAL_VOLUMEN_ALTO = 1.5;
export const UMBRAL_VOLUMEN_BAJO = 0.7;
export const BARRAS_VOLUMEN_PROMEDIO = 20;

type Posicion = "encima" | "debajo" | "en_linea";

export type ContextoTecnico = {
  estado: "ok" | "parcial" | "sin_datos"; // parcial = faltó historial para alguna métrica
  barras: number;
  precio: number | null;
  sma50: { valor: number; dist_pct: number; posicion: Posicion } | null;
  sma200: {
    valor: number;
    dist_pct: number;
    posicion: Posicion;
    pendiente: "subiendo" | "bajando" | "plana" | null;
  } | null;
  retorno_12s_pct: number | null;
  rango_52s: {
    maximo: number;
    minimo: number;
    dist_maximo_pct: number; // 0 o negativo: cuánto está por debajo del máximo
    posicion_rango_pct: number; // 0 = en el mínimo, 100 = en el máximo
  } | null;
  volumen: {
    ratio: number; // volumen del último día / promedio de las 20 sesiones anteriores
    etiqueta: "alto" | "normal" | "bajo";
    dia: "sube" | "baja" | "igual"; // dirección del cierre del último día vs el anterior
  } | null;
};

function promedio(x: number[]): number {
  return x.reduce((s, v) => s + v, 0) / x.length;
}

/** Media simple de `n` cierres que terminan `offset` barras antes del final. null si no hay datos. */
export function sma(cierres: number[], n: number, offset = 0): number | null {
  const fin = cierres.length - offset;
  const ini = fin - n;
  if (n < 1 || ini < 0) return null;
  return promedio(cierres.slice(ini, fin));
}

function posicionVsMedia(precio: number, media: number): { dist_pct: number; posicion: Posicion } {
  const dist = (precio / media - 1) * 100;
  return {
    dist_pct: dist,
    posicion: Math.abs(dist) < UMBRAL_EN_LINEA_PCT ? "en_linea" : dist > 0 ? "encima" : "debajo",
  };
}

export function contextoTecnico(velas: Vela[]): ContextoTecnico {
  const n = velas.length;
  if (n < BARRAS_VOLUMEN_PROMEDIO + 1) {
    return { estado: "sin_datos", barras: n, precio: null, sma50: null, sma200: null, retorno_12s_pct: null, rango_52s: null, volumen: null };
  }

  const cierres = velas.map((v) => v.close);
  const precio = cierres[n - 1];

  // Medias móviles
  const m50 = sma(cierres, 50);
  const sma50 = m50 != null ? { valor: m50, ...posicionVsMedia(precio, m50) } : null;

  const m200 = sma(cierres, 200);
  let sma200: ContextoTecnico["sma200"] = null;
  if (m200 != null) {
    const antes = sma(cierres, 200, BARRAS_PENDIENTE);
    let pendiente: "subiendo" | "bajando" | "plana" | null = null;
    if (antes != null) {
      const cambio = (m200 / antes - 1) * 100;
      pendiente = Math.abs(cambio) < UMBRAL_PENDIENTE_PCT ? "plana" : cambio > 0 ? "subiendo" : "bajando";
    }
    sma200 = { valor: m200, ...posicionVsMedia(precio, m200), pendiente };
  }

  // Retorno de ~12 semanas (cierre actual vs. cierre de hace 60 barras)
  const retorno_12s_pct =
    n > BARRAS_12_SEMANAS ? (precio / cierres[n - 1 - BARRAS_12_SEMANAS] - 1) * 100 : null;

  // Rango de 52 semanas con máximos y mínimos del día (como lo muestran Yahoo/TradingView)
  let rango_52s: ContextoTecnico["rango_52s"] = null;
  if (n >= BARRAS_52_SEMANAS) {
    const ventana = velas.slice(n - BARRAS_52_SEMANAS);
    const maximo = Math.max(...ventana.map((v) => v.high));
    const minimo = Math.min(...ventana.map((v) => v.low));
    rango_52s = {
      maximo,
      minimo,
      dist_maximo_pct: (precio / maximo - 1) * 100,
      posicion_rango_pct: maximo > minimo ? ((precio - minimo) / (maximo - minimo)) * 100 : 50,
    };
  }

  // Volumen relativo: último día vs. promedio de las 20 sesiones anteriores
  let volumen: ContextoTecnico["volumen"] = null;
  const ultimoVol = velas[n - 1].volume;
  const previos = velas.slice(n - 1 - BARRAS_VOLUMEN_PROMEDIO, n - 1).map((v) => v.volume);
  if (ultimoVol != null && previos.every((v) => v != null && v > 0)) {
    const prom = promedio(previos as number[]);
    const ratio = ultimoVol / prom;
    const prev = cierres[n - 2];
    volumen = {
      ratio,
      etiqueta: ratio >= UMBRAL_VOLUMEN_ALTO ? "alto" : ratio <= UMBRAL_VOLUMEN_BAJO ? "bajo" : "normal",
      dia: precio > prev ? "sube" : precio < prev ? "baja" : "igual",
    };
  }

  const completo = sma50 && sma200 && sma200.pendiente && retorno_12s_pct != null && rango_52s && volumen;
  return { estado: completo ? "ok" : "parcial", barras: n, precio, sma50, sma200, retorno_12s_pct, rango_52s, volumen };
}