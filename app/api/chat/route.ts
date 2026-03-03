import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildPrompt } from '@/lib/prompts'
import { validate } from '@/lib/validator'
import type { ApiRequest } from '@/lib/types'

const client = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: 'ollama', // required by SDK, ignored by Ollama
})

const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:7b'
const MAX_RETRIES = 2

export async function POST(req: NextRequest) {
  try {
    const body: ApiRequest = await req.json()
    const { mode, history, userInput, selectedPackage, currentCode, errorLog, runtimeMetadata } = body

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
        })

        // On retries, append error context to the last user message
        const messages = [...prompt.messages]
        if (attempt > 0 && lastError) {
          const lastMsg = messages[messages.length - 1]
          messages[messages.length - 1] = {
            ...lastMsg,
            content: `${lastMsg.content}\n\n[RETRY ${attempt}] Previous attempt failed JSON validation: ${lastError}. Please fix and return valid JSON matching the schema exactly.`,
          }
        }

        const response = await client.chat.completions.create({
          model: MODEL,
          messages: [
            { role: 'system', content: prompt.system },
            ...messages,
          ],
          temperature: prompt.temperature,
          max_tokens: prompt.max_tokens,
          response_format: { type: 'json_object' },
        })

        const rawText = response.choices[0]?.message?.content ?? ''

        // Strip markdown code fences if present
        const jsonText = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/, '')
          .trim()

        const parsed = JSON.parse(jsonText)
        validate(mode, parsed)

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

    // Should not reach here
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
