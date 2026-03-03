# p5 Sketch Maker

A conversational generative-art tool that turns a personal memory into a live, animated p5.js sketch through a multi-stage AI pipeline.

Built for HAI Design × Programming 1.

---

## What it does

1. **Story elicitation** — the AI asks questions to draw out sensory and emotional details from a memory you share
2. **Concept extraction** — once your story is rich enough, three distinct visual concept packages are generated
3. **Sketch generation** — you pick a concept; a complete p5.js sketch is written and runs live in the browser
4. **Auto-debug** — if the sketch has a runtime error it's detected automatically and patched (fires once per code version)
5. **Critique & iteration** — request structured feedback with an overall score and clickable improvement suggestions
6. **Live sliders** — adjustable parameters exposed as sliders that hot-patch the running sketch

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router, `use client`) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| Canvas runtime | p5.js 1.9.4 in a sandboxed `<iframe>` |
| AI backend | Ollama (local) via OpenAI-compatible API |
| Default model | `qwen2.5-coder:7b` |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Pull the model

```bash
ollama pull qwen2.5-coder:7b
```

A larger model gives better code quality:

```bash
ollama pull qwen2.5-coder:14b
```

### 3. Configure (optional)

Copy `.env.local.example` to `.env.local` and override defaults:

```bash
cp .env.local.example .env.local
```

```env
OLLAMA_BASE_URL=http://localhost:11434/v1   # default
OLLAMA_MODEL=qwen2.5-coder:14b             # override model
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
app/
  page.tsx            # main UI — all state (useReducer) & API orchestration
  layout.tsx
  globals.css
  api/chat/route.ts   # single POST endpoint, dispatches to prompt builder

components/
  ChatPanel.tsx         # conversation + message list
  CanvasPanel.tsx       # sandboxed iframe, p5 injection, error/FPS capture
  EditorPanel.tsx       # Monaco editor + Run / Regenerate / Feedback toolbar
  SliderControls.tsx    # auto-generated sliders for adjustable params
  ConceptCards.tsx      # concept package selection cards
  TestModePanel.tsx     # fixture bar for testing without a live model

lib/
  types.ts            # all shared TypeScript interfaces
  schemas.ts          # JSON validation schemas per mode
  validator.ts        # validates API responses against schemas, retries on failure
  prompts.ts          # system prompts + message builders per mode
  testFixtures.ts     # pre-defined mock responses for every scenario

TRANSCRIPTS.md        # end-to-end example transcripts with JSON payloads
```

---

## Test mode

Click **⚗ Test Mode** in the header to open a fixture bar. Select any scenario to intercept the next matching API call with a pre-defined mock response — no running model required for that step.

| Group | Scenarios |
|---|---|
| Story | Complete (triggers concepts), Incomplete |
| Concepts | Mock packages |
| Code | Working sketch, Broken sketch (triggers auto-debug) |
| Debug | Fix succeeds, Fix fails (verifies the loop-stop) |
| Critique | Glowing review (7.8 / 10), Harsh critique (3.2 / 10) |
| Errors | API error, 30 s hang (tests the Stop button) |

---

## Key design decisions

**Single API route, mode-dispatched** — all AI calls go through `/api/chat` with a `mode` field. The server builds the appropriate prompt, validates the JSON response against a schema, and retries up to 2× on malformed output.

**Iframe sandbox** — p5.js runs in `sandbox="allow-scripts"` with the full p5 source inlined at render time. User-generated code is scanned for forbidden APIs (`fetch`, `eval`, `document.*`, etc.) before injection.

**Auto-debug fires once** — `autoDebugFiredRef` locks after the first error per code version and only resets when the user explicitly re-runs, regenerates, or applies a suggestion. Prevents infinite debug loops.

**Stable callbacks via refs** — `runtimeMetadata` is stored in a ref alongside state so the FPS reporter's 1 Hz messages don't cause `handleCanvasError` to get a new reference every second (which would reset the iframe on every tick).

**AbortController threading** — every API call is abortable. The **■ Stop** button (visible while any request is in-flight) cancels it immediately and returns the UI to a usable state.
