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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1.3fr_1fr] bg-[#0B0F0E]">
      <div className="bg-[#070A09] text-[#7C8A82] flex flex-col justify-between p-10 md:p-16 border-r border-[#1B2420]">
        <div className="font-serif text-xl font-medium text-[#E7ECE8] tracking-wide">
          plenti<span className="text-[#34D399]">.trade</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-serif font-normal text-3xl md:text-[38px] leading-tight text-[#E7ECE8] mb-5">
            Antes de operar, revisamos cómo llegas hoy.
          </h1>
          <p className="text-sm leading-relaxed text-[#7C8A82] max-w-sm">
            Plenti protege tu capital tanto del mercado como de tus propias emociones. Cada sesión empieza con un chequeo simple, y cada operación respeta tu regla del 1%, sin excepciones.
          </p>
        </div>

        <div className="flex gap-10 flex-wrap border-t border-[#1B2420] pt-7">
          <div className="max-w-[200px]">
            <p className="font-serif text-2xl text-[#34D399] mb-1">1%</p>
            <p className="text-[13px] text-[#7C8A82] leading-relaxed">Riesgo máximo por operación, calculado automáticamente.</p>
          </div>
          <div className="max-w-[200px]">
            <p className="font-serif text-2xl text-[#34D399] mb-1">Check-in</p>
            <p className="text-[13px] text-[#7C8A82] leading-relaxed">Tu estado de ánimo decide si operas en real o en modo simulador.</p>
          </div>
          <div className="max-w-[200px]">
            <p className="font-serif text-2xl text-[#34D399] mb-1">Diario</p>
            <p className="text-[13px] text-[#7C8A82] leading-relaxed">Cada decisión queda registrada para que aprendas de ella.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[360px]">
          <h2 className="font-serif font-normal text-2xl text-[#E7ECE8] mb-1.5">Inicia sesión</h2>
          <p className="text-sm text-[#7C8A82] mb-8">Entra a tu cuenta para continuar tu seguimiento.</p>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#B7C0BA] mb-1.5">Correo institucional</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" className="input" />
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#B7C0BA] mb-1.5">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" className="input" />
          </div>

          <div className="flex items-center justify-between my-6 text-[13px]">
            <label className="flex items-center gap-2 text-[#7C8A82]">
              <input type="checkbox" className="accent-[#34D399]" />
              Recordarme
            </label>
            <a href="#" className="text-[#34D399] hover:underline">¿Olvidaste tu contraseña?</a>
          </div>

          {error && <p className="text-[13px] text-[#E0605A] mb-4">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar a mi cuenta"}
          </button>

          <p className="text-center text-[13px] text-[#7C8A82] mt-5">
            ¿No tienes cuenta? <a href="/registro" className="text-[#E7ECE8] font-medium hover:underline">Regístrate</a>
          </p>

          <div className="mt-7 p-3.5 bg-[#12261B] rounded flex gap-2.5 items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] mt-1.5 flex-shrink-0" />
            <p className="text-[12.5px] leading-relaxed text-[#8FCBAA] m-0">
              Al entrar te preguntaremos cómo te sientes hoy. Si detectamos ansiedad o euforia, pasarás a modo simulador para proteger tu capital.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}