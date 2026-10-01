export type RespuestasOnboarding = {
  motivacion: string;
  capital: string;
  perdida: string;
  estres: string;
};

export type PreguntaOnboarding = {
  id: keyof RespuestasOnboarding;
  titulo: string;
  opciones: { valor: string; texto: string }[];
};

export const PREGUNTAS: PreguntaOnboarding[] = [
  {
    id: "motivacion",
    titulo: "¿Qué quieres lograr con el trading?",
    opciones: [
      { valor: "aprendizaje", texto: "Aprender una habilidad a largo plazo" },
      { valor: "complemento", texto: "Generar un ingreso extra complementario" },
      { valor: "urgencia", texto: "Conseguir ingresos rápido o reemplazar mi salario" },
    ],
  },
  {
    id: "capital",
    titulo: "¿Cómo describirías el dinero que vas a usar?",
    opciones: [
      { valor: "excedente", texto: "Ahorros que puedo permitirme perder mientras aprendo" },
      { valor: "moderado", texto: "Dinero que me sobra, pero preferiría no perder" },
      { valor: "necesario", texto: "Dinero que voy a necesitar en los próximos meses" },
    ],
  },
  {
    id: "perdida",
    titulo: "Pierdes el 3% de tu cuenta por una noticia inesperada. ¿Qué haces?",
    opciones: [
      { valor: "disciplinado", texto: "Me detengo, apago la pantalla y reviso qué pasó" },
      { valor: "tenso", texto: "Sigo con mi plan, pero me cuesta no pensar en eso" },
      { valor: "recuperar", texto: "Opero con más fuerza para recuperarlo rápido" },
    ],
  },
  {
    id: "estres",
    titulo: "Cuando siento presión financiera, normalmente...",
    opciones: [
      { valor: "calmado", texto: "Lo analizo con calma y espero" },
      { valor: "miedo", texto: "Me paralizo y evito tomar decisiones" },
      { valor: "sobreoperacion", texto: "Siento la necesidad de hacer algo arriesgado para resolverlo" },
    ],
  },
];

export type PerfilPsicologico = {
  version: number;
  fuente: string;
  motivacion: string;
  capital: string;
  reaccion_perdida: string;
  estres: string;
  alertas: string[];
};

export function construirPerfil(r: RespuestasOnboarding): PerfilPsicologico {
  const alertas: string[] = [];
  if (r.motivacion === "urgencia") alertas.push("urgencia_ingresos");
  if (r.capital === "necesario") alertas.push("capital_necesario");
  if (r.perdida === "recuperar") alertas.push("riesgo_martingala");
  if (r.estres === "sobreoperacion") alertas.push("riesgo_sobreoperacion");
  if (r.estres === "miedo") alertas.push("tendencia_paralisis");

  return {
    version: 1,
    fuente: "reglas",
    motivacion: r.motivacion,
    capital: r.capital,
    reaccion_perdida: r.perdida,
    estres: r.estres,
    alertas: Array.from(new Set(alertas)),
  };
}

export const MENSAJES_ALERTA: Record<string, string> = {
  urgencia_ingresos:
    "Buscas resultados rápidos. El trading rara vez los da, así que ve paso a paso y no dependas de él para tus ingresos por ahora.",
  capital_necesario:
    "Te recomendamos no invertir dinero que necesitas pronto. Practica primero en el simulador.",
  riesgo_martingala:
    "Aumentar el tamaño de una operación para recuperar una pérdida es una trampa común. Tu regla del 1% está para protegerte justo en ese momento.",
  riesgo_sobreoperacion:
    "Bajo presión puede aparecer la necesidad de actuar. Si pasa, espera: no operar también es una decisión válida.",
  tendencia_paralisis:
    "Si el miedo te frena, eso es normal. Usa el simulador para ganar confianza antes de operar con dinero real.",
};