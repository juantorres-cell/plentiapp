"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSemanaActual } from "@/lib/semana";

type Estado = "bien" | "medio" | "mal";

const OPCIONES: { estado: Estado; emoji: string; titulo: string; desc: string }[] = [
  { estado: "bien", emoji: "🙂", titulo: "Tranquilo y enfocado", desc: "Puedes operar con normalidad esta semana." },
  { estado: "medio", emoji: "😐", titulo: "Un poco disperso o ansioso", desc: "Sigue adelante, pero presta atención a tus decisiones." },
  { estado: "mal", emoji: "😣", titulo: "Frustrado, eufórico o alterado", desc: "Te recomendamos operar con más cautela esta semana." },
];

export default function CheckInPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Estado | null>(null);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const semana = getSemanaActual();

  useEffect(() => {
    async function verificar() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }
      const uid = sessionData.session.user.id;
      setUserId(uid);

      // ¿Ya hizo el check-in de entrada esta semana? Si sí, no lo repetimos.
      const { data: existente } = await supabase
        .from("check_ins")
        .select("id")
        .eq("user_id", uid)
        .eq("semana", semana)
        .eq("tipo", "entrada")
        .maybeSingle();

      if (existente) {
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    }
    verificar();
  }, [router, semana]);

  async function handleSubmit() {
    if (!seleccion || !userId) return;
    setGuardando(true);
    setError(null);

    const { error } = await supabase.from("check_ins").insert({
      user_id: userId,
      semana,
      tipo: "entrada",
      estado_animo: seleccion,
      nota: nota || null,
    });

    setGuardando(false);

    if (error) {
      setError(error.message);
      return;
    }

    // TODO (siguiente paso del roadmap): si seleccion === "mal",
    // redirigir a un "Modo Simulador" en vez del dashboard normal.
    router.push("/dashboard");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#16233B]">
        <p className="text-sm text-[#C7D0DE]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#16233B] p-6">
      <div className="bg-[#F6F4EE] max-w-[480px] w-full rounded-md p-10">
        <p className="text-[12px] uppercase tracking-wider text-[#3F6E58] font-medium mb-2 text-center">
          Antes de empezar la semana
        </p>
        <h1 className="font-serif text-2xl text-[#16233B] text-center mb-2">
          ¿Cómo llegas hoy?
        </h1>
        <p className="text-[13.5px] text-[#8B93A3] text-center mb-8 leading-relaxed">
          Solo te preguntamos esto una vez por semana. Tu respuesta queda
          registrada en tu diario, sé honesto contigo mismo.
        </p>

        <div className="flex flex-col gap-3">
          {OPCIONES.map((op) => (
            <button
              key={op.estado}
              onClick={() => setSeleccion(op.estado)}
              className={`text-left border-[1.5px] rounded-md p-4 flex gap-3.5 items-center bg-white transition-colors ${
                seleccion === op.estado
                  ? "border-[#3F6E58] bg-[#E7EFE9]"
                  : "border-[#E4E0D4]"
              }`}
            >
              <span className="text-xl">{op.emoji}</span>
              <span>
                <span className="block text-sm font-medium text-[#16233B]">{op.titulo}</span>
                <span className="block text-xs text-[#8B93A3]">{op.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="¿Algo más que quieras anotar? (opcional)"
          rows={2}
          className="w-full mt-5 p-3 text-sm border border-[#E4E0D4] rounded bg-white outline-none focus:border-[#3F6E58]"
        />

        {error && <p className="text-[13px] text-[#A85A34] mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!seleccion || guardando}
          className="w-full mt-6 py-3.5 bg-[#16233B] text-white rounded text-sm font-medium disabled:opacity-40"
        >
          {guardando ? "Guardando..." : "Continuar"}
        </button>
      </div>
    </div>
  );
}