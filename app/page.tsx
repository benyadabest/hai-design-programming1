'use client'

import { useReducer, useCallback, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import ChatPanel from '@/components/ChatPanel'
import ConceptCards from '@/components/ConceptCards'
import EditorPanel from '@/components/EditorPanel'
import SliderControls from '@/components/SliderControls'
import TestModePanel from '@/components/TestModePanel'
import WelcomeModal from '@/components/WelcomeModal'
import { FIXTURE_GROUPS } from '@/lib/testFixtures'
import type { TestFixture } from '@/lib/testFixtures'
import type {
  AppState,
  AppMode,
  Message,
  ConceptPackage,
  AdjustableParameter,
  RuntimeMetadata,
  ElicitationPayload,
  ConceptExtractionPayload,
  CodeGenerationPayload,
  DebugPayload,
  CritiquePayload,
  CritiqueSuggestion,
} from '@/lib/types'

// Lazy-load CanvasPanel (fetches external script)
const CanvasPanel = dynamic(() => import('@/components/CanvasPanel'), { ssr: false })

// ─── State / Actions ────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'SET_PACKAGES'; packages: ConceptPackage[] }
  | { type: 'SELECT_PACKAGE'; pkg: ConceptPackage }
  | { type: 'SET_CODE'; code: string; params: AdjustableParameter[] }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_METADATA'; meta: RuntimeMetadata }
  | { type: 'UPDATE_PARAM'; variable: string; value: number }
  | { type: 'PATCH_CODE'; code: string }
  | { type: 'INCREMENT_TURN' }
  | { type: 'STOP' }
  | { type: 'RESET' }

function makeInitialState(): AppState {
  return {
    sessionId: Math.random().toString(36).slice(2),
    mode: 'elicitation',
    history: [],
    conceptPackages: null,
    selectedPackage: null,
    currentCode: null,
    adjustableParams: [],
    paramValues: {},
    errorLog: null,
    runtimeMetadata: null,
    isLoading: false,
    turnCount: 0,
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.value }
    case 'ADD_MESSAGE':
      return { ...state, history: [...state.history, action.message] }
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'SET_PACKAGES':
      return { ...state, conceptPackages: action.packages, mode: 'concept_selection' }
    case 'SELECT_PACKAGE':
      return { ...state, selectedPackage: action.pkg }
    case 'SET_CODE': {
      const defaultValues: Record<string, number> = {}
      for (const p of action.params) defaultValues[p.variable] = p.default
      return {
        ...state,
        currentCode: action.code,
        adjustableParams: action.params,
        paramValues: defaultValues,
        mode: 'running',
        errorLog: null,
      }
    }
    case 'SET_ERROR':
      return { ...state, errorLog: action.error }
    case 'SET_METADATA':
      return { ...state, runtimeMetadata: action.meta }
    case 'UPDATE_PARAM':
      return { ...state, paramValues: { ...state.paramValues, [action.variable]: action.value } }
    case 'PATCH_CODE':
      return { ...state, currentCode: action.code, errorLog: null, mode: 'running' }
    case 'INCREMENT_TURN':
      return { ...state, turnCount: state.turnCount + 1 }
    case 'STOP':
      return {
        ...state,
        isLoading: false,
        mode: state.currentCode
          ? 'running'
          : state.conceptPackages
          ? 'concept_selection'
          : 'elicitation',
      }
    case 'RESET':
      return makeInitialState()
    default:
      return state
  }
}

// ─── Mode badge ──────────────────────────────────────────────────────────────

const modeColors: Record<AppMode, string> = {
  elicitation: 'bg-blue-100 text-blue-700',
  concept_extraction: 'bg-purple-100 text-purple-700',
  concept_selection: 'bg-amber-100 text-amber-700',
  code_generation: 'bg-orange-100 text-orange-700',
  running: 'bg-emerald-100 text-emerald-700',
  debug: 'bg-red-100 text-red-700',
  critique: 'bg-amber-100 text-amber-700',
}

