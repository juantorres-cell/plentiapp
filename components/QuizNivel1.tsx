// components/QuizNivel1.tsx
"use client";

import { useState } from "react";
import GraficoEstaticoSVG from "./GraficoEstaticoSVG";
import { armarExamen, calificarExamen } from "@/lib/nivel1/utils";
import { PreguntaNivel1, RespuestaUsuario, ResultadoNivel1 } from "@/lib/nivel1/tipos";

export default function QuizNivel1({
  onCompletar,
}: {
  onCompletar: (resultado: ResultadoNivel1) => void;
}) {
  const [examen] = useState<PreguntaNivel1[]>(() => armarExamen(2));
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<RespuestaUsuario[]>([]);
  const [opcionElegida, setOpcionElegida] = useState<string | null>(null);
  const [mostrandoFeedback, setMostrandoFeedback] = useState(false);

  const pregunta = examen[indice];
  const esUltima = indice === examen.length - 1;

  function elegirOpcion(opcionId: string) {
    if (mostrandoFeedback) return; // evita cambiar respuesta tras confirmar
    setOpcionElegida(opcionId);
  }

  function confirmarRespuesta() {
    if (!opcionElegida) return;
    setMostrandoFeedback(true);
  }

  function siguiente() {
    const correcta = opcionElegida === pregunta.respuesta_correcta_id;
    const nuevaRespuesta: RespuestaUsuario = {
      pregunta_id: pregunta.id,
      categoria: pregunta.categoria,
      opcion_elegida_id: opcionElegida!,
      correcta,
    };
    const todas = [...respuestas, nuevaRespuesta];
    setRespuestas(todas);
    setOpcionElegida(null);
    setMostrandoFeedback(false);

    if (esUltima) {
      onCompletar(calificarExamen(todas));
    } else {
      setIndice(indice + 1);
    }
  }

  const fueCorrecta = opcionElegida === pregunta.respuesta_correcta_id;

  return (
    <div className="max-w-[600px] mx-auto">
      <p className="text-[12px] text-[#7C8A82] mb-2">
        Pregunta {indice + 1} de {examen.length} · {pregunta.categoria.replace("_", " ")}
      </p>

      <h2 className="font-serif text-lg text-[#E7ECE8] mb-4">{pregunta.enunciado}</h2>

      <div className={`grid gap-3 mb-4 ${pregunta.graficos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {pregunta.graficos.map((g, i) => (
          <GraficoEstaticoSVG key={i} grafico={g} />
        ))}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {pregunta.opciones.map((op) => {
          const esElegida = opcionElegida === op.id;
          const esCorrecta = op.id === pregunta.respuesta_correcta_id;

          let estilo = "border-[#24302A] text-[#E7ECE8]";
          if (mostrandoFeedback && esCorrecta) {
            estilo = "border-[#34D399] bg-[#12261B] text-[#34D399]";
          } else if (mostrandoFeedback && esElegida && !esCorrecta) {
            estilo = "border-[#E0605A] bg-[#2A1414] text-[#E0605A]";
          } else if (esElegida) {
            estilo = "border-[#34D399] text-[#34D399]";
          }

          return (
            <button
              key={op.id}
              onClick={() => elegirOpcion(op.id)}
              disabled={mostrandoFeedback}
              className={`text-left px-4 py-2.5 rounded border text-sm ${estilo}`}
            >
              {op.texto}
            </button>
          );
        })}
      </div>

      {mostrandoFeedback && !fueCorrecta && (
        <div className="bg-[#121815] border-l-4 border-[#34D399] rounded p-4 mb-4">
          <p className="text-sm text-[#E7ECE8]">
            <strong>🤖 Coach Plenti:</strong> {pregunta.explicacion_si_falla}
          </p>
        </div>
      )}

      {!mostrandoFeedback ? (
        <button
          onClick={confirmarRespuesta}
          disabled={!opcionElegida}
          className="w-full bg-[#34D399] text-[#0B0F0E] py-3 rounded font-medium disabled:opacity-40"
        >
          Confirmar respuesta
        </button>
      ) : (
        <button
          onClick={siguiente}
          className="w-full bg-[#34D399] text-[#0B0F0E] py-3 rounded font-medium"
        >
          {esUltima ? "Ver resultado" : "Siguiente pregunta"}
        </button>
      )}
    </div>
  );
}