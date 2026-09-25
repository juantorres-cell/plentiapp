"use client";

import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NAV_TOP = [
  { href: "/dashboard", label: "Resumen", icon: IconHome },
  { href: "/operar", label: "Operar", icon: IconChart },
];

const SIMULADOR_NAV = [
  { href: "/simulador", label: "Práctica libre" },
  { href: "/simulador/nivel1", label: "Nivel 1 · Examen" },
  { href: "/simulador/nivel2", label: "Nivel 2 · Guiado" },
  { href: "/simulador/nivel3", label: "Nivel 3", proximamente: true },
];

const NAV_BOTTOM = [
  { href: "/calculadora", label: "Capital libre", icon: IconCalc },
  { href: "/diario", label: "Diario", icon: IconBook },
  { href: "/reglas", label: "Reglas", icon: IconShield },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-[#0B0F0E]">
      <aside className="w-60 bg-[#070A09] border-r border-[#1B2420] text-[#7C8A82] flex flex-col justify-between py-8 px-5 flex-shrink-0">
        <div>
          <div className="font-serif text-lg text-[#E7ECE8] mb-10 px-2">
            plenti<span className="text-[#34D399]">.trade</span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_TOP.map((item) => {
              const activo = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    activo
                      ? "bg-[#12261B] text-[#34D399]"
                      : "text-[#7C8A82] hover:text-[#E7ECE8] hover:bg-[#12261B]/40"
                  }`}
                >
                  <item.icon activo={activo} />
                  {item.label}
                </a>
              );
            })}

            <div className="mt-4 mb-1 px-3 flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#4C5B54]">
              <IconPlay activo={false} />
              Simulador
            </div>
            {SIMULADOR_NAV.map((item) => {
              const activo = pathname === item.href;
              if (item.proximamente) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center justify-between pl-9 pr-3 py-2 rounded-md text-sm text-[#4C5B54] cursor-not-allowed"
                  >
                    {item.label}
                    <span className="text-[10px] uppercase tracking-wide">
                      Próximamente
                    </span>
                  </div>
                );
              }
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`pl-9 pr-3 py-2 rounded-md text-sm transition-colors ${
                    activo
                      ? "bg-[#12261B] text-[#34D399]"
                      : "text-[#7C8A82] hover:text-[#E7ECE8] hover:bg-[#12261B]/40"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}

            <div className="mt-4 flex flex-col gap-1">
              {NAV_BOTTOM.map((item) => {
                const activo = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      activo
                        ? "bg-[#12261B] text-[#34D399]"
                        : "text-[#7C8A82] hover:text-[#E7ECE8] hover:bg-[#12261B]/40"
                    }`}
                  >
                    <item.icon activo={activo} />
                    {item.label}
                  </a>
                );
              })}
            </div>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#7C8A82] hover:text-[#E7ECE8] transition-colors"
        >
          <IconLogout />
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function IconHome({ activo }: { activo?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activo ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
    </svg>
  );
}
function IconChart({ activo }: { activo?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activo ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  );
}
function IconPlay({ activo }: { activo?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activo ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}
function IconCalc({ activo }: { activo?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activo ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
    </svg>
  );
}
function IconBook({ activo }: { activo?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activo ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5v-15z" />
      <path d="M4 20.5A2.5 2.5 0 016.5 18H20" />
    </svg>
  );
}
function IconShield({ activo }: { activo?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activo ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}