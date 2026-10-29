// Se corre con: npx tsx lib/reglas/aplicar.test.ts

import assert from "node:assert/strict";
import { recomendarReglas, type Opcion, type RespuestasCuestionario } from "./cuestionario";
import {
  columnasLegacy,
  construirConfig,
  construirRespuestasGuardadas,
  describirRegla,
  etiquetaModo,
} from "./aplicar";
import { PREGUNTAS_CUESTIONARIO, todasRespondidas } from "./preguntas";

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

function rec(cambios: Partial<RespuestasCuestionario>, alertas: string[] = []) {
  return recomendarReglas({ alertas, respuestas: { ...TODAS_A, ...cambios } });
}

const AHORA = "2026-10-29T15:00:00.000Z";

console.log("Columnas actuales de profiles");

prueba("perfil base: 1%, tope 5%, una operación por semana", () => {
  assert.deepEqual(columnasLegacy(rec({})), {
    regla_1_activa: true,
    riesgo_maximo_pct: 1,
    limite_portafolio_activa: true,
    limite_portafolio_pct: 5,
    una_operacion_semana_activa: true,
  });
});

prueba("alerta de capital baja el tope a 3%", () => {
  assert.equal(columnasLegacy(rec({}, ["capital_necesario"])).limite_portafolio_pct, 3);
  assert.equal(columnasLegacy(rec({}, ["urgencia_ingresos"])).limite_portafolio_pct, 3);
});

prueba("3 por semana o 1 por día no activan 'una operación por semana'", () => {
  assert.equal(columnasLegacy(rec({ cadencia: "b" })).una_operacion_semana_activa, false);
  assert.equal(columnasLegacy(rec({ cadencia: "c" })).una_operacion_semana_activa, false);
});

prueba("no incluye base_calculo_riesgo (es elección del usuario)", () => {
  assert.equal("base_calculo_riesgo" in columnasLegacy(rec({})), false);
});

console.log("Forma de los jsonb");

prueba("construirConfig y construirRespuestasGuardadas", () => {
  const r = rec({ salida: "c", racha: "c" }, ["riesgo_martingala"]);
  const config = construirConfig(r, AHORA);
  assert.equal(config.version, 1);
  assert.equal(config.origen, "cuestionario");
  assert.equal(config.aplicada_en, AHORA);
  assert.equal(config.activas.length, r.activas.length);
  assert.deepEqual(config.emocionesConPausa.detalles, ["frustrado", "euforico"]);

  const guardadas = construirRespuestasGuardadas({ ...TODAS_A, salida: "c" }, ["riesgo_martingala"], AHORA);
  assert.deepEqual(guardadas, {
    version: 1,
    respondido_en: AHORA,
    respuestas: { ...TODAS_A, salida: "c" },
    alertas_onboarding: ["riesgo_martingala"],
  });
});

prueba("no comparte referencias con la recomendación original", () => {
  const r = rec({});
  const config = construirConfig(r, AHORA);
  config.emocionesConPausa.estados.push("mal");
  assert.equal(r.emocionesConPausa.estados.length, 1);
});

console.log("Textos");

prueba("cada regla activa tiene título, detalle y marca de aplicación", () => {
  const r = rec({ salida: "b", cadencia: "b", racha: "b", preparacion: "c" }, ["riesgo_martingala"]);
  for (const regla of [...r.activas, ...r.sugeridas]) {
    const d = describirRegla(regla);
    assert.ok(d.titulo.length > 0 && d.detalle.length > 0, regla.id);
    assert.equal(typeof d.seAplicaHoy, "boolean");
  }
});

prueba("seAplicaHoy: solo riesgo, tope y 1 por semana", () => {
  const hoy = (cambios: Partial<RespuestasCuestionario>, alertas: string[] = []) =>
    Object.fromEntries(
      [...rec(cambios, alertas).activas, ...rec(cambios, alertas).sugeridas].map((r) => [r.id, describirRegla(r).seAplicaHoy])
    );
  const base = hoy({ racha: "b", preparacion: "b" });
  assert.equal(base.riesgo_operacion, true);
  assert.equal(base.tope_posicion, true);
  assert.equal(base.stop_definido, false);
  assert.equal(base.operaciones_periodo, true);
  assert.equal(base.perdida_periodo, false);
  assert.equal(base.tamano_entre_operaciones, false);
  assert.equal(base.consultar_calibrador, false);
  assert.equal(hoy({ cadencia: "b" }).operaciones_periodo, false);
});

