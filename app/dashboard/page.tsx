"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      } else {
        setSession(data.session);
        setChecking(false);
      }
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
      <p className="text-sm text-[#8B93A3]">
        Esta ruta ya está protegida — si borras tu sesión o abres esta URL
        sin haber iniciado sesión, te devuelve automáticamente al login.
      </p>
    </div>
  );
}