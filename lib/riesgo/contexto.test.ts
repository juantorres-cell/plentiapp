import assert from "node:assert/strict";
import { contextoTecnico, sma } from "./contexto";

const cerca = (a: number, b: number, tol = 0.01) => assert.ok(Math.abs(a - b) < tol, `${a} no está cerca de ${b}`);

// 260 barras: cierre_i = 100 + 0.5*i (sube parejo), high=cierre+1, low=cierre-1,
// volumen 1000 salvo el último día = 2000.
const velas = Array.from({ length: 260 }, (_, i) => ({
  high: 100 + 0.5 * i + 1,
  low: 100 + 0.5 * i - 1,
  close: 100 + 0.5 * i,
  volume: i === 259 ? 2000 : 1000,
}));
const c = contextoTecnico(velas);

// Valores calculados a mano (ver aritmética en el comentario del archivo de entrega)
assert.equal(c.estado, "ok");
assert.equal(c.precio, 229.5);
cerca(c.sma50!.valor, 217.25); // media de i=210..259
cerca(c.sma50!.dist_pct, 5.638, 0.01); // 229.5/217.25 - 1
assert.equal(c.sma50!.posicion, "encima");
cerca(c.sma200!.valor, 179.75); // media de i=60..259
assert.equal(c.sma200!.posicion, "encima");
assert.equal(c.sma200!.pendiente, "subiendo"); // 179.75 vs 169.75 hace 20 barras (+5.89%)
cerca(c.retorno_12s_pct!, 15.038, 0.01); // 229.5 / 199.5 - 1
cerca(c.rango_52s!.maximo, 230.5);
cerca(c.rango_52s!.minimo, 103); // i=8 -> cierre 104, low 103
cerca(c.rango_52s!.dist_maximo_pct, -0.434, 0.01);
cerca(c.rango_52s!.posicion_rango_pct, 99.216, 0.01);
cerca(c.volumen!.ratio, 2);
assert.equal(c.volumen!.etiqueta, "alto");
assert.equal(c.volumen!.dia, "sube");

// Historial corto: 100 barras -> sin SMA200 ni rango 52s, pero sí SMA50 y retorno 12s
const corto = contextoTecnico(velas.slice(0, 100));
assert.equal(corto.estado, "parcial");
assert.equal(corto.sma200, null);
assert.equal(corto.rango_52s, null);
assert.ok(corto.sma50 && corto.retorno_12s_pct != null);

// Muy poco historial -> sin_datos, sin lanzar error
assert.equal(contextoTecnico(velas.slice(0, 10)).estado, "sin_datos");
assert.equal(contextoTecnico([]).estado, "sin_datos");

// Sin volumen en los datos -> volumen null (no inventa)
const sinVol = contextoTecnico(velas.map(({ volume, ...r }) => r));
assert.equal(sinVol.volumen, null);
assert.equal(sinVol.estado, "parcial");

// Precio cayendo con volumen bajo
const baja = [...velas.slice(0, 259), { high: 231, low: 100, close: 100, volume: 500 }];
const cb = contextoTecnico(baja);
assert.equal(cb.volumen!.dia, "baja");
assert.equal(cb.volumen!.etiqueta, "bajo");
assert.equal(cb.sma50!.posicion, "debajo");

// Pendiente plana: precios constantes
const plano = Array.from({ length: 260 }, () => ({ high: 51, low: 49, close: 50, volume: 100 }));
const cp = contextoTecnico(plano);
assert.equal(cp.sma200!.pendiente, "plana");
assert.equal(cp.sma50!.posicion, "en_linea");

assert.equal(sma([1, 2, 3, 4], 2), 3.5);
assert.equal(sma([1, 2], 5), null);

console.log("OK: pruebas de contexto pasaron");