prueba("textos concretos", () => {
  const get = (id: string, cambios: Partial<RespuestasCuestionario>, alertas: string[] = []) => {
    const regla = [...rec(cambios, alertas).activas, ...rec(cambios, alertas).sugeridas].find((r) => r.id === id);
    assert.ok(regla, id);
    return describirRegla(regla).detalle;
  };
  assert.equal(get("operaciones_periodo", {}), "Máximo 1 operación por semana.");
  assert.equal(get("operaciones_periodo", { cadencia: "b" }), "Máximo 3 operaciones por semana.");
  assert.ok(get("operaciones_periodo", { cadencia: "c" }).includes("1111"));
  assert.ok(get("perdida_periodo", { tolerancia: "b" }).includes("4% de tu capital por mes"));
  assert.ok(get("perdida_periodo", { tolerancia: "b", cadencia: "c" }).includes("2% de tu capital por semana"));
  assert.ok(get("tamano_entre_operaciones", { racha: "c" }).includes("no subes el tamaño"));
  assert.ok(get("tamano_entre_operaciones", { racha: "c" }).includes("25%"));
  assert.ok(!get("tamano_entre_operaciones", { racha: "b" }).includes("pérdida"));
});

prueba("etiquetas de modo", () => {
  assert.equal(etiquetaModo("aviso"), "Aviso");
  assert.equal(etiquetaModo("pausa_guiada"), "Pausa guiada");
});

console.log("Preguntas");

prueba("6 preguntas, una por clave, con opciones a/b/c", () => {
  assert.deepEqual(
    PREGUNTAS_CUESTIONARIO.map((p) => p.id),
    ["salida", "cadencia", "fomo", "racha", "tolerancia", "preparacion"]
  );
  for (const p of PREGUNTAS_CUESTIONARIO) {
    assert.deepEqual(
      p.opciones.map((o) => o.valor),
      ["a", "b", "c"],
      p.id
    );
    assert.ok(p.titulo.length > 0 && p.opciones.every((o) => o.texto.length > 0), p.id);
  }
});

prueba("todasRespondidas", () => {
  assert.equal(todasRespondidas({}), false);
  assert.equal(todasRespondidas({ ...TODAS_A, fomo: undefined }), false);
  assert.equal(todasRespondidas({ ...TODAS_A, fomo: "z" as Opcion }), false);
  assert.equal(todasRespondidas(TODAS_A), true);
});

console.log("Todas las combinaciones (3^6 respuestas × 2^5 alertas)");

prueba("columnas válidas y jsonb serializable sin pérdida", () => {
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

                const c = columnasLegacy(r);
                assert.equal(c.regla_1_activa, true, etiqueta);
                assert.equal(c.riesgo_maximo_pct, 1, etiqueta);
                assert.equal(c.limite_portafolio_activa, true, etiqueta);
                assert.ok(c.limite_portafolio_pct === 3 || c.limite_portafolio_pct === 5, etiqueta);
                assert.equal(c.una_operacion_semana_activa, cadencia === "a", etiqueta);
                // Los valores caben en los sliders de /reglas (0.5 a 10, pasos de 0.5)
                for (const v of [c.riesgo_maximo_pct, c.limite_portafolio_pct]) {
                  assert.ok(v >= 0.5 && v <= 10 && (v * 2) % 1 === 0, etiqueta);
                }

                const config = construirConfig(r, AHORA);
                assert.deepEqual(JSON.parse(JSON.stringify(config)), config, etiqueta);
                const guardadas = construirRespuestasGuardadas(respuestas, alertas, AHORA);
                assert.deepEqual(JSON.parse(JSON.stringify(guardadas)), guardadas, etiqueta);

                for (const regla of [...r.activas, ...r.sugeridas]) {
                  const d = describirRegla(regla);
                  assert.ok(d.titulo && d.detalle, etiqueta);
                }
              }
  assert.equal(combinaciones, 729 * 32);
});

console.log(`\n${total - fallos}/${total} pruebas pasan`);
process.exit(fallos ? 1 : 0);