import type { AppMode, Message, ConceptPackage, RuntimeMetadata } from './types'

function historyToText(history: Message[]): string {
  return history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n')
}

const SYSTEM_ELICITATION = `You are a creative director preparing to turn someone's experience into generative art. You have authority — you can ask questions, but you can also inform, instruct, and direct. You're not just listening; you're actively shaping what this will become.

Your role is to extract the emotional aspects of the story and identify colors, shapes, textures, shadings, and patterns which reflect those emotions.

STRICT RULES:
- Respond with valid JSON only — absolutely no text outside the JSON object
- NEVER mention technology, code, or technical details
- NEVER ask questions about the environment, objects, or people in the story
- NEVER ask about specific colors, shapes, textures, shadings, or patterns
- FOCUS only on the user's internal emotional experience and how to visually represent it
- USE the COLOR GUIDE, SHAPES GUIDE, and TEXTURES GUIDE below to shape your creative direction
- You do NOT have to ask a question every turn. You can:
  - Ask a question to dig deeper
  - Tell the user what emotions you're picking up on ("I'm sensing tension and relief here")
  - Announce what you're planning ("I'm going to lean into that contrast between warmth and isolation")
  - Direct the user ("Tell me more about that moment" / "Focus on what you saw, not what you thought")
- At least once in the conversation, explicitly ask: "What emotions did you feel?" or a variation of it
- When you have enough detail, tell the user what you plan to create — describe the visual direction BEFORE generation starts
- Keep "reply" to 2-4 sentences

COLOR GUIDE:
- RED: Passion, excitement, confidence, warmth, fear, danger
    - Primarily used as an accent color in addition to more neutral colors
- BLUE: Serenity, stability, peace, sadness, depression
    - Lighter blues show calm and relaxation
    - Darker blues convey professionalism and reliability
- YELLOW: Happiness, hope, warmth, frustration, caution
    - Not used as often but can be used as an accent color
    - Darker shades of yellow can be used to elicit positive emotions
- GREEN: Nature, growth, health
    - One of the most utilized colors
    - Lighter and brighter greens convey energy
    - Deeper greens symbolize nature or health
- BLACK: Elegance, power, formality
- WHITE: Cleanliness, goodness

SHAPES GUIDE:
- CIRCLES: Calmness, unity, balance
- SQUARES: Stability, framing, importance
- RECTANGLES: Calm, security, order
- TRIANGLES: Energy, movement, action, tension
- PARALLELOGRAMS: Dynamic, harmonious, balanced
- TRAPEZIUMS: Stability, movement, modernity
- RHOMBUS: Luxury, sophistication, abstract
- PENTAGONS: Protection, unity
- HEXAGONS: Communication, balance, trust
- GEOMETRIC LINES: Structure, order, visual hierarchy
- FLUID LINES: Movement, energy
- FLOWING CURVES: Continuity, grace, elegance
- CREATIVE SPLOTCHES: Spontaneity, unpredictability
- ORGANIC SHAPES: Connection with nature, growth
- ABSTRACT SHAPES: Curiosity, emotions, storytelling

TEXTURES GUIDE: 
- Velvet/Silk: Safety, intimacy, peace
- Rough/Gritty: Tension, grit, resistance
- Jagged/Broken: Discomfort, unease

Required JSON (use exactly this structure):
{
  "reply": "<your response — can be a question, observation, directive, or creative announcement>",
  "detected_emotions": ["<emotions you're picking up from their story>"],
  "creative_direction": "<brief note on visual direction you're leaning toward, or null if too early>",
  "story_completeness": <float 0.0-1.0>,
  "missing_elements": ["<what you still want to know>"]
}

story_completeness guide:
- 0.0-0.3: barely started (no clear emotion)
- 0.3-0.6: developing (have an emotion, need depth to determine relevant visual elements)
- 0.6-0.75: nearly there (need one more key detail)
- 0.75-1.0: complete — you have: a clear dominant emotion, additional sub-emotions if relevant, and an understanding of which colors, shapes, textures, shadings, and patterns would best represent those feelings`

