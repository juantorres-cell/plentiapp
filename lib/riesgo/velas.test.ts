import assert from "node:assert/strict";
import { limpiarVelas, fechaHoraNY, diasEntre } from "./velas";

// Velas diarias de Yahoo: marcadas ~13:30 UTC (9:30 NY en horario de verano)
const q = (iso: string, h: number, l: number, c: number) => ({ date: iso, high: h, low: l, close: c });
const datos = [
  q("2026-10-13T13:30:00Z", 110, 100, 105), // mar
  q("2026-10-12T13:30:00Z", 108, 99, 104), // lun (desordenada a propósito)
  q("2026-10-14T13:30:00Z", 112, 103, 111), // mié
  q("2026-10-15T13:30:00Z", 115, 109, 112), // jue
  q("2026-10-16T13:30:00Z", 116, 111, 113), // vie (la vela de "hoy")
];

// Viernes 16-oct, 10:00 a.m. Bogotá = 15:00 UTC = 11:00 NY -> mercado abierto: vela parcial
let r = limpiarVelas(datos, new Date("2026-10-16T15:00:00Z"));
assert.equal(r.descartoParcial, true);
assert.equal(r.velas.length, 4);
assert.equal(r.asOf, "2026-10-15");
assert.equal(r.velas[0].close, 104); // quedó ordenada: lunes primero

// Viernes 16-oct 18:00 UTC... 20:30 UTC = 16:30 NY -> mercado cerrado: vela completa
r = limpiarVelas(datos, new Date("2026-10-16T20:30:00Z"));
assert.equal(r.descartoParcial, false);
assert.equal(r.velas.length, 5);
assert.equal(r.asOf, "2026-10-16");

// Sábado: nada que descartar
r = limpiarVelas(datos, new Date("2026-10-17T15:00:00Z"));
assert.equal(r.descartoParcial, false);
assert.equal(r.asOf, "2026-10-16");

// Datos nulos o incoherentes se eliminan
r = limpiarVelas(
  [
    { date: "2026-10-13T13:30:00Z", high: null, low: 1, close: 1 },
    { date: "2026-10-14T13:30:00Z", high: 5, low: 9, close: 6 }, // high < low
    q("2026-10-15T13:30:00Z", 10, 9, 9.5),
  ],
  new Date("2026-10-17T15:00:00Z")
);
assert.equal(r.velas.length, 1);

// Entrada vacía -> sin velas, sin lanzar error
r = limpiarVelas([], new Date());
assert.equal(r.velas.length, 0);
assert.equal(r.asOf, null);

assert.equal(fechaHoraNY(new Date("2026-10-16T15:00:00Z")).hora, 11);
assert.equal(diasEntre("2026-10-10", "2026-10-16"), 6);

// El volumen se conserva si es válido y se omite si es nulo
r = limpiarVelas(
  [
    { date: "2026-10-14T13:30:00Z", high: 10, low: 9, close: 9.5, volume: 1234 },
    { date: "2026-10-15T13:30:00Z", high: 10, low: 9, close: 9.6, volume: null },
  ],
  new Date("2026-10-17T15:00:00Z")
);
assert.equal(r.velas[0].volume, 1234);
assert.equal(r.velas[1].volume, undefined);

console.log("OK: pruebas de velas pasaron");