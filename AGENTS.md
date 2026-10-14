# AGENTS.md — Plenti Trading Platform

## Quick Start

```bash
npm run dev       # Start dev server on http://localhost:3000
npm run build     # Production build (includes typecheck)
npm run lint      # ESLint (currently has 5 errors, 4 warnings)
npx tsx lib/operaciones.test.ts          # Run pure-logic tests
npx tsx lib/riesgo/calibrador.test.ts
npx tsx lib/riesgo/velas.test.ts
npx tsx lib/riesgo/contexto.test.ts
```

## Environment Variables (`.env.local`)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (client-safe) |
| `GEMINI_API_KEY` | yes | Google GenAI key for AI tutor / risk manager |

> The repo's `.env.local` only contains `GEMINI_API_KEY`. Supabase vars must be added locally.

## Architecture Overview

**Next.js 16 (App Router)** + **React 19** + **TypeScript** + **Tailwind CSS 4** + **Supabase** + **Google GenAI (Gemini 3.5 Flash Lite)**.

### Key Directories

```
app/                    # Next.js App Router pages & API routes
├── api/
│   ├── atr/route.ts               # Fetch ATR from Yahoo Finance
│   ├── generar-escenario/route.ts # Generate Nivel 2 scenario candles via AI
│   ├── gestor-riesgo/route.ts     # Risk manager AI (user context + rules)
│   └── tutor/route.ts             # Trading coach AI
├── operar/             # Trade entry form (hypothesis, risk calc, AI review)
├── simulador/
│   ├── nivel1/         # Static chart quizzes (candles, volume, trends)
│   └── nivel2/         # Guided replay with checkpoints + AI variants
├── diario/             # Trade journal
└── ...                 # Auth, dashboard, calculator, rules, onboarding

components/             # Shared UI (charts, shells, quiz, simulator)

lib/
├── operaciones.ts          # Pure logic: hypothesis validation, position sizing helpers
├── riesgo/
│   ├── calibrador.ts       # Pure risk math: ATR, position sizing, stop calc
│   ├── velas.ts            # Candle cleaning (Yahoo → daily, drop partials)
│   └── contexto.ts         # Technical context (SMA50/200, 52w range, volume)
├── nivel1/                 # Level 1 quiz types & question bank
├── nivel2/                 # Level 2 scenario types, generator, validators
├── supabase.ts             # Supabase client (browser)
├── buildContext.ts         # User history metrics for AI prompts
└── onboarding.ts           # Onboarding flow logic
```

### Path Alias

`@/*` → `./*` (configured in `tsconfig.json`)

## Critical Conventions

### Pure Logic First
All **risk math**, **validation**, and **candle processing** are pure functions in `lib/` with **no side effects** (no network, no Supabase, no AI). They live in:
- `lib/operaciones.ts` — hypothesis validation, position helpers
- `lib/riesgo/calibrador.ts` — ATR, position sizing, stop calculation
- `lib/riesgo/velas.ts` — candle cleaning/normalization
- `lib/riesgo/contexto.ts` — technical indicators (SMA, ranges, volume)

**Tests run with `npx tsx` directly on `.test.ts` files.** No test runner configured.

### AI Never Blocks
All AI routes (`/api/gestor-riesgo`, `/api/tutor`, `/api/generar-escenario`) have **rule-based fallbacks** and return `200` even if Gemini fails. The AI is advisory only; the system calculates all numbers (risk %, position size, ATR stops) **before** calling the model.

### Supabase RLS
API routes create a **per-request Supabase client** with the user's Bearer token so Row Level Security applies. See `app/api/gestor-riesgo/route.ts:73-77`.

### Risk Rules (Hardcoded Defaults)
- **Risk per trade**: 1% of capital (configurable via UI)
- **Max position size**: 5% of capital (configurable via UI)
- **Stop loss**: `entrada - k × ATR_diario` with **k = 4.5** (weekly ATR ≈ daily ATR × √5; 2 × √5 ≈ 4.47). See `DECISIONES.md`.
- **No fractional shares**, long-only.

### Weekly Cadence
- One trade per week (`yaOperoEstaSemana` check)
- Review date = Monday of trade week + 7 days (`fechaRevisionPorDefecto`)

## Common Tasks

### Add a Nivel 1 Question
1. Add to `lib/nivel1/banco-preguntas.ts`
2. Follow `PreguntaNivel1` type in `lib/nivel1/tipos.ts`
3. Include static chart data (`GraficoEstatico` with `VelaEstatica[]` or `BarraVolumen[]`)

### Add a Nivel 2 Scenario
1. Add to `lib/nivel2/banco-escenarios.ts`
2. Follow `EscenarioNivel2` type in `lib/nivel2/tipos.ts`
3. Define `checkpoints` with `patron_presente`, `decision_correcta`, `microleccion_si_falla`
4. Set `es_trampa: true` if AI should **not** generate a variant

### Modify Risk Math
Edit `lib/riesgo/calibrador.ts` — pure functions, well-tested. Run `npx tsx lib/riesgo/calibrador.test.ts` after changes.

### Add Technical Indicator
Extend `contextoTecnico` in `lib/riesgo/contexto.ts`. Returns `{ estado: "ok" | "parcial" | "sin_datos", ... }`.

## Gotchas

| Issue | Details |
|---|---|
| **No test script in package.json** | Use `npx tsx <file>` directly |
| **ESM module warning** | `package.json` lacks `"type": "module"`; `tsx` handles it |
| **Lint errors exist** | `react-hooks/set-state-in-effect` in `operar/page.tsx` and `simulador/nivel2/page.tsx`; `Date.now()` in render in `SimuladorGuiadoChart.tsx` |
| **Build passes despite lint errors** | `next build` only runs typecheck, not eslint |
| **Supabase client in API routes** | Must pass user token for RLS; don't use the global `lib/supabase.ts` client in server code |
| **AI prompts are long** | `gestor-riesgo` prompt is ~100 lines; changes affect tone & behavior significantly |

## File to Watch

- `DECISIONES.md` — Immutable trading rule decisions (stop k=4.5, weekly cadence, etc.). Changes require dated entry.
- `lib/riesgo/calibrador.ts` — Single source of truth for position sizing math.
- `app/api/gestor-riesgo/route.ts` — Risk manager prompt (most complex AI interaction).