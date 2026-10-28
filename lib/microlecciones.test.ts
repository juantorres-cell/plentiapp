// Ejecutar: npx tsx lib/microlecciones.test.ts
import assert from "node:assert/strict";
import { calcularPatrones, type EntradaPatrones, type OperacionPatron } from "./patrones";
import { leccionDeEmocion, leccionesDeConducta, leccionesDeOperacion } from "./microlecciones";

let pasadas = 0;
function prueba(nombre: string, fn: () => void) {
  try {
    fn();
    pasadas++;
    console.log(`  ok  ${nombre}`);
  } catch (e) {
    console.error(`  FALLA  ${nombre}`);
    console.error(e);
    process.exit(1);
  }
}

const REGLAS = { riesgo_maximo_pct: 1, base_calculo_riesgo: "capital_total" as const };

function op(p: Partial<OperacionPatron> & { semana: string }): OperacionPatron {
  return {
    fecha: null, cerrada_en: null, estado: "cerrada", activo: "NVDA", cantidad: 3, capital_disponible: 10000,
    stop_loss: 95, precio_referencia: 100, resultado: 10, emocion_entrada: null, emocion_detalle: null,
    lectura_sistema: null, ...p,
  };
}
const entrada = (p: Partial<EntradaPatrones>): EntradaPatrones => ({
  operaciones: [], sin_operar: [], check_ins: [], reglas: REGLAS, ...p,
});
const ls = (usuario: number, sistema: number) => ({
  posicion: { cantidad: sistema },
  usuario: { cantidad: usuario, siguio_calibrador: { cantidad: usuario === sistema, stop: true } },
});

const W = ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"];

console.log("microlecciones.ts");

prueba("lección de emoción: detalle, mal sin detalle y casos sin lección", () => {
  assert.equal(leccionDeEmocion("bien", "euforico")?.id, "emocion:euforico");
  assert.equal(leccionDeEmocion("mal", "frustrado")?.id, "emocion:frustrado"); // el detalle manda
  assert.equal(leccionDeEmocion("mal", null)?.id, "emocion:mal");
  assert.equal(leccionDeEmocion("mal", "tranquilo")?.id, "emocion:mal");
  assert.equal(leccionDeEmocion("bien", "tranquilo"), null);
  assert.equal(leccionDeEmocion("bien", null), null);
  assert.equal(leccionDeEmocion(null, null), null);
});

prueba("sin muestra suficiente no hay lecciones de conducta", () => {
  assert.deepEqual(leccionesDeConducta(calcularPatrones(entrada({}))), []);
});

prueba("lecciones de conducta se activan con datos y llevan la cifra del usuario", () => {
  // 4 operaciones: pérdida, sube tamaño (pérdida), sube (pérdida), sube -> 3 oportunidades, 3 aumentos
  const ops = [
    op({ semana: W[0], cantidad: 25, resultado: -10, emocion_entrada: "mal", emocion_detalle: "frustrado", lectura_sistema: ls(25, 3) }),
    op({ semana: W[1], cantidad: 30, resultado: -20, emocion_entrada: "mal", emocion_detalle: "frustrado", lectura_sistema: ls(30, 3) }),
    op({ semana: W[2], cantidad: 35, resultado: -30, emocion_entrada: "mal", emocion_detalle: "frustrado", lectura_sistema: ls(35, 3) }),
    op({ semana: W[3], cantidad: 3, resultado: 50, emocion_entrada: "bien", lectura_sistema: ls(3, 3) }),
    op({ semana: W[4], cantidad: 3, resultado: 40, emocion_entrada: "bien", lectura_sistema: ls(3, 3) }),
    op({ semana: W[5], cantidad: 3, resultado: 60, emocion_entrada: "bien", lectura_sistema: ls(3, 3) }),
  ];
  const p = calcularPatrones(entrada({ operaciones: ops, check_ins: [{ semana: W[6], tipo: "entrada", estado_animo: "bien" }], semana_actual: "2026-10-26" }));
  const ids = leccionesDeConducta(p).map((l) => l.id);
  assert.ok(ids.includes("conducta:tamano_tras_perdida"), "tamaño tras pérdida");
  assert.ok(ids.includes("conducta:regla_con_emocion"), "regla con emoción");
  assert.ok(ids.includes("conducta:cantidad_sobre_calibrador"), "cantidad sobre calibrador");
  assert.ok(ids.includes("conducta:resultado_segun_emocion"), "resultado según emoción");
  assert.ok(ids.includes("conducta:semanas_sin_decision"), "semanas sin decisión");
  const tam = leccionesDeConducta(p).find((l) => l.id === "conducta:tamano_tras_perdida")!;
  assert.match(tam.dato!, /2 de 3/); // sube en 2 de 3 oportunidades (tras la tercera pérdida baja a 3)
  const reg = leccionesDeConducta(p).find((l) => l.id === "conducta:regla_con_emocion")!;
  assert.match(reg.dato!, /Mal|Frustrado/);
  // ordenadas por prioridad
  const prio = leccionesDeConducta(p).map((l) => l.prioridad);
  assert.deepEqual(prio, prio.slice().sort((a, b) => a - b));
});

prueba("situacional: subir tamaño tras una pérdida (aunque no haya historial suficiente)", () => {
  const p = calcularPatrones(entrada({ operaciones: [op({ semana: W[0], cantidad: 10, resultado: -20 })] })); // monto 1000
  const sube = leccionesDeOperacion(p, { estado: "bien", detalle: null, monto: 1500, cantidad: 15, cantidadCalibrador: null, reglaPct: 1 });
  assert.equal(sube[0].id, "conducta:tamano_tras_perdida");
  assert.match(sube[0].dato!, /\$-?20|-\$20/);
  assert.match(sube[0].dato!, /\$1,500/);
  const baja = leccionesDeOperacion(p, { estado: "bien", detalle: null, monto: 800, cantidad: 8, cantidadCalibrador: null, reglaPct: 1 });
  assert.equal(baja.length, 0);
});

