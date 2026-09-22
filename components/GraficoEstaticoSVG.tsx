// components/GraficoEstaticoSVG.tsx
import { GraficoEstatico } from "@/lib/nivel1/tipos";

export default function GraficoEstaticoSVG({ grafico }: { grafico: GraficoEstatico }) {
  if (grafico.tipo === "velas" && grafico.velas) {
    const velas = grafico.velas;
    const maxVal = Math.max(...velas.map((v) => v.high));
    const minVal = Math.min(...velas.map((v) => v.low));
    const rango = maxVal - minVal || 1;
    const anchoVela = 100 / velas.length;

    const escalarY = (valor: number) => 100 - ((valor - minVal) / rango) * 90 - 5;

    return (
      <svg viewBox="0 0 100 100" className="w-full h-40 bg-[#0E1412] rounded border border-[#24302A]">
        {velas.map((v, i) => {
          const alcista = v.close >= v.open;
          const color = alcista ? "#34D399" : "#E0605A";
          const x = i * anchoVela + anchoVela / 2;
          const yOpen = escalarY(v.open);
          const yClose = escalarY(v.close);
          const yHigh = escalarY(v.high);
          const yLow = escalarY(v.low);
          const cuerpoY = Math.min(yOpen, yClose);
          const cuerpoAlto = Math.max(Math.abs(yClose - yOpen), 1);

          return (
            <g key={i}>
              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="0.5" />
              <rect
                x={x - anchoVela * 0.3}
                y={cuerpoY}
                width={anchoVela * 0.6}
                height={cuerpoAlto}
                fill={color}
              />
            </g>
          );
        })}
      </svg>
    );
  }

  if (grafico.tipo === "volumen" && grafico.barras) {
    const barras = grafico.barras;
    const anchoBarra = 100 / barras.length;

    return (
      <svg viewBox="0 0 100 100" className="w-full h-40 bg-[#0E1412] rounded border border-[#24302A]">
        {barras.map((b, i) => {
          const x = i * anchoBarra + anchoBarra / 2;
          const altura = b.valor;
          const color = b.alto ? "#34D399" : "#7C8A82";

          return (
            <rect
              key={i}
              x={x - anchoBarra * 0.3}
              y={100 - altura}
              width={anchoBarra * 0.6}
              height={altura}
              fill={color}
            />
          );
        })}
      </svg>
    );
  }

  return null;
}