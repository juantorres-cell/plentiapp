"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSemanaActual } from "@/lib/semana";
import type { Session } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }

      // ¿Ya hizo el check-in de esta semana? Si no, lo mandamos primero allá.
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

      setSession(data.session);
      setChecking(false);
    });

    // Si la sesión se cierra en otra pestaña, saca al usuario también aquí.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) router.push("/login");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F4EE]">
        <p className="text-sm text-[#8B93A3]">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] p-10">
      <div className="flex justify-between items-center mb-10">
        <div className="font-serif text-xl text-[#16233B]">
          plenti<span className="text-[#3F6E58]">.trade</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-[13px] text-[#8B93A3] hover:text-[#16233B]"
        >
          Cerrar sesión
        </button>
      </div>

      <h1 className="font-serif text-2xl text-[#16233B] mb-2">
        Bienvenido, {session?.user.email}
      </h1>
      <p className="text-sm text-[#8B93A3] mb-6">
        Esta ruta ya está protegida — si borras tu sesión o abres esta URL
        sin haber iniciado sesión, te devuelve automáticamente al login.
      </p>

      <div className="flex gap-3">
        <a
          href="/operar"
          className="inline-block py-2.5 px-5 bg-[#16233B] text-white rounded text-sm"
        >
          Registrar operación de esta semana
        </a>
        <a
          href="/calculadora"
          className="inline-block py-2.5 px-5 border border-[#E4E0D4] rounded text-sm text-[#16233B]"
        >
          Mi capital libre
        </a>
        <a
          href="/diario"
          className="inline-block py-2.5 px-5 border border-[#E4E0D4] rounded text-sm text-[#16233B]"
        >
          Diario de trading
        </a>
      </div>
    </div>
  );
}