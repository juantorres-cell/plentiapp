// app/api/atr/route.ts   (el archivo DEBE llamarse exactamente route.ts)
// GET /api/atr?symbol=NVDA
// Header: Authorization: Bearer <access_token de Supabase>
// Devuelve ATR (calibrador) + contexto técnico descriptivo + fundamentales básicos.
// NO recomienda comprar/vender. Nunca bloquea: si algo falla -> estado "sin_datos" o campo null.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import YahooFinance from "yahoo-finance2";
import { atr, atrSemanalAprox, stopPorAtr } from "@/lib/riesgo/calibrador";
import { limpiarVelas, diasEntre, fechaHoraNY } from "@/lib/riesgo/velas";
import { contextoTecnico } from "@/lib/riesgo/contexto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yahooFinance = new YahooFinance();

const PERIODO_ATR = 14;
const K_DEFECTO = 4.5; // decidido 2026-10-11: ≈ 2 × rango semanal (ATR diario × √5). No ajustar viendo resultados.
const MAX_ANTIGUEDAD_DIAS = 6;
const DIAS_HISTORIAL = 420; // ~290 sesiones: alcanza para SMA200 + pendiente y rango de 52 semanas

function sinDatos(motivo: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ estado: "sin_datos", motivo, ...extra }, { status: 200 });
}

// Fundamentales: si Yahoo falla aquí, el resto de la respuesta sigue válida (devuelve null).
async function fundamentales(symbol: string, hoyNY: string) {
  try {
    const q = await yahooFinance.quote(symbol);
    const ts = q.earningsTimestamp ? new Date(q.earningsTimestamp) : null;
    const fechaRes = ts && !isNaN(ts.getTime()) ? fechaHoraNY(ts).fecha : null;
    const dias = fechaRes ? diasEntre(hoyNY, fechaRes) : null;
    return {
      nombre: q.shortName ?? q.longName ?? null,
      market_cap: q.marketCap ?? null,
      pe_ttm: q.trailingPE ?? null,
      eps_ttm: q.epsTrailingTwelveMonths ?? null,
      // solo se informa si la fecha está en el futuro
      proximos_resultados: dias != null && dias >= 0 ? fechaRes : null,
      dias_a_resultados: dias != null && dias >= 0 ? dias : null,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "no_autorizado" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: u, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !u?.user) return NextResponse.json({ error: "no_autorizado" }, { status: 401 });

  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,10}$/.test(symbol)) {
    return NextResponse.json({ error: "simbolo_invalido" }, { status: 400 });
  }
  const kParam = parseFloat(req.nextUrl.searchParams.get("k") ?? "");
  const k = isFinite(kParam) && kParam > 0 && kParam <= 10 ? kParam : K_DEFECTO;

  try {
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - DIAS_HISTORIAL * 24 * 60 * 60 * 1000);

    // Datos de precio y fundamentales en paralelo
    const hoyNY = fechaHoraNY(hasta).fecha;
    const [res, fund] = await Promise.all([
      yahooFinance.chart(symbol, { period1: desde, period2: hasta, interval: "1d" }),
      fundamentales(symbol, hoyNY),
    ]);

    const { velas, asOf, descartoParcial } = limpiarVelas(res.quotes ?? [], hasta);
    if (!asOf || velas.length < PERIODO_ATR + 1) {
      return sinDatos("historial_insuficiente", { symbol, velas: velas.length });
    }

    const atrDiario = atr(velas, PERIODO_ATR);
    if (atrDiario == null) return sinDatos("atr_no_calculable", { symbol });

    const ultimoCierre = velas[velas.length - 1].close;
    const antiguedad = diasEntre(asOf, hoyNY);

    return NextResponse.json({
      estado: antiguedad > MAX_ANTIGUEDAD_DIAS ? "desactualizado" : "ok",
      symbol,
      as_of: asOf,
      descarto_vela_parcial: descartoParcial,
      ultimo_cierre: ultimoCierre,
      periodo_atr: PERIODO_ATR,
      atr_diario: atrDiario,
      atr_pct: (atrDiario / ultimoCierre) * 100,
      atr_semanal_aprox: atrSemanalAprox(atrDiario),
      k,
      stop_sugerido: stopPorAtr(ultimoCierre, atrDiario, k),
      contexto: contextoTecnico(velas),
      fundamentales: fund,
      fuente: "yahoo-finance2 (no oficial)",
    });
  } catch (e) {
    return sinDatos("fallo_fuente_datos", { symbol, detalle: e instanceof Error ? e.message : "desconocido" });
  }
}