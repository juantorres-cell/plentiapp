import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Reintenta si Gemini responde 503 (alta demanda) — no reintenta otros errores
// como key inválida o request mal formado, esos hay que verlos directo.
async function generarConReintento(prompt: string, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      });
    } catch (error) {
      const es503 =
        error instanceof Error && error.message.includes('"status":"UNAVAILABLE"');
      const esUltimoIntento = i === intentos - 1;

      if (!es503 || esUltimoIntento) throw error;

      // Espera antes de reintentar (backoff simple: 1s, 2s, 3s...)
      await new Promise((resolve) => setTimeout(resolve, (i + 1) * 1000));
    }
  }
  throw new Error("No se pudo generar respuesta tras varios intentos.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contextoGrafico, accionUsuario } = body;

    const prompt = `
Eres el Coach de Plenti, una plataforma para traders principiantes.

Contexto del mercado en este momento: ${contextoGrafico}
Acción que acaba de elegir el usuario: ${accionUsuario}

Tu trabajo es darle retroalimentación en máximo 3 o 4 líneas. Sé directo, empático pero firme.
- Si el usuario compró basándose en el soporte y el martillo alcista, felicítalo por leer bien el patrón técnico y no dejarse llevar por el pánico de las velas rojas anteriores.
- Si el usuario vendió, explícale con calma que pudo haberse dejado llevar por el miedo de la caída de los días anteriores, justo en el momento en que el precio tocó un soporte y mostró una señal de reversión. Enséñale la lección sin sonar como que lo estás regañando.
- Si el usuario decidió esperar, valida que no operar también es una decisión válida cuando no hay claridad.
`;

    const response = await generarConReintento(prompt);

    return NextResponse.json({ respuesta: response.text });
  } catch (error) {
    console.error("Error procesando IA:", error);

    const es503 =
      error instanceof Error && error.message.includes('"status":"UNAVAILABLE"');

    return NextResponse.json(
      {
        respuesta: es503
          ? "El coach está muy solicitado en este momento. Intenta de nuevo en unos segundos 🙏"
          : "Hubo un error de conexión con la IA. Revisa la terminal para más detalles.",
      },
      { status: 500 }
    );
  }
}