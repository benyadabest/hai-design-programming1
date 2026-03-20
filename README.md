# p5 Sketch Maker

A conversational generative-art tool that turns a personal memory into a live, animated p5.js sketch through a multi-stage AI pipeline.

Built for HAI Design × Programming 1.

---

## What it does

1. **Story elicitation** — a creative director guides you through your memory with questions, observations, and directives — explicitly surfacing detected emotions and evolving visual direction
2. **Concept extraction** — when you're ready (click **Generate** anytime, or let the system auto-trigger), three distinct visual concept packages are generated
3. **Sketch generation** — you pick a concept; a complete p5.js sketch is written and runs live in the browser
4. **Auto-debug** — if the sketch has a runtime error it's detected automatically and patched (fires once per code version)
5. **Critique & iteration** — request structured feedback with an overall score and clickable improvement suggestions; participants are encouraged to repeat **★ Feedback → apply a suggestion → run again** several times so the session reflects collaborative, incremental refinement rather than a single pass after the first generation
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
  ConceptCards.tsx      # concept package selection cards + "Surprise me"
  WelcomeModal.tsx      # first-visit welcome overlay with prize incentive
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

## Communication Design

### System Persona: Creative Director (not a teacher)

The AI acts as a **creative director** — not a passive listener or a teacher asking quiz questions. It has authority over the creative process and exercises it through a mix of:

- **Questions**: "What emotions did you feel in that moment?"
- **Observations**: "I'm sensing tension and relief layered on top of each other here."
- **Directives**: "Focus on what you saw, not what you thought."
- **Creative announcements**: "I'm going to lean into that contrast between the warmth of the crowd and your sense of isolation."

The system does **not** ask a question every turn. It can inform, instruct, and direct.

### Explicit Emotions

Emotions are a first-class element of the interaction:

1. **The system asks about emotions directly** — at least once per conversation, it explicitly asks "What emotions did you feel?" (or a variation).
2. **The system reports detected emotions** — after each response, the system shows which emotions it picked up from the user's story (e.g., "Emotions I'm picking up: nostalgia, tension, warmth").
3. **The system announces creative direction** — when it has enough signal, it tells the user what visual direction it's leaning toward before generating anything.

### Transparent Creative Process

The system tells the user what it plans to draw **before generation starts**:

- During elicitation, the `creative_direction` field surfaces the system's evolving visual intent.
- Before triggering generation, the system announces its plan ("I'm going to build this around spiraling particles that fragment as they move outward — representing how that memory keeps scattering").

### User Control: Generate Button

The user has a **"Generate" button** visible at all times during the conversation (after the first message). They can click it whenever they feel ready — they don't have to wait for the system to decide the story is "complete enough."

- The system still auto-triggers generation at `story_completeness >= 0.75` after 3+ turns.
- But the user can override this at any point by clicking **Generate**.
- The "generate" keyword shortcut (typing "generate", "go ahead", "let's go", etc.) also still works.

### Elicitation Response Schema

```json
{
  "reply": "Your response — question, observation, directive, or announcement",
  "detected_emotions": ["nostalgia", "tension"],
  "creative_direction": "Spiraling particles fragmenting outward",
  "story_completeness": 0.6,
  "missing_elements": ["sensory texture", "key visual"]
}
```

### Interaction Flow

```
User shares experience
    |
    v
Creative Director responds (question / observation / directive)
  - Shows detected emotions
  - Shows creative direction (when ready)
    |
    v
[User can click GENERATE at any time]
    |
    v
3 Concept Packages presented (or "Surprise me" to let the system pick)
    |
    v
User picks one -> Code generated -> Sketch runs
    |
    v
Critique / Adjust / Regenerate cycle
```

---

## Emerging trust UX

The app is designed as a **single-use experience** — users never come back, so trust is always emerging. The UX reflects this:

- **Welcome modal with prize incentive** — Sets a goal frame ("Create something amazing and win a prize") before the user types anything. Explains the 3-step flow so the user knows what to expect.
- **"Surprise me" concept selection** — A dashed-border card below the 3 concepts reads "I trust you — pick for me." Users who click it are signaling trust in the system. Users who carefully compare all 3 cards aren't there yet. Both paths are valid.
- **p5.js preloading** — The p5.js library is preloaded via `<link rel="preload">` on page load so the sketch renders instantly after code generation. In a 1x experience, infrastructure delays erode trust — the "magic moment" must be immediate.

---

## Key design decisions

**Single API route, mode-dispatched** — all AI calls go through `/api/chat` with a `mode` field. The server builds the appropriate prompt, validates the JSON response against a schema, and retries up to 2× on malformed output.

**Iframe sandbox** — p5.js runs in `sandbox="allow-scripts"` with the full p5 source inlined at render time. User-generated code is scanned for forbidden APIs (`fetch`, `eval`, `document.*`, etc.) before injection.

**Auto-debug fires once** — `autoDebugFiredRef` locks after the first error per code version and only resets when the user explicitly re-runs, regenerates, or applies a suggestion. Prevents infinite debug loops.

**Stable callbacks via refs** — `runtimeMetadata` is stored in a ref alongside state so the FPS reporter's 1 Hz messages don't cause `handleCanvasError` to get a new reference every second (which would reset the iframe on every tick).

**AbortController threading** — every API call is abortable. The **■ Stop** button (visible while any request is in-flight) cancels it immediately and returns the UI to a usable state.
