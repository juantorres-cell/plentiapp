"use client";

import { useState } from "react";
import SimuladorChart from "@/components/SimuladorChart";

// Datos ficticios para un escenario de prueba (Soporte)
const escenarioSoporte = [
  { time: '2026-09-01', open: 100, high: 105, low: 98, close: 99 },
  { time: '2026-09-02', open: 99, high: 100, low: 90, close: 92 },
  { time: '2026-09-03', open: 92, high: 95, low: 90, close: 91 }, // Toca soporte
  { time: '2026-09-04', open: 91, high: 98, low: 90, close: 97 }, // Martillo alcista
];

export default function SimuladorPage() {
  const [tutorMensaje, setTutorMensaje] = useState("¡Bienvenido al simulador! Fíjate en el gráfico. Estamos en una zona de soporte tras una caída. ¿Qué harías?");
  const [cargando, setCargando] = useState(false);

  const consultarTutor = async (accion: string) => {
    setCargando(true);
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextoGrafico: "Tendencia bajista que acaba de formar una vela martillo alcista rebotando en un soporte histórico de precio 90.",
          accionUsuario: accion
        })
      });
      const data = await res.json();
      setTutorMensaje(data.respuesta);
    } catch (error) {
      setTutorMensaje("Hubo un error al conectar con el tutor.");
    }
    setCargando(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-4">Simulador: Nivel Intermedio</h1>
      
      {/* Burbuja del Tutor */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6 border-l-4 border-green-500">
        <p><strong>🤖 Coach Plenti:</strong> {cargando ? "Pensando..." : tutorMensaje}</p>
      </div>

      {/* Gráfico */}
      <div className="mb-6 bg-gray-900 rounded-lg p-2 border border-gray-800">
        <SimuladorChart data={escenarioSoporte} />
      </div>

      {/* Controles */}
      <div className="flex gap-4">
        <button 
          onClick={() => consultarTutor("Comprar")}
          className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold"
        >
          📈 Comprar (Rebote)
        </button>
        <button 
          onClick={() => consultarTutor("Vender por pánico")}
          className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-bold"
        >
          📉 Vender (Pánico)
        </button>
      </div>
    </div>
  );
}