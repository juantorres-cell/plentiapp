"use client";

import { useEffect, useRef, useState } from "react";

type Tamano = "sm" | "md" | "lg";

const ALTURAS: Record<Tamano, { chart: number; info: number; financials: number }> = {
  sm: { chart: 320, info: 60, financials: 220 },
  md: { chart: 480, info: 70, financials: 300 },
  lg: { chart: 680, info: 80, financials: 380 },
};

export default function TradingViewWatchlist({ symbols }: { symbols: string[] }) {
  const [tamanos, setTamanos] = useState<Record<string, Tamano>>({});
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  if (symbols.length === 0) {
    return (
      <p className="text-sm text-[#7C8A82] py-10 text-center border border-dashed border-[#24302A] rounded-lg">
        Agrega una acción arriba para ver su gráfico aquí.
      </p>
    );
  }

  function setTamano(symbol: string, t: Tamano) {
    setTamanos((prev) => ({ ...prev, [symbol]: t }));
  }
  function toggleExpandido(symbol: string) {
    setExpandidos((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {symbols.map((symbol) => {
        const tamano = tamanos[symbol] ?? "md";
        const expandido = expandidos[symbol] ?? false;
        const alturas = ALTURAS[tamano];

        return (
          <div
            key={symbol}
            className={`border border-[#24302A] rounded-lg overflow-hidden bg-[#0E1412] ${
              expandido ? "xl:col-span-2" : ""
            }`}
          >
            <div className="px-4 py-3 bg-[#121815] border-b border-[#24302A] flex items-center justify-between">
              <p className="text-sm font-medium text-[#E7ECE8]">{symbol}</p>

              <div className="flex items-center gap-3">
                <div className="flex bg-[#0E1412] border border-[#24302A] rounded overflow-hidden">
                  {(["sm", "md", "lg"] as Tamano[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTamano(symbol, t)}
                      className={`px-2.5 py-1 text-[11px] uppercase ${
                        tamano === t ? "bg-[#12261B] text-[#34D399]" : "text-[#7C8A82] hover:text-[#E7ECE8]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => toggleExpandido(symbol)}
                  title={expandido ? "Contraer" : "Expandir a todo el ancho"}
                  className="text-[#7C8A82] hover:text-[#34D399]"
                >
                  <IconExpand expandido={expandido} />
                </button>
              </div>
            </div>

            {/* Panel textual: precio, variación, rango, sector, market cap */}
            <SymbolInfoWidget symbol={symbol} height={alturas.info} />

            <ChartWidget symbol={symbol} height={alturas.chart} />
            <FinancialsWidget symbol={symbol} height={alturas.financials} />
          </div>
        );
      })}
    </div>
  );
}

/** Panel de texto: precio, variación %, rango del día, sector, market cap */
function SymbolInfoWidget({ symbol, height }: { symbol: string; height: number }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      width: "100%",
      locale: "es",
      colorTheme: "dark",
      isTransparent: false,
    });
    container.current.appendChild(script);
  }, [symbol]);

  return <div className="tradingview-widget-container border-b border-[#24302A]" style={{ height }} ref={container} />;
}

function ChartWidget({ symbol, height }: { symbol: string; height: number }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    container.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "America/Bogota",
      theme: "dark",
      style: "1",
      locale: "es",
      hide_top_toolbar: false,
      hide_legend: false,
      withdateranges: true,
      allow_symbol_change: false,
      studies: ["Volume@tv-basicstudies"],
      backgroundColor: "rgba(14, 20, 18, 1)",
      gridColor: "rgba(36, 48, 42, 0.4)",
      support_host: "https://www.tradingview.com",
    });
    container.current.appendChild(script);
  }, [symbol]);

  return <div className="tradingview-widget-container" style={{ height }} ref={container} />;
}

function FinancialsWidget({ symbol, height }: { symbol: string; height: number }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      colorTheme: "dark",
      isTransparent: false,
      displayMode: "regular",
      width: "100%",
      height: "100%",
      locale: "es",
    });
    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="tradingview-widget-container border-t border-[#24302A]" style={{ height }} ref={container} />
  );
}

function IconExpand({ expandido }: { expandido: boolean }) {
  return expandido ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4M15 3h4a2 2 0 012 2v4M9 21H5a2 2 0 01-2-2v-4M15 21h4a2 2 0 002-2v-4" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9V5a2 2 0 012-2h4M21 9V5a2 2 0 00-2-2h-4M3 15v4a2 2 0 002 2h4M21 15v4a2 2 0 01-2 2h-4" />
    </svg>
  );
}