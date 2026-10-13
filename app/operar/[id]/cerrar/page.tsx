"use client";

// app/operar/[id]/cerrar/page.tsx — PARTE 2: CERRAR la operación con su resultado.
// El check-out emocional se guarda en la semana de la OPERACIÓN, no en la semana actual.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { numero, type Hipotesis } from "@/lib/operaciones";

type Estado = "bien" | "medio" | "mal";
type Cumplida = "si" | "no" | "no_evaluable";

type Op = {
  id: string;
  semana: string;
  estado: "abierta" | "cerrada";
  activo: string | null;
  cantidad: number | null;
  stop_loss: number | null;
  tipo_orden: string | null;
  capital_disponible: number | null;
  hipotesis: Hipotesis | null;
};

export default function CerrarOperacionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [cargando, setCargando] = useState(true);

  const [precioEjecucion, setPrecioEjecucion] = useState("");
  const [resultado, setResultado] = useState("");
  const [capitalFinal, setCapitalFinal] = useState("");
  const [cumplida, setCumplida] = useState<Cumplida | null>(null);
  const [leccion, setLeccion] = useState("");
  const [estadoSalida, setEstadoSalida] = useState<Estado | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      setUserId(data.session.user.id);

      const { data: fila } = await supabase
        .from("operaciones")
        .select("id, semana, estado, activo, cantidad, stop_loss, tipo_orden, capital_disponible, hipotesis")
        .eq("id", id)
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      setOp((fila as Op | null) ?? null);
      setCargando(false);
    }
    cargar();
  }, [id, router]);

  const resultadoNum = numero(resultado);
  const puedeGuardar = resultadoNum != null && cumplida != null && leccion.trim().length >= 10;

  async function handleCerrar() {
    if (!userId || !op || !puedeGuardar) return;
    setError(null);
    setGuardando(true);

    const { data: actualizadas, error: errUpdate } = await supabase
      .from("operaciones")
      .update({
        estado: "cerrada",
        cerrada_en: new Date().toISOString(),
        precio_ejecucion: numero(precioEjecucion),
        resultado: resultadoNum,
        capital_final: numero(capitalFinal),
        hipotesis_cumplida: cumplida,
        leccion_aprendida: leccion.trim(),
      })
      .eq("id", op.id)
      .eq("user_id", userId)
      .eq("estado", "abierta")
      .select("id");

    if (errUpdate) {
      setGuardando(false);
      setError(errUpdate.message);
      return;
    }
    if (!actualizadas || actualizadas.length === 0) {
      setGuardando(false);
      setError("No se pudo cerrar: la operación ya estaba cerrada o no existe.");
      return;
    }

    if (estadoSalida) {
      await supabase.from("check_ins").upsert(
        { user_id: userId, semana: op.semana, tipo: "salida", estado_animo: estadoSalida },
        { onConflict: "user_id,semana,tipo" }
      );
    }

    router.push("/diario");
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E]">
        <p className="text-sm text-[#7C8A82]">Cargando...</p>
      </div>
    );
  }

  if (!op) {
    return (
      <AppShell>
        <div className="max-w-[720px] mx-auto px-10 py-12">
          <p className="text-sm text-[#7C8A82] mb-4">No se encontró esa operación.</p>
          <a href="/diario" className="text-[13px] text-[#34D399] hover:underline">Volver al diario</a>
        </div>
      </AppShell>
    );
  }

  if (op.estado === "cerrada") {
    return (
      <AppShell>
        <div className="max-w-[720px] mx-auto px-10 py-12">
          <p className="text-sm text-[#7C8A82] mb-4">Esta operación ya está cerrada.</p>
          <a href="/diario" className="text-[13px] text-[#34D399] hover:underline">Volver al diario</a>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[720px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-1">Semana del {op.semana}</p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] mb-8">Cerrar operación</h1>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-4">Lo que registraste al abrirla</h2>
          <p className="text-[13px] text-[#B7C0BA] mb-3">
            {op.activo ?? "—"} · {op.cantidad ?? "—"} {op.cantidad === 1 ? "acción" : "acciones"} · {op.tipo_orden ?? "—"}
            {op.stop_loss != null ? ` · stop $${op.stop_loss}` : ""}
          </p>
          {op.hipotesis ? (
            <div className="flex flex-col gap-2 text-[13px] text-[#B7C0BA]">
              {op.hipotesis.observo && <p className="m-0"><span className="text-[#7C8A82]">Observaba:</span> {op.hipotesis.observo}</p>}
              <p className="m-0"><span className="text-[#7C8A82]">Tesis:</span> {op.hipotesis.tesis}</p>
              <p className="m-0"><span className="text-[#7C8A82]">Me equivoco si:</span> {op.hipotesis.me_equivoco_si}</p>
              {op.hipotesis.cuando_reviso && <p className="m-0"><span className="text-[#7C8A82]">Revisión prevista:</span> {op.hipotesis.cuando_reviso}</p>}
            </div>
          ) : (
            <p className="text-[13px] text-[#7C8A82] m-0">Esta operación no tiene hipótesis registrada.</p>
          )}
        </div>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-5">Resultado</h2>
          <div className="grid grid-cols-3 gap-4">
            <Campo label="Precio de ejecución ($)">
              <input type="number" value={precioEjecucion} onChange={(e) => setPrecioEjecucion(e.target.value)} className="input" />
            </Campo>
            <Campo label="Resultado ($) *">
              <input type="number" value={resultado} onChange={(e) => setResultado(e.target.value)} className="input" placeholder="Negativo si perdiste" />
            </Campo>
            <Campo label="Capital final ($)">
              <input type="number" value={capitalFinal} onChange={(e) => setCapitalFinal(e.target.value)} className="input" />
            </Campo>
          </div>
        </div>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">¿Se cumplió tu hipótesis? *</h2>
          <p className="text-[13px] text-[#7C8A82] mb-4">
            Esto es distinto del resultado: puedes perder con una buena hipótesis, o ganar por suerte. Compara con tu
            “me equivoco si”.
          </p>
          <div className="flex gap-3 mb-5">
            {([
              ["si", "Sí"],
              ["no", "No"],
              ["no_evaluable", "No se pudo evaluar"],
            ] as [Cumplida, string][]).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setCumplida(valor)}
                className={`flex-1 py-2.5 rounded border text-sm ${
                  cumplida === valor ? "border-[#34D399] bg-[#12261B] text-[#34D399]" : "border-[#24302A] text-[#7C8A82]"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
          <Campo label="Qué aprendiste y qué cambias (mínimo una frase concreta) *">
            <textarea value={leccion} onChange={(e) => setLeccion(e.target.value)} rows={3} className="input" />
          </Campo>
        </div>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6 mb-6">
          <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">¿Cómo te sientes con este resultado?</h2>
          <p className="text-[13px] text-[#7C8A82] mb-4">Opcional, pero cierra tu loopback emocional de esa semana.</p>
          <div className="flex gap-3">
            {(["bien", "medio", "mal"] as Estado[]).map((e) => (
              <button
                key={e}
                type="button"
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

        {error && <p className="text-[13px] text-[#E0605A] mb-4">{error}</p>}

        <button onClick={handleCerrar} disabled={guardando || !puedeGuardar} className="w-full py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-50">
          {guardando ? "Cerrando..." : !puedeGuardar ? "Completa resultado, hipótesis y lección para cerrar" : "Cerrar operación"}
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