"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  PREGUNTAS,
  MENSAJES_ALERTA,
  construirPerfil,
  type RespuestasOnboarding,
} from "@/lib/onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState<Partial<RespuestasOnboarding>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<string[] | null>(null);

  useEffect(() => {
    async function verificar() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }
      const uid = sessionData.session.user.id;
      setUserId(uid);

      const { data: perfil } = await supabase
        .from("profiles")
        .select("onboarding_completo")
        .eq("id", uid)
        .single();

      if (perfil?.onboarding_completo) {
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    }
    verificar();
  }, [router]);

  const pregunta = PREGUNTAS[paso];
  const seleccionado = respuestas[pregunta?.id];
  const esUltima = paso === PREGUNTAS.length - 1;

  async function handleSiguiente() {
    if (!seleccionado || !userId) return;
    if (!esUltima) {
      setPaso(paso + 1);
      return;
    }

    setGuardando(true);
    setError(null);

    const completas = respuestas as RespuestasOnboarding;
    const perfil = construirPerfil(completas);

    const { error } = await supabase
      .from("profiles")
      .update({
        respuestas_onboarding: completas,
        perfil_psicologico_ia: perfil,
        onboarding_completo: true,
      })
      .eq("id", userId);

    setGuardando(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (perfil.alertas.length > 0) {
      setAlertas(perfil.alertas);
    } else {
      router.push("/check-in");
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070A09]">
        <p className="text-sm text-[#7C8A82]">Cargando...</p>
      </div>
    );
  }

  if (alertas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070A09] p-6">
        <div className="bg-[#121815] border border-[#24302A] max-w-[480px] w-full rounded-md p-10">
          <h1 className="font-serif text-2xl text-[#E7ECE8] text-center mb-2">
            Tenlo presente
          </h1>
          <p className="text-[13.5px] text-[#7C8A82] text-center mb-6 leading-relaxed">
            Según tus respuestas, estas recomendaciones te pueden servir:
          </p>
          <div className="flex flex-col gap-3">
            {alertas.map((a) => (
              <div key={a} className="p-3.5 bg-[#12261B] rounded flex gap-2.5 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] mt-1.5 flex-shrink-0" />
                <p className="text-[13px] leading-relaxed text-[#8FCBAA] m-0">
                  {MENSAJES_ALERTA[a]}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push("/check-in")}
            className="w-full mt-6 py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070A09] p-6">
      <div className="bg-[#121815] border border-[#24302A] max-w-[480px] w-full rounded-md p-10">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-2 text-center">
          Paso {paso + 1} de {PREGUNTAS.length}
        </p>
        <div className="flex gap-1.5 mb-6">
          {PREGUNTAS.map((p, i) => (
            <div
              key={p.id}
              className={`h-1 flex-1 rounded ${i <= paso ? "bg-[#34D399]" : "bg-[#24302A]"}`}
            />
          ))}
        </div>

        {paso === 0 && (
          <>
            <h1 className="font-serif text-2xl text-[#E7ECE8] text-center mb-2">
              Cuéntanos cómo operas
            </h1>
            <p className="text-[13.5px] text-[#7C8A82] text-center mb-6 leading-relaxed">
              No hay respuestas correctas. Sirven para proteger tu capital, así que sé honesto.
            </p>
          </>
        )}

        <h2 className="text-[15px] font-medium text-[#E7ECE8] mb-4 leading-snug">
          {pregunta.titulo}
        </h2>

        <div className="flex flex-col gap-3">
          {pregunta.opciones.map((op) => (
            <button
              key={op.valor}
              onClick={() => setRespuestas({ ...respuestas, [pregunta.id]: op.valor })}
              className={`text-left border-[1.5px] rounded-md p-4 bg-[#0E1412] text-sm text-[#E7ECE8] transition-colors ${
                seleccionado === op.valor ? "border-[#34D399] bg-[#12261B]" : "border-[#24302A]"
              }`}
            >
              {op.texto}
            </button>
          ))}
        </div>

        {error && <p className="text-[13px] text-[#E0605A] mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          {paso > 0 && (
            <button
              onClick={() => setPaso(paso - 1)}
              disabled={guardando}
              className="px-5 py-3.5 border border-[#24302A] text-[#7C8A82] rounded text-sm disabled:opacity-40"
            >
              Atrás
            </button>
          )}
          <button
            onClick={handleSiguiente}
            disabled={!seleccionado || guardando}
            className="flex-1 py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-40"
          >
            {guardando ? "Guardando..." : esUltima ? "Finalizar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}