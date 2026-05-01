import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildPrompt } from '@/lib/prompts'
import { validate } from '@/lib/validator'
import { logElicitation } from '@/lib/logger'
import type { ApiRequest, ElicitationLogEntry, ElicitationPayload } from '@/lib/types'

// Use APP_-prefixed vars to avoid shell/tooling env (ANTHROPIC_API_KEY,
// ANTHROPIC_BASE_URL) shadowing .env.local — system env wins in Next.js.
const apiKey = process.env.APP_ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('[chat route] APP_ANTHROPIC_API_KEY is missing — check .env.local')
}
const client = new Anthropic({ apiKey })

const DEFAULT_MODEL = process.env.APP_ANTHROPIC_MODEL ?? 'claude-opus-4-6'
const FAST_MODEL = process.env.APP_ANTHROPIC_FAST_MODEL ?? 'claude-sonnet-4-6'

// Code-heavy modes use Sonnet for ~2x faster long outputs; conversational/
// creative modes stay on Opus for richer reasoning.
const MODEL_FOR_MODE: Record<string, string> = {
  code_generation: FAST_MODEL,
  debug: FAST_MODEL,
}

const MAX_RETRIES = 2

export async function POST(req: NextRequest) {
  try {
    const body: ApiRequest = await req.json()
    const {
      mode,
      history,
      userInput,
      selectedPackage,
      currentCode,
      errorLog,
      runtimeMetadata,
      sessionId,
      priorAccumulatedEmotions,
    } = body

    let lastError: string | null = null
    let retryCount = 0

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const prompt = buildPrompt(mode, {
          history,
          userInput,
          selectedPackage,
          currentCode,
          errorLog,
          runtimeMetadata,
          priorAccumulatedEmotions,
        })

        const messages = prompt.messages.map((m) => ({ role: m.role, content: m.content }))
        if (attempt > 0 && lastError) {
          const lastMsg = messages[messages.length - 1]
          messages[messages.length - 1] = {
            ...lastMsg,
            content: `${lastMsg.content}\n\n[RETRY ${attempt}] Previous attempt failed JSON validation: ${lastError}. Please fix and return valid JSON matching the schema exactly.`,
          }
        }

        const response = await client.messages.create({
          model: MODEL_FOR_MODE[mode] ?? DEFAULT_MODEL,
          max_tokens: prompt.max_tokens,
          temperature: prompt.temperature,
          system: [
            {
              type: 'text',
              text: prompt.system,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages,
        })

        let rawText = ''
        for (const block of response.content) {
          if (block.type === 'text') rawText += block.text
        }

        const jsonText = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/, '')
          .trim()

        const parsed = JSON.parse(jsonText)
        validate(mode, parsed)

        if (mode === 'elicitation' && userInput) {
          const p = parsed as ElicitationPayload
          const entry: ElicitationLogEntry = {
            timestamp: new Date().toISOString(),
            sessionId: sessionId ?? 'unknown',
            prompt: userInput,
            accumulated_emotions_prior: priorAccumulatedEmotions ?? [],
            emotions_detected_this_prompt: p.new_emotions ?? [],
            image_type: p.image_type,
            physical_characteristics: p.physical_characteristics ?? [],
            is_race_specific: p.is_race_specific,
            additional_characteristics: p.additional_characteristics ?? [],
            inappropriate_content: p.inappropriate_content,
          }
          logElicitation(entry)
        }

        retryCount = attempt
        return NextResponse.json({ mode, payload: parsed, retryCount })
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        retryCount = attempt
        if (attempt === MAX_RETRIES) {
          return NextResponse.json(
            { error: `Failed after ${MAX_RETRIES + 1} attempts: ${lastError}` },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