const modeLabels: Record<AppMode, string> = {
  elicitation: 'Story',
  concept_extraction: 'Extracting…',
  concept_selection: 'Pick Concept',
  code_generation: 'Generating…',
  running: 'Running',
  debug: 'Debugging…',
  critique: 'Critique',
}

// ─── API helper ──────────────────────────────────────────────────────────────

async function callApi(
  request: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ payload: unknown; mode: AppMode }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState)
  const autoDebugFiredRef = useRef(false)
  const runtimeMetadataRef = useRef<RuntimeMetadata | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ── Welcome modal ────────────────────────────────────────────────────────
  const [showWelcome, setShowWelcome] = useState(true)

  // ── Test mode ─────────────────────────────────────────────────────────────
  const [testMode, setTestMode] = useState(false)
  const [queuedFixture, setQueuedFixture] = useState<TestFixture | null>(null)
  // Refs so async callbacks always see the latest values without stale closure issues
  const testModeRef = useRef(false)
  const queuedFixtureRef = useRef<TestFixture | null>(null)

  const toggleTestMode = useCallback(() => {
    setTestMode((prev) => {
      testModeRef.current = !prev
      if (prev) {
        // turning off — clear any queued fixture
        setQueuedFixture(null)
        queuedFixtureRef.current = null
      }
      return !prev
    })
  }, [])

  const queueFixture = useCallback((fixture: TestFixture) => {
    setQueuedFixture(fixture)
    queuedFixtureRef.current = fixture
  }, [])

  const clearFixture = useCallback(() => {
    setQueuedFixture(null)
    queuedFixtureRef.current = null
  }, [])

  // ── Mock-aware API wrapper ────────────────────────────────────────────────
  // When test mode is on and a fixture is queued for the requested mode, use
  // the fixture instead of hitting the real API. Consumes the fixture on use.
  const callApiOrMock = useCallback(
    async (request: Record<string, unknown>, signal?: AbortSignal) => {
      const fixture = queuedFixtureRef.current
      if (testModeRef.current && fixture) {
        const modeMatch =
          fixture.targetMode === 'any' || fixture.targetMode === (request.mode as string)
        if (modeMatch) {
          // Consume the fixture
          queuedFixtureRef.current = null
          setQueuedFixture(null)

          const delay = fixture.simulatedDelay ?? 400

          // Simulate network latency (and honour abort during the wait)
          await new Promise<void>((resolve, reject) => {
            if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
            const timer = setTimeout(resolve, delay)
            signal?.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new DOMException('Aborted', 'AbortError'))
            })
          })

          if (fixture.isError) {
            throw new Error(fixture.errorMessage ?? 'Mock API error')
          }
          return { payload: fixture.response, mode: request.mode as AppMode }
        }
      }
      return callApi(request, signal)
    },
    [], // setQueuedFixture is stable; testModeRef/queuedFixtureRef are always current
  )

  // ── Creates a new AbortController, cancelling any in-flight request ───────
  const startRequest = useCallback(() => {
    abortControllerRef.current?.abort()
    const ac = new AbortController()
    abortControllerRef.current = ac
    return ac.signal
  }, [])

  // ── Stop: cancel in-flight request and reset loading state ───────────────
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    autoDebugFiredRef.current = true
    dispatch({ type: 'STOP' })
  }, [])

  // ── Elicitation: send user message ──────────────────────────────────────
  const GENERATE_KEYWORDS = ['generate', 'go ahead', "let's go", 'make it', 'create it', 'skip', 'ready']

  const handleSend = useCallback(
    async (userInput: string) => {
      if (state.isLoading) return

      const updatedHistory: Message[] = [
        ...state.history,
        { role: 'user', content: userInput },
      ]
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'user', content: userInput } })
      dispatch({ type: 'SET_LOADING', value: true })
      const signal = startRequest()

      // ── Keyword shortcut: jump straight to concept extraction ─────────────
      const wantsToGenerate =
        state.history.length >= 1 &&
        GENERATE_KEYWORDS.some((kw) => userInput.toLowerCase().includes(kw))

      if (wantsToGenerate) {
        dispatch({ type: 'SET_MODE', mode: 'concept_extraction' })
        dispatch({
          type: 'ADD_MESSAGE',
          message: { role: 'assistant', content: 'Got it — generating concepts from your story now…' },
        })
        try {
          const extractData = await callApiOrMock(
            { mode: 'concept_extraction', history: updatedHistory },
            signal,
          )
          const extractPayload = extractData.payload as ConceptExtractionPayload
          dispatch({ type: 'SET_PACKAGES', packages: extractPayload.packages })
          dispatch({
            type: 'ADD_MESSAGE',
            message: { role: 'assistant', content: `Here are 3 concept packages. Pick the one that resonates!` },
          })
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
          const msg = err instanceof Error ? err.message : 'Unknown error'
          dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `Concept extraction failed: ${msg}` } })
        } finally {
          dispatch({ type: 'SET_LOADING', value: false })
        }
        return
      }
      // ─────────────────────────────────────────────────────────────────────

      try {
        const data = await callApiOrMock({ mode: 'elicitation', history: state.history, userInput }, signal)
        const payload = data.payload as ElicitationPayload
        let replyContent = payload.reply
        if (payload.detected_emotions && payload.detected_emotions.length > 0) {
          replyContent += `\n\n_Emotions I'm picking up: ${payload.detected_emotions.join(', ')}_`
        }
        if (payload.creative_direction) {
          replyContent += `\n\n_Visual direction: ${payload.creative_direction}_`
        }
        dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: replyContent } })
        dispatch({ type: 'INCREMENT_TURN' })

        const newTurnCount = state.turnCount + 1
        if (payload.story_completeness >= 0.75 && newTurnCount >= 3) {
          dispatch({ type: 'SET_MODE', mode: 'concept_extraction' })
          const fullHistory: Message[] = [
            ...updatedHistory,
            { role: 'assistant', content: payload.reply },
          ]
          const extractData = await callApiOrMock(
            { mode: 'concept_extraction', history: fullHistory },
            signal,
          )
          const extractPayload = extractData.payload as ConceptExtractionPayload
          dispatch({ type: 'SET_PACKAGES', packages: extractPayload.packages })
          dispatch({
            type: 'ADD_MESSAGE',
            message: {
              role: 'assistant',
              content: `I've created 3 concept packages based on your story. Pick the one that resonates most with you!`,
            },
          })
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Unknown error'
        dispatch({
          type: 'ADD_MESSAGE',
          message: { role: 'assistant', content: `Sorry, something went wrong: ${msg}` },
        })
      } finally {
        dispatch({ type: 'SET_LOADING', value: false })
      }
    },
    [callApiOrMock, startRequest, state.history, state.isLoading, state.turnCount],
  )

  // ── Generate button: jump to concept extraction immediately ─────────────
  const handleGenerate = useCallback(async () => {
    if (state.isLoading || state.history.length < 1) return
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'SET_MODE', mode: 'concept_extraction' })
    dispatch({
      type: 'ADD_MESSAGE',
      message: { role: 'assistant', content: 'Got it — generating concepts from your story now…' },
    })
    const signal = startRequest()

    try {
      const extractData = await callApiOrMock(
        { mode: 'concept_extraction', history: state.history },
        signal,
      )
      const extractPayload = extractData.payload as ConceptExtractionPayload
      dispatch({ type: 'SET_PACKAGES', packages: extractPayload.packages })
      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'assistant', content: 'Here are 3 concept packages. Pick the one that resonates!' },
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Unknown error'
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `Concept extraction failed: ${msg}` } })
      dispatch({ type: 'SET_MODE', mode: 'elicitation' })
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
    }
  }, [callApiOrMock, startRequest, state.history, state.isLoading])

  // ── Concept selection → code generation ─────────────────────────────────
  const handleSelectPackage = useCallback(
    async (pkg: ConceptPackage) => {
      if (state.isLoading) return
      dispatch({ type: 'SELECT_PACKAGE', pkg })
      dispatch({ type: 'SET_LOADING', value: true })
      dispatch({ type: 'SET_MODE', mode: 'code_generation' })
      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'assistant', content: `Generating your sketch for "${pkg.title}"…` },
      })
      const signal = startRequest()

      try {
        const data = await callApiOrMock(
          { mode: 'code_generation', history: state.history, selectedPackage: pkg },
          signal,
        )
        const payload = data.payload as CodeGenerationPayload
        dispatch({ type: 'SET_CODE', code: payload.code, params: payload.adjustable_params })
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            role: 'assistant',
            content: `✨ Here's your sketch! ${payload.explanation}

_Plan on several revision rounds: use ★ Feedback for critique and concrete suggestions, apply changes step by step, then open ★ Feedback again on the new version. That back-and-forth is what we're studying—incremental improvement, not a single shot._`,
          },
        })
        autoDebugFiredRef.current = false
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Unknown error'
        dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `Code generation failed: ${msg}` } })
        dispatch({ type: 'SET_MODE', mode: 'concept_selection' })
      } finally {
        dispatch({ type: 'SET_LOADING', value: false })
      }
    },
    [callApiOrMock, startRequest, state.history, state.isLoading],
  )

  // ── Surprise me: pick a random concept ─────────────────────────────────
  const handleSurpriseMe = useCallback(() => {
    if (!state.conceptPackages || state.conceptPackages.length === 0 || state.isLoading) return
    const randomPkg = state.conceptPackages[Math.floor(Math.random() * state.conceptPackages.length)]
    handleSelectPackage(randomPkg)
  }, [state.conceptPackages, state.isLoading, handleSelectPackage])

  // ── Canvas error → auto debug (fires once per code version) ─────────────
  const handleCanvasError = useCallback(
    async (errorMsg: string) => {
      if (autoDebugFiredRef.current || state.isLoading) return
      autoDebugFiredRef.current = true
      dispatch({ type: 'SET_ERROR', error: errorMsg })
      dispatch({ type: 'SET_MODE', mode: 'debug' })
      dispatch({ type: 'SET_LOADING', value: true })
      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'assistant', content: `🐛 Error detected: ${errorMsg}\n\nAuto-fixing…` },
      })
      const signal = startRequest()

      try {
        const data = await callApiOrMock(
          {
            mode: 'debug',
            history: state.history,
            currentCode: state.currentCode,
            errorLog: errorMsg,
            runtimeMetadata: runtimeMetadataRef.current,
          },
          signal,
        )
        const payload = data.payload as DebugPayload
        dispatch({ type: 'PATCH_CODE', code: payload.patched_code })
        dispatch({
          type: 'ADD_MESSAGE',
          message: { role: 'assistant', content: `Fixed! ${payload.explanation}` },
        })
        // NOTE: autoDebugFiredRef stays true — auto-debug fires once per code version.
        // It resets when the user explicitly clicks Run, Regenerate, or applies a suggestion.
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Unknown error'
        dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `Debug failed: ${msg}` } })
      } finally {
        dispatch({ type: 'SET_LOADING', value: false })
      }
    },
    [callApiOrMock, startRequest, state.currentCode, state.history, state.isLoading],
  )

  // ── Metadata update ──────────────────────────────────────────────────────
  const handleMetadata = useCallback((meta: RuntimeMetadata) => {
    runtimeMetadataRef.current = meta
    dispatch({ type: 'SET_METADATA', meta })
  }, [])

  // ── Run (re-inject current code) ─────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!state.currentCode) return
    autoDebugFiredRef.current = false
    dispatch({ type: 'PATCH_CODE', code: state.currentCode })
  }, [state.currentCode])

  // ── Regenerate ───────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (!state.selectedPackage || state.isLoading) return
    autoDebugFiredRef.current = false
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'SET_MODE', mode: 'code_generation' })
    const signal = startRequest()

    try {
      const data = await callApiOrMock(
        { mode: 'code_generation', history: state.history, selectedPackage: state.selectedPackage },
        signal,
      )
      const payload = data.payload as CodeGenerationPayload
      dispatch({ type: 'SET_CODE', code: payload.code, params: payload.adjustable_params })
      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'assistant', content: `Regenerated! ${payload.explanation}` },
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Unknown error'
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `Regeneration failed: ${msg}` } })
      dispatch({ type: 'SET_MODE', mode: 'running' })
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
    }
  }, [callApiOrMock, startRequest, state.history, state.isLoading, state.selectedPackage])

  // ── Get Feedback ─────────────────────────────────────────────────────────
  const handleGetFeedback = useCallback(async () => {
    if (!state.currentCode || state.isLoading) return
    dispatch({ type: 'SET_LOADING', value: true })
    dispatch({ type: 'SET_MODE', mode: 'critique' })
    const signal = startRequest()

    try {
      const data = await callApiOrMock(
        {
          mode: 'critique',
          history: state.history,
          selectedPackage: state.selectedPackage,
          currentCode: state.currentCode,
          runtimeMetadata: runtimeMetadataRef.current,
        },
        signal,
      )
      const payload = data.payload as CritiquePayload
      const score = payload.overall_score.toFixed(1)
      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'assistant', content: `Critique (${score}/10)\n\n${payload.feedback}` },
      })
      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'assistant', content: `__SUGGESTIONS__${JSON.stringify(payload.suggestions)}` },
      })
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          role: 'assistant',
          content:
            '_You can apply one suggestion below, then run ★ Feedback again on the updated sketch. Aim for at least a few cycles—small steps are better than one giant change._',
        },
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Unknown error'
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `Critique failed: ${msg}` } })
      dispatch({ type: 'SET_MODE', mode: 'running' })
    } finally {
      dispatch({ type: 'SET_LOADING', value: false })
    }
  }, [callApiOrMock, startRequest, state.currentCode, state.history, state.isLoading, state.selectedPackage])

  // ── Suggestion click → code regeneration ────────────────────────────────
  const handleSuggestion = useCallback(
    async (suggestion: CritiqueSuggestion) => {
      if (!state.selectedPackage || state.isLoading) return
      autoDebugFiredRef.current = false
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'user', content: suggestion.prompt } })
      dispatch({ type: 'SET_LOADING', value: true })
      dispatch({ type: 'SET_MODE', mode: 'code_generation' })
      const signal = startRequest()

      try {
        const data = await callApiOrMock(
          {
            mode: 'code_generation',
            history: state.history,
            selectedPackage: state.selectedPackage,
            userInput: suggestion.prompt,
          },
          signal,
        )
        const payload = data.payload as CodeGenerationPayload
        dispatch({ type: 'SET_CODE', code: payload.code, params: payload.adjustable_params })
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            role: 'assistant',
            content: `Applied: ${suggestion.title}. ${payload.explanation}

_You can apply another suggestion from this list, edit the code directly, or run ★ Feedback for a new critique of this version._`,
          },
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Unknown error'
        dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: `Failed: ${msg}` } })
        dispatch({ type: 'SET_MODE', mode: 'running' })
      } finally {
        dispatch({ type: 'SET_LOADING', value: false })
      }
    },
    [callApiOrMock, startRequest, state.history, state.isLoading, state.selectedPackage],
  )

  // ── Slider change ────────────────────────────────────────────────────────
  const handleSliderChange = useCallback(
    (variable: string, value: number) => {
      dispatch({ type: 'UPDATE_PARAM', variable, value })
      if (!state.currentCode) return
      const newCode = state.currentCode.replace(
        new RegExp(`(let\\s+${variable}\\s*=\\s*)([^;\\n]+)`),
        `$1${value}`
      )
      dispatch({ type: 'PATCH_CODE', code: newCode })
    },
    [state.currentCode],
  )

  // ── Code change from editor ──────────────────────────────────────────────
  const handleCodeChange = useCallback((code: string) => {
    dispatch({ type: 'PATCH_CODE', code })
  }, [])

  // ── Parse suggestion messages ────────────────────────────────────────────
  const renderedMessages = state.history.filter((m) => !m.content.startsWith('__SUGGESTIONS__'))
  const suggestionMessages = state.history.filter((m) => m.content.startsWith('__SUGGESTIONS__'))
  const latestSuggestions: CritiqueSuggestion[] | null =
    suggestionMessages.length > 0
      ? (() => {
          try {
            return JSON.parse(
              suggestionMessages[suggestionMessages.length - 1].content.replace('__SUGGESTIONS__', '')
            )
          } catch {
            return null
          }
        })()
      : null

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] text-gray-800">
      {/* Welcome modal */}
      {showWelcome && <WelcomeModal onDismiss={() => setShowWelcome(false)} />}

      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200/80 shadow-sm shrink-0">
        <h1 className="text-xl font-serif tracking-tight text-gray-900">p5 Sketch Maker</h1>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${modeColors[state.mode]}`}>
          {modeLabels[state.mode]}
        </span>
        {state.runtimeMetadata && state.mode === 'running' && (
          <span className="text-xs text-gray-400 font-mono ml-1">
            {state.runtimeMetadata.fps} fps
          </span>
        )}
        <div className="flex-1" />
        {state.isLoading && (
          <button
            onClick={handleStop}
            className="text-xs text-red-500 hover:text-red-700 transition-colors px-2.5 py-1 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50"
          >
            Stop
          </button>
        )}
        <button
          onClick={toggleTestMode}
          className={`text-xs transition-colors px-2.5 py-1 rounded-lg border ${
            testMode
              ? 'text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100'
              : 'text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {testMode ? 'Test Mode ON' : 'Test Mode'}
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2.5 py-1 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        >
          Start Over
        </button>
      </header>

      {/* Test mode panel — shown below header when active */}
      {testMode && (
        <TestModePanel
          groups={FIXTURE_GROUPS}
          queued={queuedFixture}
          onQueue={queueFixture}
          onClear={clearFixture}
        />
      )}

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Chat (38%) */}
        <div className="w-[38%] flex flex-col border-r border-gray-200/80 min-h-0 bg-white">
          <ChatPanel
            messages={renderedMessages}
            mode={state.mode}
            isLoading={state.isLoading}
            onSend={handleSend}
            onGenerate={handleGenerate}
          >
            {/* Concept cards above input */}
            {state.conceptPackages && (
              <ConceptCards
                packages={state.conceptPackages}
                selected={state.selectedPackage}
                onSelect={handleSelectPackage}
                onSurpriseMe={handleSurpriseMe}
              />
            )}
            {/* Critique suggestion cards */}
            {latestSuggestions && (state.mode === 'critique' || state.mode === 'running') && (
              <div className="px-3 py-2 border-t border-gray-100 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Suggestions</p>
                <p className="text-xs text-gray-500 leading-snug">
                  {state.mode === 'critique'
                    ? 'Pick one to apply, then keep refining with ★ Feedback on the result.'
                    : 'From your last critique — apply another idea, or use ★ Feedback so suggestions match the latest sketch.'}
                </p>
                {latestSuggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSuggestion(s)}
                    disabled={state.isLoading}
                    className="w-full text-left bg-amber-50/60 hover:bg-amber-50 border border-amber-200/80 hover:border-amber-300 rounded-xl p-3 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-amber-700">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                  </button>
                ))}
              </div>
            )}
          </ChatPanel>
        </div>

        {/* Right: Editor + Canvas (62%) */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Editor (45%) */}
          <div className="h-[45%] border-b border-gray-200/80">
            <EditorPanel
              code={state.currentCode}
              mode={state.mode}
              isLoading={state.isLoading}
              onCodeChange={handleCodeChange}
              onRun={handleRun}
              onRegenerate={handleRegenerate}
              onGetFeedback={handleGetFeedback}
            />
          </div>

          {/* Canvas (remaining) */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* relative+absolute-fill gives CanvasPanel a definite pixel height */}
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0 p-3 flex flex-col">
                <CanvasPanel
                  code={state.currentCode}
                  onError={handleCanvasError}
                  onMetadata={handleMetadata}
                />
              </div>
            </div>

            {/* Sliders */}
            {state.adjustableParams.length > 0 && (
              <SliderControls
                params={state.adjustableParams}
                values={state.paramValues}
                onChange={handleSliderChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