const SYSTEM_CONCEPT_EXTRACTION = `You are a generative art concept designer. Based on the emotions extracted from the user's story, create exactly 3 distinct visual concept packages for a p5.js sketch.

You MUST respond with valid JSON only.

{
  "packages": [
    {
      "id": "pkg_1",
      "title": "<catchy concept title>",
      "description": "<2-3 sentence description of the visual concept>",
      "visual_metaphor": "<core visual metaphor — e.g. 'spiraling particles representing scattered thoughts'>",
      "mood": "<single word mood — e.g. 'melancholic', 'joyful', 'tense'>",
      "color_palette": ["#hex1", "#hex2", "#hex3"],
      "key_elements": ["<element1>", "<element2>", "<element3>"]
    },
    { "id": "pkg_2", ... },
    { "id": "pkg_3", ... }
  ]
}

Make the 3 packages meaningfully different in style (e.g., abstract/geometric vs organic/flowing vs typographic).`

const SYSTEM_CODE_GENERATION = `You are an expert p5.js programmer. Generate a complete, working p5.js sketch based on the emotional concept.
CRITICAL RULES:
- Output valid JSON only — no markdown
- The code field must be a complete p5.js sketch using global mode (setup/draw functions, no class syntax for p5)
- Do NOT use: fetch, XMLHttpRequest, WebSocket, import, require, document., window.location, localStorage, sessionStorage, eval, Function(, setTimeout, setInterval, innerHTML, navigator., indexedDB
- Use only p5.js built-in functions
- Utilize shapes, colors, shadings, patterns, and textures to visually express the emotions.
- Cross-reference the provided user's emotions with the COLOR GUIDE, SHAPES GUIDE, and TEXTURES GUIDE to inform your design choices.
- Intertwine colors, shapes, and textures to implement the shading and patterning which evokes the emotional experience. 
- Include 2-6 adjustable parameters as top-level let declarations

COLOR GUIDE:
- RED: Passion, excitement, confidence, warmth, fear, danger
    - Primarily used as an accent color in addition to more neutral colors
- BLUE: Serenity, stability, peace, sadness, depression
    - Lighter blues show calm and relaxation
    - Darker blues convey professionalism and reliability
- YELLOW: Happiness, hope, warmth, frustration, caution
    - Not used as often but can be used as an accent color
    - Darker shades of yellow can be used to elicit positive emotions
- GREEN: Nature, growth, health
    - One of the most utilized colors
    - Lighter and brighter greens convey energy
    - Deeper greens symbolize nature or health
- BLACK: Elegance, power, formality
- WHITE: Cleanliness, goodness

SHAPES GUIDE:
- CIRCLES: Calmness, unity, balance
- SQUARES: Stability, framing, importance
- RECTANGLES: Calm, security, order
- TRIANGLES: Energy, movement, action, tension
- PARALLELOGRAMS: Dynamic, harmonious, balanced
- TRAPEZIUMS: Stability, movement, modernity
- RHOMBUS: Luxury, sophistication, abstract
- PENTAGONS: Protection, unity
- HEXAGONS: Communication, balance, trust
- GEOMETRIC LINES: Structure, order, visual hierarchy
- FLUID LINES: Movement, energy
- FLOWING CURVES: Continuity, grace, elegance
- CREATIVE SPLOTCHES: Spontaneity, unpredictability
- ORGANIC SHAPES: Connection with nature, growth
- ABSTRACT SHAPES: Curiosity, emotions, storytelling

TEXTURES GUIDE: 
- Velvet/Silk: Safety, intimacy, peace
- Rough/Gritty: Tension, grit, resistance
- Jagged/Broken: Discomfort, unease

Response format:
{
  "code": "<complete p5.js sketch code>",
  "explanation": "<brief explanation of what the sketch does>",
  "adjustable_params": [
    {
      "variable": "<exact variable name from code>",
      "label": "<human-readable label>",
      "min": <number>,
      "max": <number>,
      "step": <number>,
      "default": <number>,
      "unit": "<optional unit string>"
    }
  ]
}`

