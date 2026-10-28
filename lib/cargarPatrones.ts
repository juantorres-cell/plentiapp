// lib/cargarPatrones.ts
// Lee del historial del usuario en Supabase y calcula sus patrones (lib/patrones.ts).
// Funciona igual en el servidor (cliente con el token del usuario) y en el navegador:
// en ambos casos RLS limita las filas al usuario. Nunca lanza error: si algo falla, devuelve null.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcularPatrones,
  type CheckInPatron,
  type OperacionPatron,
  type Patrones,
  type ReglasPatron,
  type SinOperarPatron,
} from "./patrones";

export async function cargarPatrones(
  supabase: SupabaseClient,
  uid: string,
  semanaActual?: string
): Promise<Patrones | null> {
  try {
    const [perfil, ops, sin, cis] = await Promise.all([
      supabase.from("profiles").select("riesgo_maximo_pct, base_calculo_riesgo").eq("id", uid).single(),
      supabase
        .from("operaciones")
        .select(
          "semana, fecha, cerrada_en, estado, activo, cantidad, capital_disponible, stop_loss, precio_referencia, resultado, emocion_entrada, emocion_detalle, lectura_sistema"
        )
        .eq("user_id", uid)
        .order("semana", { ascending: false })
        .limit(200),
      supabase
        .from("semanas_sin_operar")
        .select("semana, emocion, emocion_detalle")
        .eq("user_id", uid)
        .limit(200),
      supabase.from("check_ins").select("semana, tipo, estado_animo").eq("user_id", uid).limit(400),
    ]);

    // Con datos incompletos los patrones saldrían falsos: mejor no devolver nada.
    if (ops.error || sin.error || cis.error) {
      console.error("cargarPatrones:", ops.error?.message ?? sin.error?.message ?? cis.error?.message);
      return null;
    }

    const reglas: ReglasPatron = {
      riesgo_maximo_pct: Number(perfil.data?.riesgo_maximo_pct ?? 1),
      base_calculo_riesgo: perfil.data?.base_calculo_riesgo === "capital_invertido" ? "capital_invertido" : "capital_total",
    };

    return calcularPatrones({
      operaciones: (ops.data ?? []) as OperacionPatron[],
      sin_operar: (sin.data ?? []) as SinOperarPatron[],
      check_ins: (cis.data ?? []) as CheckInPatron[],
      reglas,
      semana_actual: semanaActual,
    });
  } catch (error) {
    console.error("Error en cargarPatrones:", error);
    return null;
  }
}