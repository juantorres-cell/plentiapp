// lib/nivel1/banco-preguntas.ts
import { PreguntaNivel1 } from "./tipos";

export const BANCO_PREGUNTAS: PreguntaNivel1[] = [
  // ═══ VELAS JAPONESAS ═══
  {
    id: "vj-1",
    categoria: "velas_japonesas",
    formato: "opcion_multiple",
    enunciado: "Esta vela cerró por encima de donde abrió. ¿Qué muestra su mecha inferior larga?",
    graficos: [{ tipo: "velas", velas: [{ open: 95, high: 98, low: 88, close: 97 }] }],
    opciones: [
      { id: "a", texto: "El precio subió sin pausa durante todo el periodo" },
      { id: "b", texto: "El precio bajó fuerte pero los compradores lo recuperaron" },
      { id: "c", texto: "No hubo actividad de compra ni venta" },
      { id: "d", texto: "El volumen fue extremadamente bajo" },
    ],
    respuesta_correcta_id: "b",
    explicacion_si_falla:
      "Una vela muestra 4 datos de un periodo: apertura, cierre, máximo y mínimo. Una mecha inferior larga significa que el precio llegó a bajar mucho, pero los compradores lo empujaron de vuelta hacia arriba antes de cerrar.",
  },
  {
    id: "vj-2",
    categoria: "velas_japonesas",
    formato: "verdadero_falso",
    enunciado: "Verdadero o falso: una vela roja significa que la empresa perdió dinero ese día.",
    graficos: [{ tipo: "velas", velas: [{ open: 100, high: 101, low: 92, close: 93 }] }],
    opciones: [
      { id: "v", texto: "Verdadero" },
      { id: "f", texto: "Falso" },
    ],
    respuesta_correcta_id: "f",
    explicacion_si_falla:
      "Una vela roja solo indica que el precio cerró más bajo de lo que abrió en ese periodo de tiempo. No tiene nada que ver directamente con las ganancias de la empresa — eso lo ves en los reportes de earnings, no en el color de una vela.",
  },
  {
    id: "vj-3",
    categoria: "velas_japonesas",
    formato: "opcion_multiple",
    enunciado: "¿Qué representa el cuerpo (la parte ancha) de una vela?",
    graficos: [{ tipo: "velas", velas: [{ open: 90, high: 94, low: 89, close: 93 }] }],
    opciones: [
      { id: "a", texto: "El rango entre el precio máximo y mínimo del periodo" },
      { id: "b", texto: "El rango entre el precio de apertura y cierre" },
      { id: "c", texto: "El volumen negociado" },
      { id: "d", texto: "El promedio de los últimos 5 periodos" },
    ],
    respuesta_correcta_id: "b",
    explicacion_si_falla:
      "El cuerpo de la vela va de apertura a cierre. Las mechas (líneas finas arriba y abajo) son las que muestran el máximo y el mínimo que tocó el precio en ese periodo.",
  },

  // ═══ TENDENCIAS ═══
  {
    id: "td-1",
    categoria: "tendencias",
    formato: "opcion_multiple",
    enunciado: "Mira esta secuencia de velas. ¿Qué tipo de tendencia muestra?",
    graficos: [
      {
        tipo: "velas",
        velas: [
          { open: 90, high: 94, low: 89, close: 93 },
          { open: 93, high: 97, low: 92, close: 96 },
          { open: 96, high: 100, low: 95, close: 99 },
          { open: 99, high: 103, low: 98, close: 102 },
        ],
      },
    ],
    opciones: [
      { id: "a", texto: "Alcista" },
      { id: "b", texto: "Bajista" },
      { id: "c", texto: "Lateral" },
    ],
    respuesta_correcta_id: "a",
    explicacion_si_falla:
      "Una tendencia alcista se ve como una serie de velas verdes subiendo de forma sostenida, cada una cerrando más arriba que la anterior. Eso es exactamente lo que muestra este gráfico.",
  },
  {
    id: "td-2",
    categoria: "tendencias",
    formato: "comparacion",
    enunciado: "¿Cuál de estos dos gráficos muestra una tendencia lateral (sin dirección dominante)?",
    graficos: [
      {
        tipo: "velas",
        velas: [
          { open: 100, high: 102, low: 98, close: 101 },
          { open: 101, high: 103, low: 99, close: 100 },
          { open: 100, high: 102, low: 98, close: 101 },
        ],
      },
      {
        tipo: "velas",
        velas: [
          { open: 100, high: 101, low: 95, close: 96 },
          { open: 96, high: 97, low: 90, close: 91 },
          { open: 91, high: 92, low: 85, close: 86 },
        ],
      },
    ],
    opciones: [
      { id: "a", texto: "Gráfico A (izquierda)" },
      { id: "b", texto: "Gráfico B (derecha)" },
    ],
    respuesta_correcta_id: "a",
    explicacion_si_falla:
      "El gráfico A se mueve en un rango sin dirección clara — sube y baja sin avanzar. El gráfico B es una tendencia bajista clara: cada vela cierra más abajo que la anterior.",
  },
  {
    id: "td-3",
    categoria: "tendencias",
    formato: "verdadero_falso",
    enunciado: "Verdadero o falso: una sola vela roja en medio de una tendencia alcista significa que la tendencia terminó.",
    graficos: [
      {
        tipo: "velas",
        velas: [
          { open: 90, high: 94, low: 89, close: 93 },
          { open: 93, high: 97, low: 92, close: 96 },
          { open: 96, high: 97, low: 93, close: 94 },
          { open: 94, high: 99, low: 93, close: 98 },
        ],
      },
    ],
    opciones: [
      { id: "v", texto: "Verdadero" },
      { id: "f", texto: "Falso" },
    ],
    respuesta_correcta_id: "f",
    explicacion_si_falla:
      "Una tendencia se define por el comportamiento general de varias velas, no por una sola. Una vela roja aislada en medio de un movimiento alcista es normal y no invalida la tendencia por sí sola.",
  },

  // ═══ SOPORTES Y RESISTENCIAS ═══
  {
    id: "sr-1",
    categoria: "soportes_resistencias",
    formato: "opcion_multiple",
    enunciado: "El precio ha bajado hasta la misma zona (90) tres veces y siempre rebota hacia arriba. ¿Qué es esa zona?",
    graficos: [
      {
        tipo: "velas",
        velas: [
          { open: 98, high: 99, low: 90, close: 95 },
          { open: 95, high: 99, low: 96, close: 98 },
          { open: 98, high: 99, low: 90, close: 96 },
          { open: 96, high: 100, low: 95, close: 99 },
          { open: 99, high: 99, low: 90, close: 97 },
        ],
      },
    ],
    opciones: [
      { id: "a", texto: "Una resistencia" },
      { id: "b", texto: "Un soporte" },
      { id: "c", texto: "Volumen bajo" },
      { id: "d", texto: "Una media móvil" },
    ],
    respuesta_correcta_id: "b",
    explicacion_si_falla:
      "Un soporte es una zona donde el precio baja y rebota repetidamente. Entre más veces la haya tocado y rebotado sin romperla, y entre más reciente sea, más confiable se considera.",
  },
  {
    id: "sr-2",
    categoria: "soportes_resistencias",
    formato: "verdadero_falso",
    enunciado: "Verdadero o falso: una resistencia se forma porque mucha gente decide vender cuando el precio llega ahí, en parte por pura expectativa colectiva.",
    graficos: [{ tipo: "velas", velas: [{ open: 100, high: 105, low: 99, close: 101 }] }],
    opciones: [
      { id: "v", texto: "Verdadero" },
      { id: "f", texto: "Falso" },
    ],
    respuesta_correcta_id: "v",
    explicacion_si_falla:
      "Es una profecía autocumplida: como muchos traders ven ese mismo nivel como 'techo' basándose en el historial, colocan órdenes de venta ahí, y eso mismo hace que el precio efectivamente se frene en ese punto.",
  },
  {
    id: "sr-3",
    categoria: "soportes_resistencias",
    formato: "opcion_multiple",
    enunciado: "¿Cuál de estos soportes es probablemente MÁS confiable?",
    graficos: [
      {
        tipo: "velas",
        velas: [
          { open: 98, high: 99, low: 90, close: 95 },
          { open: 95, high: 99, low: 90, close: 96 },
          { open: 96, high: 100, low: 90, close: 98 },
        ],
      },
    ],
    opciones: [
      { id: "a", texto: "Uno tocado una sola vez hace 2 años" },
      { id: "b", texto: "Uno tocado 3 veces de forma reciente, como el del gráfico" },
      { id: "c", texto: "Ambos son igual de confiables" },
      { id: "d", texto: "Los soportes nunca son confiables" },
    ],
    respuesta_correcta_id: "b",
    explicacion_si_falla:
      "Entre más reciente y más veces se haya respetado un soporte sin romperse, más peso le dan los traders — refleja una zona de precio donde la demanda actual sigue siendo fuerte.",
  },

  // ═══ VOLUMEN ═══
  {
    id: "vol-1",
    categoria: "volumen",
    formato: "opcion_multiple",
    enunciado: "El precio subió fuerte, pero mira el volumen: fue muy bajo comparado con los días anteriores. ¿Qué sugiere esto?",
    graficos: [
      { tipo: "velas", velas: [{ open: 90, high: 100, low: 89, close: 99 }] },
      { tipo: "volumen", barras: [{ valor: 20, alto: false }] },
    ],
    opciones: [
      { id: "a", texto: "El movimiento 'va en serio' y probablemente continúe" },
      { id: "b", texto: "Puede ser un 'disparo de fogueo' que no valida el movimiento" },
      { id: "c", texto: "Significa que la empresa reportó buenas ganancias" },
      { id: "d", texto: "El volumen no tiene relación con la fuerza del movimiento" },
    ],
    respuesta_correcta_id: "b",
    explicacion_si_falla:
      "Un movimiento de precio con volumen bajo es sospechoso — pocos participantes lo están respaldando. Los movimientos que 'van en serio' suelen venir acompañados de volumen alto, confirmando que hay convicción real detrás.",
  },
  {
    id: "vol-2",
    categoria: "volumen",
    formato: "comparacion",
    enunciado: "Ambos gráficos muestran la misma subida de precio. ¿Cuál movimiento es más confiable según el volumen?",
    graficos: [
      { tipo: "volumen", barras: [{ valor: 90, alto: true }] },
      { tipo: "volumen", barras: [{ valor: 15, alto: false }] },
    ],
    opciones: [
      { id: "a", texto: "El de volumen alto (A)" },
      { id: "b", texto: "El de volumen bajo (B)" },
    ],
    respuesta_correcta_id: "a",
    explicacion_si_falla:
      "Volumen alto significa que muchos compradores/vendedores están participando activamente en ese movimiento — le da respaldo real. Volumen bajo es una señal débil que puede revertirse fácilmente.",
  },
  {
    id: "vol-3",
    categoria: "volumen",
    formato: "verdadero_falso",
    enunciado: "Verdadero o falso: el volumen mide cuántas acciones se compraron y vendieron en un periodo de tiempo.",
    graficos: [{ tipo: "volumen", barras: [{ valor: 60, alto: true }] }],
    opciones: [
      { id: "v", texto: "Verdadero" },
      { id: "f", texto: "Falso" },
    ],
    respuesta_correcta_id: "v",
    explicacion_si_falla:
      "Correcto es 'verdadero' — el volumen es literalmente la cantidad de acciones negociadas en ese periodo. Es la forma más directa de medir cuánta gente está participando en un movimiento de precio.",
  },
];