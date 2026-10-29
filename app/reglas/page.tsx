"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import CuestionarioReglas from "@/components/CuestionarioReglas";
import type { RecomendacionReglas, RespuestasCuestionario } from "@/lib/reglas/cuestionario";
import { columnasLegacy, construirConfig, construirRespuestasGuardadas } from "@/lib/reglas/aplicar";

export default function ReglasPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [regla1Activa, setRegla1Activa] = useState(true);
  const [riesgoMaximoPct, setRiesgoMaximoPct] = useState(1);
  const [baseCalculoRiesgo, setBaseCalculoRiesgo] = useState<"capital_total" | "capital_invertido">("capital_total");

  const [limitePortafolioActiva, setLimitePortafolioActiva] = useState(false);
  const [limitePortafolioPct, setLimitePortafolioPct] = useState(5);

  const [unaOperacionActiva, setUnaOperacionActiva] = useState(false);
  const [mostrandoCuestionario, setMostrandoCuestionario] = useState(false);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [aplicando, setAplicando] = useState(false);
  const [errorCuestionario, setErrorCuestionario] = useState<string | null>(null);

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
          "regla_1_activa, riesgo_maximo_pct, base_calculo_riesgo, limite_portafolio_activa, limite_portafolio_pct, una_operacion_semana_activa, perfil_psicologico_ia"
        )
        .eq("id", data.session.user.id)
        .single();

      if (perfil) {
        setRegla1Activa(perfil.regla_1_activa ?? true);
        setRiesgoMaximoPct(perfil.riesgo_maximo_pct ?? 1);
        setBaseCalculoRiesgo(perfil.base_calculo_riesgo ?? "capital_total");
        setLimitePortafolioActiva(perfil.limite_portafolio_activa ?? false);
        setLimitePortafolioPct(perfil.limite_portafolio_pct ?? 5);
        setUnaOperacionActiva(perfil.una_operacion_semana_activa ?? false);
        const alertasPerfil = (perfil.perfil_psicologico_ia as { alertas?: unknown } | null)?.alertas;
        setAlertas(Array.isArray(alertasPerfil) ? alertasPerfil.filter((a): a is string => typeof a === "string") : []);
      }
      setCargando(false);
    });
  }, [router]);

  async function guardar() {
    if (!userId) return;
    setGuardando(true);
    setMensaje(null);

    const { data: filas, error } = await supabase
      .from("profiles")
      .update({
        regla_1_activa: regla1Activa,
        riesgo_maximo_pct: riesgoMaximoPct,
        base_calculo_riesgo: baseCalculoRiesgo,
        limite_portafolio_activa: limitePortafolioActiva,
        limite_portafolio_pct: limitePortafolioPct,
        una_operacion_semana_activa: unaOperacionActiva,
      })
      .eq("id", userId)
      .select("id");

    setGuardando(false);
    setMensaje(
      error
        ? error.message
        : !filas || filas.length === 0
          ? "No se guardó ningún cambio. Revisa las políticas RLS de profiles."
          : "Reglas guardadas. Se aplicarán en tu próxima operación."
    );
  }

  async function aplicarRecomendacion(respuestas: RespuestasCuestionario, recomendacion: RecomendacionReglas) {
    if (!userId) return;
    setAplicando(true);
    setErrorCuestionario(null);
    const ahora = new Date().toISOString();
    const legacy = columnasLegacy(recomendacion);

    const { data: filas, error } = await supabase
      .from("profiles")
      .update({
        ...legacy,
        respuestas_cuestionario: construirRespuestasGuardadas(respuestas, alertas, ahora),
        reglas_config: construirConfig(recomendacion, ahora),
      })
      .eq("id", userId)
      .select("id");

    setAplicando(false);
    if (error) {
      setErrorCuestionario(error.message);
      return;
    }
    if (!filas || filas.length === 0) {
      setErrorCuestionario("No se guardó ningún cambio. Revisa las políticas RLS de profiles.");
      return;
    }
    setRegla1Activa(legacy.regla_1_activa);
    setRiesgoMaximoPct(legacy.riesgo_maximo_pct);
    setLimitePortafolioActiva(legacy.limite_portafolio_activa);
    setLimitePortafolioPct(legacy.limite_portafolio_pct);
    setUnaOperacionActiva(legacy.una_operacion_semana_activa);
    setMostrandoCuestionario(false);
    setMensaje("Reglas aplicadas. Puedes ajustarlas abajo cuando quieras.");
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E]">
        <p className="text-sm text-[#7C8A82]">Cargando...</p>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[720px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-1">
          Gestión de riesgo
        </p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] mb-2">Tus reglas</h1>
        <p className="text-[13.5px] text-[#7C8A82] mb-8 leading-relaxed">
          Estas reglas son tuyas — puedes activarlas, desactivarlas o ajustar los porcentajes
          en cualquier momento. Cuando están activas, aparecen como una guía en el formulario
          de "Operar" antes de que confirmes una operación.
        </p>

        <div className="bg-[#121815] border border-[#24302A] rounded-lg p-5 mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#E7ECE8] mb-1">¿No sabes qué reglas elegir?</p>
            <p className="text-[12.5px] text-[#7C8A82] leading-relaxed">
              Responde 6 preguntas y te sugerimos reglas según cómo operas. Después puedes ajustarlas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrandoCuestionario(true)}
            className="px-4 py-2.5 border border-[#34D399] text-[#34D399] rounded text-sm font-medium whitespace-nowrap"
          >
            Ayúdame a elegir
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <ReglaCard
            titulo="Regla del 1%"
            descripcion="Al llenar una operación, te avisamos si el riesgo (distancia entre tu precio de referencia y tu stop loss, multiplicado por la cantidad) supera este porcentaje de tu capital disponible."
            activa={regla1Activa}
            onToggle={() => setRegla1Activa(!regla1Activa)}
          >
            {regla1Activa && (
              <div className="flex flex-col gap-4">
                <CampoPorcentaje label="Riesgo máximo por operación" valor={riesgoMaximoPct} onChange={setRiesgoMaximoPct} />

                <div>
                  <p className="text-[13px] text-[#B7C0BA] mb-2">¿Sobre qué se calcula el riesgo?</p>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-start gap-2.5 text-[12.5px] text-[#7C8A82] cursor-pointer">
                      <input
                        type="radio"
                        checked={baseCalculoRiesgo === "capital_total"}
                        onChange={() => setBaseCalculoRiesgo("capital_total")}
                        className="mt-0.5 accent-[#34D399]"
                      />
                      <span>
                        <span className="text-[#E7ECE8] font-medium">Capital total disponible</span> — recomendado. Protege
                        tu cuenta completa, sin importar el tamaño de la posición.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-[12.5px] text-[#7C8A82] cursor-pointer">
                      <input
                        type="radio"
                        checked={baseCalculoRiesgo === "capital_invertido"}
                        onChange={() => setBaseCalculoRiesgo("capital_invertido")}
                        className="mt-0.5 accent-[#34D399]"
                      />
                      <span>
                        <span className="text-[#E7ECE8] font-medium">Monto invertido en esta operación</span> — más
                        permisivo con posiciones grandes.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </ReglaCard>

          <ReglaCard
            titulo="Límite de portafolio por posición"
            descripcion="Te avisamos si el monto total que vas a invertir en una sola acción supera este porcentaje de tu capital disponible — para evitar concentrar todo en una sola apuesta."
            activa={limitePortafolioActiva}
            onToggle={() => setLimitePortafolioActiva(!limitePortafolioActiva)}
          >
            {limitePortafolioActiva && (
              <CampoPorcentaje label="Máximo del portafolio en una posición" valor={limitePortafolioPct} onChange={setLimitePortafolioPct} />
            )}
          </ReglaCard>

          <ReglaCard
            titulo="Una operación por semana"
            descripcion={'La "regla del 1111": si ya registraste una operación esta semana, te lo recordamos antes de que registres otra.'}
            activa={unaOperacionActiva}
            onToggle={() => setUnaOperacionActiva(!unaOperacionActiva)}
          />
        </div>

        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full mt-8 py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar reglas"}
        </button>
        {mensaje && <p className="text-[12.5px] text-[#7C8A82] mt-3">{mensaje}</p>}
      </div>

      {mostrandoCuestionario && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0B0F0E]" role="dialog" aria-modal="true" aria-label="Elegir reglas">
          <CuestionarioReglas
            alertas={alertas}
            aplicando={aplicando}
            error={errorCuestionario}
            onAplicar={aplicarRecomendacion}
            onCancelar={() => {
              setMostrandoCuestionario(false);
              setErrorCuestionario(null);
            }}
          />
        </div>
      )}
    </AppShell>
  );
}

function ReglaCard({
  titulo,
  descripcion,
  activa,
  onToggle,
  children,
}: {
  titulo: string;
  descripcion: string;
  activa: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[#121815] border border-[#24302A] rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#E7ECE8] mb-1.5">{titulo}</p>
          <p className="text-[12.5px] text-[#7C8A82] leading-relaxed">{descripcion}</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
            activa ? "bg-[#34D399]" : "bg-[#24302A]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#0B0F0E] transition-transform ${
              activa ? "right-0.5" : "left-0.5"
            }`}
          />
        </button>
      </div>
      {children && <div className="mt-4 pt-4 border-t border-[#1B2420]">{children}</div>}
    </div>
  );
}

function CampoPorcentaje({ label, valor, onChange }: { label: string; valor: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-2">
        <span className="text-[#B7C0BA]">{label}</span>
        <span className="font-medium text-[#34D399]">{valor}%</span>
      </div>
      <input
        type="range"
        min={0.5}
        max={10}
        step={0.5}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#34D399]"
      />
    </div>
  );
}