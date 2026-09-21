import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contextoGrafico, accionUsuario } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prompt estructurado (Aquí definimos el rol del Tutor)
    const prompt = `
      Eres el tutor de Plenti, una plataforma para traders principiantes. 
      El mercado actual está así: ${contextoGrafico}. 
      El usuario ha decidido: ${accionUsuario}. 
      Responde de manera concisa y amigable. Si cometió un error (como comprar en una resistencia clara), explícale por qué. Si acertó, felicítalo y dale una pequeña lección sobre gestión emocional.
    `;

    const result = await model.generateContent(prompt);
    const respuesta = result.response.text();

    return NextResponse.json({ respuesta });
  } catch (error) {
    return NextResponse.json({ error: "Error al procesar la IA" }, { status: 500 });
  }
}