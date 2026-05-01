export type AppMode =
  | 'elicitation'
  | 'concept_extraction'
  | 'concept_selection'
  | 'code_generation'
  | 'running'
  | 'debug'
  | 'critique'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface AdjustableParameter {
  variable: string
  label: string
  min: number
  max: number
  step: number
  default: number
  unit?: string
}

export interface ConceptPackage {
  id: string
  title: string
  description: string
  visual_metaphor: string
  mood: string
  color_palette: string[]
  key_elements: string[]
}

export interface RuntimeMetadata {
  fps: number
  frameCount: number
  screenshot_summary: null
}

export interface AppState {
  sessionId: string
  mode: AppMode
  history: Message[]
  conceptPackages: ConceptPackage[] | null
  selectedPackage: ConceptPackage | null
  currentCode: string | null
  adjustableParams: AdjustableParameter[]
  paramValues: Record<string, number>
  errorLog: string | null
  runtimeMetadata: RuntimeMetadata | null
  isLoading: boolean
  turnCount: number
}

export type ImageType = 'abstract' | 'real_life' | 'unclear'

export interface InappropriateContent {
  flagged: boolean
  reason: string | null
}

// API response payloads per mode
export interface ElicitationPayload {
  reply: string
  detected_emotions: string[]
  new_emotions: string[]
  creative_direction: string | null
  story_completeness: number
  missing_elements: string[]
  image_type: ImageType
  physical_characteristics: string[]
  is_race_specific: boolean
  additional_characteristics: string[]
  inappropriate_content: InappropriateContent
}

export interface ElicitationLogEntry {
  timestamp: string
  sessionId: string
  prompt: string
  accumulated_emotions_prior: string[]
  emotions_detected_this_prompt: string[]
  image_type: ImageType
  physical_characteristics: string[]
  is_race_specific: boolean
  additional_characteristics: string[]
  inappropriate_content: InappropriateContent
}

export interface ConceptExtractionPayload {
  packages: ConceptPackage[]
}

export interface CodeGenerationPayload {
  code: string
  explanation: string
  adjustable_params: AdjustableParameter[]
}

export interface DebugPayload {
  patched_code: string
  explanation: string
  error_cause: string
}

export interface CritiquePayload {
  feedback: string
  suggestions: CritiqueSuggestion[]
  overall_score: number
}

export interface CritiqueSuggestion {
  id: string
  title: string
  description: string
  prompt: string
}

export type ModePayload =
  | ElicitationPayload
  | ConceptExtractionPayload
  | CodeGenerationPayload
  | DebugPayload
  | CritiquePayload

export interface ApiResponse {
  mode: AppMode
  payload: ModePayload
  retryCount: number
}

export interface ApiRequest {
  mode: AppMode
  history: Message[]
  userInput?: string
  selectedPackage?: ConceptPackage | null
  currentCode?: string | null
  errorLog?: string | null
  runtimeMetadata?: RuntimeMetadata | null
  sessionId?: string
  priorAccumulatedEmotions?: string[]
}
