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

    router.push("/dashboard");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070A09]">
        <p className="text-sm text-[#7C8A82]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070A09] p-6">
      <div className="bg-[#121815] border border-[#24302A] max-w-[480px] w-full rounded-md p-10">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-2 text-center">
          Antes de empezar la semana
        </p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] text-center mb-2">¿Cómo llegas hoy?</h1>
        <p className="text-[13.5px] text-[#7C8A82] text-center mb-8 leading-relaxed">
          Solo te preguntamos esto una vez por semana. Tu respuesta queda registrada en tu diario, sé honesto contigo mismo.
        </p>

        <div className="flex flex-col gap-3">
          {OPCIONES.map((op) => (
            <button
              key={op.estado}
              onClick={() => setSeleccion(op.estado)}
              className={`text-left border-[1.5px] rounded-md p-4 flex gap-3.5 items-center bg-[#0E1412] transition-colors ${
                seleccion === op.estado ? "border-[#34D399] bg-[#12261B]" : "border-[#24302A]"
              }`}
            >
              <span className="text-xl">{op.emoji}</span>
              <span>
                <span className="block text-sm font-medium text-[#E7ECE8]">{op.titulo}</span>
                <span className="block text-xs text-[#7C8A82]">{op.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="¿Algo más que quieras anotar? (opcional)"
          rows={2}
          className="input w-full mt-5"
        />

        {error && <p className="text-[13px] text-[#E0605A] mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!seleccion || guardando}
          className="w-full mt-6 py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-40"
        >
          {guardando ? "Guardando..." : "Continuar"}
        </button>
      </div>
    </div>
  );
}