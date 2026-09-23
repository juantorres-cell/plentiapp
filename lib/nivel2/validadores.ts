// lib/nivel2/validadores.ts
import type { CandlestickData } from "lightweight-charts";
import { PatronNivel2, MediaMovilPunto } from "./tipos";

function validarVelasBasico(velas: CandlestickData[]): boolean {
  return velas.every((v) => {
    const c = v as { open: number; high: number; low: number; close: number };
    return (
      c.high >= Math.max(c.open, c.close) &&
      c.low <= Math.min(c.open, c.close) &&
      c.high >= c.low
    );
  });
}

function comoOHLC(v: CandlestickData) {
  return v as { open: number; high: number; low: number; close: number };
}

function validarMartillo(velas: CandlestickData[], indice: number): boolean {
  const v = comoOHLC(velas[indice]);
  const cuerpo = Math.abs(v.close - v.open);
  const mechaInferior = Math.min(v.open, v.close) - v.low;
  const mechaSuperior = v.high - Math.max(v.open, v.close);

  if (cuerpo === 0) return false; // doji puro, no sirve como martillo

  const cuerpoValido = mechaInferior >= cuerpo * 1.5 && mechaSuperior <= cuerpo * 0.6;

  // Debe estar cerca de la zona mínima tocada previamente (el "soporte")
  const minimoPrevio = Math.min(...velas.slice(0, indice).map((x) => comoOHLC(x).low));
  const rango = Math.max(...velas.map((x) => comoOHLC(x).high)) - Math.min(...velas.map((x) => comoOHLC(x).low));
  const cercaDeSoporte = v.low <= minimoPrevio + rango * 0.15;

  return cuerpoValido && cercaDeSoporte;
}

function validarEnvolvente(velas: CandlestickData[], indice: number): boolean {
  const actual = comoOHLC(velas[indice]);
  const anterior = comoOHLC(velas[indice - 1]);

  const esRoja = actual.close < actual.open;
  const anteriorFueAlcista = anterior.close > anterior.open;
  const envuelve =
    Math.max(actual.open, actual.close) >= Math.max(anterior.open, anterior.close) &&
    Math.min(actual.open, actual.close) <= Math.min(anterior.open, anterior.close);

  return esRoja && anteriorFueAlcista && envuelve;
}

// Asume la misma estructura de 6 velas que tu escenario original:
// 0=hombro izq, 1=valle, 2=cabeza, 3=valle, 4=hombro der, 5=ruptura del neckline
function validarHCH(velas: CandlestickData[], indice: number): boolean {
  if (velas.length < indice + 1 || indice < 5) return false;

  const hombro1 = comoOHLC(velas[0]);
  const valle1 = comoOHLC(velas[1]);
  const cabeza = comoOHLC(velas[2]);
  const valle2 = comoOHLC(velas[3]);
  const hombro2 = comoOHLC(velas[4]);
  const ruptura = comoOHLC(velas[5]);

  const cabezaEsLaMasAlta = cabeza.high > hombro1.high && cabeza.high > hombro2.high;
  const hombrosParecidos = Math.abs(hombro1.high - hombro2.high) <= (cabeza.high - Math.min(valle1.low, valle2.low)) * 0.5;
  const neckline = Math.min(valle1.low, valle2.low);
  const rompeNeckline = ruptura.close < neckline;

  return cabezaEsLaMasAlta && hombrosParecidos && rompeNeckline;
}

function validarMediaMovil(velas: CandlestickData[], media: MediaMovilPunto[], indice: number): boolean {
  if (!media[indice] || !media[indice - 1]) return false;
  const cerrabaDebajo = comoOHLC(velas[indice - 1]).close <= media[indice - 1].value;
  const cierraArriba = comoOHLC(velas[indice]).close > media[indice].value;
  return cerrabaDebajo && cierraArriba;
}

export function validarPatron(
  patron: PatronNivel2,
  velas: CandlestickData[],
  indice: number,
  media?: MediaMovilPunto[]
): boolean {
  if (!validarVelasBasico(velas)) return false;

  switch (patron) {
    case "martillo":
      return validarMartillo(velas, indice);
    case "envolvente":
      return validarEnvolvente(velas, indice);
    case "hombro_cabeza_hombro":
      return validarHCH(velas, indice);
    case "medias_moviles":
      return media ? validarMediaMovil(velas, media, indice) : false;
  }
}