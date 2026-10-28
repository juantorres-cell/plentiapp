// components/PatronesConducta.tsx
// Parte visual de los patrones del usuario. Solo presenta datos ya calculados por lib/patrones.ts:
// no consulta nada ni usa IA. Todo grupo con menos datos que MIN_GRUPO sale en gris con "pocos datos".

import {
  DETALLES,
  ESTADOS,
  MIN_GRUPO,
  type ConteoRegla,
  type Estado,
  type Grupo,
  type LineaSemana,
  type Patrones,
} from "@/lib/patrones";

const ETIQUETA_ESTADO: Record<Estado, string> = { bien: "Bien", medio: "Medio", mal: "Mal" };
const EMOJI: Record<Estado, string> = { bien: "🙂", medio: "😐", mal: "😣" };
const ETIQUETA_DETALLE: Record<(typeof DETALLES)[number], string> = {
  tranquilo: "Tranquilo",
  ansioso: "Ansioso",
  euforico: "Eufórico",
  frustrado: "Frustrado",
  miedo: "Con miedo",
  fomo: "Con FOMO",
};

const formatoDinero = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

export default function PatronesConducta({ patrones }: { patrones: Patrones | null }) {
  if (!patrones) {
    return (
      <Tarjeta>
        <p className="text-sm text-[#7C8A82]">No se pudieron calcular tus patrones ahora. Recarga la página para intentarlo de nuevo.</p>
      </Tarjeta>
    );
  }

  if (patrones.muestra.operaciones === 0 && patrones.semanas.total === 0) {
    return (
      <Tarjeta>
        <p className="text-sm text-[#7C8A82] leading-relaxed">
          Aún no hay datos para mostrar. Aparecerán cuando registres operaciones o semanas en que decides no operar.
        </p>
      </Tarjeta>
    );
  }

  const { emocion_vs_resultado: ev, reglas_por_emocion: re, calibrador: cal, semanas } = patrones;

  // Escala común para las barras de resultado: el mayor promedio absoluto con datos.
  const gruposConDatos = [
    ...ESTADOS.map((e) => ev.por_estado[e]),
    ...DETALLES.map((d) => ev.por_detalle[d]),
  ].filter((g) => g.n > 0);
  const maxAbs = Math.max(1, ...gruposConDatos.map((g) => Math.abs(g.promedio)));
  const hayDetalle = DETALLES.some((d) => ev.por_detalle[d].n > 0);
  const reglasDetalle = DETALLES.filter((d) => re.por_detalle[d].calculables > 0);

  const consultadas = cal.conteo.siguio + cal.conteo.se_aparto + cal.conteo.no_comparable;
  const hayCalibrador = consultadas + cal.conteo.no_consultado > 0;
  const csc = cal.cantidad_sobre_calibrador;

  return (
    <Tarjeta>
      <h2 className="font-serif text-lg text-[#E7ECE8] mb-1">Tus emociones y tus decisiones</h2>
      <p className="text-[13px] text-[#7C8A82] mb-6 leading-relaxed">
        Calculado con tu diario, sin IA. Lo que tiene menos de {MIN_GRUPO} datos sale en gris con «pocos datos»: es
        orientativo, no una conclusión.
      </p>

      <div className="grid grid-cols-1 @4xl:grid-cols-2 gap-5">
      {/* 1. Resultado según emoción */}
      <Bloque titulo="Resultado promedio según cómo te sentías al abrir la operación">
        {ESTADOS.map((e) => (
          <FilaResultado key={e} etiqueta={`${EMOJI[e]} ${ETIQUETA_ESTADO[e]}`} g={ev.por_estado[e]} max={maxAbs} />
        ))}
        {hayDetalle && (
          <>
            <p className="text-[12px] text-[#4C5B54] mt-3 mb-1">Por emoción concreta</p>
            {DETALLES.filter((d) => ev.por_detalle[d].n > 0).map((d) => (
              <FilaResultado key={d} etiqueta={ETIQUETA_DETALLE[d]} g={ev.por_detalle[d]} max={maxAbs} />
            ))}
          </>
        )}
        {ev.cobertura.respaldo_check_in > 0 && (
          <p className="text-[12px] text-[#4C5B54] mt-2 leading-relaxed">
            {ev.cobertura.respaldo_check_in}{" "}
            {plural(ev.cobertura.respaldo_check_in, "operación antigua no tenía", "operaciones antiguas no tenían")}{" "}
            emoción propia y se usó el check-in de esa semana.
          </p>
        )}
      </Bloque>

      {/* 2. Reglas superadas según emoción */}
      <Bloque titulo="Veces que superaste tu regla de riesgo, según cómo te sentías">
        {ESTADOS.map((e) => (
          <FilaRegla key={e} etiqueta={`${EMOJI[e]} ${ETIQUETA_ESTADO[e]}`} c={re.por_estado[e]} />
        ))}
        {reglasDetalle.length > 0 && (
          <>
            <p className="text-[12px] text-[#4C5B54] mt-3 mb-1">Por emoción concreta</p>
            {reglasDetalle.map((d) => (
              <FilaRegla key={d} etiqueta={ETIQUETA_DETALLE[d]} c={re.por_detalle[d]} />
            ))}
          </>
        )}
        {re.aumento_tras_perdida.oportunidades > 0 && (
          <p
            className={`text-[13px] mt-3 leading-relaxed ${
              re.aumento_tras_perdida.suficiente ? "text-[#B7C0BA]" : "text-[#4C5B54]"
            }`}
          >
            Después de una pérdida, subiste el tamaño de la siguiente posición{" "}
            <span className="font-medium">
              {re.aumento_tras_perdida.veces} de {re.aumento_tras_perdida.oportunidades}
            </span>{" "}
            {plural(re.aumento_tras_perdida.oportunidades, "vez", "veces")}
            {!re.aumento_tras_perdida.suficiente && " · pocos datos"}.
          </p>
        )}
      </Bloque>

      {/* 3. Calibrador */}
      <Bloque titulo="Tu relación con el calibrador">
        {!hayCalibrador ? (
          <p className="text-[13px] text-[#4C5B54]">Todavía no hay operaciones con la lectura del calibrador guardada.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Mini etiqueta="Usaste lo que calculó" valor={cal.conteo.siguio} />
              <Mini etiqueta="Cambiaste cantidad o stop" valor={cal.conteo.se_aparto} />
              <Mini etiqueta="No lo consultaste" valor={cal.conteo.no_consultado} />
            </div>
            {(cal.resultado_siguio.n > 0 || cal.resultado_se_aparto.n > 0) && (
              <div className="flex flex-col gap-1.5 mt-3">
                {cal.resultado_siguio.n > 0 && <LineaGrupo texto="Resultado promedio cuando usaste lo que calculó" g={cal.resultado_siguio} />}
                {cal.resultado_se_aparto.n > 0 && (
                  <LineaGrupo texto="Resultado promedio cuando cambiaste cantidad o stop" g={cal.resultado_se_aparto} />
                )}
              </div>
            )}
            {cal.conteo.sin_dato > 0 && (
              <p className="text-[12px] text-[#4C5B54] mt-3 leading-relaxed">
                {cal.conteo.sin_dato} {plural(cal.conteo.sin_dato, "operación antigua no tiene", "operaciones antiguas no tienen")}{" "}
                la lectura del calibrador guardada.
              </p>
            )}
            {csc.calculables > 0 && (
              <p className={`text-[13px] mt-3 leading-relaxed ${csc.suficiente ? "text-[#B7C0BA]" : "text-[#4C5B54]"}`}>
                Compraste más acciones de las que permitía el calibrador{" "}
                <span className="font-medium">
                  {csc.veces} de {csc.calculables}
                </span>{" "}
                {plural(csc.calculables, "vez", "veces")}
                {!csc.suficiente && " · pocos datos"}.
              </p>
            )}
          </>
        )}
      </Bloque>

      {/* 4. Semanas */}
      <Bloque titulo="Tus semanas">
        <p className="text-[13px] text-[#B7C0BA] mb-3">
          {semanas.total} {plural(semanas.total, "semana", "semanas")}: {semanas.operadas}{" "}
          {plural(semanas.operadas, "operada", "operadas")} · {semanas.sin_operar_registradas} sin operar ·{" "}
          {semanas.solo_check_in} sin decisión registrada
        </p>

        <div className="flex flex-wrap gap-1.5">
          {semanas.linea.map((s) => (
            <Cuadro key={s.semana} s={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11.5px] text-[#7C8A82]">
          <Leyenda clases="border-[#1E3A2A] bg-[#12261B]" texto="Operada, con ganancia" />
          <Leyenda clases="border-[#4A2A24] bg-[#2A1815]" texto="Operada, con pérdida" />
          <Leyenda clases="border-dashed border-[#3A4640] bg-transparent" texto="Sin operar (lo registraste)" />
          <Leyenda clases="border-[#3A2F18] bg-[#241E10]" texto="Sin decisión registrada" />
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          {ESTADOS.map((e) => {
            const d = semanas.decision_por_estado[e];
            const total = d.operadas + d.sin_operar + d.sin_decision;
            return (
              <div key={e} className={`text-[13px] ${d.suficiente ? "text-[#B7C0BA]" : "text-[#4C5B54]"}`}>
                <span className="text-[#E7ECE8]">
                  {EMOJI[e]} {ETIQUETA_ESTADO[e]}
                </span>{" "}
                {total === 0
                  ? "· sin semanas"
                  : `· operaste ${d.operadas}, no operaste ${d.sin_operar}, sin decisión ${d.sin_decision}${
                      d.suficiente ? "" : " · pocos datos"
                    }`}
              </div>
            );
          })}
        </div>

        {semanas.solo_check_in > 0 && (
          <div className="mt-4 text-[12.5px] leading-relaxed px-3.5 py-2.5 rounded border bg-[#241E10] text-[#E0C088] border-[#3A2F18]">
            Tienes {semanas.solo_check_in} {plural(semanas.solo_check_in, "semana", "semanas")} con check-in pero sin
            operación ni registro de «No operé». Si decidiste no operar, regístralo en Operar para completar tu historial.
          </div>
        )}
      </Bloque>
      </div>
    </Tarjeta>
  );
}

// ---------- Piezas ----------

function Tarjeta({ children }: { children: React.ReactNode }) {
  return <section className="@container bg-[#121815] border border-[#24302A] rounded-md p-6">{children}</section>;
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#1B2420] rounded-md p-4">
      <h3 className="text-[13px] font-medium text-[#B7C0BA] mb-3">{titulo}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FilaResultado({ etiqueta, g, max }: { etiqueta: string; g: Grupo; max: number }) {
  if (g.n === 0) {
    return (
      <div className="grid grid-cols-[96px_1fr] items-center gap-3 text-[13px]">
        <span className="text-[#E7ECE8]">{etiqueta}</span>
        <span className="text-[#4C5B54] text-[12.5px]">Sin datos</span>
      </div>
    );
  }
  const positivo = g.promedio >= 0;
  const ancho = Math.min(50, (Math.abs(g.promedio) / max) * 50); // % del ancho total, desde el centro
  const color = g.suficiente ? (positivo ? "#34D399" : "#E0605A") : "#3A4640";
  return (
    <div className="grid grid-cols-[96px_1fr_190px] items-center gap-3 text-[13px]">
      <span className="text-[#E7ECE8]">{etiqueta}</span>
      <div className="relative h-2.5 bg-[#0E1412] rounded">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#24302A]" />
        <div
          className="absolute top-0 bottom-0 rounded"
          style={{ background: color, width: `${ancho}%`, left: positivo ? "50%" : `${50 - ancho}%` }}
        />
      </div>
      <span className={`text-[12px] ${g.suficiente ? "text-[#7C8A82]" : "text-[#4C5B54]"}`}>
        {formatoDinero(g.promedio)} · {g.n} {plural(g.n, "operación", "operaciones")}
        {!g.suficiente && " · pocos datos"}
      </span>
    </div>
  );
}

function FilaRegla({ etiqueta, c }: { etiqueta: string; c: ConteoRegla }) {
  if (c.calculables === 0) {
    return (
      <div className="grid grid-cols-[96px_1fr] items-center gap-3 text-[13px]">
        <span className="text-[#E7ECE8]">{etiqueta}</span>
        <span className="text-[#4C5B54] text-[12.5px]">Sin datos</span>
      </div>
    );
  }
  const pct = (c.superaron / c.calculables) * 100;
  return (
    <div className="grid grid-cols-[96px_1fr_190px] items-center gap-3 text-[13px]">
      <span className="text-[#E7ECE8]">{etiqueta}</span>
      <div className="h-2.5 bg-[#0E1412] rounded overflow-hidden">
        <div
          className="h-full rounded"
          style={{ width: `${pct}%`, background: c.suficiente ? "#E0605A" : "#3A4640" }}
        />
      </div>
      <span className={`text-[12px] ${c.suficiente ? "text-[#7C8A82]" : "text-[#4C5B54]"}`}>
        {c.superaron} de {c.calculables}
        {!c.suficiente && " · pocos datos"}
      </span>
    </div>
  );
}

function Mini({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="bg-[#0E1412] border border-[#24302A] rounded px-4 py-3">
      <p className="text-[11.5px] text-[#7C8A82] mb-1 leading-snug">{etiqueta}</p>
      <p className="font-serif text-xl text-[#E7ECE8]">{valor}</p>
    </div>
  );
}

function LineaGrupo({ texto, g }: { texto: string; g: Grupo }) {
  return (
    <p className={`text-[13px] ${g.suficiente ? "text-[#B7C0BA]" : "text-[#4C5B54]"}`}>
      {texto}:{" "}
      <span className="font-medium" style={{ color: g.suficiente ? (g.promedio >= 0 ? "#34D399" : "#E0605A") : undefined }}>
        {formatoDinero(g.promedio)}
      </span>{" "}
      · {g.n} {plural(g.n, "operación", "operaciones")}
      {!g.suficiente && " · pocos datos"}
    </p>
  );
}

function Cuadro({ s }: { s: LineaSemana }) {
  let clases = "border-[#24302A] bg-[#162019]";
  let descripcion = "";
  if (s.tipo === "operada") {
    if (s.resultado !== null && s.resultado > 0) clases = "border-[#1E3A2A] bg-[#12261B]";
    else if (s.resultado !== null && s.resultado < 0) clases = "border-[#4A2A24] bg-[#2A1815]";
    descripcion =
      s.resultado === null ? "operada, sin cerrar" : `operada, resultado ${formatoDinero(s.resultado)}`;
  } else if (s.tipo === "sin_operar") {
    clases = "border-dashed border-[#3A4640] bg-transparent";
    descripcion = "sin operar";
  } else {
    clases = "border-[#3A2F18] bg-[#241E10]";
    descripcion = "sin decisión registrada";
  }
  const sentia = s.emocion ? `, te sentías ${ETIQUETA_ESTADO[s.emocion].toLowerCase()}` : "";
  return (
    <div
      title={`Semana del ${s.semana}: ${descripcion}${sentia}`}
      className={`w-8 h-8 rounded border flex items-center justify-center text-[15px] ${clases}`}
    >
      {s.emocion ? EMOJI[s.emocion] : "·"}
    </div>
  );
}

function Leyenda({ clases, texto }: { clases: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm border ${clases}`} />
      {texto}
    </span>
  );
}