// Ejecutar: npx tsx lib/patrones.test.ts
import assert from "node:assert/strict";
import {
  calcularPatrones,
  resumenParaIA,
  clasificarCalibrador,
  superoRegla,
  MIN_GRUPO,
  type OperacionPatron,
  type EntradaPatrones,
} from "./patrones";

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
    fecha: null,
    cerrada_en: null,
    estado: "cerrada",
    activo: "NVDA",
    cantidad: null,
    capital_disponible: 10000,
    stop_loss: null,
    precio_referencia: null,
    resultado: null,
    emocion_entrada: null,
    emocion_detalle: null,
    lectura_sistema: null,
    ...p,
  };
}

function entrada(p: Partial<EntradaPatrones>): EntradaPatrones {
  return { operaciones: [], sin_operar: [], check_ins: [], reglas: REGLAS, ...p };
}

const W1 = "2026-09-28";
const W2 = "2026-10-05";
const W3 = "2026-10-12";
const W4 = "2026-10-19";
const W5 = "2026-10-26";

console.log("patrones.ts");

prueba("MIN_GRUPO es 3", () => assert.equal(MIN_GRUPO, 3));

prueba("entrada vacía no lanza error y todo queda sin muestra", () => {
  const p = calcularPatrones(entrada({}));
  assert.equal(p.muestra.operaciones, 0);
  assert.equal(p.semanas.total, 0);
  assert.equal(p.emocion_vs_resultado.por_estado.mal.suficiente, false);
  assert.deepEqual(resumenParaIA(p), { patrones_suficientes: false });
});

prueba("emoción vs resultado: promedios, pérdidas y suficiencia", () => {
  const ops = [
    op({ semana: W1, resultado: 50, emocion_entrada: "bien" }),
    op({ semana: W2, resultado: 80, emocion_entrada: "bien" }),
    op({ semana: W3, resultado: 60, emocion_entrada: "bien" }),
    op({ semana: W4, resultado: -10, emocion_entrada: "medio" }),
    op({ semana: W5, resultado: 5, emocion_entrada: "medio" }),
    op({ semana: "2026-09-21", resultado: -38, emocion_entrada: "mal", emocion_detalle: "euforico" }),
  ];
  const p = calcularPatrones(entrada({ operaciones: ops }));
  const e = p.emocion_vs_resultado.por_estado;
  assert.deepEqual(e.bien, { n: 3, promedio: 63.33, perdidas: 0, suficiente: true });
  assert.deepEqual(e.medio, { n: 2, promedio: -2.5, perdidas: 1, suficiente: false });
  assert.deepEqual(e.mal, { n: 1, promedio: -38, perdidas: 1, suficiente: false });
  assert.equal(p.emocion_vs_resultado.por_detalle.euforico.n, 1);
  assert.equal(p.emocion_vs_resultado.cobertura.por_operacion, 6);
});

prueba("respaldo al check-in semanal y operaciones abiertas excluidas", () => {
  const ops = [
    op({ semana: W1, resultado: -10 }), // sin emoción propia, hay check-in "mal"
    op({ semana: W2, resultado: 20 }), // sin emoción ni check-in
    op({ semana: W3, estado: "abierta", resultado: null, emocion_entrada: "bien" }), // abierta: no cuenta
  ];
  const p = calcularPatrones(
    entrada({ operaciones: ops, check_ins: [{ semana: W1, tipo: "entrada", estado_animo: "mal" }] })
  );
  assert.equal(p.emocion_vs_resultado.por_estado.mal.n, 1);
  assert.equal(p.emocion_vs_resultado.por_estado.bien.n, 0);
  assert.deepEqual(p.emocion_vs_resultado.cobertura, { por_operacion: 0, respaldo_check_in: 1, sin_emocion: 1 });
});

prueba("clasificarCalibrador cubre los 5 casos", () => {
  assert.equal(clasificarCalibrador(null), "sin_dato");
  assert.equal(clasificarCalibrador({ foo: 1 }), "sin_dato");
  assert.equal(clasificarCalibrador({ calibrador_consultado: false }), "no_consultado");
  assert.equal(clasificarCalibrador({ usuario: { siguio_calibrador: { cantidad: true, stop: true } } }), "siguio");
  assert.equal(clasificarCalibrador({ usuario: { siguio_calibrador: { cantidad: null, stop: true } } }), "siguio");
  assert.equal(clasificarCalibrador({ usuario: { siguio_calibrador: { cantidad: true, stop: false } } }), "se_aparto");
  assert.equal(clasificarCalibrador({ usuario: { siguio_calibrador: { cantidad: false, stop: null } } }), "se_aparto");
  assert.equal(clasificarCalibrador({ usuario: { siguio_calibrador: { cantidad: null, stop: null } } }), "no_comparable");
  assert.equal(clasificarCalibrador({ usuario: { siguio_calibrador: null } }), "no_comparable");
});

