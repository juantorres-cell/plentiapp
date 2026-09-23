// lib/nivel2/banco-escenarios.ts
import { EscenarioNivel2 } from "./tipos";

export const ESCENARIOS_NIVEL2: EscenarioNivel2[] = [
  {
    id: "n2-martillo-soporte",
    titulo: "El Martillo en zona de soporte",
    contexto_inicial:
      "El precio viene cayendo varios periodos seguidos. Observa qué pasa cuando llega a la zona de 90.",
    velas: [
      { time: "2026-09-01", open: 105, high: 106, low: 100, close: 101 },
      { time: "2026-09-02", open: 101, high: 102, low: 95, close: 96 },
      { time: "2026-09-03", open: 96, high: 97, low: 91, close: 92 },
      // ↓ vela martillo: mecha larga hacia abajo, cierre cerca del máximo
      { time: "2026-09-04", open: 92, high: 93, low: 84, close: 91 },
      { time: "2026-09-05", open: 91, high: 96, low: 90, close: 95 },
    ],
    checkpoints: [
      {
        indice_vela: 3, // justo después del martillo
        patron_presente: "martillo",
        mensaje_tutor:
          "Mira esta vela: tiene una mecha larga hacia abajo y cerró casi en el máximo, justo en la zona de 90 que ya habíamos identificado como soporte. Esto es un Martillo. ¿Qué harías?",
        opciones_decision: ["comprar", "vender", "esperar"],
        decision_correcta: "comprar",
        microleccion_si_falla:
          "Un Martillo en zona de soporte es una señal alcista clásica: el precio intentó caer más, pero los compradores lo rechazaron con fuerza y lo devolvieron cerca del máximo. Vender aquí, o quedarte solo esperando, es dejar pasar la señal técnica que tú mismo identificaste.",
      },
    ],
  },
  {
    id: "n2-envolvente-bajista",
    titulo: "La Vela Envolvente en resistencia",
    contexto_inicial:
      "El precio viene subiendo con fuerza. Observa qué pasa cuando llega cerca de 110, una resistencia que ya se tocó antes.",
    velas: [
      { time: "2026-09-01", open: 95, high: 99, low: 94, close: 98 },
      { time: "2026-09-02", open: 98, high: 103, low: 97, close: 102 },
      { time: "2026-09-03", open: 102, high: 107, low: 101, close: 106 },
      // ↓ vela envolvente bajista: cuerpo rojo que "envuelve" por completo a la vela anterior
      { time: "2026-09-04", open: 108, high: 109, low: 100, close: 101 },
      { time: "2026-09-05", open: 101, high: 102, low: 95, close: 96 },
    ],
    checkpoints: [
      {
        indice_vela: 3,
        patron_presente: "envolvente",
        mensaje_tutor:
          "Esta vela roja abrió más alto que el cierre anterior, pero cerró por debajo de la apertura de esa vela anterior — la 'envuelve' por completo. Y pasó justo en la resistencia de 110. ¿Qué harías?",
        opciones_decision: ["comprar", "vender", "esperar"],
        decision_correcta: "vender",
        microleccion_si_falla:
          "Una Envolvente Bajista en resistencia es una señal de reversión: los vendedores tomaron control total del periodo, borrando toda la subida anterior de un solo golpe. Comprar aquí es ir directo contra la señal que el propio gráfico te está mostrando.",
      },
    ],
  },
  {
    id: "n2-hch-neckline",
    titulo: "Hombro-Cabeza-Hombro rompiendo el neckline",
    contexto_inicial:
      "Este es un patrón más largo. Fíjate en la forma general: sube, baja, sube más alto, baja, sube parecido al primer hombro, y luego observa qué pasa con la línea de cuello (neckline) en 95.",
    velas: [
      { time: "2026-09-01", open: 90, high: 100, low: 89, close: 99 }, // hombro izq
      { time: "2026-09-02", open: 99, high: 100, low: 95, close: 96 },
      { time: "2026-09-03", open: 96, high: 110, low: 95, close: 108 }, // cabeza
      { time: "2026-09-04", open: 108, high: 109, low: 95, close: 97 },
      { time: "2026-09-05", open: 97, high: 101, low: 96, close: 99 }, // hombro der
      // ↓ rompe el neckline (95) con fuerza
      { time: "2026-09-06", open: 99, high: 99, low: 88, close: 89 },
    ],
    checkpoints: [
      {
        indice_vela: 5,
        patron_presente: "hombro_cabeza_hombro",
        mensaje_tutor:
          "El precio acaba de romper la línea de cuello (95) con una vela fuerte hacia abajo, después de formar los dos hombros y la cabeza. ¿Qué harías?",
        opciones_decision: ["comprar", "vender", "esperar"],
        decision_correcta: "vender",
        microleccion_si_falla:
          "El H.C.H. es uno de los patrones de reversión bajista más reconocidos: cuando rompe el neckline después de formar los dos hombros y la cabeza, suele confirmar que la tendencia alcista terminó. Comprar aquí, esperando que 'rebote como antes', es ignorar una señal técnica bastante confiable.",
      },
    ],
  },
  {
    id: "n2-media-movil",
    titulo: "Cruce con la Media Móvil",
    contexto_inicial:
      "La línea punteada es una media móvil de los últimos periodos. Observa qué pasa cuando el precio la cruza.",
    velas: [
      { time: "2026-09-01", open: 100, high: 101, low: 97, close: 98 },
      { time: "2026-09-02", open: 98, high: 99, low: 95, close: 96 },
      { time: "2026-09-03", open: 96, high: 97, low: 93, close: 94 },
      { time: "2026-09-04", open: 94, high: 99, low: 93, close: 98 },
      { time: "2026-09-05", open: 98, high: 104, low: 97, close: 103 }, // cruza la media hacia arriba
    ],
    media_movil: [
      { time: "2026-09-01", value: 99 },
      { time: "2026-09-02", value: 98 },
      { time: "2026-09-03", value: 97 },
      { time: "2026-09-04", value: 96 },
      { time: "2026-09-05", value: 96.5 },
    ],
    checkpoints: [
      {
        indice_vela: 4,
        patron_presente: "medias_moviles",
        mensaje_tutor:
          "El precio acaba de cruzar por encima de la media móvil después de varios periodos por debajo de ella. Eso suele leerse como un cambio de dirección hacia arriba. ¿Qué harías?",
        opciones_decision: ["comprar", "vender", "esperar"],
        decision_correcta: "comprar",
        microleccion_si_falla:
          "Cuando el precio cruza por encima de su media móvil después de estar por debajo, es una de las señales más simples y usadas para identificar que la dirección suavizada del precio está cambiando hacia arriba. Vender o quedarte esperando aquí va contra esa señal.",
      },
    ],
  },
];