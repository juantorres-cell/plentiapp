// components/SimuladorGuiadoChart.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";
import { EscenarioNivel2, DecisionUsuario, Checkpoint } from "@/lib/nivel2/tipos";

const VELOCIDAD_MS = 900;

export default function SimuladorGuiadoChart({
  escenario,
  onDecision,
  onTerminarEscenario,
}: {
  escenario: EscenarioNivel2;
  onDecision: (indiceVela: number, decision: DecisionUsuario, tiempoMs: number) => void;
  onTerminarEscenario: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const mediaRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [indiceActual, setIndiceActual] = useState(-1); // -1 = nada revelado aún
  const [checkpointActivo, setCheckpointActivo] = useState<Checkpoint | null>(null);
  const [feedback, setFeedback] = useState<{ correcta: boolean; texto: string } | null>(null);
  const tiempoInicioDecision = useRef<number>(0);

  // Crea el chart UNA vez por escenario
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "#0E1412" }, textColor: "#B7C0BA" },
      grid: { vertLines: { color: "#1B2420" }, horzLines: { color: "#1B2420" } },
      timeScale: { borderColor: "#24302A" },
      rightPriceScale: { borderColor: "#24302A" },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#34D399",
      downColor: "#E0605A",
      borderVisible: false,
      wickUpColor: "#34D399",
      wickDownColor: "#E0605A",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    if (escenario.media_movil) {
      mediaRef.current = chart.addSeries(LineSeries, {
        color: "#7C8A82",
        lineWidth: 1,
        lineStyle: 2, // punteada
      });
    }

    setIndiceActual(-1);
    setCheckpointActivo(null);
    setFeedback(null);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      mediaRef.current = null;
    };
  }, [escenario.id]);

  // Revelado progresivo con pausa automática en checkpoints
  useEffect(() => {
    if (!seriesRef.current || checkpointActivo) return; // pausado si hay checkpoint activo

    if (indiceActual >= escenario.velas.length - 1) {
      if (indiceActual === escenario.velas.length - 1) {
        // pequeña espera antes de avisar que terminó, para que se vea la última vela
        const t = setTimeout(onTerminarEscenario, 1200);
        return () => clearTimeout(t);
      }
      return;
    }

    const t = setTimeout(() => {
      const siguienteIndice = indiceActual + 1;
      const vela = escenario.velas[siguienteIndice];
      seriesRef.current!.update(vela);

      if (mediaRef.current && escenario.media_movil?.[siguienteIndice]) {
        mediaRef.current.update(escenario.media_movil[siguienteIndice]);
      }

      chartRef.current?.timeScale().fitContent();
      setIndiceActual(siguienteIndice);

      const checkpoint = escenario.checkpoints.find((c) => c.indice_vela === siguienteIndice);
      if (checkpoint) {
        setCheckpointActivo(checkpoint);
        tiempoInicioDecision.current = Date.now();
      }
    }, VELOCIDAD_MS);

    return () => clearTimeout(t);
  }, [indiceActual, checkpointActivo, escenario, onTerminarEscenario]);

  function elegirDecision(decision: DecisionUsuario) {
    if (!checkpointActivo) return;
    const tiempoMs = Date.now() - tiempoInicioDecision.current;
    const correcta = decision === checkpointActivo.decision_correcta;

    onDecision(checkpointActivo.indice_vela, decision, tiempoMs);

    setFeedback({
      correcta,
      texto: correcta
        ? "¡Bien leído! Identificaste correctamente la señal."
        : checkpointActivo.microleccion_si_falla,
    });
  }

  function continuarDespuesDeCheckpoint() {
    setCheckpointActivo(null);
    setFeedback(null);
  }

  return (
    <div className="relative">
      <div className="bg-[#0E1412] border border-[#24302A] rounded-lg p-2 mb-4">
        <div ref={containerRef} className="w-full h-[400px]" />
      </div>

      {checkpointActivo && (
        <div className="bg-[#121815] border-l-4 border-[#34D399] rounded-lg p-4">
          <p className="text-sm text-[#E7ECE8] mb-3">
            <strong>🤖 Coach Plenti:</strong> {checkpointActivo.mensaje_tutor}
          </p>

          {!feedback ? (
            <div className="flex gap-3">
              {checkpointActivo.opciones_decision.map((op) => (
                <button
                  key={op}
                  onClick={() => elegirDecision(op)}
                  className={`flex-1 py-2.5 rounded font-medium capitalize text-sm ${
                    op === "comprar"
                      ? "bg-[#34D399] text-[#0B0F0E]"
                      : op === "vender"
                      ? "bg-[#E0605A] text-[#0B0F0E]"
                      : "border border-[#24302A] text-[#E7ECE8]"
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          ) : (
            <>
              <p
                className={`text-sm mb-3 ${
                  feedback.correcta ? "text-[#34D399]" : "text-[#E7ECE8]"
                }`}
              >
                {feedback.texto}
              </p>
              <button
                onClick={continuarDespuesDeCheckpoint}
                className="w-full bg-[#34D399] text-[#0B0F0E] py-2.5 rounded font-medium text-sm"
              >
                Continuar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}