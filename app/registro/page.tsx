"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegistroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F0E] p-10">
        <div className="max-w-[380px] text-center">
          <h2 className="font-serif text-2xl text-[#E7ECE8] mb-3">Revisa tu correo</h2>
          <p className="text-sm text-[#7C8A82] leading-relaxed">
            Te enviamos un enlace de confirmación a <strong className="text-[#E7ECE8]">{email}</strong>. Una vez confirmes, puedes iniciar sesión normalmente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1.3fr_1fr] bg-[#0B0F0E]">
      <div className="bg-[#070A09] text-[#7C8A82] flex flex-col justify-between p-10 md:p-16 border-r border-[#1B2420]">
        <div className="font-serif text-xl font-medium text-[#E7ECE8] tracking-wide">
          plenti<span className="text-[#34D399]">.trade</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-serif font-normal text-3xl md:text-[38px] leading-tight text-[#E7ECE8] mb-5">
            Empieza con el pie en el que sí puedes confiar.
          </h1>
          <p className="text-sm leading-relaxed text-[#7C8A82] max-w-sm">
            Crear tu cuenta toma un minuto. Lo que construyes después — tu perfil de riesgo, tu historial, tu diario emocional — es lo que realmente te va a servir.
          </p>
        </div>
        <div />
      </div>

      <div className="flex items-center justify-center p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[360px]">
          <h2 className="font-serif font-normal text-2xl text-[#E7ECE8] mb-1.5">Crea tu cuenta</h2>
          <p className="text-sm text-[#7C8A82] mb-8">Es gratis y toma menos de un minuto.</p>

          <div className="mb-4">
            <label className="block text-[13px] font-medium text-[#B7C0BA] mb-1.5">Correo institucional</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" className="input" />
          </div>

          <div className="mb-6">
            <label className="block text-[13px] font-medium text-[#B7C0BA] mb-1.5">Contraseña</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="input" />
          </div>

          {error && <p className="text-[13px] text-[#E0605A] mb-4">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading ? "Creando cuenta..." : "Crear mi cuenta"}
          </button>

          <p className="text-center text-[13px] text-[#7C8A82] mt-5">
            ¿Ya tienes cuenta? <a href="/login" className="text-[#E7ECE8] font-medium hover:underline">Inicia sesión</a>
          </p>
        </form>
      </div>
    </div>
  );
}