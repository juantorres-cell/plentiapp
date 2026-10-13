import assert from "node:assert/strict";
import { numero, validarHipotesis, fechaRevisionPorDefecto, compararConCalibrador } from "./operaciones";

// numero
assert.equal(numero("182,28"), 182.28);
assert.equal(numero(" 229.28 "), 229.28);
assert.equal(numero("-5.6"), -5.6);
assert.equal(numero("0"), 0); // el cero es un valor válido, no "vacío"
assert.equal(numero(""), null);
assert.equal(numero("abc"), null);

const base = { observo: "", tesis: "", me_equivoco_si: "", cuando_reviso: "" };

// Vacío -> dos errores que bloquean
let r = validarHipotesis(base);
assert.equal(r.errores.length, 2);

// Tu justificación real de la captura, sin "me equivoco si": bloquea
r = validarHipotesis({ ...base, tesis: "Puede ser una buena opción porque llegó a una resistencia", observo: "tendencia alcista" });
assert.equal(r.errores.length, 1);
assert.ok(r.avisos.some((a) => a.includes("no incluye números")));

// Refutación sin número: no bloquea, pero avisa
r = validarHipotesis({ ...base, tesis: "Sigue la tendencia alcista", me_equivoco_si: "pierde la media de corto plazo", observo: "Cierre 229.28, 3.2% sobre media de 50", cuando_reviso: "2026-10-19" });
assert.equal(r.errores.length, 0);
assert.equal(r.avisos.length, 1);
assert.ok(r.avisos[0].includes("ningún número"));

// Hipótesis completa: sin errores ni avisos
r = validarHipotesis({ observo: "Cierre 229.28, 3.2% sobre media de 50", tesis: "Sigue la tendencia alcista", me_equivoco_si: "cierra bajo 222.08 antes del 19/10", cuando_reviso: "2026-10-19" });
assert.deepEqual(r, { errores: [], avisos: [] });

// Fecha de revisión por defecto
assert.equal(fechaRevisionPorDefecto("2026-10-12"), "2026-10-19");
assert.equal(fechaRevisionPorDefecto("2026-12-28"), "2027-01-04"); // cruza fin de año
assert.equal(fechaRevisionPorDefecto("basura"), "");

// Comparación con el calibrador
assert.deepEqual(compararConCalibrador({ cantidad: 2, stop: 203.69 }, { cantidad: 2, stop_sugerido: 203.6872 }), { cantidad: true, stop: true });
assert.deepEqual(compararConCalibrador({ cantidad: 2, stop: 182.28 }, { cantidad: 2, stop_sugerido: 203.69 }), { cantidad: true, stop: false });
assert.deepEqual(compararConCalibrador({ cantidad: 6, stop: null }, { cantidad: 2, stop_sugerido: 203.69 }), { cantidad: false, stop: null });
assert.equal(compararConCalibrador({ cantidad: 2, stop: 200 }, null), null);

console.log("OK: pruebas de operaciones pasaron");