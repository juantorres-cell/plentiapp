// lib/nivel1/utils.ts
import { BANCO_PREGUNTAS } from "./banco-preguntas";
import { CategoriaConcepto, PreguntaNivel1, RespuestaUsuario, ResultadoNivel1 } from "./tipos";

const CATEGORIAS: CategoriaConcepto[] = [
  "velas_japonesas",
  "tendencias",
  "soportes_resistencias",
  "volumen",
];

function shuffle<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Arma un examen: N preguntas aleatorias por categoría, orden mezclado.
export function armarExamen(preguntasPorCategoria = 2): PreguntaNivel1[] {
  const examen: PreguntaNivel1[] = [];

  for (const categoria of CATEGORIAS) {
    const delBanco = BANCO_PREGUNTAS.filter((p) => p.categoria === categoria);
    const elegidas = shuffle(delBanco).slice(0, preguntasPorCategoria);
    examen.push(...elegidas);
  }

  return shuffle(examen);
}

export function calificarExamen(respuestas: RespuestaUsuario[]): ResultadoNivel1 {
  const correctas = respuestas.filter((r) => r.correcta).length;
  const puntaje = Math.round((correctas / respuestas.length) * 100);

  const categoriasConFallo = new Set<CategoriaConcepto>();
  respuestas.forEach((r) => {
    if (!r.correcta) categoriasConFallo.add(r.categoria);
  });

  return {
    respuestas,
    puntaje,
    categorias_debiles: Array.from(categoriasConFallo),
  };
}