// lib/nivel1/tipos.ts

export type CategoriaConcepto =
  | "velas_japonesas"
  | "tendencias"
  | "soportes_resistencias"
  | "volumen";

export type FormatoPregunta = "opcion_multiple" | "verdadero_falso" | "comparacion";

export interface VelaEstatica {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface BarraVolumen {
  valor: number; // 0-100, altura relativa
  alto: boolean; // true = volumen alto, para colorear distinto
}

export interface GraficoEstatico {
  tipo: "velas" | "volumen";
  velas?: VelaEstatica[];
  barras?: BarraVolumen[];
}

export interface OpcionPregunta {
  id: string;
  texto: string;
}

export interface PreguntaNivel1 {
  id: string;
  categoria: CategoriaConcepto;
  formato: FormatoPregunta;
  enunciado: string;
  // 1 gráfico normalmente, 2 solo si formato es "comparacion"
  graficos: GraficoEstatico[];
  opciones: OpcionPregunta[];
  respuesta_correcta_id: string;
  explicacion_si_falla: string;
}

export interface RespuestaUsuario {
  pregunta_id: string;
  categoria: CategoriaConcepto;
  opcion_elegida_id: string;
  correcta: boolean;
}

export interface ResultadoNivel1 {
  respuestas: RespuestaUsuario[];
  puntaje: number;
  categorias_debiles: CategoriaConcepto[];
}