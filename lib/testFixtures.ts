import type {
  AppMode,
  ElicitationPayload,
  ConceptExtractionPayload,
  CodeGenerationPayload,
  DebugPayload,
  CritiquePayload,
} from './types'

export interface TestFixture {
  id: string
  label: string
  description: string
  /** Which API mode this fixture intercepts. 'any' matches every mode. */
  targetMode: AppMode | 'any'
  /** If true, the mock throws an error instead of returning a payload. */
  isError?: boolean
  errorMessage?: string
  response?: unknown
  /** Delay in ms before resolving/rejecting. Default 400. Use large value to test Stop. */
  simulatedDelay?: number
}

export interface FixtureGroup {
  label: string
  fixtures: TestFixture[]
}

// ── p5.js snippets ───────────────────────────────────────────────────────────

const CODE_WORKING = `let speed = 1.5;
let numDots = 60;
let dots = [];

function setup() {
  createCanvas(600, 400);
  for (let i = 0; i < numDots; i++) {
    dots.push({
      x: random(width),
      y: random(height),
      vx: random(-speed, speed),
      vy: random(-speed, speed),
      r: random(3, 8)
    });
  }
}

function draw() {
  fill(10, 10, 20, 30);
  noStroke();
  rect(0, 0, width, height);
  for (let d of dots) {
    d.x += d.vx;
    d.y += d.vy;
    if (d.x < 0 || d.x > width) d.vx *= -1;
    if (d.y < 0 || d.y > height) d.vy *= -1;
    fill(200, 150, 255, 200);
    ellipse(d.x, d.y, d.r * 2);
  }
}`

// Uses undeclared variables — triggers a ReferenceError in the iframe
const CODE_BROKEN = `let speed = 2;

function setup() {
  createCanvas(600, 400);
}

function draw() {
  background(0);
  fill(hue, saturation, brightness);
  ellipse(mouseX, mouseY, 50 * speed, 50 * speed);
}`

// Correctly fixes the broken sketch above
const CODE_FIXED = `let speed = 2;
let hue = 0;

function setup() {
  createCanvas(600, 400);
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  background(0);
  hue = (hue + speed) % 360;
  fill(hue, 80, 100);
  ellipse(mouseX, mouseY, 50 * speed, 50 * speed);
}`

// "Fixes" the sketch but introduces a new TypeError — tests the loop-stop fix
const CODE_STILL_BROKEN = `let speed = 2;
let particles = null;

function setup() {
  createCanvas(600, 400);
}

function draw() {
  background(0);
  particles.forEach(function(p) {
    ellipse(p.x, p.y, 10);
  });
}`

// ── Fixture groups ────────────────────────────────────────────────────────────

