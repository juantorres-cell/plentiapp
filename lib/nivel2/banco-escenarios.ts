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
    nivel_referencia: { precio: 90, tipo: "soporte" },
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
    nivel_referencia: { precio: 110, tipo: "resistencia" },
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
    nivel_referencia: { precio: 95, tipo: "soporte", etiqueta: "Neckline" },
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
{
  id: "n2-martillo-tras-noticia",
  titulo: "El Martillo después de una caída por noticias",
  contexto_inicial:
    "Salió una noticia negativa y el precio cayó fuerte varios periodos. Observa qué pasa cuando llega a la zona de 150, un soporte que ya se había respetado antes.",
  velas: [
    { time: "2026-11-01", open: 175, high: 176, low: 168, close: 169 },
    { time: "2026-11-02", open: 169, high: 170, low: 160, close: 161 },
    { time: "2026-11-03", open: 161, high: 162, low: 152, close: 153 },
    { time: "2026-11-04", open: 153, high: 154, low: 140, close: 151 },
    { time: "2026-11-05", open: 151, high: 158, low: 150, close: 156 },
  ],
  nivel_referencia: { precio: 150, tipo: "soporte" },
  checkpoints: [
    {
      indice_vela: 3,
      patron_presente: "martillo",
      mensaje_tutor:
        "A pesar del pánico por la noticia, esta vela muestra una mecha larga hacia abajo y cerró cerca del máximo, justo en la zona de 150. ¿Qué harías?",
      opciones_decision: ["comprar", "vender", "esperar"],
      decision_correcta: "comprar",
      microleccion_si_falla:
        "El contexto (una mala noticia) genera miedo, pero la vela técnica sigue diciendo lo mismo: rechazo fuerte en soporte. Dejarte llevar por el pánico de la noticia en vez de leer la vela es justo el sesgo que buscamos que reconozcas.",
    },
  ],
},
{
  id: "n2-envolvente-euforia",
  titulo: "La Envolvente en medio de la euforia",
  contexto_inicial:
    "El precio lleva varios periodos subiendo con fuerza y todo el mundo habla de esta acción. Observa qué pasa cerca de 60, una resistencia previa.",
  velas: [
    { time: "2026-11-01", open: 40, high: 44, low: 39, close: 43 },
    { time: "2026-11-02", open: 43, high: 48, low: 42, close: 47 },
    { time: "2026-11-03", open: 47, high: 55, low: 46, close: 54 },
    { time: "2026-11-04", open: 57, high: 58, low: 46, close: 47 },
    { time: "2026-11-05", open: 47, high: 48, low: 40, close: 41 },
  ],
  nivel_referencia: { precio: 60, tipo: "resistencia" },
  checkpoints: [
    {
      indice_vela: 3,
      patron_presente: "envolvente",
      mensaje_tutor:
        "Con todo el optimismo de las últimas velas, aparece esta vela roja que envuelve por completo a la anterior. ¿Qué harías?",
      opciones_decision: ["comprar", "vender", "esperar"],
      decision_correcta: "vender",
      microleccion_si_falla:
        "La euforia colectiva (FOMO) hace que sea tentador comprar 'porque todo sigue subiendo', pero la vela está mostrando lo contrario: los vendedores tomaron control total del periodo. Ese es justo el sesgo de euforia que este nivel busca enseñarte a detectar.",
    },
  ],
},
{
  id: "n2-hch-cripto",
  titulo: "Hombro-Cabeza-Hombro en un activo volátil",
  contexto_inicial:
    "Este activo se mueve en rangos más amplios que las acciones tradicionales. Observa la forma completa del patrón antes de decidir.",
  velas: [
    { time: "2026-11-01", open: 200, high: 240, low: 198, close: 235 },
    { time: "2026-11-02", open: 235, high: 238, low: 210, close: 215 },
    { time: "2026-11-03", open: 215, high: 270, low: 212, close: 260 },
    { time: "2026-11-04", open: 260, high: 265, low: 212, close: 220 },
    { time: "2026-11-05", open: 220, high: 242, low: 215, close: 230 },
    { time: "2026-11-06", open: 230, high: 231, low: 190, close: 195 },
  ],
  nivel_referencia: { precio: 212, tipo: "soporte", etiqueta: "Neckline" },
  checkpoints: [
    {
      indice_vela: 5,
      patron_presente: "hombro_cabeza_hombro",
      mensaje_tutor:
        "El precio acaba de romper la línea de cuello con fuerza tras formar los dos hombros y la cabeza. ¿Qué harías?",
      opciones_decision: ["comprar", "vender", "esperar"],
      decision_correcta: "vender",
      microleccion_si_falla:
        "El patrón se cumple igual en un activo volátil que en uno tranquilo — lo único que cambia es el tamaño de los movimientos, no la lógica detrás de la señal.",
    },
  ],
},
{
  id: "n2-media-movil-recuperacion",
  titulo: "Cruce de Media Móvil tras una recuperación lenta",
  contexto_inicial:
    "El precio venía bajando, pero se ha ido estabilizando poco a poco. Observa qué pasa cuando finalmente cruza la media móvil.",
  velas: [
    { time: "2026-11-01", open: 80, high: 81, low: 75, close: 76 },
    { time: "2026-11-02", open: 76, high: 78, low: 73, close: 74 },
    { time: "2026-11-03", open: 74, high: 76, low: 71, close: 73 },
    { time: "2026-11-04", open: 73, high: 79, low: 72, close: 78 },
    { time: "2026-11-05", open: 78, high: 86, low: 77, close: 85 },
  ],
  media_movil: [
    { time: "2026-11-01", value: 79 },
    { time: "2026-11-02", value: 77.5 },
    { time: "2026-11-03", value: 76 },
    { time: "2026-11-04", value: 75 },
    { time: "2026-11-05", value: 76 },
  ],
  checkpoints: [
    {
      indice_vela: 4,
      patron_presente: "medias_moviles",
      mensaje_tutor:
        "Tras varios periodos débiles, el precio finalmente cruzó por encima de la media móvil. ¿Qué harías?",
      opciones_decision: ["comprar", "vender", "esperar"],
      decision_correcta: "comprar",
      microleccion_si_falla:
        "Una recuperación lenta que finalmente cruza su media móvil es una señal válida de cambio de dirección, aunque el camino hasta ahí se haya sentido incierto.",
    },
  ],
},

