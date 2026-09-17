"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSemanaActual } from "@/lib/semana";
import AppShell from "@/components/AppShell";

type Estado = "bien" | "medio" | "mal";

type Reglas = {
  regla_1_activa: boolean;
  riesgo_maximo_pct: number;
  limite_portafolio_activa: boolean;
  limite_portafolio_pct: number;
  una_operacion_semana_activa: boolean;
};

export default function OperarPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [reglas, setReglas] = useState<Reglas | null>(null);
  const [yaOperoEstaSemana, setYaOperoEstaSemana] = useState(false);
  const [precioReferencia, setPrecioReferencia] = useState("");

  const [capitalDisponible, setCapitalDisponible] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [activo, setActivo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipoOrden, setTipoOrden] = useState<"MARKET" | "LIMIT">("MARKET");
  const [precioLimite, setPrecioLimite] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [explicacionJson, setExplicacionJson] = useState("");

  const [precioEjecucion, setPrecioEjecucion] = useState("");
  const [resultado, setResultado] = useState("");
  const [capitalFinal, setCapitalFinal] = useState("");
  const [leccionAprendida, setLeccionAprendida] = useState("");
  const [estadoSalida, setEstadoSalida] = useState<Estado | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const semana = getSemanaActual();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }
      setUserId(data.session.user.id);

      const { data: perfil } = await supabase
        .from("profiles")
        .select(
          "capital_disponible, regla_1_activa, riesgo_maximo_pct, limite_portafolio_activa, limite_portafolio_pct, una_operacion_semana_activa"
        )
        .eq("id", data.session.user.id)
        .single();

      if (perfil?.capital_disponible != null) {
        setCapitalDisponible(String(perfil.capital_disponible));
      }
      if (perfil) {
        setReglas({
          regla_1_activa: perfil.regla_1_activa,
          riesgo_maximo_pct: perfil.riesgo_maximo_pct,
          limite_portafolio_activa: perfil.limite_portafolio_activa,
          limite_portafolio_pct: perfil.limite_portafolio_pct,
          una_operacion_semana_activa: perfil.una_operacion_semana_activa,
        });
      }

      const { data: operacionExistente } = await supabase
        .from("operaciones")
        .select("id")
        .eq("user_id", data.session.user.id)
        .eq("semana", semana)
        .maybeSingle();

      setYaOperoEstaSemana(!!operacionExistente);
    });
  }, [router]);

  const jsonGenerado = useMemo(() => {
    const orden: Record<string, unknown> = {
      action: "BUY",
      symbol: activo || "SYMBOL",
      quantity: Number(cantidad) || 0,
      type: tipoOrden,
    };
    if (tipoOrden === "LIMIT") orden.limit_price = Number(precioLimite) || 0;
    if (stopLoss) orden.stop_loss = Number(stopLoss);
    return { version: 1, orders: [orden] };
  }, [activo, cantidad, tipoOrden, precioLimite, stopLoss]);

  // --- Cálculo del riesgo en vivo, según las reglas que el usuario tenga activas ---
  const precioRef = Number(precioReferencia) || (tipoOrden === "LIMIT" ? Number(precioLimite) : 0);
  const montoRiesgo =
    precioRef && stopLoss ? Math.abs(precioRef - Number(stopLoss)) * (Number(cantidad) || 0) : null;
  const pctRiesgo =
    montoRiesgo != null && Number(capitalDisponible) > 0 ? (montoRiesgo / Number(capitalDisponible)) * 100 : null;

  const montoPosicion = precioRef ? precioRef * (Number(cantidad) || 0) : null;
  const pctPortafolio =
    montoPosicion != null && Number(capitalDisponible) > 0 ? (montoPosicion / Number(capitalDisponible)) * 100 : null;

  async function handleSubmit() {
    if (!userId) return;
    setError(null);
    setGuardando(true);

    const { error: errorOperacion } = await supabase.from("operaciones").insert({
      user_id: userId,
      semana,
      capital_disponible: Number(capitalDisponible) || null,
      justificacion_estrategica: justificacion || null,
      activo: activo || null,
      cantidad: Number(cantidad) || null,
      tipo_orden: tipoOrden,
      precio_limite: tipoOrden === "LIMIT" ? Number(precioLimite) || null : null,
      stop_loss: Number(stopLoss) || null,
      precio_referencia: precioRef || null,
      json_enviado: jsonGenerado,
      explicacion_json: explicacionJson || null,
      precio_ejecucion: Number(precioEjecucion) || null,
      resultado: Number(resultado) || null,
      capital_final: Number(capitalFinal) || null,
      leccion_aprendida: leccionAprendida || null,
    });

    if (errorOperacion) {
      setGuardando(false);
      setError(errorOperacion.message);
      return;
    }

    if (estadoSalida) {
      await supabase.from("check_ins").upsert(
        { user_id: userId, semana, tipo: "salida", estado_animo: estadoSalida },
        { onConflict: "user_id,semana,tipo" }
      );
    }

    setGuardando(false);
    setExito(true);
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E] p-10">
        <div className="max-w-[380px] text-center">
          <h2 className="font-serif text-2xl text-[#E7ECE8] mb-3">Operación registrada</h2>
          <p className="text-sm text-[#7C8A82] mb-6">Quedó guardada en tu diario de trading de la semana del {semana}.</p>
          <button onClick={() => router.push("/dashboard")} className="py-3 px-6 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium">
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[720px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-1">Semana del {semana}</p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] mb-8">Registro de operación</h1>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-5">Datos de la operación</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Campo label="Capital disponible ($)">
              <input value={capitalDisponible} onChange={(e) => setCapitalDisponible(e.target.value)} className="input" />
            </Campo>
            <Campo label="Activo / acción">
              <input value={activo} onChange={(e) => setActivo(e.target.value.toUpperCase())} placeholder="NVDA" className="input" />
            </Campo>
          </div>

          <Campo label="Justificación estratégica">
            <textarea value={justificacion} onChange={(e) => setJustificacion(e.target.value)} rows={2} className="input" />
          </Campo>

          <div className="grid grid-cols-3 gap-4 my-4">
            <Campo label="Cantidad">
              <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="input" />
            </Campo>
            <Campo label="Tipo de orden">
              <select value={tipoOrden} onChange={(e) => setTipoOrden(e.target.value as "MARKET" | "LIMIT")} className="input">
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
              </select>
            </Campo>
            <Campo label="Stop loss ($)">
              <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="input" />
            </Campo>
          </div>

          {tipoOrden === "LIMIT" && (
            <Campo label="Precio límite ($)">
              <input type="number" value={precioLimite} onChange={(e) => setPrecioLimite(e.target.value)} className="input" />
            </Campo>
          )}

          {tipoOrden === "MARKET" && (reglas?.regla_1_activa || reglas?.limite_portafolio_activa) && (
            <Campo label="Precio de referencia estimado ($)">
              <input
                type="number"
                value={precioReferencia}
                onChange={(e) => setPrecioReferencia(e.target.value)}
                placeholder="Ej: 213.90 — solo para calcular tu riesgo, no se envía en la orden"
                className="input"
              />
            </Campo>
          )}

          <Campo label="Explicación del JSON">
            <textarea value={explicacionJson} onChange={(e) => setExplicacionJson(e.target.value)} rows={2} className="input" />
          </Campo>

          <p className="text-[13px] font-medium text-[#B7C0BA] mb-1.5 mt-4">Bloque JSON generado</p>
          <pre className="bg-[#0B0F0E] text-[#34D399] text-[12px] p-4 rounded overflow-x-auto border border-[#24302A]">
            {JSON.stringify(jsonGenerado, null, 2)}
          </pre>
        </div>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-5">Cierre de la operación</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Campo label="Precio de ejecución ($)">
              <input type="number" value={precioEjecucion} onChange={(e) => setPrecioEjecucion(e.target.value)} className="input" />
            </Campo>
            <Campo label="Resultado ($)">
              <input type="number" value={resultado} onChange={(e) => setResultado(e.target.value)} className="input" />
            </Campo>
            <Campo label="Capital final ($)">
              <input type="number" value={capitalFinal} onChange={(e) => setCapitalFinal(e.target.value)} className="input" />
            </Campo>
          </div>
          <Campo label="Lección aprendida (loopback)">
            <textarea value={leccionAprendida} onChange={(e) => setLeccionAprendida(e.target.value)} rows={2} className="input" />
          </Campo>
        </div>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">¿Cómo te sientes con este resultado?</h2>
          <p className="text-[13px] text-[#7C8A82] mb-4">Opcional, pero cierra tu loopback emocional de la semana.</p>
          <div className="flex gap-3">
            {(["bien", "medio", "mal"] as Estado[]).map((e) => (
              <button
                key={e}
                onClick={() => setEstadoSalida(e)}
                className={`flex-1 py-2.5 rounded border text-sm capitalize ${
                  estadoSalida === e ? "border-[#34D399] bg-[#12261B] text-[#34D399]" : "border-[#24302A] text-[#7C8A82]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {reglas && (reglas.regla_1_activa || reglas.limite_portafolio_activa || reglas.una_operacion_semana_activa) && (
          <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-[#E7ECE8]">Tus reglas de gestión de riesgo</h2>
              <a href="/reglas" className="text-[12px] text-[#34D399] hover:underline">
                Editar reglas
              </a>
            </div>

            <div className="flex flex-col gap-3">
              {reglas.una_operacion_semana_activa && yaOperoEstaSemana && (
                <AvisoRegla tipo="advertencia" texto="Ya registraste una operación esta semana. Tu regla dice máximo una — puedes continuar, pero revisa si es lo que quieres hacer." />
              )}

              {reglas.regla_1_activa && (
                pctRiesgo == null ? (
                  <AvisoRegla tipo="info" texto={`Agrega precio de referencia, stop loss y cantidad para calcular tu riesgo (regla del ${reglas.riesgo_maximo_pct}%).`} />
                ) : pctRiesgo <= reglas.riesgo_maximo_pct ? (
                  <AvisoRegla tipo="ok" texto={`Dentro de tu regla del ${reglas.riesgo_maximo_pct}%: estás arriesgando ${pctRiesgo.toFixed(2)}% de tu capital.`} />
                ) : (
                  <AvisoRegla tipo="alerta" texto={`Esto supera tu regla del ${reglas.riesgo_maximo_pct}%: estás arriesgando ${pctRiesgo.toFixed(2)}%. Considera reducir la cantidad o acercar el stop loss.`} />
                )
              )}

              {reglas.limite_portafolio_activa && (
                pctPortafolio == null ? null : pctPortafolio <= reglas.limite_portafolio_pct ? (
                  <AvisoRegla tipo="ok" texto={`Esta posición usa ${pctPortafolio.toFixed(1)}% de tu capital, dentro de tu límite de ${reglas.limite_portafolio_pct}%.`} />
                ) : (
                  <AvisoRegla tipo="alerta" texto={`Esta posición usaría ${pctPortafolio.toFixed(1)}% de tu capital, por encima de tu límite de ${reglas.limite_portafolio_pct}%.`} />
                )
              )}
            </div>
          </div>
        )}

        {error && <p className="text-[13px] text-[#E0605A] mb-4">{error}</p>}

        <button onClick={handleSubmit} disabled={guardando} className="w-full py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-50">
          {guardando ? "Guardando..." : "Guardar operación"}
        </button>
      </div>
    </AppShell>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <label className="block text-[13px] font-medium text-[#B7C0BA] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function AvisoRegla({ tipo, texto }: { tipo: "ok" | "alerta" | "advertencia" | "info"; texto: string }) {
  const estilos = {
    ok: "bg-[#12261B] text-[#8FCBAA] border-[#1E3A2A]",
    alerta: "bg-[#2A1815] text-[#F0A099] border-[#4A2A24]",
    advertencia: "bg-[#241E10] text-[#E0C088] border-[#3A2F18]",
    info: "bg-[#0E1412] text-[#7C8A82] border-[#24302A]",
  }[tipo];

  return <div className={`text-[12.5px] leading-relaxed px-3.5 py-2.5 rounded border ${estilos}`}>{texto}</div>;
}