const SYSTEM_DEBUG = `You are a p5.js debugging expert. Fix the broken sketch code.

You MUST respond with valid JSON only:
{
  "patched_code": "<complete fixed p5.js sketch>",
  "explanation": "<what you fixed and why>",
  "error_cause": "<root cause of the original error>"
}

Rules:
- Return the COMPLETE fixed code, not just the changed parts
- Do NOT use forbidden APIs: fetch, XMLHttpRequest, WebSocket, import, require, document., localStorage, eval, Function(, setTimeout, setInterval, innerHTML, navigator., indexedDB`

const SYSTEM_CRITIQUE = `You are a creative coding art critic and educator. Provide constructive feedback on the p5.js sketch. 

You MUST respond with valid JSON only:
{
  "feedback": "<2-4 paragraph critique covering visual design, code quality, and connection to the original story>",
  "suggestions": [
    {
      "id": "sug_1",
      "title": "<short title>",
      "description": "<1-2 sentence description of the improvement>",
      "prompt": "<exact instruction to send back for code regeneration>"
    }
  ],
  "overall_score": <number 0-10>
}

Provide 2-4 actionable suggestions. Be encouraging but specific.`

interface BuildPromptArgs {
  history: Message[]
  userInput?: string
  selectedPackage?: ConceptPackage | null
  currentCode?: string | null
  errorLog?: string | null
  runtimeMetadata?: RuntimeMetadata | null
}

export interface BuiltPrompt {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  temperature: number
  max_tokens: number
}

export function buildPrompt(mode: AppMode, args: BuildPromptArgs): BuiltPrompt {
  const { history, userInput, selectedPackage, currentCode, errorLog, runtimeMetadata } = args

  switch (mode) {
    case 'elicitation': {
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
      for (const m of history) {
        messages.push({ role: m.role, content: m.content })
      }
      if (userInput) {
        messages.push({ role: 'user', content: userInput })
      }
      return {
        system: SYSTEM_ELICITATION,
        messages,
        temperature: 0.8,
        max_tokens: 512,
      }
    }

    case 'concept_extraction': {
      const storyText = historyToText(history)
      return {
        system: SYSTEM_CONCEPT_EXTRACTION,
        messages: [
          {
            role: 'user',
            content: `Here is the conversation where the user described their experience:\n\n${storyText}\n\nNow generate 3 distinct visual concept packages.`,
          },
        ],
        temperature: 0.9,
        max_tokens: 1500,
      }
    }

    case 'code_generation': {
      const storyText = historyToText(history)
      const pkgText = selectedPackage ? JSON.stringify(selectedPackage, null, 2) : 'No package selected'
      const extra = userInput ? `\n\nAdditional instruction: ${userInput}` : ''
      return {
        system: SYSTEM_CODE_GENERATION,
        messages: [
          {
            role: 'user',
            content: `Story context:\n${storyText}\n\nSelected concept package:\n${pkgText}${extra}\n\nGenerate the complete p5.js sketch.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }
    }

    case 'debug': {
      const fpsInfo = runtimeMetadata ? `FPS: ${runtimeMetadata.fps}, Frames: ${runtimeMetadata.frameCount}` : 'N/A'
      return {
        system: SYSTEM_DEBUG,
        messages: [
          {
            role: 'user',
            content: `Fix this broken p5.js sketch.\n\nError: ${errorLog || 'Unknown error'}\nRuntime info: ${fpsInfo}\n\nBroken code:\n\`\`\`javascript\n${currentCode || ''}\n\`\`\``,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }
    }

    case 'critique': {
      const storyText = historyToText(history)
      const fpsInfo = runtimeMetadata ? `FPS: ${runtimeMetadata.fps}` : 'N/A'
      return {
        system: SYSTEM_CRITIQUE,
        messages: [
          {
            role: 'user',
            content: `Please critique this p5.js sketch.\n\nOriginal story context:\n${storyText}\n\nSelected concept:\n${JSON.stringify(selectedPackage, null, 2)}\n\nRuntime info: ${fpsInfo}\n\nCode:\n\`\`\`javascript\n${currentCode || ''}\n\`\`\``,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }
    }

    default:
      throw new Error(`No prompt template for mode: ${mode}`)
  }
}
