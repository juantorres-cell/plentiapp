// lib/reglas/preguntas.ts
// Las 6 preguntas del cuestionario de reglas. Solo datos: la lógica vive en cuestionario.ts.
// Mismo formato que lib/onboarding.ts (id, titulo, opciones), con valores "a" | "b" | "c".

import type { Opcion, RespuestasCuestionario } from "./cuestionario";

export type PreguntaCuestionario = {
  id: keyof RespuestasCuestionario;
  titulo: string;
  opciones: { valor: Opcion; texto: string }[];
};

export const PREGUNTAS_CUESTIONARIO: PreguntaCuestionario[] = [
  {
    id: "salida",
    titulo: "Antes de entrar a una operación, ¿qué haces con tu punto de salida?",
    opciones: [
      { valor: "a", texto: "Lo defino y lo anoto antes de entrar" },
      { valor: "b", texto: "Tengo una idea aproximada, pero no la anoto" },
      { valor: "c", texto: "Lo decido sobre la marcha, según cómo se mueva el precio" },
    ],
  },
  {
    id: "cadencia",
    titulo: "¿Cuántas veces a la semana piensas operar?",
    opciones: [
      { valor: "a", texto: "Una vez por semana" },
      { valor: "b", texto: "Dos o tres veces por semana" },
      { valor: "c", texto: "Casi todos los días" },
    ],
  },
  {
    id: "fomo",
    titulo: "Una acción que no compraste sube 8% en un día y todos hablan de ella. ¿Qué haces?",
    opciones: [
      { valor: "a", texto: "La dejo pasar" },
      { valor: "b", texto: "La reviso con mi proceso de siempre y decido con calma" },
      { valor: "c", texto: "Entro rápido para no quedarme fuera" },
    ],
  },
  {
    id: "racha",
    titulo: "Ganas 4% en dos operaciones seguidas. En la siguiente, el tamaño de tu posición...",
    opciones: [
      { valor: "a", texto: "Se mantiene igual" },
      { valor: "b", texto: "Lo subo un poco" },
      { valor: "c", texto: "Lo subo bastante: estoy en racha" },
    ],
  },
  {
    id: "tolerancia",
    titulo: "¿Cuánto de tu capital de riesgo podrías perder en un mes sin que te afecte?",
    opciones: [
      { valor: "a", texto: "Hasta 2%" },
      { valor: "b", texto: "Entre 3% y 6%" },
      { valor: "c", texto: "Más de 6%" },
    ],
  },
  {
    id: "preparacion",
    titulo: "¿Cuánto analizas normalmente antes de abrir una operación?",
    opciones: [
      { valor: "a", texto: "Más de 30 minutos, con mis propios números" },
      { valor: "b", texto: "Entre 10 y 30 minutos" },
      { valor: "c", texto: "Menos de 10 minutos" },
    ],
  },
];

export function todasRespondidas(r: Partial<RespuestasCuestionario>): r is RespuestasCuestionario {
  return PREGUNTAS_CUESTIONARIO.every((p) => {
    const v = r[p.id];
    return v === "a" || v === "b" || v === "c";
  });
}