prueba("situacional: la última operación abierta o ganadora no activa la lección", () => {
  const gan = calcularPatrones(entrada({ operaciones: [op({ semana: W[0], cantidad: 10, resultado: 20 })] }));
  assert.equal(leccionesDeOperacion(gan, { estado: null, detalle: null, monto: 5000, cantidad: 50, cantidadCalibrador: null, reglaPct: 1 }).length, 0);
  const abierta = calcularPatrones(entrada({ operaciones: [op({ semana: W[0], cantidad: 10, estado: "abierta", resultado: null })] }));
  assert.equal(leccionesDeOperacion(abierta, { estado: null, detalle: null, monto: 5000, cantidad: 50, cantidadCalibrador: null, reglaPct: 1 }).length, 0);
});

prueba("situacional: más acciones que el calibrador, sin necesitar patrones", () => {
  const r = leccionesDeOperacion(null, { estado: null, detalle: null, monto: null, cantidad: 7, cantidadCalibrador: 3, reglaPct: 1 });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "conducta:cantidad_sobre_calibrador");
  assert.match(r[0].dato!, /7/);
  assert.equal(leccionesDeOperacion(null, { estado: null, detalle: null, monto: null, cantidad: 3, cantidadCalibrador: 3, reglaPct: 1 }).length, 0);
  assert.equal(leccionesDeOperacion(null, { estado: null, detalle: null, monto: null, cantidad: 3, cantidadCalibrador: null, reglaPct: 1 }).length, 0);
});

prueba("lecciones del historial solo salen si coinciden con la emoción actual; máximo 2", () => {
  const ops = [
    op({ semana: W[0], cantidad: 25, resultado: -10, emocion_entrada: "mal" }),
    op({ semana: W[1], cantidad: 25, resultado: -10, emocion_entrada: "mal" }),
    op({ semana: W[2], cantidad: 3, resultado: -10, emocion_entrada: "mal" }),
    op({ semana: W[3], cantidad: 3, resultado: 50, emocion_entrada: "bien" }),
    op({ semana: W[4], cantidad: 3, resultado: 60, emocion_entrada: "bien" }),
    op({ semana: W[5], cantidad: 3, resultado: 70, emocion_entrada: "bien" }),
    op({ semana: W[6], cantidad: 3, resultado: -5, emocion_entrada: "mal" }), // la última cerró en pérdida
  ];
  const p = calcularPatrones(entrada({ operaciones: ops }));
  const enMal = leccionesDeOperacion(p, { estado: "mal", detalle: null, monto: null, cantidad: null, cantidadCalibrador: null, reglaPct: 1 });
  assert.deepEqual(enMal.map((l) => l.id).sort(), ["conducta:regla_con_emocion", "conducta:resultado_segun_emocion"]);
  const enBien = leccionesDeOperacion(p, { estado: "bien", detalle: null, monto: null, cantidad: null, cantidadCalibrador: null, reglaPct: 1 });
  assert.equal(enBien.length, 0);
  // con situacionales + historial: tope de 2, las situacionales primero
  const todas = leccionesDeOperacion(p, { estado: "mal", detalle: null, monto: 9999, cantidad: 9, cantidadCalibrador: 3, reglaPct: 1 });
  assert.equal(todas.length, 2);
  assert.equal(todas[0].id, "conducta:tamano_tras_perdida");
  assert.equal(todas[1].id, "conducta:cantidad_sobre_calibrador");
});

prueba("ningún texto usa lenguaje clínico ni etiqueta a la persona", () => {
  const prohibidas = /ludopat|adicci|adicto|trastorno|patolog|enferm|compulsiv|diagn[oó]stic/i;
  const todas = [
    ...(["euforico", "fomo", "frustrado", "ansioso", "miedo"] as const).map((d) => leccionDeEmocion("bien", d)!),
    leccionDeEmocion("mal", null)!,
  ];
  todas.forEach((l) => assert.ok(!prohibidas.test(l.titulo + " " + l.texto), `lenguaje clínico en ${l.id}`));
  // lecciones de conducta: se arman con datos que activan las cinco
  const ops = [
    op({ semana: W[0], cantidad: 25, resultado: -10, emocion_entrada: "mal", lectura_sistema: ls(25, 3) }),
    op({ semana: W[1], cantidad: 30, resultado: -20, emocion_entrada: "mal", lectura_sistema: ls(30, 3) }),
    op({ semana: W[2], cantidad: 35, resultado: -30, emocion_entrada: "mal", lectura_sistema: ls(35, 3) }),
    op({ semana: W[3], cantidad: 3, resultado: 50, emocion_entrada: "bien", lectura_sistema: ls(3, 3) }),
    op({ semana: W[4], cantidad: 3, resultado: 40, emocion_entrada: "bien", lectura_sistema: ls(3, 3) }),
    op({ semana: W[5], cantidad: 3, resultado: 60, emocion_entrada: "bien", lectura_sistema: ls(3, 3) }),
  ];
  const p = calcularPatrones(entrada({ operaciones: ops, check_ins: [{ semana: W[6], tipo: "entrada", estado_animo: "bien" }], semana_actual: "2026-10-26" }));
  const l = leccionesDeConducta(p);
  assert.equal(l.length, 5);
  l.forEach((x) => assert.ok(!prohibidas.test(x.titulo + " " + x.texto + " " + (x.dato ?? "")), `lenguaje clínico en ${x.id}`));
});

console.log(`\n${pasadas} pruebas pasaron`);