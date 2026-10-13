"use client";

// components/CalibradorAtr.tsx
// Calibrador de riesgo + contexto técnico descriptivo.
// Calcula tamaño y stop y describe el gráfico. NO recomienda comprar ni vender.
// Una consulta por clic (no por tecla) para cuidar la fuente de datos.

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { calcularPosicion } from "@/lib/riesgo/calibrador";
import type { ContextoTecnico } from "@/lib/riesgo/contexto";

type Fundamentales = {
  nombre: string | null;
  market_cap: number | null;
  pe_ttm: number | null;
  eps_ttm: number | null;
  proximos_resultados: string | null;
  dias_a_resultados: number | null;
};

type Lectura = {
  estado: "ok" | "desactualizado" | "sin_datos";
  motivo?: string;
  detalle?: string;
  symbol?: string;
  as_of?: string;
  ultimo_cierre?: number;
  atr_diario?: number;
  atr_pct?: number;
  atr_semanal_aprox?: number;
  k?: number;
  stop_sugerido?: number;
  contexto?: ContextoTecnico;
  fundamentales?: Fundamentales | null;
};

type Props = {
  activo: string;
  capital: number | null;
  regla1Activa: boolean;
  riesgoPct: number;
  baseRiesgo: "capital_total" | "capital_invertido";
  topeActivo: boolean;
  topePct: number;
  onUsar: (v: { stop: string; cantidad: string; precioRef: string }) => void;
};

const MARKET_CAP_MINIMO = 10_000_000_000; // tu criterio: > $10 mil millones

function fmtPct(x: number, conSigno = false): string {
  const s = Math.abs(x).toFixed(1) + "%";
  return conSigno ? (x >= 0 ? "+" : "−") + s : s;
}

function fmtMoneda(x: number): string {
  if (x >= 1e12) return `$${(x / 1e12).toFixed(2)} billones`;
  if (x >= 1e9) return `$${(x / 1e9).toFixed(1)} mil millones`;
  return `$${(x / 1e6).toFixed(0)} millones`;
}

