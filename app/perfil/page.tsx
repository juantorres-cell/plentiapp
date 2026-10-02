"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { PREGUNTAS, MENSAJES_ALERTA } from "@/lib/onboarding";
import { buildContext, type HistorialContexto } from "@/lib/buildContext";

type PerfilDB = {
  email: string;
  nombre: string | null;
  respuestas_onboarding: Record<string, string> | null;
  perfil_psicologico_ia: { alertas?: string[] } | null;
};

const ESTADOS = [
  { clave: "bien", etiqueta: "Bien" },
  { clave: "medio", etiqueta: "Medio" },
  { clave: "mal", etiqueta: "Mal" },
] as const;

const formatoDinero = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default function PerfilPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilDB | null>(null);
  const [historial, setHistorial] = useState<HistorialContexto | null>(null);
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }
      const uid = sessionData.session.user.id;
      setUserId(uid);

      const { data, error } = await supabase
        .from("profiles")
        .select("email, nombre, respuestas_onboarding, perfil_psicologico_ia")
        .eq("id", uid)
        .single();

      if (error) {
        setError(error.message);
      } else if (data) {
        setPerfil(data as PerfilDB);
        setNombre(data.nombre ?? "");
      }

      // Métricas del historial: aritmética pura, sin IA. RLS limita a los datos del usuario.
      setHistorial(await buildContext(supabase, uid));
      setCargando(false);
    }
    cargar();
  }, [router]);

  async function guardarNombre() {
    if (!userId) return;
    setGuardando(true);
    setMensaje(null);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ nombre: nombre.trim() || null })
      .eq("id", userId);
    setGuardando(false);
    if (error) setError(error.message);
    else setMensaje("Nombre guardado.");
  }

  async function rehacerOnboarding() {
    if (!userId) return;
    const ok = window.confirm(
      "Vas a responder las 4 preguntas de nuevo y tu perfil se reemplazará. ¿Continuar?"
    );
    if (!ok) return;
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completo: false })
      .eq("id", userId);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/onboarding");
  }

  function textoRespuesta(preguntaId: string, valor: string | undefined) {
    const pregunta = PREGUNTAS.find((p) => p.id === preguntaId);
    return pregunta?.opciones.find((o) => o.valor === valor)?.texto ?? "Sin responder";
  }

  const alertas = perfil?.perfil_psicologico_ia?.alertas ?? [];

  return (
    <AppShell>
      <div className="p-10 max-w-[720px]">
        <h1 className="font-serif text-3xl text-[#E7ECE8] mb-1">Tu perfil</h1>
        <p className="text-sm text-[#7C8A82] mb-8">
          Estas respuestas ayudan a Plenti a protegerte mejor. Solo tú puedes verlas.
        </p>

        {cargando && <p className="text-sm text-[#7C8A82]">Cargando...</p>}
        {error && <p className="text-[13px] text-[#E0605A] mb-4">{error}</p>}

        {perfil && (
          <div className="flex flex-col gap-6">
            <section className="bg-[#121815] border border-[#24302A] rounded-md p-6">
              <h2 className="font-serif text-lg text-[#E7ECE8] mb-4">Cuenta</h2>
              <p className="text-[13px] text-[#7C8A82] mb-1">Correo</p>
              <p className="text-sm text-[#E7ECE8] mb-4">{perfil.email}</p>
              <label className="block text-[13px] text-[#7C8A82] mb-1.5">Nombre</label>
              <div className="flex gap-3">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="¿Cómo quieres que te llamemos?"
                  className="input"
                />
                <button
                  onClick={guardarNombre}
                  disabled={guardando}
                  className="px-5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-40"
                >
                  {guardando ? "..." : "Guardar"}
                </button>
              </div>
              {mensaje && <p className="text-[13px] text-[#34D399] mt-2">{mensaje}</p>}
            </section>

            <section className="bg-[#121815] border border-[#24302A] rounded-md p-6">
              <h2 className="font-serif text-lg text-[#E7ECE8] mb-4">Cómo operas</h2>
              {perfil.respuestas_onboarding ? (
                <div className="flex flex-col gap-4">
                  {PREGUNTAS.map((p) => (
                    <div key={p.id}>
                      <p className="text-[13px] text-[#7C8A82] mb-0.5">{p.titulo}</p>
                      <p className="text-sm text-[#E7ECE8]">
                        {textoRespuesta(p.id, perfil.respuestas_onboarding?.[p.id])}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#7C8A82]">Aún no completas el onboarding.</p>
              )}
              <button
                onClick={rehacerOnboarding}
                className="mt-6 px-5 py-2.5 border border-[#24302A] text-[#7C8A82] hover:text-[#E7ECE8] rounded text-sm transition-colors"
              >
                Rehacer onboarding
              </button>
            </section>

            <section className="bg-[#121815] border border-[#24302A] rounded-md p-6">
              <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">Tus patrones</h2>
              <p className="text-[13px] text-[#7C8A82] mb-5">
                Calculados con tu diario de operaciones. No usan IA: son solo cuentas.
              </p>

              {!historial?.historial_suficiente ? (
                <p className="text-sm text-[#7C8A82] leading-relaxed">
                  Necesitas al menos 3 operaciones registradas para ver tus patrones. Llevas{" "}
                  {historial?.total_operaciones ?? 0}.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Metrica etiqueta="Operaciones" valor={String(historial.total_operaciones)} />
                    <Metrica
                      etiqueta="Resultado acumulado"
                      valor={formatoDinero(historial.resultado_acumulado ?? 0)}
                      color={(historial.resultado_acumulado ?? 0) >= 0 ? "#34D399" : "#E0605A"}
                    />
                    <Metrica
                      etiqueta="Ganadoras / perdedoras"
                      valor={`${historial.ganadoras ?? 0} / ${historial.perdedoras ?? 0}`}
                    />
                    <Metrica
                      etiqueta="Veces que superaste tu regla"
                      valor={String(historial.veces_supero_regla_riesgo ?? 0)}
                    />
                    <Metrica
                      etiqueta="Racha actual de pérdidas"
                      valor={String(historial.racha_perdidas_actual ?? 0)}
                    />
                    <Metrica
                      etiqueta="Subiste tamaño tras perder"
                      valor={`${historial.veces_aumento_tamano_tras_perdida ?? 0} veces`}
                    />
                  </div>

                  <h3 className="text-[13px] font-medium text-[#B7C0BA] mt-6 mb-3">
                    Resultado promedio según tu estado de ánimo
                  </h3>
                  <div className="flex flex-col gap-2">
                    {ESTADOS.map(({ clave, etiqueta }) => {
                      const e = historial.por_estado_de_animo?.[clave];
                      return (
                        <div
                          key={clave}
                          className="flex items-center justify-between text-[13px] border border-[#24302A] bg-[#0E1412] rounded px-4 py-2.5"
                        >
                          <span className="text-[#E7ECE8]">{etiqueta}</span>
                          {e ? (
                            <span className="text-[#7C8A82]">
                              {e.operaciones} {e.operaciones === 1 ? "operación" : "operaciones"} ·
                              promedio{" "}
                              <span style={{ color: e.resultado_promedio >= 0 ? "#34D399" : "#E0605A" }}>
                                {formatoDinero(e.resultado_promedio)}
                              </span>{" "}
                              · {e.perdidas} {e.perdidas === 1 ? "pérdida" : "pérdidas"}
                            </span>
                          ) : (
                            <span className="text-[#4C5B54]">Sin operaciones</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[12px] text-[#4C5B54] mt-3 leading-relaxed">
                    Con pocas operaciones, estos números son orientativos: un solo resultado puede
                    mover mucho el promedio.
                  </p>
                </>
              )}
            </section>

            <section className="bg-[#121815] border border-[#24302A] rounded-md p-6">
              <h2 className="font-serif text-lg text-[#E7ECE8] mb-4">Recomendaciones para ti</h2>
              {alertas.length === 0 ? (
                <p className="text-sm text-[#7C8A82]">
                  Ninguna por ahora. Tus respuestas no activaron alertas.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {alertas.map((a) => (
                    <div key={a} className="p-3.5 bg-[#12261B] rounded flex gap-2.5 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] mt-1.5 flex-shrink-0" />
                      <p className="text-[13px] leading-relaxed text-[#8FCBAA] m-0">
                        {MENSAJES_ALERTA[a] ?? a}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Metrica({
  etiqueta,
  valor,
  color,
}: {
  etiqueta: string;
  valor: string;
  color?: string;
}) {
  return (
    <div className="bg-[#0E1412] border border-[#24302A] rounded px-4 py-3">
      <p className="text-[11.5px] text-[#7C8A82] mb-1 leading-snug">{etiqueta}</p>
      <p className="font-serif text-xl" style={{ color: color ?? "#E7ECE8" }}>
        {valor}
      </p>
    </div>
  );
}