prueba("calibrador: resultados por seguimiento y cantidad sobre el calibrador", () => {
  const ls = (cant: boolean | null, stop: boolean | null, usuario: number, sistema: number) => ({
    posicion: { cantidad: sistema },
    usuario: { cantidad: usuario, siguio_calibrador: { cantidad: cant, stop } },
  });
  const ops = [
    op({ semana: W1, resultado: 10, lectura_sistema: ls(true, true, 5, 5) }),
    op({ semana: W2, resultado: 20, lectura_sistema: ls(true, true, 5, 5) }),
    op({ semana: W3, resultado: 30, lectura_sistema: ls(true, true, 5, 5) }),
    op({ semana: W4, resultado: -40, lectura_sistema: ls(false, true, 8, 5) }), // compró de más
    op({ semana: W5, resultado: -10, lectura_sistema: { calibrador_consultado: false } }),
  ];
  const p = calcularPatrones(entrada({ operaciones: ops }));
  assert.equal(p.calibrador.conteo.siguio, 3);
  assert.equal(p.calibrador.conteo.se_aparto, 1);
  assert.equal(p.calibrador.conteo.no_consultado, 1);
  assert.deepEqual(p.calibrador.resultado_siguio, { n: 3, promedio: 20, perdidas: 0, suficiente: true });
  assert.equal(p.calibrador.resultado_se_aparto.suficiente, false);
  assert.deepEqual(p.calibrador.cantidad_sobre_calibrador, { calculables: 4, veces: 1, suficiente: true });
});

prueba("superoRegla: capital total vs capital invertido y datos faltantes", () => {
  const dentro = op({ semana: W1, precio_referencia: 100, stop_loss: 95, cantidad: 3 }); // riesgo 15
  const fuera = op({ semana: W1, precio_referencia: 100, stop_loss: 95, cantidad: 25 }); // riesgo 125
  assert.equal(superoRegla(dentro, REGLAS), false); // 0.15% de 10000
  assert.equal(superoRegla(fuera, REGLAS), true); // 1.25%
  const invertido = { riesgo_maximo_pct: 1, base_calculo_riesgo: "capital_invertido" as const };
  assert.equal(superoRegla(dentro, invertido), true); // 15 / 300 = 5%
  assert.equal(superoRegla(op({ semana: W1, precio_referencia: 100, cantidad: 3 }), REGLAS), null);
});

prueba("reglas rotas por emoción", () => {
  const rota = { precio_referencia: 100, stop_loss: 95, cantidad: 25 };
  const sana = { precio_referencia: 100, stop_loss: 95, cantidad: 3 };
  const ops = [
    op({ semana: W1, emocion_entrada: "mal", emocion_detalle: "frustrado", ...rota }),
    op({ semana: W2, emocion_entrada: "mal", emocion_detalle: "frustrado", ...rota }),
    op({ semana: W3, emocion_entrada: "mal", emocion_detalle: "frustrado", ...sana }),
    op({ semana: W4, emocion_entrada: "bien", ...sana }),
    op({ semana: W5, emocion_entrada: "bien", ...sana }),
    op({ semana: "2026-11-02", emocion_entrada: "bien", ...sana }),
  ];
  const r = calcularPatrones(entrada({ operaciones: ops })).reglas_por_emocion;
  assert.deepEqual(r.total, { calculables: 6, superaron: 2, suficiente: true });
  assert.deepEqual(r.por_estado.mal, { calculables: 3, superaron: 2, suficiente: true });
  assert.deepEqual(r.por_estado.bien, { calculables: 3, superaron: 0, suficiente: true });
  assert.deepEqual(r.por_detalle.frustrado, { calculables: 3, superaron: 2, suficiente: true });
  assert.equal(r.por_detalle.fomo.suficiente, false);
});

