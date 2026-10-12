// app/api/atr/route.ts   (el archivo DEBE llamarse exactamente route.ts)
// GET /api/atr?symbol=NVDA&k=2
// Header: Authorization: Bearer <access_token de Supabase>
// Devuelve datos de mercado + ATR. NO recomienda comprar/vender. Nunca bloquea: si falla -> estado "sin_datos".
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import YahooFinance from "yahoo-finance2";
import { atr, atrSemanalAprox, stopPorAtr } from "@/lib/riesgo/calibrador";
import { limpiarVelas, diasEntre, fechaHoraNY } from "@/lib/riesgo/velas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yahooFinance = new YahooFinance();

const PERIODO_ATR = 14;
const K_DEFECTO = 4.5; // fijado de antemano: no ajustar viendo resultados
const MAX_ANTIGUEDAD_DIAS = 6; // más viejo que esto -> "desactualizado"

function sinDatos(motivo: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ estado: "sin_datos", motivo, ...extra }, { status: 200 });
}

export async function GET(req: NextRequest) {
  // 1) Auth: solo usuarios con sesión
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "no_autorizado" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: u, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !u?.user) return NextResponse.json({ error: "no_autorizado" }, { status: 401 });

  // 2) Parámetros
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,10}$/.test(symbol)) {
    return NextResponse.json({ error: "simbolo_invalido" }, { status: 400 });
  }
  const kParam = parseFloat(req.nextUrl.searchParams.get("k") ?? "");
  const k = isFinite(kParam) && kParam > 0 && kParam <= 10 ? kParam : K_DEFECTO;

  // 3) Datos (Yahoo es no oficial: puede fallar -> sin_datos, las reglas duras siguen valiendo)
  try {
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - 100 * 24 * 60 * 60 * 1000);
    const res = await yahooFinance.chart(symbol, { period1: desde, period2: hasta, interval: "1d" });

    const { velas, asOf, descartoParcial } = limpiarVelas(res.quotes ?? [], hasta);
    if (!asOf || velas.length < PERIODO_ATR + 1) {
      return sinDatos("historial_insuficiente", { symbol, velas: velas.length });
    }

    const atrDiario = atr(velas, PERIODO_ATR);
    if (atrDiario == null) return sinDatos("atr_no_calculable", { symbol });

    const ultimoCierre = velas[velas.length - 1].close;
    const antiguedad = diasEntre(asOf, fechaHoraNY(hasta).fecha);

    return NextResponse.json({
      estado: antiguedad > MAX_ANTIGUEDAD_DIAS ? "desactualizado" : "ok",
      symbol,
      as_of: asOf, // fecha de la última vela COMPLETA usada
      descarto_vela_parcial: descartoParcial,
      ultimo_cierre: ultimoCierre, // referencia: una orden MARKET se llena a un precio que aún no conoces
      periodo_atr: PERIODO_ATR,
      atr_diario: atrDiario,
      atr_semanal_aprox: atrSemanalAprox(atrDiario),
      k,
      stop_sugerido: stopPorAtr(ultimoCierre, atrDiario, k),
      fuente: "yahoo-finance2 (no oficial)",
    });
  } catch (e) {
    return sinDatos("fallo_fuente_datos", { symbol, detalle: e instanceof Error ? e.message : "desconocido" });
  }
}