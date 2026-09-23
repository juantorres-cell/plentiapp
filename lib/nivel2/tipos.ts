// lib/nivel2/tipos.ts
import type { CandlestickData } from "lightweight-charts";

export type PatronNivel2 =
  | "martillo"
  | "envolvente"
  | "hombro_cabeza_hombro"
  | "medias_moviles";

export type DecisionUsuario = "comprar" | "vender" | "esperar";

export interface Checkpoint {
  indice_vela: number; // se pausa DESPUÉS de revelar esta vela (0-based)
  patron_presente: PatronNivel2;
  mensaje_tutor: string;
  opciones_decision: DecisionUsuario[];
  decision_correcta: DecisionUsuario;
  microleccion_si_falla: string;
}

export interface MediaMovilPunto {
  time: string;
  value: number;
}

export interface EscenarioNivel2 {
  id: string;
  titulo: string;
  contexto_inicial: string;
  velas: CandlestickData[];
  checkpoints: Checkpoint[];
  media_movil?: MediaMovilPunto[];
}

export interface DecisionRegistrada {
  escenario_id: string;
  indice_vela: number;
  decision: DecisionUsuario;
  correcta: boolean;
  tiempo_decision_ms: number;
}

export interface NivelReferencia {
  precio: number;
  tipo: "soporte" | "resistencia";
  etiqueta?: string; // ej. "Neckline" en vez de "Soporte"
}

export interface EscenarioNivel2 {
  id: string;
  titulo: string;
  contexto_inicial: string;
  velas: CandlestickData[];
  checkpoints: Checkpoint[];
  media_movil?: MediaMovilPunto[];
  nivel_referencia?: NivelReferencia; // NUEVO
  es_trampa?: boolean; // NUEVO — si es true, nunca se le pide variante a la IA
}