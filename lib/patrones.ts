// lib/patrones.ts
// Patrones de conducta del usuario. Lógica PURA: sin red, sin Supabase, sin IA.
//
// Dos consumidores con necesidades distintas:
//  - La UI usa `calcularPatrones()`: estructura completa, apta para tarjetas y gráficas.
//  - La IA usa `resumenParaIA()`: versión compacta, solo con lo que tiene muestra suficiente.
//
// Regla de muestra: un grupo con menos de MIN_GRUPO datos se marca `suficiente: false`.
// La UI puede mostrarlo como "pocos datos" y la IA nunca lo recibe.

export type Estado = "bien" | "medio" | "mal";
export type Detalle = "tranquilo" | "ansioso" | "euforico" | "frustrado" | "miedo" | "fomo";

export const ESTADOS: Estado[] = ["bien", "medio", "mal"];
export const DETALLES: Detalle[] = ["tranquilo", "ansioso", "euforico", "frustrado", "miedo", "fomo"];

/** Mínimo de datos en un grupo para que cuente como patrón y no como casualidad. */
export const MIN_GRUPO = 3;

// ---------- Entradas (filas tal como salen de Supabase) ----------

export type OperacionPatron = {
  semana: string; // lunes, YYYY-MM-DD
  fecha: string | null;
  cerrada_en: string | null;
  estado: "abierta" | "cerrada";
  activo: string | null;
  cantidad: number | null;
  capital_disponible: number | null;
  stop_loss: number | null;
  precio_referencia: number | null;
  resultado: number | null;
  emocion_entrada: Estado | null;
  emocion_detalle: Detalle | null;
  lectura_sistema: unknown; // jsonb: puede ser null, {calibrador_consultado:false} o la foto del calibrador
};

export type SinOperarPatron = {
  semana: string;
  emocion: Estado | null;
  emocion_detalle: Detalle | null;
};

export type CheckInPatron = {
  semana: string;
  tipo: "entrada" | "salida";
  estado_animo: Estado;
};

export type ReglasPatron = {
  riesgo_maximo_pct: number;
  base_calculo_riesgo: "capital_total" | "capital_invertido";
};

export type EntradaPatrones = {
  operaciones: OperacionPatron[];
  sin_operar: SinOperarPatron[];
  check_ins: CheckInPatron[];
  reglas: ReglasPatron;
  /** Lunes de la semana en curso: si aún no tiene decisión, no cuenta como "sin decisión". */
  semana_actual?: string;
};

// ---------- Salidas ----------

export type Grupo = { n: number; promedio: number; perdidas: number; suficiente: boolean };
export type ConteoRegla = { calculables: number; superaron: number; suficiente: boolean };
export type Decision = { operadas: number; sin_operar: number; sin_decision: number; suficiente: boolean };

export type LineaSemana = {
  semana: string;
  tipo: "operada" | "sin_operar" | "sin_decision";
  emocion: Estado | null;
  /** Suma de los resultados cerrados de esa semana; null si no hay ninguno. */
  resultado: number | null;
};

export type SeguimientoCalibrador = "siguio" | "se_aparto" | "no_comparable" | "no_consultado" | "sin_dato";

export type Patrones = {
  version: 1;
  /** Regla de riesgo del usuario (% máximo por operación), para que los textos citen su número. */
  regla_pct: number;
  /** La operación más reciente (cualquier estado): sirve para detectar "subir tamaño tras perder" en vivo. */
  ultima_operacion: {
    semana: string;
    estado: "abierta" | "cerrada";
    resultado: number | null;
    monto: number | null;
  } | null;
  muestra: { operaciones: number; cerradas_con_resultado: number; semanas: number };

  /** Patrón 1: cómo te va según cómo te sientes al abrir la operación. */
  emocion_vs_resultado: {
    por_estado: Record<Estado, Grupo>;
    por_detalle: Record<Detalle, Grupo>;
    /** De dónde salió la emoción de cada operación cerrada. */
    cobertura: { por_operacion: number; respaldo_check_in: number; sin_emocion: number };
  };

  /** Patrón 2: si seguiste lo que calculó el calibrador. */
  calibrador: {
    conteo: Record<SeguimientoCalibrador, number>;
    resultado_siguio: Grupo;
    resultado_se_aparto: Grupo;
    /** Operaciones donde compraste más acciones de las que el calibrador permitía. */
    cantidad_sobre_calibrador: { calculables: number; veces: number; suficiente: boolean };
  };

  /** Patrón 3: cuándo rompes tus reglas, según la emoción. */
  reglas_por_emocion: {
    total: ConteoRegla;
    por_estado: Record<Estado, ConteoRegla>;
    por_detalle: Record<Detalle, ConteoRegla>;
    aumento_tras_perdida: { oportunidades: number; veces: number; suficiente: boolean };
  };

  /** Patrón 4: qué pasa en las semanas en que no operas (o no decides). */
  semanas: {
    total: number;
    operadas: number;
    sin_operar_registradas: number;
    /** Semanas con check-in pero sin operación ni registro de "no operé". */
    solo_check_in: number;
    solo_check_in_recientes: string[];
    decision_por_estado: Record<Estado, Decision>;
    sin_operar_por_detalle: Partial<Record<Detalle, number>>;
    /** Últimas 16 semanas, de la más antigua a la más reciente (para la tira visual). */
    linea: LineaSemana[];
  };
};