export const FIXTURE_GROUPS: FixtureGroup[] = [
  {
    label: 'Story',
    fixtures: [
      {
        id: 'story_complete',
        label: 'Complete',
        description:
          'Returns 0.92 completeness. The threshold (0.75 + 3 turns) triggers concept extraction — use this fixture 3 times to get there fast.',
        targetMode: 'elicitation',
        response: {
          reply:
            "What a vivid memory. The soft golden light, the quiet rustling of leaves, that feeling of complete stillness — I think I have everything I need to start building something.",
          story_completeness: 0.92,
          missing_elements: [],
        } satisfies ElicitationPayload,
      },
      {
        id: 'story_incomplete',
        label: 'Incomplete',
        description: 'Returns 0.3 completeness — stays in elicitation, asks follow-up.',
        targetMode: 'elicitation',
        response: {
          reply: "Interesting start! Can you tell me more about the colors or textures you remember most vividly?",
          story_completeness: 0.3,
          missing_elements: ['colors', 'textures', 'emotional tone', 'time of day'],
        } satisfies ElicitationPayload,
      },
    ],
  },
  {
    label: 'Concepts',
    fixtures: [
      {
        id: 'concepts_mock',
        label: 'Mock packages',
        description: 'Returns 3 pre-defined concept packages (skips the real model call).',
        targetMode: 'concept_extraction',
        response: {
          packages: [
            {
              id: 'pkg_1',
              title: 'Golden Hour Drift',
              description: 'Soft golden particles drift lazily across a warm gradient, occasionally clustering before dissolving.',
              visual_metaphor: 'motes of dust caught in afternoon light',
              mood: 'peaceful',
              color_palette: ['#f5c842', '#e8874a', '#2d1b4e'],
              key_elements: ['particles', 'gradient', 'slow drift'],
            },
            {
              id: 'pkg_2',
              title: 'Ripple Memory',
              description: 'Concentric rings expand from a central point, overlapping and interfering like overlapping memories.',
              visual_metaphor: 'ripples spreading across still water',
              mood: 'contemplative',
              color_palette: ['#4a9eca', '#1a3a5c', '#e8f4f8'],
              key_elements: ['circles', 'interference', 'center point'],
            },
            {
              id: 'pkg_3',
              title: 'Fracture Lines',
              description: 'Sharp geometric lines branch recursively across the canvas, like cracks in ice or thought patterns.',
              visual_metaphor: 'fractures spreading through glass',
              mood: 'tense',
              color_palette: ['#e0e0e0', '#333333', '#c0392b'],
              key_elements: ['lines', 'recursion', 'branching'],
            },
          ],
        } satisfies ConceptExtractionPayload,
      },
    ],
  },
  {
    label: 'Code',
    fixtures: [
      {
        id: 'code_working',
        label: 'Working sketch',
        description: 'Generates a working floating-particles sketch with two sliders.',
        targetMode: 'code_generation',
        response: {
          code: CODE_WORKING,
          explanation: 'Soft particles drift and bounce across a dark canvas, evoking gentle, drifting energy.',
          adjustable_params: [
            { variable: 'speed', label: 'Speed', min: 0.5, max: 5, step: 0.5, default: 1.5, unit: 'px/f' },
            { variable: 'numDots', label: 'Dot Count', min: 10, max: 200, step: 10, default: 60 },
          ],
        } satisfies CodeGenerationPayload,
      },
      {
        id: 'code_broken',
        label: 'Broken sketch',
        description: 'Generates code with an undeclared-variable ReferenceError — triggers auto-debug.',
        targetMode: 'code_generation',
        response: {
          code: CODE_BROKEN,
          explanation: 'An interactive cursor sketch (contains a deliberate bug for testing the debug flow).',
          adjustable_params: [
            { variable: 'speed', label: 'Speed', min: 1, max: 10, step: 1, default: 2 },
          ],
        } satisfies CodeGenerationPayload,
      },
    ],
  },
  {
    label: 'Debug',
    fixtures: [
      {
        id: 'debug_fixed',
        label: 'Fix succeeds',
        description: 'Debug returns working patched code — sketch starts running.',
        targetMode: 'debug',
        response: {
          patched_code: CODE_FIXED,
          explanation: 'Declared hue variable and made it cycle each frame. Switched to HSB color mode.',
          error_cause: 'hue, saturation, and brightness were used as color values without being declared.',
        } satisfies DebugPayload,
      },
      {
        id: 'debug_still_broken',
        label: 'Fix fails',
        description: 'Debug returns code with a different error — verifies the loop-stop fix works.',
        targetMode: 'debug',
        response: {
          patched_code: CODE_STILL_BROKEN,
          explanation: 'Refactored to use a particles array approach (but introduced a new null reference bug).',
          error_cause: 'Original undeclared variable issue. Restructured particle management.',
        } satisfies DebugPayload,
      },
    ],
  },
  {
    label: 'Critique',
    fixtures: [
      {
        id: 'critique_positive',
        label: 'Glowing (7.8)',
        description: 'High score with two gentle improvement suggestions.',
        targetMode: 'critique',
        response: {
          feedback:
            'This sketch beautifully captures the essence of the original story. The drifting particles feel organic and emotionally resonant — their gentle bounce adds quiet life without overwhelming the calm mood. The near-black background with soft-purple particles enhances the contemplative quality. Code is clean and readable. The main opportunity is variety: particles currently behave identically, missing a chance for subtle visual richness.',
          suggestions: [
            {
              id: 'sug_1',
              title: 'Add size pulsing',
              description: 'Let particles gently breathe in size over time.',
              prompt: 'Make each particle gently pulse in size — slowly growing and shrinking independently, like breathing.',
            },
            {
              id: 'sug_2',
              title: 'Warm color shift',
              description: 'Shift the palette slowly from cool to warm to suggest time passing.',
              prompt: 'Slowly shift the overall hue from cool purple toward warm gold over 15 seconds, then loop smoothly.',
            },
          ],
          overall_score: 7.8,
        } satisfies CritiquePayload,
      },
      {
        id: 'critique_harsh',
        label: 'Harsh (3.2)',
        description: 'Low score with three critical suggestions — tests the suggestion UI.',
        targetMode: 'critique',
        response: {
          feedback:
            'While technically functional, this sketch feels disconnected from the story it came from. Random particle placement is generic — it could represent almost any human experience, and therefore represents none. The purple color has no clear connection to the memory described. The animation loop is monotonous with no variation, build, or resolution. A generative art piece should feel specific. This feels assembled from a template.',
          suggestions: [
            {
              id: 'sug_1',
              title: 'Ground the palette in the story',
              description: 'Use colors the user actually mentioned.',
              prompt: 'Rebuild the color palette to use warm golden and earthy green tones directly inspired by the conversation, with gentle transitions between them.',
            },
            {
              id: 'sug_2',
              title: 'Add a narrative arc',
              description: 'Give the sketch a beginning, middle, and end.',
              prompt: 'Add a 30-second narrative arc: start sparse and slow, build to a peak of density and movement, then gently fade back to stillness. Loop the whole cycle.',
            },
            {
              id: 'sug_3',
              title: 'Meaningful canvas composition',
              description: 'Particles should emerge from or converge toward a focal point.',
              prompt: 'Have particles emerge from the center and drift outward like ripples, so the composition has a clear point of focus that relates to the memory.',
            },
          ],
          overall_score: 3.2,
        } satisfies CritiquePayload,
      },
    ],
  },
  {
    label: 'Errors',
    fixtures: [
      {
        id: 'error_api',
        label: 'API error',
        description: 'Next request throws a server error — tests error handling in all handlers.',
        targetMode: 'any',
        isError: true,
        errorMessage: 'Mock: connection refused (test fixture)',
      },
      {
        id: 'error_timeout',
        label: 'Hang (test Stop)',
        description: 'Next request hangs for 30s — use the Stop button to cancel it.',
        targetMode: 'any',
        simulatedDelay: 30_000,
        response: null,
      },
    ],
  },
]

export const FIXTURES_BY_ID: Record<string, TestFixture> = Object.fromEntries(
  FIXTURE_GROUPS.flatMap((g) => g.fixtures).map((f) => [f.id, f])
)
