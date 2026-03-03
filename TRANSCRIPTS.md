# End-to-End Interaction Transcripts

Two miniature transcripts showing mode transitions, data flow, and sample JSON payloads for testing Tasks 3–4.

---

## Data Flow Overview

```
User types message
      │
      ▼
  [elicitation]  ──── POST /api/chat { mode:"elicitation", history, userInput }
      │                    └─► ElicitationPayload { reply, story_completeness, missing_elements }
      │
      │  completeness ≥ 0.75 AND turnCount ≥ 3
      ▼
[concept_extraction] ── POST /api/chat { mode:"concept_extraction", history }
      │                    └─► ConceptExtractionPayload { packages: ConceptPackage[3] }
      │
      │  user clicks a concept card
      ▼
[code_generation] ───── POST /api/chat { mode:"code_generation", history, selectedPackage }
      │                    └─► CodeGenerationPayload { code, explanation, adjustable_params }
      │
      ├── code runs clean ──► [running]  (iframe renders p5 sketch, FPS reported)
      │
      └── iframe error ───► [debug] ──── POST /api/chat { mode:"debug", currentCode, errorLog }
                                │          └─► DebugPayload { patched_code, explanation, error_cause }
                                │
                                └── patched code injected ──► [running]

[running] ──► user clicks ★ Feedback
      ▼
  [critique] ──────────────── POST /api/chat { mode:"critique", currentCode, selectedPackage }
      │                          └─► CritiquePayload { feedback, suggestions, overall_score }
      │
      └── user clicks suggestion card
              ▼
        [code_generation]  (cycle repeats)
```

**State stored in `AppState`:**
- `mode` — drives UI (badges, button visibility, editor placeholder)
- `history` — full conversation passed to every API call for context
- `currentCode` — rendered live in Monaco editor and injected into iframe
- `adjustableParams / paramValues` — sliders that patch `let` declarations in code
- `errorLog / runtimeMetadata` — fed into debug and critique calls

---

## Transcript 1 — "Lonely in a Crowd"

**Premise:** User felt invisible at a packed house party.

---

### Turn 1 — mode: `elicitation`

**User:** "I went to this massive house party and somehow felt completely alone the whole time."

**POST /api/chat**
```json
{
  "mode": "elicitation",
  "history": [],
  "userInput": "I went to this massive house party and somehow felt completely alone the whole time."
}
```

**Response — ElicitationPayload**
```json
{
  "reply": "That contrast — surrounded by people yet utterly disconnected — is such a specific kind of loneliness. Were you moving through the crowd or mostly standing still? And was there a moment where it felt the most acute?",
  "story_completeness": 0.35,
  "missing_elements": ["sensory details", "colors / lighting", "emotional peak", "a key image"]
}
```
→ `story_completeness` 0.35 — stays in `elicitation`.

---

### Turn 2 — mode: `elicitation`

**User:** "I kept drifting room to room. Strobing lights, loud music. Everyone laughing in clusters. I'd hover at the edge, make eye contact, and they'd just… turn away."

**Response — ElicitationPayload**
```json
{
  "reply": "The image of hovering at the edge of a circle and then watching it close — that's quietly devastating. The strobing light is interesting too; flashes of visibility, then darkness. Was the feeling more like being *invisible*, or like being *seen but not wanted*?",
  "story_completeness": 0.68,
  "missing_elements": ["resolution or aftermath", "one dominant color or texture"]
}
```
→ 0.68 — still in `elicitation`, one more turn needed.

---

### Turn 3 — mode: `elicitation` → auto-fires `concept_extraction`

**User:** "Invisible, definitely. Like I was a ghost. Cold blue light from the pool outside bleeding in. I left early and sat in my car."

**Response — ElicitationPayload**
```json
{
  "reply": "The cold blue pool light is a perfect visual anchor. And the car at the end — a bubble of stillness you retreated into. I think I have everything I need.",
  "story_completeness": 0.88,
  "missing_elements": []
}
```
→ `story_completeness` 0.88 + `turnCount` 3 → **auto-fires concept extraction**.

**Mode transition: `elicitation` → `concept_extraction`**

---

### Concept Extraction — mode: `concept_extraction`

