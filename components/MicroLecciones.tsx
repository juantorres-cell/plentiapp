// components/MicroLecciones.tsx
// Presenta micro-lecciones ya decididas por lib/microlecciones.ts. No calcula nada.
// Sin `titulo`: lista compacta (para /operar). Con `titulo`: tarjeta propia (para /perfil).

import type { Leccion } from "@/lib/microlecciones";

const ACENTO: Record<Leccion["tipo"], string> = { emocion: "#E0C088", conducta: "#34D399" };
const ETIQUETA: Record<Leccion["tipo"], string> = {
  emocion: "Sobre lo que sientes",
  conducta: "Según tus datos",
};

export default function MicroLecciones({
  lecciones,
  titulo,
  descripcion,
}: {
  lecciones: Leccion[];
  titulo?: string;
  descripcion?: string;
}) {
  if (lecciones.length === 0) return null;

  const lista = (
    <div className="flex flex-col gap-3">
      {lecciones.map((l) => (
        <div
          key={l.id}
          className="bg-[#0E1412] border border-[#24302A] rounded-md px-4 py-3.5"
          style={{ borderLeftWidth: 3, borderLeftColor: ACENTO[l.tipo] }}
        >
          <p className="text-[11px] uppercase tracking-wide text-[#7C8A82] mb-1">{ETIQUETA[l.tipo]}</p>
          <h3 className="font-serif text-[15px] text-[#E7ECE8] m-0">{l.titulo}</h3>
          {l.dato && <p className="text-[12.5px] text-[#E0C088] mt-1.5 mb-0 leading-relaxed">{l.dato}</p>}
          <p className="text-[13px] text-[#B7C0BA] mt-2 mb-0 leading-relaxed">{l.texto}</p>
        </div>
      ))}
    </div>
  );

  if (titulo) {
    return (
      <section className="bg-[#121815] border border-[#24302A] rounded-md p-6">
        <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">{titulo}</h2>
        {descripcion && <p className="text-[13px] text-[#7C8A82] mb-4">{descripcion}</p>}
        {lista}
      </section>
    );
  }

  return <div className="mb-6">{lista}</div>;
}