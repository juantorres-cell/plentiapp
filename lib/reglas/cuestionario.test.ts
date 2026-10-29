// Se corre con: npx tsx lib/reglas/cuestionario.test.ts

import assert from "node:assert/strict";
import {
  MAX_REGLAS_ACTIVAS,
  recomendarReglas,
  type IdRegla,
  type Opcion,
  type RecomendacionReglas,
  type ReglaRecomendada,
  type RespuestasCuestionario,
} from "./cuestionario";

let total = 0;
let fallos = 0;

function prueba(nombre: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log("  ✓", nombre);
  } catch (e) {
    fallos++;
    console.log("  ✗", nombre);
    console.log("   ", String(e));
  }
}

const TODAS_A: RespuestasCuestionario = {
  salida: "a",
  cadencia: "a",
  fomo: "a",
  racha: "a",
  tolerancia: "a",
  preparacion: "a",
};

function caso(cambios: Partial<RespuestasCuestionario>, alertas: string[] = []): RecomendacionReglas {
  return recomendarReglas({ alertas, respuestas: { ...TODAS_A, ...cambios } });
}

function ids(reglas: ReglaRecomendada[]): IdRegla[] {
  return reglas.map((r) => r.id);
}

// Busca una regla por id y la devuelve ya estrechada por tipo.
function buscar<I extends IdRegla>(reglas: ReglaRecomendada[], id: I): Extract<ReglaRecomendada, { id: I }> {
  const regla = reglas.find((r) => r.id === id);
  assert.ok(regla, `no se encontró la regla ${id}`);
  return regla as Extract<ReglaRecomendada, { id: I }>;
}

const BASE_Y_PERIODO: IdRegla[] = [
  "riesgo_operacion",
  "tope_posicion",
  "stop_definido",
  "operaciones_periodo",
  "perdida_periodo",
];

console.log("Casos esperados");

prueba("todo en (a) y sin alertas: 5 reglas, sin conducta, solo 'mal' dispara pausa", () => {
  const r = caso({});
  assert.deepEqual(ids(r.activas), BASE_Y_PERIODO);
  assert.equal(buscar(r.activas, "tope_posicion").topePct, 5);
  assert.equal(buscar(r.activas, "stop_definido").modo, "aviso");
  const ops = buscar(r.activas, "operaciones_periodo");
  assert.deepEqual([ops.max, ops.periodo, ops.modo], [1, "semana", "aviso"]);
  const perdida = buscar(r.activas, "perdida_periodo");
  assert.deepEqual([perdida.limitePct, perdida.periodo, perdida.modo], [2, "mes", "aviso"]);
  assert.deepEqual(r.sugeridas, []);
  assert.deepEqual(r.emocionesConPausa, { estados: ["mal"], detalles: [] });
});

prueba("caso del mensaje (corregido): martingala + P1 c, P3 c, P4 b, P5 b, P6 c", () => {
  const r = caso({ salida: "c", cadencia: "a", fomo: "c", racha: "b", tolerancia: "b", preparacion: "c" }, [
    "riesgo_martingala",
  ]);
  assert.equal(r.activas.length, 6);
  assert.equal(r.activas[5]?.id, "tamano_entre_operaciones");
  const tamano = buscar(r.activas, "tamano_entre_operaciones");
  assert.deepEqual(
    [tamano.maxAumentoTrasPerdidaPct, tamano.maxAumentoTrasGananciaPct, tamano.modo, tamano.senales],
    [0, 25, "pausa_guiada", 2]
  );
  assert.deepEqual(ids(r.sugeridas), ["consultar_calibrador"]);
  assert.equal(r.sugeridas[0]?.senales, 3);
  assert.equal(buscar(r.activas, "stop_definido").modo, "pausa_guiada");
  // Corrección: sin la alerta de sobreoperación solo cuenta FOMO (1 señal) -> aviso, no pausa.
  const ops = buscar(r.activas, "operaciones_periodo");
  assert.deepEqual([ops.max, ops.periodo, ops.senales, ops.modo], [1, "semana", 1, "aviso"]);
  const perdida = buscar(r.activas, "perdida_periodo");
  assert.deepEqual([perdida.limitePct, perdida.periodo, perdida.modo], [4, "mes", "aviso"]);
  assert.deepEqual(r.emocionesConPausa.detalles, ["frustrado", "fomo"]);
});

