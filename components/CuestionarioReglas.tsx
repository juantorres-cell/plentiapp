"use client";

// components/CuestionarioReglas.tsx
// Cuestionario de reglas: 6 preguntas (una por pantalla) y un resultado con las reglas sugeridas.
// Solo interfaz: NO habla con Supabase. La página (/reglas) recibe onAplicar y guarda.

import { useMemo, useState } from "react";
import {
  recomendarReglas,
  type Opcion,
  type RecomendacionReglas,
  type ReglaRecomendada,
  type RespuestasCuestionario,
} from "@/lib/reglas/cuestionario";
import { PREGUNTAS_CUESTIONARIO, todasRespondidas } from "@/lib/reglas/preguntas";
import { describirRegla, etiquetaModo } from "@/lib/reglas/aplicar";
import { textoDetalle } from "@/lib/emociones";

type Props = {
  alertas: string[];
  aplicando: boolean;
  error: string | null;
  onAplicar: (respuestas: RespuestasCuestionario, recomendacion: RecomendacionReglas) => void;
  onCancelar: () => void;
};

export default function CuestionarioReglas({ alertas, aplicando, error, onAplicar, onCancelar }: Props) {
  const total = PREGUNTAS_CUESTIONARIO.length;
  const [paso, setPaso] = useState(0); // 0..total-1 = preguntas; total = resultado
  const [respuestas, setRespuestas] = useState<Partial<RespuestasCuestionario>>({});

  const completas = todasRespondidas(respuestas) ? respuestas : null;
  const recomendacion = useMemo(
    () => (completas ? recomendarReglas({ alertas, respuestas: completas }) : null),
    [alertas, completas]
  );

  const enResultado = paso >= total;
  const pregunta = enResultado ? null : PREGUNTAS_CUESTIONARIO[paso];
  const respuestaActual = pregunta ? respuestas[pregunta.id] : undefined;

  function elegir(valor: Opcion) {
    if (!pregunta) return;
    setRespuestas((r) => ({ ...r, [pregunta.id]: valor }));
  }

  function reiniciar() {
    setRespuestas({});
    setPaso(0);
  }

  return (
    <div className="max-w-[640px] mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <p className="text-[12px] uppercase tracking-wider text-[#34D399] font-medium">
          {enResultado ? "Tus reglas sugeridas" : `Pregunta ${paso + 1} de ${total}`}
        </p>
        <button type="button" onClick={onCancelar} disabled={aplicando} className="text-[12.5px] text-[#7C8A82] hover:text-[#E7ECE8]">
          Cancelar
        </button>
      </div>

      {!enResultado && pregunta && (
        <>
          <div className="h-1 bg-[#1B2420] rounded mb-8">
            <div className="h-1 bg-[#34D399] rounded transition-all" style={{ width: `${(paso / total) * 100}%` }} />
          </div>

          <h2 className="font-serif text-2xl text-[#E7ECE8] mb-6 leading-snug">{pregunta.titulo}</h2>

          <div className="flex flex-col gap-3 mb-8">
            {pregunta.opciones.map((o) => (
              <button
                key={o.valor}
                type="button"
                aria-pressed={respuestaActual === o.valor}
                onClick={() => elegir(o.valor)}
                className={`text-left px-4 py-3.5 rounded border text-sm ${
                  respuestaActual === o.valor
                    ? "border-[#34D399] bg-[#12261B] text-[#E7ECE8]"
                    : "border-[#24302A] bg-[#121815] text-[#B7C0BA] hover:border-[#34D399]"
                }`}
              >
                {o.texto}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            {paso > 0 && (
              <button
                type="button"
                onClick={() => setPaso(paso - 1)}
                className="px-5 py-3 border border-[#24302A] text-[#7C8A82] rounded text-sm"
              >
                Atrás
              </button>
            )}
            <button
              type="button"
              disabled={!respuestaActual}
              onClick={() => setPaso(paso + 1)}
              className="flex-1 py-3 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-40"
            >
              {paso === total - 1 ? "Ver mis reglas" : "Siguiente"}
            </button>
          </div>
        </>
      )}

      {enResultado && completas && recomendacion && (
        <Resultado
          recomendacion={recomendacion}
          aplicando={aplicando}
          error={error}
          onAplicar={() => onAplicar(completas, recomendacion)}
          onVolver={reiniciar}
          onAtras={() => setPaso(total - 1)}
        />
      )}
    </div>
  );
}

function Resultado({
  recomendacion,
  aplicando,
  error,
  onAplicar,
  onVolver,
  onAtras,
}: {
  recomendacion: RecomendacionReglas;
  aplicando: boolean;
  error: string | null;
  onAplicar: () => void;
  onVolver: () => void;
  onAtras: () => void;
}) {
  const { emocionesConPausa } = recomendacion;
  const emociones = [
    ...emocionesConPausa.estados.map((e) => (e === "mal" ? "Mal" : e)),
    ...emocionesConPausa.detalles.map((d) => textoDetalle(d) ?? d),
  ];

  return (
    <>
      <h2 className="font-serif text-2xl text-[#E7ECE8] mb-3">Estas son las reglas que te sugerimos</h2>
      <p className="text-[13px] text-[#7C8A82] leading-relaxed mb-2">
        Salen de tus respuestas y de tu onboarding. Son un punto de partida: después puedes ajustarlas.
      </p>
      <p className="text-[12.5px] text-[#7C8A82] leading-relaxed mb-6">
        <span className="text-[#B7C0BA]">Aviso:</span> te lo señalamos y decides.{" "}
        <span className="text-[#B7C0BA]">Pausa guiada:</span> te pedimos un paso extra antes de continuar (por ahora
        se muestra como un aviso, porque la pausa guiada todavía no existe).
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {recomendacion.activas.map((regla) => (
          <TarjetaRegla key={regla.id} regla={regla} />
        ))}
      </div>

      {recomendacion.sugeridas.length > 0 && (
        <div className="mb-6">
          <p className="text-[13px] text-[#B7C0BA] mb-2">También podrías considerar</p>
          <div className="flex flex-col gap-3">
            {recomendacion.sugeridas.map((regla) => (
              <TarjetaRegla key={regla.id} regla={regla} sugerida />
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#121815] border border-[#24302A] rounded-lg p-4 mb-6">
        <p className="text-[13px] text-[#B7C0BA] mb-2">Cuando exista la pausa guiada, se activará con estas emociones</p>
        <div className="flex flex-wrap gap-2">
          {emociones.map((e) => (
            <span key={e} className="px-3 py-1 rounded-full border border-[#24302A] text-[12.5px] text-[#7C8A82]">
              {e}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[12.5px] text-[#7C8A82] leading-relaxed mb-6">
        Hoy, en Operar, ya se aplican el riesgo por operación, el tope por posición y &ldquo;una operación por
        semana&rdquo;. Las demás quedan registradas y se irán activando.
      </p>

      {error && <p className="text-[13px] text-[#E0605A] mb-4">{error}</p>}

      <button
        type="button"
        onClick={onAplicar}
        disabled={aplicando}
        className="w-full py-3.5 bg-[#34D399] text-[#0B0F0E] rounded text-sm font-medium disabled:opacity-50"
      >
        {aplicando ? "Aplicando..." : "Aplicar estas reglas"}
      </button>
      <p className="text-[12px] text-[#48544D] mt-2 mb-5">
        Esto reemplaza tus tres reglas actuales (riesgo, tope por posición y una operación por semana).
      </p>
      <div className="flex gap-4">
        <button type="button" onClick={onAtras} disabled={aplicando} className="text-[12.5px] text-[#7C8A82] hover:text-[#E7ECE8]">
          Cambiar la última respuesta
        </button>
        <button type="button" onClick={onVolver} disabled={aplicando} className="text-[12.5px] text-[#7C8A82] hover:text-[#E7ECE8]">
          Responder de nuevo
        </button>
      </div>
    </>
  );
}

function TarjetaRegla({ regla, sugerida = false }: { regla: ReglaRecomendada; sugerida?: boolean }) {
  const d = describirRegla(regla);
  return (
    <div className={`bg-[#121815] border rounded-lg p-4 ${sugerida ? "border-dashed border-[#24302A]" : "border-[#24302A]"}`}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <p className="text-sm font-medium text-[#E7ECE8]">{d.titulo}</p>
        <span
          className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11.5px] ${
            regla.modo === "pausa_guiada" ? "bg-[#241E10] text-[#E0C088]" : "bg-[#12261B] text-[#8FCBAA]"
          }`}
        >
          {etiquetaModo(regla.modo)}
        </span>
      </div>
      <p className="text-[12.5px] text-[#B7C0BA] leading-relaxed mb-2">{d.detalle}</p>
      <ul className="m-0 pl-4 list-disc text-[12px] text-[#7C8A82] leading-relaxed">
        {regla.porque.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {!d.seAplicaHoy && (
        <p className="text-[11.5px] text-[#48544D] mt-2 mb-0">Registrada · aún no se aplica en Operar</p>
      )}
    </div>
  );
}