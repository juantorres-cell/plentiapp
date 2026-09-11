"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";

type Operacion = {
  semana: string;
  fecha: string;
  activo: string | null;
  cantidad: number | null;
  resultado: number | null;
  capital_final: number | null;
  leccion_aprendida: string | null;
};

type CheckIn = {
  semana: string;
  tipo: "entrada" | "salida";
  estado_animo: "bien" | "medio" | "mal";
};

const EMOJI: Record<string, string> = { bien: "🙂", medio: "😐", mal: "😣" };

export default function DiarioPage() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

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
        .select("semana, fecha, activo, cantidad, resultado, capital_final, leccion_aprendida")
        .eq("user_id", uid)
        .order("semana", { ascending: false });

      const { data: cis } = await supabase
        .from("check_ins")
        .select("semana, tipo, estado_animo")
        .eq("user_id", uid);

      setOperaciones(ops ?? []);
      setCheckIns(cis ?? []);
      setCargando(false);
    }
    cargar();
  }, [router]);

  // Unimos todas las semanas que aparecen en cualquiera de las dos tablas,
  // para que también se vean semanas donde solo hiciste check-in sin operar.
  const semanas = Array.from(
    new Set([...operaciones.map((o) => o.semana), ...checkIns.map((c) => c.semana)])
  ).sort((a, b) => (a < b ? 1 : -1));

  function emocion(semana: string, tipo: "entrada" | "salida") {
    return checkIns.find((c) => c.semana === semana && c.tipo === tipo)?.estado_animo ?? null;
  }

  function operacion(semana: string) {
    return operaciones.find((o) => o.semana === semana) ?? null;
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F4EE]">
        <p className="text-sm text-[#8B93A3]">Cargando...</p>
      </div>
    );
  }

  const operacionesConResultado = operaciones.filter((o) => o.resultado != null);
  const gananciaAcumulada = operacionesConResultado.reduce((acc, o) => acc + Number(o.resultado), 0);
  const semanasGanadoras = operacionesConResultado.filter((o) => Number(o.resultado) >= 0).length;

  return (
    <AppShell>
    <div className="max-w-[980px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#3F6E58] font-medium mb-1">
          Historial
        </p>
        <h1 className="font-serif text-2xl text-[#16233B] mb-8">Diario de trading</h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#E4E0D4] rounded-lg p-5">
            <p className="text-[12px] text-[#8B93A3] mb-1.5">Semanas registradas</p>
            <p className="font-serif text-2xl text-[#16233B]">{semanas.length}</p>
          </div>
          <div className="bg-white border border-[#E4E0D4] rounded-lg p-5">
            <p className="text-[12px] text-[#8B93A3] mb-1.5">Resultado acumulado</p>
            <p className={`font-serif text-2xl ${gananciaAcumulada >= 0 ? "text-[#3F6E58]" : "text-[#A85A34]"}`}>
              $ {gananciaAcumulada.toLocaleString("es-CO")}
            </p>
          </div>
          <div className="bg-white border border-[#E4E0D4] rounded-lg p-5">
            <p className="text-[12px] text-[#8B93A3] mb-1.5">Semanas positivas</p>
            <p className="font-serif text-2xl text-[#16233B]">
              {semanasGanadoras} / {operacionesConResultado.length || 0}
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E4E0D4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase text-[#8B93A3] border-b border-[#E4E0D4] bg-[#FAF9F5]">
                <th className="text-left px-5 py-3.5 font-medium">Semana</th>
                <th className="text-center px-3 py-3.5 font-medium">Entrada</th>
                <th className="text-left px-5 py-3.5 font-medium">Activo</th>
                <th className="text-right px-5 py-3.5 font-medium">Resultado</th>
                <th className="text-right px-5 py-3.5 font-medium">Capital final</th>
                <th className="text-center px-3 py-3.5 font-medium">Salida</th>
                <th className="text-left px-5 py-3.5 font-medium">Lección</th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((semana, i) => {
                const op = operacion(semana);
                const entrada = emocion(semana, "entrada");
                const salida = emocion(semana, "salida");
                return (
                  <tr
                    key={semana}
                    className={`border-b border-[#F0EEE6] last:border-none ${i % 2 === 1 ? "bg-[#FCFBF8]" : ""}`}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap font-medium text-[#16233B]">{semana}</td>
                    <td className="px-3 py-3.5 text-lg text-center">{entrada ? EMOJI[entrada] : "—"}</td>
                    <td className="px-5 py-3.5">{op?.activo ?? <span className="text-[#C7C2B3]">—</span>}</td>
                    <td className="px-5 py-3.5 text-right">
                      {op?.resultado != null ? (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[12.5px] font-medium tabular-nums ${
                            op.resultado >= 0
                              ? "bg-[#E7EFE9] text-[#2E4A3C]"
                              : "bg-[#F3E4DA] text-[#7A4425]"
                          }`}
                        >
                          $ {op.resultado.toLocaleString("es-CO")}
                        </span>
                      ) : (
                        <span className="text-[#C7C2B3]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {op?.capital_final != null
                        ? `$ ${op.capital_final.toLocaleString("es-CO")}`
                        : <span className="text-[#C7C2B3]">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-lg text-center">{salida ? EMOJI[salida] : "—"}</td>
                    <td className="px-5 py-3.5 text-[#8B93A3] max-w-[220px]">
                      {op?.leccion_aprendida ?? <span className="text-[#C7C2B3]">—</span>}
                    </td>
                  </tr>
                );
              })}
              {semanas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[#8B93A3]">
                    Todavía no tienes registros. Empieza con tu check-in semanal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
    </AppShell>
  );
}