prueba("alertas de capital y sobreoperación + cadencia diaria", () => {
  const r = caso({ cadencia: "c", fomo: "c", tolerancia: "b" }, ["capital_necesario", "riesgo_sobreoperacion"]);
  assert.equal(buscar(r.activas, "tope_posicion").topePct, 3);
  const ops = buscar(r.activas, "operaciones_periodo");
  assert.deepEqual([ops.max, ops.periodo, ops.senales, ops.modo], [1, "dia", 2, "pausa_guiada"]);
  // 4% mensual -> baja un escalón (2%) -> semanal = mitad = 1%
  const perdida = buscar(r.activas, "perdida_periodo");
  assert.deepEqual([perdida.limitePct, perdida.periodo, perdida.modo], [1, "semana", "aviso"]);
  assert.equal(r.activas.length, 5);
  assert.deepEqual(r.emocionesConPausa.detalles, ["fomo"]);
});

console.log("Cupo de conducta");

prueba("empate de señales: gana Tamaño y Calibrador queda sugerida", () => {
  const r = caso({ racha: "b", preparacion: "b" });
  assert.equal(r.activas[5]?.id, "tamano_entre_operaciones");
  assert.deepEqual(ids(r.sugeridas), ["consultar_calibrador"]);
});

prueba("Calibrador suma más y no hay reserva: gana Calibrador", () => {
  const r = caso({ racha: "b", preparacion: "c" });
  assert.equal(r.activas[5]?.id, "consultar_calibrador");
  assert.equal(r.activas[5]?.modo, "pausa_guiada");
  assert.deepEqual(ids(r.sugeridas), ["tamano_entre_operaciones"]);
});

prueba("racha (c) reserva el cupo para Tamaño aunque Calibrador sume 3", () => {
  const r = caso({ racha: "c", preparacion: "c", salida: "c" });
  assert.equal(r.activas[5]?.id, "tamano_entre_operaciones");
  const tamano = buscar(r.activas, "tamano_entre_operaciones");
  assert.deepEqual([tamano.maxAumentoTrasPerdidaPct, tamano.maxAumentoTrasGananciaPct], [0, 25]);
  assert.equal(r.sugeridas[0]?.senales, 3);
  assert.deepEqual(r.emocionesConPausa.detalles, ["euforico"]);
});

prueba("solo martingala: tope tras pérdida 0%, sin tope tras ganancia, aviso", () => {
  const r = caso({}, ["riesgo_martingala"]);
  const tamano = buscar(r.activas, "tamano_entre_operaciones");
  assert.deepEqual(
    [tamano.maxAumentoTrasPerdidaPct, tamano.maxAumentoTrasGananciaPct, tamano.modo],
    [0, null, "aviso"]
  );
});

prueba("solo racha (b): tope +25% tras ganancia, sin tope tras pérdida", () => {
  const r = caso({ racha: "b" });
  const tamano = buscar(r.activas, "tamano_entre_operaciones");
  assert.deepEqual([tamano.maxAumentoTrasPerdidaPct, tamano.maxAumentoTrasGananciaPct], [null, 25]);
});

console.log("Pérdida del periodo");

prueba("escalones: valor, baja por alerta con piso en 2% y conversión a semanal", () => {
  const pct = (cambios: Partial<RespuestasCuestionario>, alertas: string[] = []) => {
    const p = buscar(caso(cambios, alertas).activas, "perdida_periodo");
    return [p.limitePct, p.periodo];
  };
  assert.deepEqual(pct({ tolerancia: "c" }), [6, "mes"]);
  assert.deepEqual(pct({ tolerancia: "c" }, ["urgencia_ingresos"]), [4, "mes"]);
  assert.deepEqual(pct({ tolerancia: "a" }, ["capital_necesario"]), [2, "mes"]);
  assert.deepEqual(pct({ tolerancia: "b", cadencia: "c" }), [2, "semana"]);
  assert.deepEqual(pct({ tolerancia: "c", cadencia: "c" }), [3, "semana"]);
  assert.deepEqual(pct({ tolerancia: "a", cadencia: "c" }, ["capital_necesario"]), [1, "semana"]);
});

prueba("el texto 'Bajó un escalón' solo aparece si el valor realmente bajó", () => {
  const textos = (cambios: Partial<RespuestasCuestionario>, alertas: string[]) =>
    buscar(caso(cambios, alertas).activas, "perdida_periodo").porque.join(" | ");
  assert.ok(textos({ tolerancia: "b" }, ["capital_necesario"]).includes("Bajó un escalón"));
  assert.ok(textos({ tolerancia: "c" }, ["urgencia_ingresos"]).includes("Bajó un escalón"));
  assert.ok(!textos({ tolerancia: "a" }, ["capital_necesario"]).includes("Bajó un escalón"));
  assert.ok(textos({ tolerancia: "a" }, ["capital_necesario"]).includes("mínimo"));
  assert.ok(!textos({ tolerancia: "b" }, []).includes("escalón"));
});

console.log("Robustez");

