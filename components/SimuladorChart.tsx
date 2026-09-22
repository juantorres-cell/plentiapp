"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, IChartApi, ISeriesApi, CandlestickData } from "lightweight-charts";

export default function SimuladorChart({ data }: { data: CandlestickData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Crea el gráfico UNA sola vez, no en cada cambio de datos.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { type: "solid" as const, color: "#0E1412" }, textColor: "#B7C0BA" },
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

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []); // <- solo al montar, no en cada cambio de "data"

  // Cuando cambian los datos, solo actualiza la serie — no recrea el gráfico ni pierde el zoom.
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} className="w-full h-[400px]" />;
}