// ---------- Utilidades ----------

const redondear = (n: number) => Math.round(n * 100) / 100;

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function num(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function mapaVacio<T extends string, V>(claves: T[], fabrica: () => V): Record<T, V> {
  const out = {} as Record<T, V>;
  claves.forEach((k) => {
    out[k] = fabrica();
  });
  return out;
}

function grupo(resultados: number[]): Grupo {
  const n = resultados.length;
  const suma = resultados.reduce((a, b) => a + b, 0);
  return {
    n,
    promedio: n > 0 ? redondear(suma / n) : 0,
    perdidas: resultados.filter((r) => r < 0).length,
    suficiente: n >= MIN_GRUPO,
  };
}

function monto(op: OperacionPatron): number | null {
  return op.precio_referencia && op.cantidad ? op.precio_referencia * op.cantidad : null;
}

/** De la más antigua a la más reciente (semana, luego fecha, luego cierre). */
function ordenar(ops: OperacionPatron[]): OperacionPatron[] {
  return ops
    .slice()
    .sort(
      (a, b) =>
        a.semana.localeCompare(b.semana) ||
        (a.fecha ?? "").localeCompare(b.fecha ?? "") ||
        (a.cerrada_en ?? "").localeCompare(b.cerrada_en ?? "")
    );
}

/**
 * Emoción de una operación: la declarada al abrirla; si no existe (operaciones antiguas),
 * el check-in de entrada de esa semana. Se registra de dónde salió.
 */
function emocionOperacion(
  op: OperacionPatron,
  semanal: Map<string, Estado>
): { estado: Estado | null; fuente: "operacion" | "check_in" | "ninguna" } {
  if (op.emocion_entrada) return { estado: op.emocion_entrada, fuente: "operacion" };
  const s = semanal.get(op.semana);
  if (s) return { estado: s, fuente: "check_in" };
  return { estado: null, fuente: "ninguna" };
}

/** ¿Superó la regla de riesgo? null si faltan datos. Misma cuenta que buildContext. */
export function superoRegla(op: OperacionPatron, reglas: ReglasPatron): boolean | null {
  if (!op.precio_referencia || !op.stop_loss || !op.cantidad) return null;
  const riesgo = Math.abs(op.precio_referencia - op.stop_loss) * op.cantidad;
  const base = reglas.base_calculo_riesgo === "capital_invertido" ? monto(op) : op.capital_disponible;
  if (!base) return null;
  return (riesgo / base) * 100 > reglas.riesgo_maximo_pct;
}

/** Lee lectura_sistema.usuario.siguio_calibrador (lo guarda /operar al abrir la operación). */
export function clasificarCalibrador(ls: unknown): SeguimientoCalibrador {
  if (!esObjeto(ls)) return "sin_dato";
  if (ls.calibrador_consultado === false) return "no_consultado";
  if (!esObjeto(ls.usuario)) return "sin_dato";
  const sc = ls.usuario.siguio_calibrador;
  if (!esObjeto(sc)) return "no_comparable";
  const c = sc.cantidad;
  const s = sc.stop;
  if (c === false || s === false) return "se_aparto";
  if (c === true || s === true) return "siguio";
  return "no_comparable";
}

/** ¿Compró más acciones que la cantidad del calibrador? null si no se puede saber. */
function cantidadSobreCalibrador(ls: unknown): boolean | null {
  if (!esObjeto(ls) || !esObjeto(ls.usuario) || !esObjeto(ls.posicion)) return null;
  const u = num(ls.usuario.cantidad);
  const s = num(ls.posicion.cantidad);
  if (u === null || s === null) return null;
  return u > s;
}

// ---------- Cálculo principal ----------

export function calcularPatrones(e: EntradaPatrones): Patrones {
  const ops = ordenar(e.operaciones ?? []);
  const sinOperar = e.sin_operar ?? [];
  const todosCheckIns = e.check_ins ?? [];

  const semanal = new Map<string, Estado>();
  todosCheckIns.filter((c) => c.tipo === "entrada").forEach((c) => semanal.set(c.semana, c.estado_animo));

  // --- Patrón 1: emoción vs resultado (solo operaciones cerradas con resultado) ---
  const resEstado = mapaVacio(ESTADOS, () => [] as number[]);
  const resDetalle = mapaVacio(DETALLES, () => [] as number[]);
  const cobertura = { por_operacion: 0, respaldo_check_in: 0, sin_emocion: 0 };
  const cerradas = ops.filter((o) => o.estado === "cerrada" && o.resultado !== null);

  cerradas.forEach((op) => {
    const r = op.resultado as number;
    const em = emocionOperacion(op, semanal);
    if (em.estado) resEstado[em.estado].push(r);
    if (op.emocion_detalle) resDetalle[op.emocion_detalle].push(r);
    if (em.fuente === "operacion") cobertura.por_operacion++;
    else if (em.fuente === "check_in") cobertura.respaldo_check_in++;
    else cobertura.sin_emocion++;
  });

  // --- Patrón 2: calibrador ---
  const conteoCal = mapaVacio<SeguimientoCalibrador, number>(
    ["siguio", "se_aparto", "no_comparable", "no_consultado", "sin_dato"],
    () => 0
  );
  const resSiguio: number[] = [];
  const resSeAparto: number[] = [];
  const sobre = { calculables: 0, veces: 0 };

  ops.forEach((op) => {
    const clase = clasificarCalibrador(op.lectura_sistema);
    conteoCal[clase]++;
    if (op.estado === "cerrada" && op.resultado !== null) {
      if (clase === "siguio") resSiguio.push(op.resultado);
      if (clase === "se_aparto") resSeAparto.push(op.resultado);
    }
    const mayor = cantidadSobreCalibrador(op.lectura_sistema);
    if (mayor !== null) {
      sobre.calculables++;
      if (mayor) sobre.veces++;
    }
  });

  // --- Patrón 3: reglas rotas según emoción ---
  const cuentaTotal = { calculables: 0, superaron: 0 };
  const cuentaEstado = mapaVacio(ESTADOS, () => ({ calculables: 0, superaron: 0 }));
  const cuentaDetalle = mapaVacio(DETALLES, () => ({ calculables: 0, superaron: 0 }));

  ops.forEach((op) => {
    const supero = superoRegla(op, e.reglas);
    if (supero === null) return;
    const em = emocionOperacion(op, semanal);
    cuentaTotal.calculables++;
    if (supero) cuentaTotal.superaron++;
    if (em.estado) {
      cuentaEstado[em.estado].calculables++;
      if (supero) cuentaEstado[em.estado].superaron++;
    }
    if (op.emocion_detalle) {
      cuentaDetalle[op.emocion_detalle].calculables++;
      if (supero) cuentaDetalle[op.emocion_detalle].superaron++;
    }
  });

  const aumento = { oportunidades: 0, veces: 0 };
  for (let i = 1; i < ops.length; i++) {
    const previa = ops[i - 1];
    if (previa.estado !== "cerrada" || previa.resultado === null || previa.resultado >= 0) continue;
    const actual = monto(ops[i]);
    const anterior = monto(previa);
    if (actual === null || anterior === null) continue;
    aumento.oportunidades++;
    if (actual > anterior) aumento.veces++;
  }

  const conSuficiencia = (c: { calculables: number; superaron: number }): ConteoRegla => ({
    ...c,
    suficiente: c.calculables >= MIN_GRUPO,
  });

  // --- Patrón 4: semanas ---
  const opsPorSemana = new Map<string, OperacionPatron[]>();
  ops.forEach((o) => {
    const lista = opsPorSemana.get(o.semana) ?? [];
    lista.push(o);
    opsPorSemana.set(o.semana, lista);
  });
  const sinPorSemana = new Map<string, SinOperarPatron>();
  sinOperar.forEach((s) => sinPorSemana.set(s.semana, s));

  const universo = new Set<string>([
    ...opsPorSemana.keys(),
    ...sinPorSemana.keys(),
    ...todosCheckIns.map((c) => c.semana),
  ]);
  // La semana en curso sin decisión todavía no es un hueco: aún está en juego.
  if (e.semana_actual && !opsPorSemana.has(e.semana_actual) && !sinPorSemana.has(e.semana_actual)) {
    universo.delete(e.semana_actual);
  }

  const decision = mapaVacio(ESTADOS, () => ({ operadas: 0, sin_operar: 0, sin_decision: 0 }));
  const sinPorDetalle: Partial<Record<Detalle, number>> = {};
  let operadas = 0;
  let sinOperarReg = 0;
  let soloCheckIn = 0;
  const recientes: string[] = [];
  const lineaDesc: LineaSemana[] = [];

  Array.from(universo)
    .sort((a, b) => b.localeCompare(a)) // más recientes primero
    .forEach((semana) => {
      const opsSemana = opsPorSemana.get(semana);
      const sin = sinPorSemana.get(semana);
      if (opsSemana && opsSemana.length > 0) {
        operadas++;
        const em = emocionOperacion(opsSemana[0], semanal).estado;
        if (em) decision[em].operadas++;
        const conResultado = opsSemana.filter((o) => o.estado === "cerrada" && o.resultado !== null);
        lineaDesc.push({
          semana,
          tipo: "operada",
          emocion: em,
          resultado:
            conResultado.length > 0
              ? redondear(conResultado.reduce((a, o) => a + (o.resultado as number), 0))
              : null,
        });
      } else if (sin) {
        sinOperarReg++;
        const em = sin.emocion ?? semanal.get(semana) ?? null;
        if (em) decision[em].sin_operar++;
        lineaDesc.push({ semana, tipo: "sin_operar", emocion: em, resultado: null });
        if (sin.emocion_detalle) {
          sinPorDetalle[sin.emocion_detalle] = (sinPorDetalle[sin.emocion_detalle] ?? 0) + 1;
        }
      } else {
        soloCheckIn++;
        if (recientes.length < 5) recientes.push(semana);
        const em = semanal.get(semana) ?? null;
        if (em) decision[em].sin_decision++;
        lineaDesc.push({ semana, tipo: "sin_decision", emocion: em, resultado: null });
      }
    });

  const ultima = ops.length > 0 ? ops[ops.length - 1] : null;

  return {
    version: 1,
    regla_pct: e.reglas.riesgo_maximo_pct,
    ultima_operacion: ultima
      ? { semana: ultima.semana, estado: ultima.estado, resultado: ultima.resultado, monto: monto(ultima) }
      : null,
    muestra: { operaciones: ops.length, cerradas_con_resultado: cerradas.length, semanas: universo.size },
    emocion_vs_resultado: {
      por_estado: {
        bien: grupo(resEstado.bien),
        medio: grupo(resEstado.medio),
        mal: grupo(resEstado.mal),
      },
      por_detalle: Object.fromEntries(DETALLES.map((d) => [d, grupo(resDetalle[d])])) as Record<Detalle, Grupo>,
      cobertura,
    },
    calibrador: {
      conteo: conteoCal,
      resultado_siguio: grupo(resSiguio),
      resultado_se_aparto: grupo(resSeAparto),
      cantidad_sobre_calibrador: { ...sobre, suficiente: sobre.calculables >= MIN_GRUPO },
    },
    reglas_por_emocion: {
      total: conSuficiencia(cuentaTotal),
      por_estado: {
        bien: conSuficiencia(cuentaEstado.bien),
        medio: conSuficiencia(cuentaEstado.medio),
        mal: conSuficiencia(cuentaEstado.mal),
      },
      por_detalle: Object.fromEntries(
        DETALLES.map((d) => [d, conSuficiencia(cuentaDetalle[d])])
      ) as Record<Detalle, ConteoRegla>,
      aumento_tras_perdida: { ...aumento, suficiente: aumento.oportunidades >= MIN_GRUPO },
    },
    semanas: {
      total: universo.size,
      operadas,
      sin_operar_registradas: sinOperarReg,
      solo_check_in: soloCheckIn,
      solo_check_in_recientes: recientes,
      decision_por_estado: {
        bien: { ...decision.bien, suficiente: sumaDecision(decision.bien) >= MIN_GRUPO },
        medio: { ...decision.medio, suficiente: sumaDecision(decision.medio) >= MIN_GRUPO },
        mal: { ...decision.mal, suficiente: sumaDecision(decision.mal) >= MIN_GRUPO },
      },
      sin_operar_por_detalle: sinPorDetalle,
      linea: lineaDesc.slice().reverse().slice(-16),
    },
  };
}

function sumaDecision(d: { operadas: number; sin_operar: number; sin_decision: number }): number {
  return d.operadas + d.sin_operar + d.sin_decision;
}

// ---------- Versión compacta para la IA ----------

const fraccion = (veces: number, de: number) => `${veces} de ${de}`;

/**
 * Solo incluye lo que tiene muestra suficiente. Sin ceros ni grupos vacíos:
 * menos tokens y nada que la IA pueda sobreinterpretar.
 * Si no hay nada con muestra suficiente devuelve { patrones_suficientes: false }.
 */
export function resumenParaIA(p: Patrones): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const soloSuficientes = (g: Record<string, Grupo>) => {
    const r: Record<string, { n: number; promedio: number; perdidas: number }> = {};
    Object.entries(g).forEach(([k, v]) => {
      if (v.suficiente) r[k] = { n: v.n, promedio: v.promedio, perdidas: v.perdidas };
    });
    return Object.keys(r).length > 0 ? r : undefined;
  };

  const porEstado = soloSuficientes(p.emocion_vs_resultado.por_estado);
  if (porEstado) out.resultado_por_estado = porEstado;
  const porDetalle = soloSuficientes(p.emocion_vs_resultado.por_detalle);
  if (porDetalle) out.resultado_por_detalle = porDetalle;

  const cal: Record<string, unknown> = {};
  const siguio = soloSuficientes({ siguio: p.calibrador.resultado_siguio });
  const aparto = soloSuficientes({ se_aparto: p.calibrador.resultado_se_aparto });
  if (siguio) Object.assign(cal, siguio);
  if (aparto) Object.assign(cal, aparto);
  const csc = p.calibrador.cantidad_sobre_calibrador;
  if (csc.suficiente) cal.cantidad_sobre_calibrador = fraccion(csc.veces, csc.calculables);
  if (Object.keys(cal).length > 0) out.calibrador = cal;

  const reglas: Record<string, unknown> = {};
  const rt = p.reglas_por_emocion.total;
  if (rt.suficiente) reglas.total = fraccion(rt.superaron, rt.calculables);
  const porEst: Record<string, string> = {};
  (Object.entries(p.reglas_por_emocion.por_estado) as [string, ConteoRegla][]).forEach(([k, v]) => {
    if (v.suficiente) porEst[k] = fraccion(v.superaron, v.calculables);
  });
  if (Object.keys(porEst).length > 0) reglas.por_estado = porEst;
  const porDet: Record<string, string> = {};
  (Object.entries(p.reglas_por_emocion.por_detalle) as [string, ConteoRegla][]).forEach(([k, v]) => {
    if (v.suficiente) porDet[k] = fraccion(v.superaron, v.calculables);
  });
  if (Object.keys(porDet).length > 0) reglas.por_detalle = porDet;
  const at = p.reglas_por_emocion.aumento_tras_perdida;
  if (at.suficiente) reglas.aumento_tamano_tras_perdida = fraccion(at.veces, at.oportunidades);
  if (Object.keys(reglas).length > 0) out.reglas_rotas = reglas;

  const sem: Record<string, unknown> = {};
  if (p.semanas.total >= MIN_GRUPO) {
    sem.total = p.semanas.total;
    sem.operadas = p.semanas.operadas;
    sem.sin_operar = p.semanas.sin_operar_registradas;
    if (p.semanas.solo_check_in > 0) sem.sin_decision_registrada = p.semanas.solo_check_in;
    const dec: Record<string, { operadas: number; sin_operar: number; sin_decision: number }> = {};
    (Object.entries(p.semanas.decision_por_estado) as [string, Decision][]).forEach(([k, v]) => {
      if (v.suficiente) dec[k] = { operadas: v.operadas, sin_operar: v.sin_operar, sin_decision: v.sin_decision };
    });
    if (Object.keys(dec).length > 0) sem.decision_por_estado = dec;
    out.semanas = sem;
  }

  return Object.keys(out).length > 0 ? out : { patrones_suficientes: false };
}