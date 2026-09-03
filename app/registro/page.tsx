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

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // El trigger de Supabase crea el perfil solo (ver 01-crear-tabla-profiles.sql).
    // Si tu proyecto tiene confirmación por correo activada, el usuario
    // debe verificar su email antes de poder iniciar sesión.
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F4EE] p-10">
        <div className="max-w-[380px] text-center">
          <h2 className="font-serif text-2xl text-[#16233B] mb-3">
            Revisa tu correo
          </h2>
          <p className="text-sm text-[#8B93A3] leading-relaxed">
            Te enviamos un enlace de confirmación a <strong>{email}</strong>.
            Una vez confirmes, puedes iniciar sesión normalmente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1.3fr_1fr]">
      <div className="bg-[#16233B] text-[#C7D0DE] flex flex-col justify-between p-10 md:p-16">
        <div className="font-serif text-xl font-medium text-white tracking-wide">
          plenti<span className="font-sans text-[#3F6E58]">.trade</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-serif font-normal text-3xl md:text-[38px] leading-tight text-white mb-5">
            Empieza con el pie en el que sí puedes confiar.
          </h1>
          <p className="text-sm leading-relaxed text-[#C7D0DE] max-w-sm">
            Crear tu cuenta toma un minuto. Lo que construyes después —
            tu perfil de riesgo, tu historial, tu diario emocional — es lo
            que realmente te va a servir.
          </p>
        </div>
        <div />
      </div>

      <div className="bg-[#F6F4EE] flex items-center justify-center p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[360px]">
          <h2 className="font-serif font-normal text-2xl text-[#16233B] mb-1.5">
            Crea tu cuenta
          </h2>
          <p className="text-sm text-[#8B93A3] mb-8">
            Es gratis y toma menos de un minuto.
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

          <div className="mb-6">
            <label className="block text-[13px] font-medium text-[#223652] mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-3 text-sm border border-[#E4E0D4] rounded bg-white text-[#16233B] outline-none focus:border-[#3F6E58]"
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#A85A34] mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#16233B] text-white rounded text-sm font-medium hover:bg-[#223652] transition-colors disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Crear mi cuenta"}
          </button>

          <p className="text-center text-[13px] text-[#8B93A3] mt-5">
            ¿Ya tienes cuenta?{" "}
            <a href="/login" className="text-[#16233B] font-medium hover:underline">
              Inicia sesión
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}