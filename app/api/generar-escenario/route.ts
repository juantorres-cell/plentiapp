// app/api/generar-escenario/route.ts
import { NextResponse } from "next/server";
import { generarVelasIA } from "@/lib/nivel2/generador-ia";
import { ESCENARIOS_NIVEL2 } from "@/lib/nivel2/banco-escenarios";

export async function POST(request: Request) {
  try {
    const { escenario_id } = await request.json();
    const plantilla = ESCENARIOS_NIVEL2.find((e) => e.id === escenario_id);

    if (!plantilla) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const patron = plantilla.checkpoints[0].patron_presente;
    const indicePatron = plantilla.checkpoints[0].indice_vela;

    const generado = await generarVelasIA(patron, plantilla.velas.length, indicePatron);
    console.log(`[generar-escenario] resultado final para ${escenario_id}:`, generado ? "ÉXITO" : "FALLBACK a plantilla");

    if (!generado) {
      return NextResponse.json({ ok: false }); // el frontend usa la plantilla estática
    }

    return NextResponse.json({ ok: true, ...generado });
  } catch (error) {
    console.error("Error generando escenario:", error);
    return NextResponse.json({ ok: false });
  }
}