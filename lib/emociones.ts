// lib/emociones.ts — lista única de emociones de detalle (entrada y salida).

export type Detalle = "tranquilo" | "ansioso" | "euforico" | "frustrado" | "miedo" | "fomo";

export const DETALLES: { valor: Detalle; texto: string }[] = [
  { valor: "tranquilo", texto: "Tranquilo" },
  { valor: "ansioso", texto: "Ansioso" },
  { valor: "euforico", texto: "Eufórico" },
  { valor: "frustrado", texto: "Frustrado" },
  { valor: "miedo", texto: "Con miedo" },
  { valor: "fomo", texto: "Con FOMO" },
];

export function textoDetalle(valor: string | null | undefined): string | null {
  return DETALLES.find((d) => d.valor === valor)?.texto ?? null;
}