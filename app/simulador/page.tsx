"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import SimuladorChart from "@/components/SimuladorChart";
import type { CandlestickData } from "lightweight-charts";

type Nivel = "principiante" | "intermedio" | "avanzado";

// Un escenario por nivel. Se puede seguir agregando más adelante,
// o mover a una tabla de Supabase si quieres que crezcan con el tiempo.
const ESCENARIOS: Record<Nivel, { contexto: string; data: CandlestickData[] }> = {
  principiante: {
    contexto: "Tendencia alcista clara y sostenida, sin señales de reversión todavía.",
    data: [
      { time: "2026-09-01", open: 90, high: 94, low: 89, close: 93 },
      { time: "2026-09-02", open: 93, high: 97, low: 92, close: 96 },
      { time: "2026-09-03", open: 96, high: 100, low: 95, close: 99 },
      { time: "2026-09-04", open: 99, high: 103, low: 98, close: 102 },
    ],
  },
  intermedio: {
    contexto:
      "Tendencia bajista que acaba de formar una vela martillo alcista rebotando en un soporte histórico de precio 90.",
    data: [
      { time: "2026-09-01", open: 100, high: 105, low: 98, close: 99 },
      { time: "2026-09-02", open: 99, high: 100, low: 90, close: 92 },
      { time: "2026-09-03", open: 92, high: 95, low: 90, close: 91 },
      { time: "2026-09-04", open: 91, high: 98, low: 90, close: 97 },
    ],
  },
  avanzado: {
    contexto:
      "Mercado lateral con volatilidad creciente y una ruptura falsa de resistencia (falso quiebre alcista que revirtió el mismo día).",
    data: [
      { time: "2026-09-01", open: 100, high: 102, low: 98, close: 101 },
      { time: "2026-09-02", open: 101, high: 103, low: 99, close: 100 },
      { time: "2026-09-03", open: 100, high: 108, low: 99, close: 102 },
      { time: "2026-09-04", open: 102, high: 104, low: 95, close: 96 },
    ],
  },
};

export default function SimuladorPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [nivel, setNivel] = useState<Nivel>("intermedio");
  const [tutorMensaje, setTutorMensaje] = useState(
    "¡Bienvenido al simulador! Elige un nivel y fíjate bien en el gráfico antes de decidir."
  );
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }
      setChecking(false);
    });
  }, [router]);

  async function consultarTutor(accion: "Comprar" | "Vender" | "Esperar") {
    if (cargando) return; // evita doble click mientras responde
    setCargando(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextoGrafico: ESCENARIOS[nivel].contexto,
          accionUsuario: accion,
        }),
      });
      const data = await res.json();
      setTutorMensaje(data.respuesta);
    } catch {
      setTutorMensaje("Hubo un error al conectar con el tutor.");
    }
    setCargando(false);
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
          Práctica sin riesgo
        </p>
        <h1 className="font-serif text-2xl text-[#E7ECE8] mb-6">Simulador</h1>

        <div className="flex gap-2 mb-6">
          {(["principiante", "intermedio", "avanzado"] as Nivel[]).map((n) => (
            <button
              key={n}
              onClick={() => setNivel(n)}
              className={`px-4 py-1.5 rounded-full text-[13px] capitalize border ${
                nivel === n
                  ? "bg-[#12261B] border-[#34D399] text-[#34D399]"
                  : "border-[#24302A] text-[#7C8A82]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="bg-[#121815] border-l-4 border-[#34D399] rounded-lg p-4 mb-6">
          <p className="text-sm text-[#E7ECE8]">
            <strong>🤖 Coach Plenti:</strong> {cargando ? "Pensando..." : tutorMensaje}
          </p>
        </div>

        <div className="bg-[#0E1412] border border-[#24302A] rounded-lg p-2 mb-6">
          <SimuladorChart data={ESCENARIOS[nivel].data} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => consultarTutor("Comprar")}
            disabled={cargando}
            className="flex-1 bg-[#34D399] text-[#0B0F0E] hover:opacity-90 px-6 py-3 rounded font-medium disabled:opacity-50"
          >
            Comprar
          </button>
          <button
            onClick={() => consultarTutor("Esperar")}
            disabled={cargando}
            className="flex-1 border border-[#24302A] text-[#E7ECE8] hover:border-[#34D399] px-6 py-3 rounded font-medium disabled:opacity-50"
          >
            Esperar
          </button>
          <button
            onClick={() => consultarTutor("Vender")}
            disabled={cargando}
            className="flex-1 bg-[#E0605A] text-[#0B0F0E] hover:opacity-90 px-6 py-3 rounded font-medium disabled:opacity-50"
          >
            Vender
          </button>
        </div>
      </div>
    </AppShell>
  );
}