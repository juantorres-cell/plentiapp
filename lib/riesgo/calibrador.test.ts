import assert from "node:assert/strict";
import { atr, atrSemanalAprox, stopPorAtr, calcularPosicion } from "./calibrador";

// 1) ATR: rango constante de 2, sin gaps -> ATR = 2
const planas = Array.from({ length: 6 }, (_, i) => ({ high: 12 + i, low: 10 + i, close: 11 + i }));
assert.equal(atr(planas, 3), 2);

// 2) ATR calculado a mano (periodo 2): TR=[2,2,3] -> inicial 2 -> (2*1+3)/2 = 2.5
const conGap = [
  { high: 12, low: 10, close: 11 },
  { high: 13, low: 11, close: 12 },
  { high: 15, low: 12, close: 14 },
];
assert.equal(atr(conGap, 2), 2.5);

// 3) Datos insuficientes o inválidos -> null (nunca lanza)
assert.equal(atr(conGap, 14), null);
assert.equal(atr([{ high: NaN, low: 1, close: 1 }, ...conGap], 2), null);

// 4) CASO DE ORO: tu Semana 1 (NVDA, entrada 225.06, stop 221.76, capital 10000)
const s1 = calcularPosicion({ capital: 10000, entrada: 225.06, stop: 221.76 });
assert.ok(s1.ok);
if (s1.ok) {
  assert.equal(s1.cantidadPorRiesgo, 30); // la regla del 1% habría permitido 30
  assert.equal(s1.cantidadPorTope, 2); // el tope del 5% permite 2
  assert.equal(s1.cantidad, 2);
  assert.equal(s1.limiteActivo, "tope_portafolio"); // el que limitó fue el tope, NO el 1%
  assert.ok(Math.abs(s1.distanciaPct - 1.466) < 0.01); // stop a ~1.47% de la entrada
  assert.ok(s1.perdidaMaximaPct < 0.07); // ~0.066% del capital, no 1%
}

// 5) Con stop ancho por ATR (ejemplo: ATR 6, k=2 -> stop a 12 de distancia)
const stop = stopPorAtr(225.06, 6, 2);
assert.ok(Math.abs(stop - 213.06) < 1e-9);
const ancha = calcularPosicion({ capital: 10000, entrada: 225.06, stop });
assert.ok(ancha.ok);
if (ancha.ok) {
  assert.equal(ancha.cantidad, 2); // el tope sigue mandando
  assert.ok(ancha.perdidaMaximaPct < 1); // y nunca se pasa del 1%
}

// 6) Caso donde SÍ limita el 1%: acción barata y stop ancho
const barata = calcularPosicion({ capital: 10000, entrada: 20, stop: 10 });
assert.ok(barata.ok);
if (barata.ok) {
  assert.equal(barata.cantidadPorRiesgo, 10);
  assert.equal(barata.cantidadPorTope, 25);
  assert.equal(barata.limiteActivo, "riesgo");
}

// 7) Entradas inválidas -> resultado de error, no excepción
assert.equal(calcularPosicion({ capital: 10000, entrada: 100, stop: 105 }).ok, false);
assert.equal(calcularPosicion({ capital: -5, entrada: 100, stop: 90 }).ok, false);
assert.equal(calcularPosicion({ capital: 100, entrada: 500, stop: 490 }).ok, false); // no alcanza 1 acción

// 8) Rango semanal aproximado
assert.ok(Math.abs(atrSemanalAprox(6) - 13.416) < 0.01);

console.log("OK: todas las pruebas del calibrador pasaron");