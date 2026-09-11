"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSemanaActual } from "@/lib/semana";
import AppShell from "@/components/AppShell";
import type { Session } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [capitalDisponible, setCapitalDisponible] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

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

      setCapitalDisponible(perfil?.capital_disponible ?? null);
      setSession(data.session);
      setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F4EE]">
        <p className="text-sm text-[#8B93A3]">Verificando sesión...</p>
      </div>
    );
  }

  const nombre = session?.user.email?.split("@")[0] ?? "";
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <AppShell>
      <div className="max-w-[880px] mx-auto px-10 py-12">
        <p className="text-[12px] uppercase tracking-wider text-[#3F6E58] font-medium mb-1">
          {saludo}
        </p>
        <h1 className="font-serif text-3xl text-[#16233B] mb-10">{nombre}</h1>

        <div className="grid grid-cols-2 gap-5 mb-10">
          <div className="bg-white border border-[#E4E0D4] rounded-lg p-6">
            <p className="text-[12px] text-[#8B93A3] mb-2">Capital disponible para invertir</p>
            <p className="font-serif text-[30px] text-[#3F6E58]">
              {capitalDisponible != null
                ? `$ ${capitalDisponible.toLocaleString("es-CO")}`
                : "Sin calcular"}
            </p>
            {capitalDisponible == null && (
              <a href="/calculadora" className="text-[12.5px] text-[#3F6E58] hover:underline">
                Calcúlalo en tu capital libre →
              </a>
            )}
          </div>
          <div className="bg-[#16233B] rounded-lg p-6 text-[#C7D0DE]">
            <p className="text-[12px] text-[#9AA5B8] mb-2">Check-in de esta semana</p>
            <p className="font-serif text-lg text-white mb-1">Completado ✓</p>
            <p className="text-[12.5px] text-[#9AA5B8]">Vuelve la próxima semana para el siguiente.</p>
          </div>
        </div>

        <p className="text-[12px] uppercase tracking-wider text-[#8B93A3] font-medium mb-3">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-3 gap-4">
          <TarjetaAcceso
            href="/operar"
            titulo="Registrar operación"
            descripcion="Genera tu bloque JSON y registra el resultado de la semana."
          />
          <TarjetaAcceso
            href="/calculadora"
            titulo="Mi capital libre"
            descripcion="Ajusta tus ingresos, gastos y cuánto destinar a inversión."
          />
          <TarjetaAcceso
            href="/diario"
            titulo="Diario de trading"
            descripcion="Revisa tu historial de operaciones y estados emocionales."
          />
        </div>
      </div>
    </AppShell>
  );
}

function TarjetaAcceso({ href, titulo, descripcion }: { href: string; titulo: string; descripcion: string }) {
  return (
    <a
      href={href}
      className="block bg-white border border-[#E4E0D4] rounded-lg p-5 hover:border-[#3F6E58] transition-colors"
    >
      <p className="text-sm font-medium text-[#16233B] mb-1.5">{titulo}</p>
      <p className="text-[12.5px] text-[#8B93A3] leading-relaxed">{descripcion}</p>
    </a>
  );
}