**POST /api/chat**
```json
{
  "mode": "concept_extraction",
  "history": [ "...full conversation above..." ]
}
```

**Response — ConceptExtractionPayload**
```json
{
  "packages": [
    {
      "id": "pkg_1",
      "title": "Orbiting Strangers",
      "description": "Dozens of particles orbit shared center points but repel each other just before touching — proximity without contact, endlessly circling.",
      "visual_metaphor": "bodies in social gravity that never collide",
      "mood": "melancholic",
      "color_palette": ["#0d1b2a", "#1b4f72", "#7fb3d3"],
      "key_elements": ["orbital motion", "near-miss repulsion", "cold blue palette"]
    },
    {
      "id": "pkg_2",
      "title": "Static Crowd",
      "description": "Dense field of fine lines flicker like analog TV static, occasionally forming the ghost of a human silhouette before dissolving back to noise.",
      "visual_metaphor": "signal lost in interference",
      "mood": "anxious",
      "color_palette": ["#111111", "#444444", "#cccccc"],
      "key_elements": ["noise", "silhouette", "flicker"]
    },
    {
      "id": "pkg_3",
      "title": "Closed Circles",
      "description": "Clusters of dots slowly draw closed rings around themselves. A single outlier dot wanders between clusters, never absorbed.",
      "visual_metaphor": "social circles literally closing",
      "mood": "resigned",
      "color_palette": ["#1a1a2e", "#4a4e69", "#c9ada7"],
      "key_elements": ["rings", "outlier", "clustering"]
    }
  ]
}
```

**Mode transition: `concept_extraction` → `concept_selection`**
UI renders three concept cards. User clicks **"Orbiting Strangers"**.

---

### Code Generation — mode: `code_generation`

**Mode transition: `concept_selection` → `code_generation`**

**POST /api/chat**
```json
{
  "mode": "code_generation",
  "history": [ "...full conversation..." ],
  "selectedPackage": { "id": "pkg_1", "title": "Orbiting Strangers", "...": "..." }
}
```

**Response — CodeGenerationPayload**
```json
{
  "code": "let orbitSpeed = 0.008;\nlet repelDist = 28;\nlet numClusters = 6;\nlet clusters = [];\nlet particles = [];\n\nfunction setup() {\n  createCanvas(600, 400);\n  colorMode(RGB);\n  for (let i = 0; i < numClusters; i++) {\n    clusters.push({ x: random(80, width-80), y: random(80, height-80) });\n  }\n  for (let i = 0; i < 40; i++) {\n    let c = clusters[floor(random(numClusters))];\n    particles.push({ cx: c.x, cy: c.y, angle: random(TWO_PI), radius: random(30, 70), speed: random(0.004, orbitSpeed) });\n  }\n}\n\nfunction draw() {\n  background(13, 27, 42, 30);\n  for (let p of particles) {\n    p.angle += p.speed;\n    let x = p.cx + cos(p.angle) * p.radius;\n    let y = p.cy + sin(p.angle) * p.radius;\n    for (let other of particles) {\n      let ox = other.cx + cos(other.angle) * other.radius;\n      let oy = other.cy + sin(other.angle) * other.radius;\n      if (dist(x, y, ox, oy) < repelDist) p.angle -= 0.002;\n    }\n    fill(127, 179, 211, 180);\n    noStroke();\n    ellipse(x, y, 5, 5);\n  }\n}",
  "explanation": "Particles orbit shared cluster centers in cold blue. A repulsion force nudges them away when they get close — proximity without contact.",
  "adjustable_params": [
    { "variable": "orbitSpeed", "label": "Orbit Speed", "min": 0.002, "max": 0.02, "step": 0.001, "default": 0.008 },
    { "variable": "repelDist",  "label": "Repel Distance", "min": 10, "max": 60, "step": 5, "default": 28, "unit": "px" },
    { "variable": "numClusters","label": "Cluster Count", "min": 2, "max": 12, "step": 1, "default": 6 }
  ]
}
```

**Mode transition: `code_generation` → `running`**
Code injected into iframe. Sketch renders. FPS messages begin.

---

### Feedback — mode: `critique`

User clicks **★ Feedback**.

**Mode transition: `running` → `critique`**