{
  id: "n2-trampa-martillo-sin-historial",
  titulo: "¿Es realmente un Martillo?",
  contexto_inicial:
    "El precio viene cayendo. Presta mucha atención: ¿este nivel de precio ya se había tocado antes, o es territorio completamente nuevo?",
  es_trampa: true,
  velas: [
    { time: "2026-12-01", open: 150, high: 152, low: 145, close: 146 },
    { time: "2026-12-02", open: 146, high: 147, low: 138, close: 139 },
    { time: "2026-12-03", open: 139, high: 140, low: 130, close: 131 },
    { time: "2026-12-04", open: 131, high: 132, low: 115, close: 130 },
    { time: "2026-12-05", open: 130, high: 136, low: 129, close: 134 },
  ],
  checkpoints: [
    {
      indice_vela: 3,
      patron_presente: "martillo",
      mensaje_tutor:
        "Esta vela tiene mecha larga hacia abajo y cerró cerca del máximo — la forma es de Martillo. Pero mira bien el historial: ¿este nivel de precio (115) ya se había tocado antes en este gráfico? ¿Qué harías?",
      opciones_decision: ["comprar", "vender", "esperar"],
      decision_correcta: "esperar",
      microleccion_si_falla:
        "La forma de la vela es correcta, pero un soporte real necesita historial: precio que ya rebotó ahí antes, más de una vez. Aquí el precio nunca había estado tan bajo — no hay ningún soporte confirmado, solo una vela con mecha larga en territorio nuevo. La forma sola no basta, necesitas el contexto.",
    },
  ],
},
{
  id: "n2-trampa-envolvente-sin-reversion",
  titulo: "¿Es realmente una Envolvente?",
  contexto_inicial:
    "Observa el color de las velas antes de decidir si hay una reversión real.",
  es_trampa: true,
  velas: [
    { time: "2026-12-01", open: 100, high: 101, low: 95, close: 96 },
    { time: "2026-12-02", open: 96, high: 97, low: 93, close: 94 },
    { time: "2026-12-03", open: 94, high: 95, low: 85, close: 86 },
    { time: "2026-12-04", open: 86, high: 88, low: 80, close: 82 },
  ],
  checkpoints: [
    {
      indice_vela: 2,
      patron_presente: "envolvente",
      mensaje_tutor:
        "Esta vela roja tiene un cuerpo más grande que el de la vela anterior. ¿Es esto una Envolvente Bajista de reversión? ¿Qué harías?",
      opciones_decision: ["comprar", "vender", "esperar"],
      decision_correcta: "esperar",
      microleccion_si_falla:
        "Una Envolvente Bajista de reversión requiere que la vela anterior sea VERDE (alcista) — ahí es donde 'envuelve' y revierte el optimismo previo. Aquí la vela anterior ya era roja: esto no es una reversión, es solo continuación de la caída. No es una señal nueva, es la misma tendencia de siempre.",
    },
  ],
},
{
  id: "n2-trampa-hch-asimetrico",
  titulo: "¿Es realmente un Hombro-Cabeza-Hombro?",
  contexto_inicial:
    "Compara con cuidado la altura de los dos hombros antes de confiar en la ruptura.",
  es_trampa: true,
  velas: [
    { time: "2026-12-01", open: 100, high: 103, low: 99, close: 102 },
    { time: "2026-12-02", open: 102, high: 103, low: 98, close: 99 },
    { time: "2026-12-03", open: 99, high: 140, low: 98, close: 135 },
    { time: "2026-12-04", open: 135, high: 136, low: 110, close: 115 },
    { time: "2026-12-05", open: 115, high: 128, low: 114, close: 127 },
    { time: "2026-12-06", open: 127, high: 128, low: 105, close: 97 },
  ],
  checkpoints: [
    {
      indice_vela: 5,
      patron_presente: "hombro_cabeza_hombro",
      mensaje_tutor:
        "El precio acaba de caer por debajo del nivel de los valles anteriores, después de una cabeza y dos 'hombros'. ¿Confías en esta ruptura?",
      opciones_decision: ["comprar", "vender", "esperar"],
      decision_correcta: "esperar",
      microleccion_si_falla:
        "Mira otra vez los dos hombros: el primero llegó apenas a 103, el segundo a 128 — son muy distintos en altura. Un H.C.H. confiable necesita hombros parecidos entre sí. Cuando son tan asimétricos, la 'ruptura' puede ser ruido del mercado, no una reversión real confirmada.",
    },
  ],
},
{
  id: "n2-trampa-cruce-marginal",
  titulo: "¿Es realmente un cruce confirmado?",
  contexto_inicial:
    "Mira con atención qué tan lejos cruzó el precio la media móvil, y cómo se ve la media misma.",
  es_trampa: true,
  velas: [
    { time: "2026-12-01", open: 100, high: 101, low: 98, close: 99 },
    { time: "2026-12-02", open: 99, high: 100, low: 97, close: 98 },
    { time: "2026-12-03", open: 98, high: 99, low: 96, close: 97 },
    { time: "2026-12-04", open: 97, high: 98, low: 95, close: 96 },
    { time: "2026-12-05", open: 96, high: 97.3, low: 95.5, close: 97.1 },
  ],
  media_movil: [
    { time: "2026-12-01", value: 99 },
    { time: "2026-12-02", value: 98.5 },
    { time: "2026-12-03", value: 98 },
    { time: "2026-12-04", value: 97.5 },
    { time: "2026-12-05", value: 97 },
  ],
  checkpoints: [
    {
      indice_vela: 4,
      patron_presente: "medias_moviles",
      mensaje_tutor:
        "El precio acaba de cerrar apenas por encima de la media móvil, por un margen muy pequeño. ¿Confías en este cruce?",
      opciones_decision: ["comprar", "vender", "esperar"],
      decision_correcta: "esperar",
      microleccion_si_falla:
        "Un cruce por un margen tan pequeño (0.1 de diferencia) con una media que apenas se mueve es fácil que se revierta al siguiente periodo — se le llama 'whipsaw'. Es más prudente esperar una o dos velas más de confirmación antes de actuar, en vez de saltar apenas toca la línea.",
    },
  ],
},

];