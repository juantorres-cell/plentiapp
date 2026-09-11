"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Gasto = { id: string; categoria: string; monto: number };

export default function CalculadoraPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const [ingresos, setIngresos] = useState("");
  const [porcentajeGasto, setPorcentajeGasto] = useState(20);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }
      const uid = sessionData.session.user.id;
      setUserId(uid);

      const { data: perfil } = await supabase
        .from("profiles")
        .select("ingresos_mensuales, porcentaje_gasto")
        .eq("id", uid)
        .single();

      if (perfil) {
        setIngresos(String(perfil.ingresos_mensuales ?? ""));
        setPorcentajeGasto(perfil.porcentaje_gasto ?? 20);
      }

      const { data: listaGastos } = await supabase
        .from("gastos_fijos")
        .select("id, categoria, monto")
        .eq("user_id", uid)
        .order("created_at", { ascending: true });

      setGastos(listaGastos ?? []);
      setCargando(false);
    }
    cargar();
  }, [router]);

  const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
  const capitalLibre = (Number(ingresos) || 0) - totalGastos;
  const montoGastoLibre = capitalLibre * (porcentajeGasto / 100);
  const montoInversion = capitalLibre - montoGastoLibre;

  async function agregarGasto() {
    if (!userId || !nuevaCategoria || !nuevoMonto) return;
    const { data, error } = await supabase
      .from("gastos_fijos")
      .insert({ user_id: userId, categoria: nuevaCategoria, monto: Number(nuevoMonto) })
      .select()
      .single();

    if (!error && data) {
      setGastos([...gastos, data]);
      setNuevaCategoria("");
      setNuevoMonto("");
    }
  }

  async function borrarGasto(id: string) {
    await supabase.from("gastos_fijos").delete().eq("id", id);
    setGastos(gastos.filter((g) => g.id !== id));
  }

  async function guardar() {
    if (!userId) return;
    setGuardando(true);
    setMensaje(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        ingresos_mensuales: Number(ingresos) || 0,
        porcentaje_gasto: porcentajeGasto,
        capital_disponible: montoInversion, // esto es lo que se precarga al registrar una operación
      })
      .eq("id", userId);

    setGuardando(false);
    setMensaje(error ? error.message : "Guardado. Tu capital para invertir quedó actualizado.");
  }

  function textoSugerencia(pct: number) {
    if (pct <= 15) return `Con ${pct}% de gasto libre estás siendo bastante conservador — casi todo tu capital libre va a inversión.`;
    if (pct <= 30) return `Te sugerimos mantenerte cerca de este rango: guardas algo de liquidez sin sacrificar mucha capacidad de inversión.`;
    return `Con ${pct}% de gasto libre estás destinando bastante menos a inversión de lo recomendado — considera bajarlo si tu meta es crecer capital.`;
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F4EE]">
        <p className="text-sm text-[#8B93A3]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4EE] p-10">
      <div className="max-w-[900px] mx-auto">
        <p className="text-[12px] uppercase tracking-wider text-[#3F6E58] font-medium mb-1">
          Salud financiera
        </p>
        <h1 className="font-serif text-2xl text-[#16233B] mb-8">Tu capital libre</h1>

        <div className="grid md:grid-cols-[1.3fr_1fr] gap-7">
          {/* Gastos fijos */}
          <div className="bg-white border border-[#E4E0D4] rounded-md p-6">
            <h2 className="font-serif text-lg text-[#16233B] mb-5">Ingresos y gastos fijos</h2>

            <label className="block text-[13px] font-medium text-[#223652] mb-1.5">
              Ingresos mensuales ($)
            </label>
            <input
              value={ingresos}
              onChange={(e) => setIngresos(e.target.value)}
              type="number"
              className="input mb-5"
            />

            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="text-[11px] uppercase text-[#8B93A3] border-b border-[#E4E0D4]">
                  <th className="text-left pb-2 font-medium">Categoría</th>
                  <th className="text-right pb-2 font-medium">Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id} className="border-b border-[#F0EEE6]">
                    <td className="py-2.5">{g.categoria}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      $ {Number(g.monto).toLocaleString("es-CO")}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => borrarGasto(g.id)}
                        className="text-[#A85A34] text-xs hover:underline"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                {gastos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-[#8B93A3] text-sm">
                      Aún no has agregado gastos fijos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex gap-2 mt-3">
              <input
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                placeholder="Nueva categoría, ej: Arriendo"
                className="input flex-1"
              />
              <input
                value={nuevoMonto}
                onChange={(e) => setNuevoMonto(e.target.value)}
                type="number"
                placeholder="Monto"
                className="input"
                style={{ maxWidth: 120 }}
              />
              <button
                onClick={agregarGasto}
                className="px-4 border border-[#E4E0D4] rounded text-sm text-[#16233B] bg-[#F6F4EE]"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-white border border-[#E4E0D4] rounded-md p-6">
            <h2 className="font-serif text-lg text-[#16233B] mb-5">Resumen</h2>

            <div className="flex justify-between text-sm py-2">
              <span className="text-[#8B93A3]">Ingresos mensuales</span>
              <span>$ {(Number(ingresos) || 0).toLocaleString("es-CO")}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-t border-[#E4E0D4] font-medium">
              <span>Total gastos fijos</span>
              <span>$ {totalGastos.toLocaleString("es-CO")}</span>
            </div>

            <p className="text-[12px] text-[#8B93A3] mt-5 mb-1">Capital libre</p>
            <p className="font-serif text-[32px] text-[#3F6E58] mb-1">
              $ {capitalLibre.toLocaleString("es-CO")}
            </p>

            <div className="mt-6">
              <div className="flex justify-between text-[13px] mb-2">
                <span>Gasto libre</span>
                <span className="font-medium">{porcentajeGasto}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={porcentajeGasto}
                onChange={(e) => setPorcentajeGasto(Number(e.target.value))}
                className="w-full accent-[#3F6E58]"
              />
              <div className="flex justify-between text-[12px] text-[#8B93A3] mt-2">
                <span>Gasto libre — $ {montoGastoLibre.toLocaleString("es-CO")}</span>
                <span>Para invertir — $ {montoInversion.toLocaleString("es-CO")}</span>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-[#E7EFE9] rounded flex gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3F6E58] mt-1.5 flex-shrink-0" />
              <p className="text-[12.5px] leading-relaxed text-[#2E4A3C] m-0">
                {textoSugerencia(porcentajeGasto)}
              </p>
            </div>

            <button
              onClick={guardar}
              disabled={guardando}
              className="w-full mt-6 py-3 bg-[#16233B] text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar y actualizar mi capital"}
            </button>
            {mensaje && <p className="text-[12.5px] text-[#8B93A3] mt-3">{mensaje}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}