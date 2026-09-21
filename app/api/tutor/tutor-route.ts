import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // NOTA: revisa https://ai.google.dev/gemini-api/docs/models antes de desplegar en
    // producción — esto cambia rápido y algunos modelos se apagan con poco aviso.
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ respuesta: response.text });
  } catch (error) {
    console.error("Error procesando IA:", error);
    return NextResponse.json(
      {
        respuesta:
          "Hubo un error de conexión con la IA. Asegúrate de que GEMINI_API_KEY está configurada (en .env.local en local, o en Codespaces secrets si trabajas desde ahí).",
      },
      { status: 500 }
    );
  }
}