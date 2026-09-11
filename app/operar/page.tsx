"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSemanaActual } from "@/lib/semana";

type Estado = "bien" | "medio" | "mal";

export default function OperarPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  // --- Datos de la operación ---
  const [capitalDisponible, setCapitalDisponible] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [activo, setActivo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipoOrden, setTipoOrden] = useState<"MARKET" | "LIMIT">("MARKET");
  const [precioLimite, setPrecioLimite] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [explicacionJson, setExplicacionJson] = useState("");

  // --- Cierre de la operación ---
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

      // Precargamos el capital que ya calculaste en /calculadora, para no repetirlo a mano.
      const { data: perfil } = await supabase
        .from("profiles")
        .select("capital_disponible")
        .eq("id", data.session.user.id)
        .single();

      if (perfil?.capital_disponible != null) {
        setCapitalDisponible(String(perfil.capital_disponible));
      }
    });
  }, [router]);

  // El bloque JSON se arma solo, a medida que llenas el formulario.
  const jsonGenerado = useMemo(() => {
    const orden: Record<string, unknown> = {
      action: "BUY",
      symbol: activo || "SYMBOL",
      quantity: Number(cantidad) || 0,
      type: tipoOrden,
    };
    if (tipoOrden === "LIMIT") {
      orden.limit_price = Number(precioLimite) || 0;
    }
    if (stopLoss) {
      orden.stop_loss = Number(stopLoss);
    }
    return { version: 1, orders: [orden] };
  }, [activo, cantidad, tipoOrden, precioLimite, stopLoss]);

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

    // Check-out emocional, si el usuario lo diligenció.
    if (estadoSalida) {
      await supabase.from("check_ins").upsert(
        {
          user_id: userId,
          semana,
          tipo: "salida",
          estado_animo: estadoSalida,
        },
        { onConflict: "user_id,semana,tipo" }
      );
    }

    setGuardando(false);
    setExito(true);
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F4EE] p-10">
        <div className="max-w-[380px] text-center">
          <h2 className="font-serif text-2xl text-[#16233B] mb-3">
            Operación registrada
          </h2>
          <p className="text-sm text-[#8B93A3] mb-6">
            Quedó guardada en tu diario de trading de la semana del {semana}.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="py-3 px-6 bg-[#16233B] text-white rounded text-sm"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] p-10">
      <div className="max-w-[720px] mx-auto">
        <p className="text-[12px] uppercase tracking-wider text-[#3F6E58] font-medium mb-1">
          Semana del {semana}
        </p>
        <h1 className="font-serif text-2xl text-[#16233B] mb-8">
          Registro de operación
        </h1>

        {/* --- Sección 1: datos de la operación --- */}
        <div className="bg-white border border-[#E4E0D4] rounded-md p-6 mb-6">
          <h2 className="font-serif text-lg text-[#16233B] mb-5">Datos de la operación</h2>

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

          <Campo label="Explicación del JSON">
            <textarea value={explicacionJson} onChange={(e) => setExplicacionJson(e.target.value)} rows={2} className="input" />
          </Campo>

          <p className="text-[13px] font-medium text-[#223652] mb-1.5 mt-4">Bloque JSON generado</p>
          <pre className="bg-[#16233B] text-[#C7D0DE] text-[12px] p-4 rounded overflow-x-auto">
            {JSON.stringify(jsonGenerado, null, 2)}
          </pre>
        </div>

        {/* --- Sección 2: cierre de la operación --- */}
        <div className="bg-white border border-[#E4E0D4] rounded-md p-6 mb-6">
          <h2 className="font-serif text-lg text-[#16233B] mb-5">Cierre de la operación</h2>

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

        {/* --- Sección 3: check-out emocional --- */}
        <div className="bg-white border border-[#E4E0D4] rounded-md p-6 mb-6">
          <h2 className="font-serif text-lg text-[#16233B] mb-1">¿Cómo te sientes con este resultado?</h2>
          <p className="text-[13px] text-[#8B93A3] mb-4">Opcional, pero cierra tu loopback emocional de la semana.</p>
          <div className="flex gap-3">
            {(["bien", "medio", "mal"] as Estado[]).map((e) => (
              <button
                key={e}
                onClick={() => setEstadoSalida(e)}
                className={`flex-1 py-2.5 rounded border text-sm capitalize ${
                  estadoSalida === e ? "border-[#3F6E58] bg-[#E7EFE9] text-[#16233B]" : "border-[#E4E0D4] text-[#8B93A3]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[13px] text-[#A85A34] mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={guardando}
          className="w-full py-3.5 bg-[#16233B] text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar operación"}
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <label className="block text-[13px] font-medium text-[#223652] mb-1.5">{label}</label>
      {children}
    </div>
  );
}