import type { AppMode, Message, ConceptPackage, RuntimeMetadata } from './types'

function historyToText(history: Message[]): string {
  return history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n')
}

const SYSTEM_ELICITATION = `You are a warm, curious creative writing coach helping someone turn a personal life experience into a p5.js generative art sketch. Your job in this phase is to ask thoughtful follow-up questions to draw out rich sensory and emotional details.

You MUST respond with valid JSON only — no markdown, no explanation outside JSON.

Respond with this exact structure:
{
  "reply": "<your conversational response to the user — ask follow-up questions, show empathy>",
  "story_completeness": <float 0-1 reflecting how complete the story is>,
  "missing_elements": ["<element1>", "<element2>"]
}

Guidelines:
- story_completeness < 0.5 if you know almost nothing
- story_completeness >= 0.75 only when you have: a setting, an emotion, a key visual element, and some sensory detail
- missing_elements should list what you still need (e.g., "emotional tone", "colors/textures", "time of day")
- Keep reply to 2-4 sentences; end with one open question`

const SYSTEM_CONCEPT_EXTRACTION = `You are a generative art concept designer. Based on the user's story, create exactly 3 distinct visual concept packages for a p5.js sketch.

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

const SYSTEM_CODE_GENERATION = `You are an expert p5.js programmer. Generate a complete, working p5.js sketch based on the concept package and story.

CRITICAL RULES:
- Output valid JSON only — no markdown
- The code field must be a complete p5.js sketch using global mode (setup/draw functions, no class syntax for p5)
- Do NOT use: fetch, XMLHttpRequest, WebSocket, import, require, document., window.location, localStorage, sessionStorage, eval, Function(, setTimeout, setInterval, innerHTML, navigator., indexedDB
- Use only p5.js built-in functions
- Make it visually interesting and animated (use draw loop)
- Include 2-6 adjustable parameters as top-level let declarations

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