prueba("aumento de tamaño tras pérdida (y orden cronológico independiente de la entrada)", () => {
  const tam = (semana: string, cantidad: number, resultado: number, extra: Partial<OperacionPatron> = {}) =>
    op({ semana, cantidad, resultado, precio_referencia: 100, ...extra });
  const ops = [
    tam("2026-11-02", 20, 5), // tras ganar: no es oportunidad
    tam(W1, 10, -20),
    tam(W3, 12, -5), // tras pérdida, baja: oportunidad sin aumento
    tam(W2, 15, -30), // tras pérdida, sube: aumento
    tam(W4, 12, 10), // tras pérdida, igual: no es aumento
  ];
  const a = calcularPatrones(entrada({ operaciones: ops })).reglas_por_emocion.aumento_tras_perdida;
  assert.deepEqual(a, { oportunidades: 3, veces: 1, suficiente: true });
});

prueba("una operación previa abierta no genera oportunidad", () => {
  const ops = [
    op({ semana: W1, estado: "abierta", cantidad: 10, precio_referencia: 100, resultado: null }),
    op({ semana: W2, cantidad: 20, precio_referencia: 100, resultado: -5 }),
  ];
  const a = calcularPatrones(entrada({ operaciones: ops })).reglas_por_emocion.aumento_tras_perdida;
  assert.equal(a.oportunidades, 0);
});

prueba("semanas: operadas, sin operar, solo check-in y semana actual excluida", () => {
  const p = calcularPatrones(
    entrada({
      operaciones: [
        op({ semana: W1, resultado: 10, emocion_entrada: "bien" }),
        op({ semana: W2, resultado: -5, emocion_entrada: "mal" }),
      ],
      sin_operar: [
        { semana: W3, emocion: "mal", emocion_detalle: "miedo" },
        { semana: W2, emocion: "bien", emocion_detalle: null }, // semana con operación: la operación manda
      ],
      check_ins: [
        { semana: W4, tipo: "entrada", estado_animo: "bien" },
        { semana: W5, tipo: "entrada", estado_animo: "medio" }, // semana actual sin decisión
      ],
      semana_actual: W5,
    })
  );
  const s = p.semanas;
  assert.equal(s.total, 4);
  assert.equal(s.operadas, 2);
  assert.equal(s.sin_operar_registradas, 1);
  assert.equal(s.solo_check_in, 1);
  assert.deepEqual(s.solo_check_in_recientes, [W4]);
  assert.deepEqual(s.sin_operar_por_detalle, { miedo: 1 });
  assert.equal(s.decision_por_estado.mal.operadas, 1);
  assert.equal(s.decision_por_estado.mal.sin_operar, 1);
  assert.equal(s.decision_por_estado.bien.operadas, 1);
  assert.equal(s.decision_por_estado.bien.sin_decision, 1);
  assert.equal(s.decision_por_estado.medio.sin_decision, 0); // la semana actual no cuenta
});

prueba("la semana actual SÍ cuenta si ya tiene decisión", () => {
  const p = calcularPatrones(
    entrada({
      sin_operar: [{ semana: W5, emocion: "medio", emocion_detalle: null }],
      semana_actual: W5,
    })
  );
  assert.equal(p.semanas.total, 1);
  assert.equal(p.semanas.sin_operar_registradas, 1);
});

prueba("resumenParaIA incluye solo grupos con muestra suficiente", () => {
  const ops = [
    op({ semana: W1, resultado: 50, emocion_entrada: "bien" }),
    op({ semana: W2, resultado: 80, emocion_entrada: "bien" }),
    op({ semana: W3, resultado: 60, emocion_entrada: "bien" }),
    op({ semana: W4, resultado: -38, emocion_entrada: "mal", emocion_detalle: "euforico" }),
  ];
  const r = resumenParaIA(calcularPatrones(entrada({ operaciones: ops })));
  const texto = JSON.stringify(r);
  assert.deepEqual(r.resultado_por_estado, { bien: { n: 3, promedio: 63.33, perdidas: 0 } });
  assert.ok(!texto.includes('"mal"'), "no debe citar 'mal' con 1 sola operación");
  assert.ok(!texto.includes("euforico"), "no debe citar un detalle con 1 sola operación");
  assert.ok(texto.length < 600, `resumen demasiado largo: ${texto.length}`);
});

console.log(`\n${pasadas} pruebas pasaron`);