**Response — CritiquePayload (abbreviated)**
```json
{
  "feedback": "The orbital repulsion mechanic is a strong literal translation of the story — bodies that approach but never touch. The cold blue palette earns its connection to the pool-light detail. The trail effect from the semi-transparent background gives it atmosphere. The main weakness is uniformity: all particles move at nearly the same speed, which undercuts the 'crowd energy' feeling. Real crowds have stillness and bursts.",
  "suggestions": [
    {
      "id": "sug_1",
      "title": "Add speed variance",
      "description": "Some particles should linger, some should move frenetically — crowd energy.",
      "prompt": "Give each particle a randomised speed ranging from very slow (stillness) to fast (energy), so the sketch feels like a real uneven crowd rather than a synchronized system."
    },
    {
      "id": "sug_2",
      "title": "Single ghost outlier",
      "description": "One particle that floats slowly through all clusters without belonging to any.",
      "prompt": "Add one special particle that drifts slowly in a straight line across the whole canvas, passing through all the clusters without being pulled into any orbit — a visual stand-in for the narrator."
    }
  ],
  "overall_score": 6.9
}
```

User clicks **"Single ghost outlier"** → fires `code_generation` with suggestion prompt.

---

## Transcript 2 — "On Top of the World"

**Premise:** User summited a mountain alone at dawn after a year of setbacks.

---

### Turn 1 — mode: `elicitation`

**User:** "I reached the summit of a mountain I'd been training for all year. Got there at sunrise, completely alone."

**Response — ElicitationPayload**
```json
{
  "reply": "That moment of arriving somewhere you've been working toward for a year — with no one else there, just you and the horizon — must have been enormous. What did the light look like when you got there? And what did you feel in your body first?",
  "story_completeness": 0.42,
  "missing_elements": ["colors / light quality", "physical sensation", "emotional arc of the year"]
}
```

---

### Turn 2 — mode: `elicitation`

**User:** "The sky went from deep purple to orange to blinding gold. My legs were shaking. I'd failed to get there twice before. I just started crying."

**Response — ElicitationPayload**
```json
{
  "reply": "Purple → orange → gold is a full emotional spectrum in a single sky. And the shaking legs detail is perfect — the body saying 'we made it' before the mind does. The two previous failed attempts make the third summit feel earned rather than lucky. Is there one image you keep returning to when you think about it?",
  "story_completeness": 0.74,
  "missing_elements": ["one anchoring image"]
}
```

---

### Turn 3 — mode: `elicitation` → auto-fires `concept_extraction`

**User:** "Standing at the stone marker at the top. Arms out. The valley was still dark below me and I was already in the sun."

**Response — ElicitationPayload**
```json
{
  "reply": "That image — lit from above while darkness pools below — is genuinely powerful. The stone marker, the valley in shadow, arms out. That's enough. Let's build something.",
  "story_completeness": 0.91,
  "missing_elements": []
}
```
→ `story_completeness` 0.91 + `turnCount` 3 → **auto-fires concept extraction**.

**Mode transition: `elicitation` → `concept_extraction`**

---

### Concept Extraction — mode: `concept_extraction`

**Response — ConceptExtractionPayload**
```json
{
  "packages": [
    {
      "id": "pkg_1",
      "title": "Summit Burst",
      "description": "Light rays erupt from a single central point and sweep across the canvas, their intensity building from a faint purple pre-dawn to searing gold at the peak. A solitary particle rises slowly through them.",
      "visual_metaphor": "the moment the sun clears the ridge",
      "mood": "triumphant",
      "color_palette": ["#1a0533", "#c0392b", "#f39c12", "#f9d71c"],
      "key_elements": ["radial rays", "color gradient sweep", "ascending particle"]
    },
    {
      "id": "pkg_2",
      "title": "Valley in Shadow",
      "description": "The lower half of the canvas holds slowly drifting dark particles. A sharp horizontal light line bisects the frame. Above it, golden particles scatter and rise. Below it, deep cool tones pool and sink.",
      "visual_metaphor": "standing at the exact line where shadow ends and sun begins",
      "mood": "awe",
      "color_palette": ["#0a0a1a", "#2c3e50", "#f39c12", "#ffeaa7"],
      "key_elements": ["horizon line", "two-zone composition", "rising/sinking particles"]
    },
    {
      "id": "pkg_3",
      "title": "Three Attempts",
      "description": "Three lines climb the canvas from the bottom. The first two fade and stop partway up. The third reaches the top and explodes into a radial burst of golden lines.",
      "visual_metaphor": "the path of three attempts — two incomplete, one triumphant",
      "mood": "resilient",
      "color_palette": ["#636e72", "#636e72", "#fdcb6e"],
      "key_elements": ["three paths", "trail fade", "apex burst"]
    }
  ]
}
```

