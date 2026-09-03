"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message
      );
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1.3fr_1fr] font-[system-ui]">
      {/* Panel izquierdo: confianza */}
      <div className="bg-[#16233B] text-[#C7D0DE] flex flex-col justify-between p-10 md:p-16">
        <div className="font-serif text-xl font-medium text-white tracking-wide">
          plenti<span className="font-sans text-[#3F6E58]">.trade</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-serif font-normal text-3xl md:text-[38px] leading-tight text-white mb-5">
            Antes de operar, revisamos cómo llegas hoy.
          </h1>
          <p className="text-sm leading-relaxed text-[#C7D0DE] max-w-sm">
            Plenti protege tu capital tanto del mercado como de tus propias
            emociones. Cada sesión empieza con un chequeo simple, y cada
            operación respeta tu regla del 1%, sin excepciones.
          </p>
        </div>

        <div className="flex gap-10 flex-wrap border-t border-white/10 pt-7">
          <div className="max-w-[200px]">
            <p className="font-serif text-2xl text-white mb-1">1%</p>
            <p className="text-[13px] text-[#C7D0DE] leading-relaxed">
              Riesgo máximo por operación, calculado automáticamente.
            </p>
          </div>
          <div className="max-w-[200px]">
            <p className="font-serif text-2xl text-white mb-1">Check-in</p>
            <p className="text-[13px] text-[#C7D0DE] leading-relaxed">
              Tu estado de ánimo decide si operas en real o en modo simulador.
            </p>
          </div>
          <div className="max-w-[200px]">
            <p className="font-serif text-2xl text-white mb-1">Diario</p>
            <p className="text-[13px] text-[#C7D0DE] leading-relaxed">
              Cada decisión queda registrada para que aprendas de ella.
            </p>
          </div>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="bg-[#F6F4EE] flex items-center justify-center p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[360px]">
          <h2 className="font-serif font-normal text-2xl text-[#16233B] mb-1.5">
            Inicia sesión
          </h2>
          <p className="text-sm text-[#8B93A3] mb-8">
            Entra a tu cuenta para continuar tu seguimiento.
          </p>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#223652] mb-1.5">
              Correo institucional
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              className="w-full px-3.5 py-3 text-sm border border-[#E4E0D4] rounded bg-white text-[#16233B] outline-none focus:border-[#3F6E58]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#223652] mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full px-3.5 py-3 text-sm border border-[#E4E0D4] rounded bg-white text-[#16233B] outline-none focus:border-[#3F6E58]"
            />
          </div>

          <div className="flex items-center justify-between my-6 text-[13px]">
            <label className="flex items-center gap-2 text-[#8B93A3]">
              <input type="checkbox" className="accent-[#3F6E58]" />
              Recordarme
            </label>
            <a href="#" className="text-[#3F6E58] hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {error && (
            <p className="text-[13px] text-[#A85A34] mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#16233B] text-white rounded text-sm font-medium hover:bg-[#223652] transition-colors disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar a mi cuenta"}
          </button>

          <p className="text-center text-[13px] text-[#8B93A3] mt-5">
            ¿No tienes cuenta?{" "}
            <a href="/registro" className="text-[#16233B] font-medium hover:underline">
              Regístrate
            </a>
          </p>

          <div className="mt-7 p-3.5 bg-[#E7EFE9] rounded flex gap-2.5 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3F6E58] mt-1.5 flex-shrink-0" />
            <p className="text-[12.5px] leading-relaxed text-[#2E4A3C] m-0">
              Al entrar te preguntaremos cómo te sientes hoy. Si detectamos
              ansiedad o euforia, pasarás a modo simulador para proteger tu
              capital.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}