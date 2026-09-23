// app/simulador/nivel2/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import SimuladorGuiadoChart from "@/components/SimuladorGuiadoChart";
import { ESCENARIOS_NIVEL2 } from "@/lib/nivel2/banco-escenarios";
import { DecisionRegistrada, DecisionUsuario } from "@/lib/nivel2/tipos";

export default function Nivel2Page() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [habilitado, setHabilitado] = useState(false);
  const [indiceEscenario, setIndiceEscenario] = useState(0);
  const [decisiones, setDecisiones] = useState<DecisionRegistrada[]>([]);
  const [terminado, setTerminado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const escenario = ESCENARIOS_NIVEL2[indiceEscenario];
  const esUltimoEscenario = indiceEscenario === ESCENARIOS_NIVEL2.length - 1;

  useEffect(() => {
    async function verificar() {
      const { data: sesion } = await supabase.auth.getSession();
      if (!sesion.session) {
        router.push("/login");
        return;
      }

      // Gate: exige haber aprobado el Nivel 1 antes de entrar aquí
      const { data: progreso } = await supabase
        .from("progreso_simulador")
        .select("completado")
        .eq("user_id", sesion.session.user.id)
        .eq("nivel", 1)
        .maybeSingle();

      if (!progreso?.completado) {
        router.push("/simulador/nivel1");
        return;
      }

      setHabilitado(true);
      setChecking(false);
    }
    verificar();
  }, [router]);

  function registrarDecision(indiceVela: number, decision: DecisionUsuario, tiempoMs: number) {
    const checkpoint = escenario.checkpoints.find((c) => c.indice_vela === indiceVela)!;
    setDecisiones((prev) => [
      ...prev,
      {
        escenario_id: escenario.id,
        indice_vela: indiceVela,
        decision,
        correcta: decision === checkpoint.decision_correcta,
        tiempo_decision_ms: tiempoMs,
      },
    ]);
  }

  async function manejarFinDeEscenario() {
    if (!esUltimoEscenario) {
      setIndiceEscenario((i) => i + 1);
      return;
    }

    setTerminado(true);
    setGuardando(true);

    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;
    if (!userId) return;

    const filas = decisiones.map((d) => ({
      user_id: userId,
      escenario_id: d.escenario_id,
      checkpoint_indice: d.indice_vela,
      decision: d.decision,
      correcta: d.correcta,
      tiempo_decision_ms: d.tiempo_decision_ms,
    }));
    await supabase.from("decisiones_nivel2").insert(filas);

    const correctas = decisiones.filter((d) => d.correcta).length;
    const puntaje = Math.round((correctas / decisiones.length) * 100);

    await supabase.from("progreso_simulador").upsert(
      {
        user_id: userId,
        nivel: 2,
        completado: puntaje >= 70,
        puntaje,
        fecha_completado: new Date().toISOString(),
      },
      { onConflict: "user_id,nivel" }
    );

    setGuardando(false);
  }

  if (checking || !habilitado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E]">
        <p className="text-sm text-[#7C8A82]">Verificando progreso...</p>
      </div>
    );
  }

  const correctas = decisiones.filter((d) => d.correcta).length;
  const puntajeFinal =
    decisiones.length > 0 ? Math.round((correctas / decisiones.length) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-[900px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-1">
          Nivel 2 · Simulación Guiada
        </p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] mb-2">
          {terminado ? "Resultado del Nivel 2" : escenario.titulo}
        </h1>

        {!terminado ? (
          <>
            <p className="text-sm text-[#7C8A82] mb-6">{escenario.contexto_inicial}</p>
            <p className="text-[12px] text-[#7C8A82] mb-4">
              Escenario {indiceEscenario + 1} de {ESCENARIOS_NIVEL2.length}
            </p>
            <SimuladorGuiadoChart
              key={escenario.id}
              escenario={escenario}
              onDecision={registrarDecision}
              onTerminarEscenario={manejarFinDeEscenario}
            />
          </>
        ) : (
          <div className="max-w-[600px] mx-auto text-center">
            <p className="font-serif text-4xl text-[#34D399] mb-2">{puntajeFinal}%</p>
            <p className="text-[#7C8A82] mb-6">
              {puntajeFinal >= 70
                ? "¡Aprobado! Ya puedes avanzar al Nivel 3."
                : "Aún no alcanzas el 70% — vuelve a intentarlo prestando atención a los patrones."}
            </p>
            <button
              onClick={() => window.location.reload()}
              disabled={guardando}
              className="border border-[#24302A] text-[#E7ECE8] hover:border-[#34D399] px-6 py-3 rounded font-medium"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}