User selects **"Summit Burst"**.

**Mode transition: `concept_extraction` → `concept_selection` → `code_generation`**

---

### Code Generation — mode: `code_generation`

**Response — CodeGenerationPayload**
```json
{
  "code": "let rayCount = 80;\nlet sweepSpeed = 0.004;\nlet brightness = 1.0;\nlet t = 0;\n\nfunction setup() {\n  createCanvas(600, 400);\n  colorMode(HSB, 360, 100, 100, 100);\n}\n\nfunction draw() {\n  background(0, 0, 0, 15);\n  t += sweepSpeed;\n  let progress = (sin(t) + 1) / 2;\n  let cx = width / 2;\n  let cy = height / 2 + 30;\n  for (let i = 0; i < rayCount; i++) {\n    let angle = (TWO_PI / rayCount) * i;\n    let len = random(80, 220);\n    let hue = lerp(270, 45, progress);\n    let alpha = lerp(20, 70, progress) * brightness;\n    stroke(hue, 80, 95, alpha);\n    strokeWeight(random(0.5, 1.5));\n    line(cx, cy, cx + cos(angle) * len, cy + sin(angle) * len);\n  }\n  let px = cx;\n  let py = height - (progress * height * 0.9);\n  noStroke();\n  fill(50, 100, 100, 90);\n  ellipse(px, py, 8, 8);\n}",
  "explanation": "Rays radiate from a central point and sweep from deep purple through to gold as the cycle progresses, matching the dawn gradient. A single point ascends the canvas across the full cycle.",
  "adjustable_params": [
    { "variable": "rayCount",   "label": "Ray Count",    "min": 20,  "max": 200, "step": 10, "default": 80 },
    { "variable": "sweepSpeed", "label": "Sweep Speed",  "min": 0.001, "max": 0.02, "step": 0.001, "default": 0.004 },
    { "variable": "brightness", "label": "Brightness",   "min": 0.3, "max": 2.0, "step": 0.1, "default": 1.0 }
  ]
}
```

**Mode transition: `code_generation` → `running`**
Sketch renders cleanly — no errors, no debug cycle.

---

### Feedback — mode: `critique`

**Response — CritiquePayload (abbreviated)**
```json
{
  "feedback": "The color sweep from purple to gold is the strongest element — it directly encodes the passage of time from pre-dawn to full sun, and it's felt rather than just seen. The ascending particle is a smart minimalist stand-in for the climber. The sketch suffers slightly from symmetry: a perfect radial burst reads as mechanical rather than natural. Real light at a summit ridge would be directional and uneven. The loop also makes the dawn feel trivially repeatable rather than hard-won.",
  "suggestions": [
    {
      "id": "sug_1",
      "title": "Break the symmetry",
      "description": "Make rays vary more in length and weight — natural light is uneven.",
      "prompt": "Make the ray lengths vary much more dramatically (some very short, some very long) and vary the ray weight from hairline to 3px, so the burst looks like actual light rather than a technical diagram."
    },
    {
      "id": "sug_2",
      "title": "Play it forward once",
      "description": "Run the dawn once, fully, then hold — earn the golden moment.",
      "prompt": "Run the colour sweep from purple to gold exactly once (no looping). At the end, hold the golden state indefinitely so the climax feels earned and permanent rather than cyclical."
    }
  ],
  "overall_score": 7.4
}
```

---

## Mode Transition Summary

| Transcript | Turns to concepts | Debug needed | Final score |
|---|---|---|---|
| Lonely in a Crowd | 3 | No | 6.9 / 10 |
| On Top of the World | 3 | No | 7.4 / 10 |

```
elicitation (×3) → concept_extraction → concept_selection
    → code_generation → running [→ debug → running]
        → critique → code_generation → running
```
