"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

export default function SimuladorChart({ data }: { data: any }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Inicializar el gráfico delegando el tamaño a la librería (autoSize)
    const chart = createChart(chartContainerRef.current, {
      autoSize: true, 
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#D9D9D9' },
      grid: { vertLines: { color: '#2B2B2B' }, horzLines: { color: '#2B2B2B' } },
    });

    // 2. Agregar la serie de Velas Japonesas
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', 
      downColor: '#ef4444', 
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // 3. Cargar los datos ficticios
    candlestickSeries.setData(data);
    
    // 4. Hacer zoom automático para que las 4 velas ocupen el centro de la pantalla
    chart.timeScale().fitContent();

    // Limpiar el gráfico al desmontar
    return () => {
      chart.remove();
    };
  }, [data]);

  // El contenedor mantiene sus clases de Tailwind para definir el espacio
  return <div ref={chartContainerRef} className="w-full h-[400px]" />;
}