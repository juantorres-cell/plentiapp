// lib/nivel2/generador-ia.ts
import { GoogleGenAI } from "@google/genai";
import { PatronNivel2, MediaMovilPunto } from "./tipos";
import { validarPatron } from "./validadores";
import type { CandlestickData } from "lightweight-charts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const INSTRUCCIONES_POR_PATRON: Record<PatronNivel2, string> = {
  martillo:
    "La última vela debe ser un Martillo: cuerpo pequeño, mecha inferior larga (al menos 2x el tamaño del cuerpo), mecha superior casi nula, y su mínimo debe estar cerca o por debajo del mínimo tocado en las velas anteriores (zona de soporte).",
  envolvente:
    "La última vela debe ser roja (close menor que open) y su cuerpo debe envolver completamente el cuerpo de la vela anterior (que fue verde): su apertura debe ser mayor al cierre anterior, y su cierre menor a la apertura anterior.",
  hombro_cabeza_hombro:
    "Genera exactamente 6 velas: [0] hombro izquierdo (sube), [1] valle, [2] cabeza (el máximo más alto de todos), [3] valle, [4] hombro derecho (altura parecida al hombro izquierdo), [5] vela que rompe hacia abajo el nivel más bajo entre los dos valles (neckline).",
  medias_moviles:
    "Genera también una media móvil (mismo número de puntos que velas). En las velas anteriores a la última, el cierre debe estar por debajo del valor de la media. En la última vela, el cierre debe cerrar por encima del valor de la media (cruce alcista).",
};

function limpiarJSON(texto: string): string {
  return texto.replace(/```json|```/g, "").trim();
}

export async function generarVelasIA(
  patron: PatronNivel2,
  cantidadVelas: number,
  indicePatron: number
): Promise<{ velas: CandlestickData[]; media_movil?: MediaMovilPunto[] } | null> {
  const necesitaMedia = patron === "medias_moviles";


  // Precio base aleatorio para que el nivel general del gráfico cambie entre intentos,
  // no solo los números finos dentro del mismo rango de siempre.
  const precioBase = Math.round(50 + Math.random() * 150); // entre 50 y 200
  const rangoMin = precioBase - 20;
  const rangoMax = precioBase + 20;

  const prompt = `
Genera datos ficticios de velas japonesas para un ejercicio educativo de trading.
Responde SOLO con JSON válido, sin texto adicional, sin markdown, con esta forma exacta:

{
  "velas": [{ "open": number, "high": number, "low": number, "close": number }, ...],
  ${necesitaMedia ? '"media_movil": [number, ...],' : ""}
}

Reglas:
- Exactamente ${cantidadVelas} velas.
- Todos los valores entre ${rangoMin} y ${rangoMax} (el precio base de este ejercicio es ${precioBase}).
- high siempre mayor o igual que open y close. low siempre menor o igual que open y close.
- La vela en la posición ${indicePatron} (0-indexado) debe formar este patrón: ${INSTRUCCIONES_POR_PATRON[patron]}
`;

  for (let intento = 0; intento < 3; intento++) {
    try {
      const respuesta = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      });

      const parseado = JSON.parse(limpiarJSON(respuesta.text ?? ""));

      const velasBase: { open: number; high: number; low: number; close: number }[] =
        parseado.velas;

      // Les agregamos fechas secuenciales acá mismo, no dejamos que la IA las invente
      // (evita fechas mal formadas o duplicadas).
      const velas: CandlestickData[] = velasBase.map((v, i) => ({
        time: `2026-10-${String(i + 1).padStart(2, "0")}`,
        ...v,
      })) as CandlestickData[];

      const media_movil: MediaMovilPunto[] | undefined = necesitaMedia
        ? (parseado.media_movil as number[]).map((valor, i) => ({
            time: `2026-10-${String(i + 1).padStart(2, "0")}`,
            value: valor,
          }))
        : undefined;

      const esValido = validarPatron(patron, velas, indicePatron, media_movil);

      console.log(`[generar-escenario] patrón=${patron} intento=${intento + 1} válido=${esValido}`, velas);
      if (esValido) return { velas, media_movil };

      // si no pasó la validación, intenta de nuevo (siguiente vuelta del for)
    } catch (error) {
      console.error(`Intento ${intento + 1} de generar escenario falló:`, error);
    }
  }

  return null; // agotó los 3 intentos sin generar algo válido
}