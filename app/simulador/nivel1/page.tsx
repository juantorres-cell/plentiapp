// app/simulador/nivel1/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import QuizNivel1 from "@/components/QuizNivel1";
import { ResultadoNivel1 } from "@/lib/nivel1/tipos";

export default function Nivel1Page() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [resultado, setResultado] = useState<ResultadoNivel1 | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }
      setChecking(false);
    });
  }, [router]);

  async function manejarCompletado(res: ResultadoNivel1) {
    setResultado(res);
    setGuardando(true);

    const { data: sesion } = await supabase.auth.getSession();
    const userId = sesion.session?.user.id;
    if (!userId) return;

    // Guarda cada respuesta individual (para saber qué categorías reforzar)
    const filas = res.respuestas.map((r) => ({
      user_id: userId,
      pregunta_id: r.pregunta_id,
      categoria: r.categoria,
      correcta: r.correcta,
    }));
    await supabase.from("respuestas_nivel1").insert(filas);

    // Actualiza el progreso general del nivel (upsert por si ya lo había intentado)
    await supabase.from("progreso_simulador").upsert(
      {
        user_id: userId,
        nivel: 1,
        completado: res.puntaje >= 70, // umbral de aprobación, ajústalo si quieres
        puntaje: res.puntaje,
        fecha_completado: new Date().toISOString(),
      },
      { onConflict: "user_id,nivel" }
    );

    setGuardando(false);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E]">
        <p className="text-sm text-[#7C8A82]">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[900px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-1">
          Nivel 1 · Examen Conceptual
        </p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] mb-6">Salud Financiera y Base Técnica</h1>

        {!resultado ? (
          <QuizNivel1 onCompletar={manejarCompletado} />
        ) : (
          <div className="max-w-[600px] mx-auto text-center">
            <p className="font-serif text-4xl text-[#34D399] mb-2">{resultado.puntaje}%</p>
            <p className="text-[#7C8A82] mb-6">
              {resultado.puntaje >= 70
                ? "¡Aprobado! Ya puedes avanzar al Nivel 2."
                : "Aún no alcanzas el 70% — repasa las categorías señaladas e inténtalo de nuevo."}
            </p>

            {resultado.categorias_debiles.length > 0 && (
              <div className="bg-[#121815] border border-[#24302A] rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-[#E7ECE8] mb-2 font-medium">Categorías a reforzar:</p>
                <ul className="text-sm text-[#7C8A82] list-disc list-inside">
                  {resultado.categorias_debiles.map((c) => (
                    <li key={c}>{c.replace("_", " ")}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              disabled={guardando}
              className="border border-[#24302A] text-[#E7ECE8] hover:border-[#34D399] px-6 py-3 rounded font-medium"
            >
              {resultado.puntaje >= 70 ? "Repasar de nuevo" : "Reintentar examen"}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}