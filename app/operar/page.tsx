"use client";

// app/operar/page.tsx — PARTE 1: ABRIR la operación (viernes).
// El cierre (resultado, check-out, lección) se hace después en /operar/[id]/cerrar.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSemanaActual } from "@/lib/semana";
import AppShell from "@/components/AppShell";
import CalibradorAtr, { type SnapshotCalibrador } from "@/components/CalibradorAtr";
import { numero, validarHipotesis, fechaRevisionPorDefecto, compararConCalibrador } from "@/lib/operaciones";

type Reglas = {
  regla_1_activa: boolean;
  riesgo_maximo_pct: number;
  base_calculo_riesgo: "capital_total" | "capital_invertido";
  limite_portafolio_activa: boolean;
  limite_portafolio_pct: number;
  una_operacion_semana_activa: boolean;
};

type Estado = "bien" | "medio" | "mal";

export default function OperarPage() {
  const router = useRouter();
  const [semana, setSemana] = useState(""); // se calcula en el cliente para evitar errores de hidratación
  const [userId, setUserId] = useState<string | null>(null);
  const [reglas, setReglas] = useState<Reglas | null>(null);
  const [yaOperoEstaSemana, setYaOperoEstaSemana] = useState(false);
  const [precioReferencia, setPrecioReferencia] = useState("");
  const [confirmacionRiesgo, setConfirmacionRiesgo] = useState(false);

  const [capitalDisponible, setCapitalDisponible] = useState("");
  const [activo, setActivo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipoOrden, setTipoOrden] = useState<"MARKET" | "LIMIT">("MARKET");
  const [precioLimite, setPrecioLimite] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [explicacionJson, setExplicacionJson] = useState("");

  // Hipótesis (4 campos)
  const [observo, setObservo] = useState("");
  const [tesis, setTesis] = useState("");
  const [meEquivoco, setMeEquivoco] = useState("");
  const [cuandoReviso, setCuandoReviso] = useState("");

  const [snapshot, setSnapshot] = useState<SnapshotCalibrador | null>(null);
  const [emocionEntrada, setEmocionEntrada] = useState<Estado | null>(null);
  const [motivoSinOperar, setMotivoSinOperar] = useState("");
  const [guardandoSinOperar, setGuardandoSinOperar] = useState(false);
  const [errorSinOperar, setErrorSinOperar] = useState<string | null>(null);
  const [exitoSinOperar, setExitoSinOperar] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [analisis, setAnalisis] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);

  useEffect(() => {
    const s = getSemanaActual();
    setSemana(s);
    setCuandoReviso(fechaRevisionPorDefecto(s));

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }
      setUserId(data.session.user.id);

      const { data: perfil } = await supabase
        .from("profiles")
        .select(
          "capital_disponible, regla_1_activa, riesgo_maximo_pct, base_calculo_riesgo, limite_portafolio_activa, limite_portafolio_pct, una_operacion_semana_activa"
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
          base_calculo_riesgo: perfil.base_calculo_riesgo ?? "capital_total",
          limite_portafolio_activa: perfil.limite_portafolio_activa,
          limite_portafolio_pct: perfil.limite_portafolio_pct,
          una_operacion_semana_activa: perfil.una_operacion_semana_activa,
        });
      }

      const { data: existentes } = await supabase
        .from("operaciones")
        .select("semana")
        .eq("user_id", data.session.user.id)
        .eq("semana", s)
        .limit(1);

      setYaOperoEstaSemana(!!existentes && existentes.length > 0);
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
  const montoPosicion = precioRef ? precioRef * (Number(cantidad) || 0) : null;

  const capitalBase =
    reglas?.base_calculo_riesgo === "capital_invertido"
      ? montoPosicion
      : Number(capitalDisponible) || null;

  const montoRiesgo =
    precioRef && stopLoss ? Math.abs(precioRef - Number(stopLoss)) * (Number(cantidad) || 0) : null;
  const pctRiesgo = montoRiesgo != null && capitalBase ? (montoRiesgo / capitalBase) * 100 : null;

  const pctPortafolio =
    montoPosicion != null && Number(capitalDisponible) > 0
      ? (montoPosicion / Number(capitalDisponible)) * 100
      : null;

  // Stop más lejano que todavía respeta la regla (no es un stop "ideal").
  const stopLossSugerido =
    reglas?.regla_1_activa && precioRef && Number(cantidad) > 0 && capitalBase
      ? Math.max(0, precioRef - (capitalBase * (reglas.riesgo_maximo_pct / 100)) / Number(cantidad))
      : null;

  const superaRegla1 = reglas?.regla_1_activa && pctRiesgo != null && pctRiesgo > reglas.riesgo_maximo_pct;

  const riesgoPorAccion = precioRef && Number(stopLoss) ? Math.abs(precioRef - Number(stopLoss)) : null;
  const cantidadMaxima =
    reglas?.regla_1_activa &&
    reglas.base_calculo_riesgo === "capital_total" &&
    riesgoPorAccion &&
    Number(capitalDisponible) > 0
      ? Math.floor((Number(capitalDisponible) * (reglas.riesgo_maximo_pct / 100)) / riesgoPorAccion)
      : null;

  // --- Hipótesis ---
  const hipotesis = { observo, tesis, me_equivoco_si: meEquivoco, cuando_reviso: cuandoReviso };
  const { errores: erroresHipotesis, avisos: avisosHipotesis } = validarHipotesis(hipotesis);
  const hipotesisIniciada = tesis.trim() !== "" || meEquivoco.trim() !== "";

  const puedeGuardar = (!superaRegla1 || confirmacionRiesgo) && erroresHipotesis.length === 0 && !!semana;

  async function handleSubmit() {
    if (!userId || !semana) return;
    setError(null);
    setGuardando(true);

    const sistema = snapshot
      ? { cantidad: snapshot.posicion?.cantidad ?? null, stop_sugerido: snapshot.lectura.stop_sugerido ?? null }
      : null;

    const lecturaSistema = snapshot
      ? {
          ...snapshot,
          usuario: {
            cantidad: numero(cantidad),
            stop_loss: numero(stopLoss),
            siguio_calibrador: compararConCalibrador(
              { cantidad: numero(cantidad), stop: numero(stopLoss) },
              sistema
            ),
          },
        }
      : { calibrador_consultado: false };

    // Resumen en texto para que el diario y el Gestor sigan leyendo "justificacion_estrategica".
    const resumen = [
      observo.trim() && `Observo: ${observo.trim()}`,
      `Tesis: ${tesis.trim()}`,
      `Me equivoco si: ${meEquivoco.trim()}`,
    ]
      .filter(Boolean)
      .join(" | ");

    const { error: errorOperacion } = await supabase.from("operaciones").insert({
      user_id: userId,
      semana,
      estado: "abierta",
      capital_disponible: numero(capitalDisponible),
      justificacion_estrategica: resumen,
      hipotesis,
      lectura_sistema: lecturaSistema,
      emocion_entrada: emocionEntrada,
      activo: activo || null,
      cantidad: numero(cantidad),
      tipo_orden: tipoOrden,
      precio_limite: tipoOrden === "LIMIT" ? numero(precioLimite) : null,
      stop_loss: numero(stopLoss),
      precio_referencia: precioRef || null,
      json_enviado: jsonGenerado,
      explicacion_json: explicacionJson || null,
    });

    setGuardando(false);
    if (errorOperacion) {
      setError(errorOperacion.message);
      return;
    }
    setExito(true);
  }

  const puedeRegistrarSinOperar = motivoSinOperar.trim().length >= 10 && !!semana;

  async function registrarSinOperar() {
    if (!userId || !semana || !puedeRegistrarSinOperar) return;
    setErrorSinOperar(null);
    setGuardandoSinOperar(true);

    const { data, error: errSin } = await supabase
      .from("semanas_sin_operar")
      .upsert(
        {
          user_id: userId,
          semana,
          motivo: motivoSinOperar.trim(),
          emocion: emocionEntrada,
          lectura_sistema: snapshot ?? { calibrador_consultado: false },
        },
        { onConflict: "user_id,semana" }
      )
      .select("id");

    setGuardandoSinOperar(false);
    if (errSin) {
      setErrorSinOperar(errSin.message);
      return;
    }
    if (!data || data.length === 0) {
      setErrorSinOperar("No se guardó nada. Revisa las políticas RLS de semanas_sin_operar.");
      return;
    }
    setExitoSinOperar(true);
  }

  async function analizarOperacion() {
    setAnalizando(true);
    setAnalisis(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/gestor-riesgo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          semana,
          activo,
          cantidad: Number(cantidad) || 0,
          tipoOrden,
          regla1Activa: !!reglas?.regla_1_activa,
          riesgoMaximo: reglas?.riesgo_maximo_pct ?? null,
          pctRiesgo,
          montoRiesgo,
          cantidadMaxima,
          stopLossSugerido,
          limitePortafolioActivo: !!reglas?.limite_portafolio_activa,
          limitePortafolio: reglas?.limite_portafolio_pct ?? null,
          pctPortafolio,
          superaRegla1: !!superaRegla1,
          confirmoRiesgo: confirmacionRiesgo,
          yaOperoEstaSemana: !!reglas?.una_operacion_semana_activa && yaOperoEstaSemana,
          justificacion: `${tesis} | Me equivoco si: ${meEquivoco}`,
        }),
      });
      const json = await res.json();
      setAnalisis(json.respuesta ?? "No se pudo obtener el análisis.");
    } catch {
      setAnalisis("No se pudo obtener el análisis. Puedes guardar tu operación igual.");
    } finally {
      setAnalizando(false);
    }
  }

  if (exitoSinOperar) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E] p-10">
        <div className="max-w-[420px] text-center">
          <h2 className="font-serif text-2xl text-[#E7ECE8] mb-3">Semana registrada sin operar</h2>
          <p className="text-sm text-[#7C8A82] mb-6">
            Quedó guardado tu motivo y lo que mostraba el calibrador, en la semana del {semana}.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push("/diario")} className="py-3 px-6 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium">
              Ir al diario
            </button>
            <button onClick={() => router.push("/dashboard")} className="py-3 px-6 border border-[#24302A] text-[#7C8A82] rounded text-sm">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E] p-10">
        <div className="max-w-[420px] text-center">
          <h2 className="font-serif text-2xl text-[#E7ECE8] mb-3">Operación abierta</h2>
          <p className="text-sm text-[#7C8A82] mb-2">
            Quedó guardada con tu hipótesis y lo que calculó el sistema, en la semana del {semana}.
          </p>
          <p className="text-sm text-[#7C8A82] mb-6">
            Cuando tengas el resultado, ciérrala desde el diario: ahí registras el resultado, si tu hipótesis se
            cumplió y cómo te sientes.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push("/diario")} className="py-3 px-6 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium">
              Ir al diario
            </button>
            <button onClick={() => router.push("/dashboard")} className="py-3 px-6 border border-[#24302A] text-[#7C8A82] rounded text-sm">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[720px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-1">
          {semana ? `Semana del ${semana}` : " "}
        </p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] mb-2">Abrir operación</h1>
        <p className="text-[13px] text-[#7C8A82] mb-8">
          Aquí registras lo que vas a hacer y por qué. El resultado lo cierras después, desde el diario.
        </p>

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
              {stopLossSugerido != null && Number(stopLoss) !== Number(stopLossSugerido.toFixed(2)) && (
                <button
                  type="button"
                  onClick={() => setStopLoss(stopLossSugerido.toFixed(2))}
                  className="text-[11.5px] text-[#34D399] hover:underline mt-1"
                >
                  Stop más lejano que cumple tu regla: ${stopLossSugerido.toFixed(2)} — usar este valor
                </button>
              )}
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

        <CalibradorAtr
          activo={activo}
          capital={Number(capitalDisponible) || null}
          regla1Activa={!!reglas?.regla_1_activa}
          riesgoPct={reglas?.riesgo_maximo_pct ?? 1}
          baseRiesgo={reglas?.base_calculo_riesgo ?? "capital_total"}
          topeActivo={!!reglas?.limite_portafolio_activa}
          topePct={reglas?.limite_portafolio_pct ?? 5}
          onUsar={({ stop, cantidad: c, precioRef }) => {
            setStopLoss(stop);
            setCantidad(c);
            setPrecioReferencia(precioRef);
          }}
          onLectura={setSnapshot}
        />

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">Tu hipótesis</h2>
          <p className="text-[13px] text-[#7C8A82] mb-5">
            Una opinión se convierte en algo que se puede aprender cuando dices cómo sabrías que te equivocaste.
          </p>

          <Campo label="Qué observo (hechos con número)">
            <textarea
              value={observo}
              onChange={(e) => setObservo(e.target.value)}
              rows={2}
              placeholder="Ej: cierre de $229.28, 3.2% sobre la media de 50 días, volumen 0.8× el promedio"
              className="input"
            />
          </Campo>
          <div className="h-3" />
          <Campo label="Mi tesis (por qué, en tus palabras)">
            <textarea value={tesis} onChange={(e) => setTesis(e.target.value)} rows={2} className="input" />
          </Campo>
          <div className="h-3" />
          <Campo label="Me equivoco si… (condición concreta, con precio o fecha)">
            <textarea
              value={meEquivoco}
              onChange={(e) => setMeEquivoco(e.target.value)}
              rows={2}
              placeholder="Ej: cierra una sesión por debajo de $X antes del viernes Y"
              className="input"
            />
          </Campo>
          <div className="h-3" />
          <Campo label="Cuándo la reviso">
            <input type="date" value={cuandoReviso} onChange={(e) => setCuandoReviso(e.target.value)} className="input" />
          </Campo>

          {hipotesisIniciada && avisosHipotesis.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              {avisosHipotesis.map((a) => (
                <AvisoRegla key={a} tipo="advertencia" texto={a} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">¿Cómo te sientes al abrirla?</h2>
          <p className="text-[13px] text-[#7C8A82] mb-4">
            Opcional. Es tu estado para esta operación, distinto del check-in semanal.
          </p>
          <div className="flex gap-3">
            {(["bien", "medio", "mal"] as Estado[]).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmocionEntrada(e)}
                className={`flex-1 py-2.5 rounded border text-sm capitalize ${
                  emocionEntrada === e ? "border-[#34D399] bg-[#12261B] text-[#34D399]" : "border-[#24302A] text-[#7C8A82]"
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
                  <>
                    <AvisoRegla tipo="alerta" texto={`Esto supera tu regla del ${reglas.riesgo_maximo_pct}%: estás arriesgando ${pctRiesgo.toFixed(2)}%. Considera reducir la cantidad o usar el stop loss sugerido.`} />
                    <label className="flex items-start gap-2.5 text-[12.5px] text-[#F0A099] cursor-pointer px-0.5">
                      <input
                        type="checkbox"
                        checked={confirmacionRiesgo}
                        onChange={(e) => setConfirmacionRiesgo(e.target.checked)}
                        className="mt-0.5 accent-[#E0605A]"
                      />
                      <span>Entiendo que esto supera mi regla del {reglas.riesgo_maximo_pct}% y quiero continuar de todas formas.</span>
                    </label>
                  </>
                )
              )}

              {reglas.limite_portafolio_activa && (
                pctPortafolio == null ? null : pctPortafolio <= reglas.limite_portafolio_pct ? (
                  <AvisoRegla tipo="ok" texto={`Esta posición usa ${pctPortafolio.toFixed(2)}% de tu capital, dentro de tu límite de ${reglas.limite_portafolio_pct}%.`} />
                ) : (
                  <AvisoRegla tipo="alerta" texto={`Esta posición usaría ${pctPortafolio.toFixed(2)}% de tu capital, por encima de tu límite de ${reglas.limite_portafolio_pct}%.`} />
                )
              )}
            </div>
          </div>
        )}

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">Gestor de riesgo</h2>
          <p className="text-[13px] text-[#7C8A82] mb-4">
            Revisa tu operación con tu perfil y tu estado de ánimo. Es opcional y no bloquea el guardado.
          </p>
          <button
            type="button"
            onClick={analizarOperacion}
            disabled={analizando || !activo || !Number(cantidad)}
            className="px-5 py-2.5 border border-[#34D399] text-[#34D399] rounded text-sm font-medium disabled:opacity-40"
          >
            {analizando ? "Analizando..." : "Analizar mi operación"}
          </button>
          {analisis && (
            <div className="mt-4 p-3.5 bg-[#12261B] rounded flex gap-2.5 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] mt-1.5 flex-shrink-0" />
              <p className="text-[13px] leading-relaxed text-[#8FCBAA] m-0">{analisis}</p>
            </div>
          )}
        </div>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">¿Esta semana no vas a operar?</h2>
          <p className="text-[13px] text-[#7C8A82] mb-4">
            Registra tu decisión. Se guarda lo que muestra el calibrador (si lo consultaste) y tu estado de ánimo (si lo elegiste arriba).
          </p>
          <Campo label="Motivo (mínimo una frase concreta) *">
            <textarea
              value={motivoSinOperar}
              onChange={(e) => setMotivoSinOperar(e.target.value)}
              rows={2}
              placeholder="Ej: no logré formular un “me equivoco si” concreto para ninguna acción"
              className="input"
            />
          </Campo>
          {errorSinOperar && <p className="text-[13px] text-[#E0605A] mt-3">{errorSinOperar}</p>}
          <button
            type="button"
            onClick={registrarSinOperar}
            disabled={guardandoSinOperar || !puedeRegistrarSinOperar}
            className="mt-4 px-5 py-2.5 border border-[#34D399] text-[#34D399] rounded text-sm font-medium disabled:opacity-40"
          >
            {guardandoSinOperar ? "Guardando..." : "Registrar que no opero"}
          </button>
        </div>

        {error && <p className="text-[13px] text-[#E0605A] mb-4">{error}</p>}

        <button onClick={handleSubmit} disabled={guardando || !puedeGuardar} className="w-full py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-50">
          {guardando
            ? "Guardando..."
            : superaRegla1 && !confirmacionRiesgo
            ? "Confirma el riesgo para guardar"
            : erroresHipotesis.length > 0
            ? "Completa tu tesis y “me equivoco si” para guardar"
            : "Abrir operación"}
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