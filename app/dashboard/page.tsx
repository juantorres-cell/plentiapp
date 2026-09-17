"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSemanaActual } from "@/lib/semana";
import AppShell from "@/components/AppShell";
import TradingViewWatchlist from "@/components/TradingViewWatchlist";
import type { Session } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [capitalDisponible, setCapitalDisponible] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [nuevoSimbolo, setNuevoSimbolo] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: checkIn } = await supabase
        .from("check_ins")
        .select("id")
        .eq("user_id", data.session.user.id)
        .eq("semana", getSemanaActual())
        .eq("tipo", "entrada")
        .maybeSingle();

      if (!checkIn) {
        router.replace("/check-in");
        return;
      }

      const { data: perfil } = await supabase
        .from("profiles")
        .select("capital_disponible")
        .eq("id", data.session.user.id)
        .single();

      const { data: listaWatchlist } = await supabase
        .from("watchlist")
        .select("symbol")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: true });

      setSymbols((listaWatchlist ?? []).map((w) => w.symbol));
      setCapitalDisponible(perfil?.capital_disponible ?? null);
      setSession(data.session);
      setChecking(false);
    });
  }, [router]);

  async function agregarSimbolo() {
    if (!session || !nuevoSimbolo.trim()) return;
    const symbol = nuevoSimbolo.trim().toUpperCase();
    if (symbols.includes(symbol)) {
      setNuevoSimbolo("");
      return;
    }
    const { error } = await supabase.from("watchlist").insert({ user_id: session.user.id, symbol });
    if (!error) {
      setSymbols([...symbols, symbol]);
      setNuevoSimbolo("");
    }
  }

  async function quitarSimbolo(symbol: string) {
    if (!session) return;
    await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("symbol", symbol);
    setSymbols(symbols.filter((s) => s !== symbol));
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E]">
        <p className="text-sm text-[#7C8A82]">Verificando sesión...</p>
      </div>
    );
  }

  const nombre = session?.user.email?.split("@")[0] ?? "";
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <AppShell>
      <div className="px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium mb-1">{saludo}</p>
        <h1 className="font-serif text-3xl text-[#E7ECE8] mb-10">{nombre}</h1>

        {/* --- Sección de acciones: todo el ancho disponible --- */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-[#E7ECE8]">Tus acciones</h2>
            <div className="flex gap-2">
              <input
                value={nuevoSimbolo}
                onChange={(e) => setNuevoSimbolo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarSimbolo()}
                placeholder="Ej: NVDA"
                className="text-sm px-3 py-1.5 bg-[#121815] border border-[#24302A] rounded w-28 text-[#E7ECE8] outline-none focus:border-[#34D399]"
              />
              <button onClick={agregarSimbolo} className="text-sm px-3 py-1.5 bg-[#34D399] text-[#0B0F0E] font-medium rounded">
                Agregar
              </button>
            </div>
          </div>

          {symbols.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {symbols.map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-[12.5px] bg-[#12261B] text-[#34D399] px-2.5 py-1 rounded-full">
                  {s}
                  <button onClick={() => quitarSimbolo(s)} className="text-[#34D399]/70 hover:text-[#E0605A]">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <TradingViewWatchlist symbols={symbols} />
        </div>

        {/* --- Resumen: capital, check-in, accesos --- */}
        <div className="max-w-[880px]">
          <div className="grid grid-cols-2 gap-5 mb-8">
            <div className="bg-[#121815] border border-[#24302A] rounded-lg p-6">
              <p className="text-[12px] text-[#7C8A82] mb-2">Capital disponible para invertir</p>
              <p className="font-serif text-[28px] text-[#34D399]">
                {capitalDisponible != null ? `$ ${capitalDisponible.toLocaleString("es-CO")}` : "Sin calcular"}
              </p>
              {capitalDisponible == null && (
                <a href="/calculadora" className="text-[12.5px] text-[#34D399] hover:underline">
                  Calcúlalo en tu capital libre →
                </a>
              )}
            </div>
            <div className="bg-[#12261B] border border-[#1E3A2A] rounded-lg p-6">
              <p className="text-[12px] text-[#5F9E80] mb-2">Check-in de esta semana</p>
              <p className="font-serif text-lg text-[#E7ECE8] mb-1">Completado ✓</p>
              <p className="text-[12.5px] text-[#5F9E80]">Vuelve la próxima semana para el siguiente.</p>
            </div>
          </div>

          <p className="text-[12px] uppercase tracking-wider text-[#7C8A82] font-medium mb-3">Accesos rápidos</p>
          <div className="grid grid-cols-3 gap-4">
            <TarjetaAcceso href="/operar" titulo="Registrar operación" descripcion="Genera tu bloque JSON y registra el resultado de la semana." />
            <TarjetaAcceso href="/calculadora" titulo="Mi capital libre" descripcion="Ajusta tus ingresos, gastos y cuánto destinar a inversión." />
            <TarjetaAcceso href="/diario" titulo="Diario de trading" descripcion="Revisa tu historial de operaciones y estados emocionales." />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TarjetaAcceso({ href, titulo, descripcion }: { href: string; titulo: string; descripcion: string }) {
  return (
    <a href={href} className="block bg-[#121815] border border-[#24302A] rounded-lg p-5 hover:border-[#34D399] transition-colors">
      <p className="text-sm font-medium text-[#E7ECE8] mb-1.5">{titulo}</p>
      <p className="text-[12.5px] text-[#7C8A82] leading-relaxed">{descripcion}</p>
    </a>
  );
}