prueba("tendencia_paralisis y alertas desconocidas no cambian nada", () => {
  const sin = caso({ racha: "b", preparacion: "b" });
  const con = caso({ racha: "b", preparacion: "b" }, ["tendencia_paralisis", "alerta_inventada"]);
  assert.deepEqual(con, sin);
});

prueba("misma entrada, misma salida", () => {
  const a = caso({ salida: "b", fomo: "c", racha: "c" }, ["riesgo_martingala"]);
  const b = caso({ salida: "b", fomo: "c", racha: "c" }, ["riesgo_martingala"]);
  assert.deepEqual(a, b);
});

prueba("una respuesta inválida lanza un error claro", () => {
  assert.throws(
    () => caso({ salida: "z" as Opcion }),
    (e: unknown) => e instanceof Error && e.message.includes("salida")
  );
});

console.log("Invariantes en TODAS las combinaciones (3^6 respuestas × 2^5 alertas)");

prueba("invariantes", () => {
  const opciones: Opcion[] = ["a", "b", "c"];
  const todasAlertas = [
    "urgencia_ingresos",
    "capital_necesario",
    "riesgo_martingala",
    "riesgo_sobreoperacion",
    "tendencia_paralisis",
  ];
  let combinaciones = 0;

  for (const salida of opciones)
    for (const cadencia of opciones)
      for (const fomo of opciones)
        for (const racha of opciones)
          for (const tolerancia of opciones)
            for (const preparacion of opciones)
              for (let mascara = 0; mascara < 32; mascara++) {
                combinaciones++;
                const alertas = todasAlertas.filter((_, i) => (mascara >> i) & 1);
                const respuestas = { salida, cadencia, fomo, racha, tolerancia, preparacion };
                const r = recomendarReglas({ alertas, respuestas });
                const etiqueta = JSON.stringify({ respuestas, alertas });

                // Tope y composición
                assert.ok(r.activas.length >= 5 && r.activas.length <= MAX_REGLAS_ACTIVAS, `cantidad ${etiqueta}`);
                assert.deepEqual(ids(r.activas).slice(0, 5), BASE_Y_PERIODO, `orden ${etiqueta}`);
                const conducta = r.activas.slice(5);
                assert.ok(conducta.length <= 1 && r.sugeridas.length <= 1, `cupo ${etiqueta}`);

                // Sin repetidos ni solapes
                const todas = [...r.activas, ...r.sugeridas];
                assert.equal(new Set(ids(todas)).size, todas.length, `repetidas ${etiqueta}`);

                // Todo tiene explicación y modo válido
                for (const regla of todas) {
                  assert.ok(regla.porque.length > 0, `sin porque ${regla.id} ${etiqueta}`);
                  assert.ok(regla.modo === "aviso" || regla.modo === "pausa_guiada", `modo ${etiqueta}`);
                }

                // Modo derivado de señales (salvo base y stop)
                for (const regla of todas) {
                  if (["operaciones_periodo", "perdida_periodo", "tamano_entre_operaciones", "consultar_calibrador"].includes(regla.id)) {
                    assert.equal(regla.modo, regla.senales >= 2 ? "pausa_guiada" : "aviso", `modo-señales ${regla.id} ${etiqueta}`);
                  }
                }
                assert.equal(buscar(r.activas, "stop_definido").modo, salida === "a" ? "aviso" : "pausa_guiada", `stop ${etiqueta}`);

                // Las reglas de conducta solo existen con señales
                for (const regla of [...conducta, ...r.sugeridas]) assert.ok(regla.senales >= 1, `señales ${etiqueta}`);

                // Prioridad: martingala o racha (c) reservan el cupo para Tamaño
                if (alertas.includes("riesgo_martingala") || racha === "c") {
                  assert.equal(conducta[0]?.id, "tamano_entre_operaciones", `reserva ${etiqueta}`);
                }

                // Valores permitidos
                const perdida = buscar(r.activas, "perdida_periodo");
                const permitidos = perdida.periodo === "mes" ? [2, 4, 6] : [1, 2, 3];
                assert.ok(permitidos.includes(perdida.limitePct), `pérdida ${perdida.limitePct} ${etiqueta}`);
                assert.equal(perdida.periodo, cadencia === "c" ? "semana" : "mes", `periodo ${etiqueta}`);
                assert.ok([3, 5].includes(buscar(r.activas, "tope_posicion").topePct), `tope ${etiqueta}`);
                assert.deepEqual(r.emocionesConPausa.estados, ["mal"], `estados ${etiqueta}`);
              }

  assert.equal(combinaciones, 729 * 32);
});

console.log(`\n${total - fallos}/${total} pruebas pasan`);
process.exit(fallos ? 1 : 0);