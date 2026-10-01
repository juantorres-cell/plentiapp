import type { SupabaseClient } from "@supabase/supabase-js";

type Estado = "bien" | "medio" | "mal";

type FilaOperacion = {
  semana: string;
  activo: string | null;
  cantidad: number | null;
  capital_disponible: number | null;
  stop_loss: number | null;
  precio_referencia: number | null;
  resultado: number | null;
};

type FilaCheckIn = { semana: string; estado_animo: Estado };

export type ResumenEstado = {
  operaciones: number;
  resultado_promedio: number;
  perdidas: number;
};

export type HistorialContexto = {
  historial_suficiente: boolean;
  total_operaciones: number;
  resultado_acumulado?: number;
  ganadoras?: number;
  perdedoras?: number;
  veces_supero_regla_riesgo?: number;
  racha_perdidas_actual?: number;
  veces_aumento_tamano_tras_perdida?: number;
  por_estado_de_animo?: Partial<Record<Estado, ResumenEstado>>;
  ultimas_operaciones?: {
    semana: string;
    activo: string | null;
    resultado: number | null;
    estado_animo: Estado | "sin registrar";
  }[];
};

const MINIMO_OPERACIONES = 3;
const redondear = (n: number) => Math.round(n * 100) / 100;

// Tamaño de la posición en dinero (solo si hay precio de referencia).
function monto(op: FilaOperacion): number | null {
  if (op.precio_referencia && op.cantidad) return op.precio_referencia * op.cantidad;
  return null;
}

// Cálculo 100% aritmético, sin IA. Nunca lanza error: si algo falla, devuelve "insuficiente".
export async function buildContext(
  supabase: SupabaseClient,
  uid: string
): Promise<HistorialContexto> {
  const vacio: HistorialContexto = { historial_suficiente: false, total_operaciones: 0 };

  try {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("riesgo_maximo_pct, base_calculo_riesgo")
      .eq("id", uid)
      .single();

    const { data: opsDesc } = await supabase
      .from("operaciones")
      .select("semana, activo, cantidad, capital_disponible, stop_loss, precio_referencia, resultado")
      .eq("user_id", uid)
      .order("semana", { ascending: false })
      .limit(50);

    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("semana, estado_animo")
      .eq("user_id", uid)
      .eq("tipo", "entrada");

    const ops = ((opsDesc ?? []) as FilaOperacion[]).slice().reverse(); // de más antigua a más reciente
    if (ops.length < MINIMO_OPERACIONES) {
      return { ...vacio, total_operaciones: ops.length };
    }

    const estadoPorSemana = new Map<string, Estado>();
    ((checkIns ?? []) as FilaCheckIn[]).forEach((c) => estadoPorSemana.set(c.semana, c.estado_animo));

    const riesgoMax = Number(perfil?.riesgo_maximo_pct ?? 1);
    const baseInvertido = perfil?.base_calculo_riesgo === "capital_invertido";

    let acumulado = 0;
    let ganadoras = 0;
    let perdedoras = 0;
    let superoRegla = 0;
    let aumentosTrasPerdida = 0;
    const porEstado: Record<string, { n: number; suma: number; perdidas: number }> = {};

    ops.forEach((op, i) => {
      const res = op.resultado;
      if (res != null) {
        acumulado += res;
        if (res > 0) ganadoras++;
        if (res < 0) perdedoras++;
      }

      // ¿Superó la regla de riesgo? Solo si hay datos suficientes para calcularlo.
      if (op.precio_referencia && op.stop_loss && op.cantidad) {
        const riesgo = Math.abs(op.precio_referencia - op.stop_loss) * op.cantidad;
        const base = baseInvertido ? monto(op) : op.capital_disponible;
        if (base && (riesgo / base) * 100 > riesgoMax) superoRegla++;
      }

      // ¿Aumentó el tamaño justo después de una pérdida?
      const previa = ops[i - 1];
      if (previa && previa.resultado != null && previa.resultado < 0) {
        const actual = monto(op);
        const anterior = monto(previa);
        if (actual != null && anterior != null && actual > anterior) aumentosTrasPerdida++;
      }

      // Rendimiento según el estado de ánimo de esa semana.
      const estado = estadoPorSemana.get(op.semana);
      if (estado && res != null) {
        const e = (porEstado[estado] ??= { n: 0, suma: 0, perdidas: 0 });
        e.n++;
        e.suma += res;
        if (res < 0) e.perdidas++;
      }
    });

    // Racha de pérdidas actual (contando desde la operación más reciente).
    let racha = 0;
    for (let i = ops.length - 1; i >= 0; i--) {
      const r = ops[i].resultado;
      if (r != null && r < 0) racha++;
      else break;
    }

    const por_estado_de_animo: Partial<Record<Estado, ResumenEstado>> = {};
    (Object.keys(porEstado) as Estado[]).forEach((k) => {
      const e = porEstado[k];
      por_estado_de_animo[k] = {
        operaciones: e.n,
        resultado_promedio: redondear(e.suma / e.n),
        perdidas: e.perdidas,
      };
    });

    return {
      historial_suficiente: true,
      total_operaciones: ops.length,
      resultado_acumulado: redondear(acumulado),
      ganadoras,
      perdedoras,
      veces_supero_regla_riesgo: superoRegla,
      racha_perdidas_actual: racha,
      veces_aumento_tamano_tras_perdida: aumentosTrasPerdida,
      por_estado_de_animo,
      ultimas_operaciones: ops.slice(-3).map((op) => ({
        semana: op.semana,
        activo: op.activo,
        resultado: op.resultado,
        estado_animo: estadoPorSemana.get(op.semana) ?? "sin registrar",
      })),
    };
  } catch (error) {
    console.error("Error en buildContext:", error);
    return vacio;
  }
}