export default function CalibradorAtr(p: Props) {
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  async function consultar() {
    if (!p.activo) return;
    setCargando(true);
    setFallo(null);
    setLectura(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`/api/atr?symbol=${encodeURIComponent(p.activo)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) throw new Error("Sesión no válida. Vuelve a iniciar sesión.");
      if (res.status === 400) throw new Error("Símbolo no válido.");
      setLectura((await res.json()) as Lectura);
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo consultar.");
    } finally {
      setCargando(false);
    }
  }

  const datosOk =
    lectura &&
    (lectura.estado === "ok" || lectura.estado === "desactualizado") &&
    lectura.ultimo_cierre != null &&
    lectura.stop_sugerido != null &&
    lectura.atr_diario != null;

  const reglaLimitaCantidad = p.regla1Activa && p.baseRiesgo === "capital_total";

  const pos =
    datosOk && p.capital
      ? calcularPosicion({
          capital: p.capital,
          entrada: lectura!.ultimo_cierre!,
          stop: lectura!.stop_sugerido!,
          riesgoPct: reglaLimitaCantidad ? p.riesgoPct : 100,
          topePct: p.topeActivo ? p.topePct : 100,
        })
      : null;

  const ctx = datosOk ? lectura!.contexto : undefined;
  const fund = datosOk ? lectura!.fundamentales : undefined;

  return (
    <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
      <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">Calibrador y contexto del activo</h2>
      <p className="text-[13px] text-[#7C8A82] mb-4">
        Calcula un stop según cuánto se mueve la acción, cuántas acciones caben en tus reglas y describe cómo
        se ve el gráfico. No es una recomendación de compra: solo dimensiona y describe.
      </p>

      <button
        type="button"
        onClick={consultar}
        disabled={cargando || !p.activo || !p.capital}
        className="px-5 py-2.5 border border-[#34D399] text-[#34D399] rounded text-sm font-medium disabled:opacity-40"
      >
        {cargando ? "Consultando..." : `Calcular para ${p.activo || "…"}`}
      </button>
      {(!p.activo || !p.capital) && (
        <p className="text-[12px] text-[#7C8A82] mt-2">Escribe el activo y el capital disponible primero.</p>
      )}

      {fallo && <p className="text-[12.5px] text-[#F0A099] mt-3">{fallo}</p>}

      {lectura?.estado === "sin_datos" && (
        <p className="text-[12.5px] text-[#E0C088] mt-3">
          Sin datos para {lectura.symbol ?? p.activo} ({lectura.motivo}). Puedes seguir con tus reglas
          manuales; nada se bloquea.
        </p>
      )}

      {lectura?.estado === "desactualizado" && (
        <p className="text-[12.5px] text-[#E0C088] mt-3">
          Los datos son de hace más de 6 días ({lectura.as_of}). No los uses para calibrar.
        </p>
      )}

      {datosOk && (
        <div className="mt-4 flex flex-col gap-4">
          {/* --- Calibrador --- */}
          <div>
            <Titulo>Riesgo y tamaño</Titulo>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
              <Fila k="Último cierre" v={`$${lectura!.ultimo_cierre!.toFixed(2)} (${lectura!.as_of})`} />
              <Fila
                k="ATR diario (14)"
                v={`$${lectura!.atr_diario!.toFixed(2)}${lectura!.atr_pct != null ? ` · ${lectura!.atr_pct.toFixed(1)}% del precio` : ""}`}
              />
              <Fila k="Rango semanal aprox." v={`$${lectura!.atr_semanal_aprox!.toFixed(2)}`} />
              <Fila k={`Stop (${lectura!.k}×ATR diario)`} v={`$${lectura!.stop_sugerido!.toFixed(2)}`} />
            </div>
          </div>

          {pos && pos.ok && (
            <div className="text-[12.5px] leading-relaxed px-3.5 py-3 rounded border bg-[#0E1412] border-[#24302A] text-[#B7C0BA]">
              <p className="m-0 mb-1.5">
                Stop a <strong>{pos.distanciaPct.toFixed(2)}%</strong> de la entrada. Cantidad máxima:{" "}
                <strong>{pos.cantidad}</strong> {pos.cantidad === 1 ? "acción" : "acciones"} (≈ $
                {pos.montoInvertido.toFixed(2)}).
              </p>
              <p className="m-0 mb-1.5">
                {reglaLimitaCantidad && <>Tu regla del {p.riesgoPct}% permitiría hasta {pos.cantidadPorRiesgo}. </>}
                {p.topeActivo && <>Tu tope de {p.topePct}% por posición permite {pos.cantidadPorTope}. </>}
                {(reglaLimitaCantidad || p.topeActivo) && (
                  <>
                    Limita: <strong>{pos.limiteActivo === "riesgo" ? "la regla de riesgo" : "el tope por posición"}</strong>.
                  </>
                )}
              </p>
              <p className="m-0">
                Pérdida máxima si el stop se ejecuta en su precio: ${pos.perdidaMaximaUsd.toFixed(2)} (
                {pos.perdidaMaximaPct.toFixed(2)}% del capital).
              </p>
            </div>
          )}

          {pos && !pos.ok && <p className="text-[12.5px] text-[#E0C088] m-0">{pos.detalle}</p>}

          {!reglaLimitaCantidad && p.regla1Activa && (
            <p className="text-[12px] text-[#7C8A82] m-0">
              Tu base de riesgo es “capital invertido”: ahí el % no depende de la cantidad, así que la regla no
              limita cuántas acciones. Solo se aplica el tope por posición.
            </p>
          )}

          {pos && pos.ok && lectura!.estado === "ok" && (
            <button
              type="button"
              onClick={() =>
                p.onUsar({
                  stop: lectura!.stop_sugerido!.toFixed(2),
                  cantidad: String(pos.cantidad),
                  precioRef: lectura!.ultimo_cierre!.toFixed(2),
                })
              }
              className="self-start text-[12.5px] text-[#34D399] hover:underline"
            >
              Rellenar cantidad, stop y precio de referencia con estos valores
            </button>
          )}

          {/* --- Contexto técnico (descriptivo) --- */}
          {ctx && ctx.estado !== "sin_datos" && (
            <div>
              <Titulo>Cómo se ve el gráfico (descriptivo)</Titulo>
              <div className="flex flex-col gap-1.5 text-[13px] text-[#B7C0BA]">
                {ctx.sma50 && (
                  <p className="m-0">
                    Media de 50 días (${ctx.sma50.valor.toFixed(2)}):{" "}
                    {ctx.sma50.posicion === "en_linea"
                      ? "el precio está en línea con ella."
                      : `el precio está ${fmtPct(ctx.sma50.dist_pct)} ${ctx.sma50.posicion === "encima" ? "por encima" : "por debajo"}.`}
                  </p>
                )}
                {ctx.sma200 ? (
                  <p className="m-0">
                    Media de 200 días (${ctx.sma200.valor.toFixed(2)}):{" "}
                    {ctx.sma200.posicion === "en_linea"
                      ? "el precio está en línea con ella"
                      : `el precio está ${fmtPct(ctx.sma200.dist_pct)} ${ctx.sma200.posicion === "encima" ? "por encima" : "por debajo"}`}
                    {ctx.sma200.pendiente ? `; la media va ${ctx.sma200.pendiente === "plana" ? "plana" : ctx.sma200.pendiente}.` : "."}
                  </p>
                ) : (
                  <p className="m-0 text-[#7C8A82]">Media de 200 días: sin historial suficiente.</p>
                )}
                {ctx.retorno_12s_pct != null && (
                  <p className="m-0">Retorno de las últimas ~12 semanas: {fmtPct(ctx.retorno_12s_pct, true)}.</p>
                )}
                {ctx.rango_52s ? (
                  <p className="m-0">
                    Rango de 52 semanas: ${ctx.rango_52s.minimo.toFixed(2)} – ${ctx.rango_52s.maximo.toFixed(2)}. El
                    precio está {fmtPct(ctx.rango_52s.dist_maximo_pct)} por debajo del máximo y en el{" "}
                    {ctx.rango_52s.posicion_rango_pct.toFixed(0)}% del rango.
                  </p>
                ) : (
                  <p className="m-0 text-[#7C8A82]">Rango de 52 semanas: sin historial suficiente.</p>
                )}
                {ctx.volumen && (
                  <p className="m-0">
                    Volumen del último día: {ctx.volumen.ratio.toFixed(1)}× su promedio de 20 días (
                    {ctx.volumen.etiqueta}), en un día de{" "}
                    {ctx.volumen.dia === "sube" ? "subida" : ctx.volumen.dia === "baja" ? "caída" : "cierre sin cambio"}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* --- Fundamentales y checklist propio --- */}
          {fund && (
            <div>
              <Titulo>Empresa{fund.nombre ? `: ${fund.nombre}` : ""}</Titulo>
              <div className="flex flex-col gap-1.5 text-[13px] text-[#B7C0BA]">
                {fund.market_cap != null && (
                  <p className="m-0">
                    Capitalización: {fmtMoneda(fund.market_cap)} —{" "}
                    {fund.market_cap >= MARKET_CAP_MINIMO ? "cumple" : "no cumple"} tu criterio de más de $10 mil
                    millones.
                  </p>
                )}
                {fund.pe_ttm != null && (
                  <p className="m-0">
                    P/E: {fund.pe_ttm.toFixed(1)} (precio entre ganancias de los últimos 12 meses). Compáralo con
                    empresas del mismo sector, no con todo el mercado.
                  </p>
                )}
                {fund.proximos_resultados && fund.dias_a_resultados != null && (
                  <p className="m-0 text-[#E0C088]">
                    Próximos resultados: {fund.proximos_resultados} (en {fund.dias_a_resultados}{" "}
                    {fund.dias_a_resultados === 1 ? "día" : "días"}). Un stop no protege contra saltos de precio
                    después de resultados.
                  </p>
                )}
              </div>
            </div>
          )}
          {fund === null && (
            <p className="text-[12px] text-[#7C8A82] m-0">Datos de la empresa no disponibles ahora.</p>
          )}

          <p className="text-[11.5px] text-[#7C8A82] m-0">
            Todo esto describe el pasado; no predice nada. El precio real de una orden MARKET se llena a un valor
            que aún no conoces, y un stop no protege contra saltos (gaps). Fuente: Yahoo Finance (no oficial).
          </p>
        </div>
      )}
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-2 mt-0">{children}</p>;
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span className="text-[#7C8A82]">{k}</span>
      <span className="text-[#E7ECE8] text-right">{v}</span>
    </>
  );
}