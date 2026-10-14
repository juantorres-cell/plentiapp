"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import type { Hipotesis } from "@/lib/operaciones";

type Cumplida = "si" | "no" | "no_evaluable";

type Operacion = {
  id: string;
  estado: "abierta" | "cerrada";
  semana: string;
  fecha: string;
  activo: string | null;
  cantidad: number | null;
  resultado: number | null;
  capital_final: number | null;
  leccion_aprendida: string | null;
  hipotesis: Hipotesis | null;
  hipotesis_cumplida: Cumplida | null;
};

type CheckIn = {
  semana: string;
  tipo: "entrada" | "salida";
  estado_animo: "bien" | "medio" | "mal";
};

// Una fila de la tabla: una operación, o una semana sin operación.
type Fila = {
  key: string;
  semana: string;
  op: Operacion | null;
};

// Estado del formulario de edición (campos como texto para poder escribir libremente).
type Edicion = {
  op: Operacion;
  resultado: string;
  capitalFinal: string;
  leccion: string;
  cumplida: Cumplida | "";
};

const EMOJI: Record<string, string> = { bien: "🙂", medio: "😐", mal: "😣" };
const ETIQUETA_HIPOTESIS: Record<string, string> = {
  si: "Hipótesis cumplida",
  no: "Hipótesis no cumplida",
  no_evaluable: "Hipótesis no evaluable",
};

function aNumero(v: string): number | null {
  const limpio = v.trim().replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function DiarioPage() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }
      const uid = sessionData.session.user.id;

      const { data: ops } = await supabase
        .from("operaciones")
        .select("id, estado, semana, fecha, activo, cantidad, resultado, capital_final, leccion_aprendida, hipotesis, hipotesis_cumplida")
        .eq("user_id", uid)
        .order("semana", { ascending: false });

      const { data: cis } = await supabase
        .from("check_ins")
        .select("semana, tipo, estado_animo")
        .eq("user_id", uid);

      setOperaciones((ops ?? []) as Operacion[]);
      setCheckIns(cis ?? []);
      setCargando(false);
    }
    cargar();
  }, [router]);

  async function eliminarOperacion(op: Operacion) {
    const detalle = `${op.activo ?? "operación"} de la semana ${op.semana}`;
    if (!window.confirm(`¿Eliminar ${detalle}? Esta acción no se puede deshacer.`)) return;

    setMensaje(null);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }
    const uid = sessionData.session.user.id;

    // .select("id") devuelve las filas realmente borradas. Si RLS bloquea el
    // borrado no hay error, pero data viene vacío: así lo detectamos.
    const { data, error } = await supabase
      .from("operaciones")
      .delete()
      .eq("id", op.id)
      .eq("user_id", uid)
      .select("id");

    if (error) {
      setMensaje(`No se pudo borrar: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      setMensaje("No se borró nada. Probablemente falta la política DELETE de la tabla operaciones en Supabase.");
      return;
    }
    setOperaciones((prev) => prev.filter((o) => o.id !== op.id));
  }

  function abrirEdicion(op: Operacion) {
    setErrorEdicion(null);
    setEdicion({
      op,
      resultado: op.resultado != null ? String(op.resultado) : "",
      capitalFinal: op.capital_final != null ? String(op.capital_final) : "",
      leccion: op.leccion_aprendida ?? "",
      cumplida: op.hipotesis_cumplida ?? "",
    });
  }

  // Si cambia el resultado, el capital final se ajusta por la diferencia
  // (se puede seguir editando a mano después).
  function cambiarResultado(valor: string) {
    setEdicion((e) => {
      if (!e) return e;
      const nuevo = aNumero(valor);
      let capitalFinal = e.capitalFinal;
      if (nuevo !== null && e.op.resultado != null && e.op.capital_final != null) {
        capitalFinal = String(redondear(Number(e.op.capital_final) + nuevo - Number(e.op.resultado)));
      }
      return { ...e, resultado: valor, capitalFinal };
    });
  }

  async function guardarEdicion() {
    if (!edicion) return;
    const resultado = aNumero(edicion.resultado);
    const capitalFinal = aNumero(edicion.capitalFinal);
    if (resultado === null || capitalFinal === null) {
      setErrorEdicion("El resultado y el capital final deben ser números.");
      return;
    }

    setGuardando(true);
    setErrorEdicion(null);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setGuardando(false);
      router.push("/login");
      return;
    }
    const uid = sessionData.session.user.id;

    const cambios = {
      resultado,
      capital_final: capitalFinal,
      leccion_aprendida: edicion.leccion.trim() || null,
      hipotesis_cumplida: edicion.cumplida || null,
    };

    const { data, error } = await supabase
      .from("operaciones")
      .update(cambios)
      .eq("id", edicion.op.id)
      .eq("user_id", uid)
      .select("id");

    setGuardando(false);
    if (error || !data || data.length === 0) {
      setErrorEdicion(error ? `No se pudo guardar: ${error.message}` : "No se guardó ningún cambio.");
      return;
    }
    const id = edicion.op.id;
    setOperaciones((prev) => prev.map((o) => (o.id === id ? ({ ...o, ...cambios } as Operacion) : o)));
    setEdicion(null);
  }

  const semanas = Array.from(new Set([...operaciones.map((o) => o.semana), ...checkIns.map((c) => c.semana)])).sort((a, b) => (a < b ? 1 : -1));

  function emocion(semana: string, tipo: "entrada" | "salida") {
    return checkIns.find((c) => c.semana === semana && c.tipo === tipo)?.estado_animo ?? null;
  }

  // Una fila por operación; las semanas sin operación quedan como fila aparte.
  const filas: Fila[] = semanas.flatMap((semana): Fila[] => {
    const opsSemana = operaciones
      .filter((o) => o.semana === semana)
      .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
    if (opsSemana.length === 0) {
      return [{ key: `sin-op-${semana}`, semana, op: null }];
    }
    return opsSemana.map((op) => ({ key: op.id, semana, op }));
  });

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E]">
        <p className="text-sm text-[#7C8A82]">Cargando...</p>
      </div>
    );
  }

  // Solo operaciones cerradas cuentan para resultados.
  const operacionesConResultado = operaciones.filter((o) => o.estado === "cerrada" && o.resultado != null);
  const abiertas = operaciones.filter((o) => o.estado === "abierta").length;
  const gananciaAcumulada = operacionesConResultado.reduce((acc, o) => acc + Number(o.resultado), 0);
  const operacionesGanadoras = operacionesConResultado.filter((o) => Number(o.resultado) >= 0).length;

  return (
    <AppShell>
      <div className="max-w-[1040px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-1">Historial</p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] mb-8">Diario de trading</h1>

        {mensaje && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-[#5A2A25] bg-[#2A1815] px-4 py-3 text-sm text-[#E0605A]">
            <span>{mensaje}</span>
            <button onClick={() => setMensaje(null)} className="text-[#E0605A] hover:underline shrink-0">
              Cerrar
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#121815] border border-[#24302A] rounded-lg p-5">
            <p className="text-[12px] text-[#7C8A82] mb-1.5">Semanas registradas</p>
            <p className="font-serif text-2xl text-[#E7ECE8]">{semanas.length}</p>
          </div>
          <div className="bg-[#121815] border border-[#24302A] rounded-lg p-5">
            <p className="text-[12px] text-[#7C8A82] mb-1.5">Resultado acumulado</p>
            <p className={`font-serif text-2xl ${gananciaAcumulada >= 0 ? "text-[#34D399]" : "text-[#E0605A]"}`}>
              $ {gananciaAcumulada.toLocaleString("es-CO")}
            </p>
          </div>
          <div className="bg-[#121815] border border-[#24302A] rounded-lg p-5">
            <p className="text-[12px] text-[#7C8A82] mb-1.5">Operaciones positivas</p>
            <p className="font-serif text-2xl text-[#E7ECE8]">
              {operacionesGanadoras} / {operacionesConResultado.length || 0}
            </p>
          </div>
          <div className="bg-[#121815] border border-[#24302A] rounded-lg p-5">
            <p className="text-[12px] text-[#7C8A82] mb-1.5">Abiertas por cerrar</p>
            <p className={`font-serif text-2xl ${abiertas > 0 ? "text-[#E0C088]" : "text-[#E7ECE8]"}`}>{abiertas}</p>
          </div>
        </div>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase text-[#7C8A82] border-b border-[#24302A] bg-[#0E1412]">
                <th className="text-left px-5 py-3.5 font-medium">Semana</th>
                <th className="text-center px-3 py-3.5 font-medium">Entrada</th>
                <th className="text-left px-5 py-3.5 font-medium">Activo</th>
                <th className="text-right px-5 py-3.5 font-medium">Resultado</th>
                <th className="text-right px-5 py-3.5 font-medium">Capital final</th>
                <th className="text-center px-3 py-3.5 font-medium">Salida</th>
                <th className="text-left px-5 py-3.5 font-medium">Lección</th>
                <th className="text-center px-3 py-3.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => {
                const { op, semana } = fila;
                const entrada = emocion(semana, "entrada");
                const salida = emocion(semana, "salida");
                const abierta = op?.estado === "abierta";
                return (
                  <tr key={fila.key} className={`border-b border-[#1B2420] last:border-none ${i % 2 === 1 ? "bg-[#0E1412]" : ""}`}>
                    <td className="px-5 py-3.5 whitespace-nowrap font-medium text-[#E7ECE8]">{semana}</td>
                    <td className="px-3 py-3.5 text-lg text-center">{entrada ? EMOJI[entrada] : "—"}</td>
                    <td className="px-5 py-3.5 text-[#E7ECE8]">
                      {op?.activo ?? <span className="text-[#48544D]">—</span>}
                      {abierta && op?.hipotesis?.me_equivoco_si && (
                        <p className="m-0 mt-1 text-[11.5px] text-[#7C8A82] max-w-[200px]">
                          Me equivoco si: {op.hipotesis.me_equivoco_si}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {abierta && op ? (
                        <a href={`/operar/${op.id}/cerrar`} className="inline-block px-2.5 py-1 rounded-full text-[12.5px] font-medium bg-[#241E10] text-[#E0C088] hover:underline">
                          Abierta · Cerrar →
                        </a>
                      ) : op?.resultado != null ? (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[12.5px] font-medium tabular-nums ${op.resultado >= 0 ? "bg-[#12261B] text-[#34D399]" : "bg-[#2A1815] text-[#E0605A]"}`}>
                          $ {op.resultado.toLocaleString("es-CO")}
                        </span>
                      ) : (
                        <span className="text-[#48544D]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#E7ECE8]">
                      {op?.capital_final != null ? `$ ${op.capital_final.toLocaleString("es-CO")}` : <span className="text-[#48544D]">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-lg text-center">{salida ? EMOJI[salida] : "—"}</td>
                    <td className="px-5 py-3.5 text-[#7C8A82] max-w-[220px]">
                      {op?.leccion_aprendida ?? <span className="text-[#48544D]">—</span>}
                      {op?.hipotesis_cumplida && (
                        <p className="m-0 mt-1 text-[11.5px] text-[#48544D]">{ETIQUETA_HIPOTESIS[op.hipotesis_cumplida]}</p>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {op ? (
                        <div className="inline-flex items-center gap-1">
                          {!abierta && (
                            <button
                              onClick={() => abrirEdicion(op)}
                              className="text-[#7C8A82] hover:text-[#34D399] transition-colors p-1"
                              title="Editar cierre"
                              aria-label="Editar cierre"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => eliminarOperacion(op)}
                            className="text-[#7C8A82] hover:text-[#E0605A] transition-colors p-1"
                            title="Eliminar operación"
                            aria-label="Eliminar operación"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#48544D]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[#7C8A82]">
                    Todavía no tienes registros. Empieza con tu check-in semanal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true" aria-label="Editar operación">
          <div className="w-full max-w-[460px] rounded-lg border border-[#24302A] bg-[#121815] p-6">
            <h2 className="font-serif text-xl text-[#E7ECE8] mb-1">Editar cierre</h2>
            <p className="text-[12.5px] text-[#7C8A82] mb-5">
              {edicion.op.activo ?? "Operación"} · semana {edicion.op.semana}
            </p>

            <label className="block text-[12px] text-[#7C8A82] mb-1" htmlFor="ed-resultado">Resultado ($)</label>
            <input
              id="ed-resultado"
              inputMode="decimal"
              value={edicion.resultado}
              onChange={(e) => cambiarResultado(e.target.value)}
              className="w-full mb-4 rounded-md border border-[#24302A] bg-[#0B0F0E] px-3 py-2 text-sm text-[#E7ECE8] outline-none focus:border-[#34D399]"
            />

            <label className="block text-[12px] text-[#7C8A82] mb-1" htmlFor="ed-capital">Capital final ($)</label>
            <input
              id="ed-capital"
              inputMode="decimal"
              value={edicion.capitalFinal}
              onChange={(e) => setEdicion({ ...edicion, capitalFinal: e.target.value })}
              className="w-full mb-1 rounded-md border border-[#24302A] bg-[#0B0F0E] px-3 py-2 text-sm text-[#E7ECE8] outline-none focus:border-[#34D399]"
            />
            <p className="text-[11.5px] text-[#48544D] mb-4">Se ajusta solo al cambiar el resultado; puedes corregirlo a mano.</p>

            <label className="block text-[12px] text-[#7C8A82] mb-1" htmlFor="ed-cumplida">¿Se cumplió la hipótesis?</label>
            <select
              id="ed-cumplida"
              value={edicion.cumplida}
              onChange={(e) => setEdicion({ ...edicion, cumplida: e.target.value as Cumplida | "" })}
              className="w-full mb-4 rounded-md border border-[#24302A] bg-[#0B0F0E] px-3 py-2 text-sm text-[#E7ECE8] outline-none focus:border-[#34D399]"
            >
              <option value="">Sin definir</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
              <option value="no_evaluable">No evaluable</option>
            </select>

            <label className="block text-[12px] text-[#7C8A82] mb-1" htmlFor="ed-leccion">Lección aprendida</label>
            <textarea
              id="ed-leccion"
              rows={3}
              value={edicion.leccion}
              onChange={(e) => setEdicion({ ...edicion, leccion: e.target.value })}
              className="w-full mb-4 rounded-md border border-[#24302A] bg-[#0B0F0E] px-3 py-2 text-sm text-[#E7ECE8] outline-none focus:border-[#34D399]"
            />

            {errorEdicion && <p className="mb-4 text-[12.5px] text-[#E0605A]">{errorEdicion}</p>}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEdicion(null)}
                disabled={guardando}
                className="px-4 py-2 rounded-md text-sm text-[#7C8A82] hover:text-[#E7ECE8]"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={guardando}
                className="px-4 py-2 rounded-md text-sm font-medium bg-[#34D399] text-[#0B0F0E] hover:opacity-90 disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}