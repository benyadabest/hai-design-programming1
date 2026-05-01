export const elicitationSchema = {
  type: 'object',
  required: [
    'reply',
    'story_completeness',
    'missing_elements',
    'detected_emotions',
    'new_emotions',
    'image_type',
    'physical_characteristics',
    'is_race_specific',
    'additional_characteristics',
    'inappropriate_content',
  ],
  properties: {
    reply: { type: 'string', minLength: 1 },
    detected_emotions: { type: 'array', items: { type: 'string' } },
    new_emotions: { type: 'array', items: { type: 'string' } },
    creative_direction: { type: ['string', 'null'] },
    story_completeness: { type: 'number', minimum: 0, maximum: 1 },
    missing_elements: { type: 'array', items: { type: 'string' } },
    image_type: { type: 'string', enum: ['abstract', 'real_life', 'unclear'] },
    physical_characteristics: { type: 'array', items: { type: 'string' } },
    is_race_specific: { type: 'boolean' },
    additional_characteristics: { type: 'array', items: { type: 'string' } },
    inappropriate_content: {
      type: 'object',
      required: ['flagged', 'reason'],
      properties: {
        flagged: { type: 'boolean' },
        reason: { type: ['string', 'null'] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
}

const conceptPackageSchema = {
  type: 'object',
  required: ['id', 'title', 'description', 'visual_metaphor', 'mood', 'color_palette', 'key_elements'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    visual_metaphor: { type: 'string' },
    mood: { type: 'string' },
    color_palette: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
    key_elements: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
  additionalProperties: false,
}

export const conceptExtractionSchema = {
  type: 'object',
  required: ['packages'],
  properties: {
    packages: {
      type: 'array',
      items: conceptPackageSchema,
      minItems: 3,
      maxItems: 3,
    },
  },
  additionalProperties: false,
}

const adjustableParamSchema = {
  type: 'object',
  required: ['variable', 'label', 'min', 'max', 'step', 'default'],
  properties: {
    variable: { type: 'string', pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$' },
    label: { type: 'string' },
    min: { type: 'number' },
    max: { type: 'number' },
    step: { type: 'number', exclusiveMinimum: 0 },
    default: { type: 'number' },
    unit: { type: 'string' },
  },
  additionalProperties: false,
}

export const codeGenerationSchema = {
  type: 'object',
  required: ['code', 'explanation', 'adjustable_params'],
  properties: {
    code: { type: 'string', minLength: 10 },
    explanation: { type: 'string' },
    adjustable_params: {
      type: 'array',
      items: adjustableParamSchema,
      minItems: 0,
      maxItems: 8,
    },
  },
  additionalProperties: false,
}

export const debugSchema = {
  type: 'object',
  required: ['patched_code', 'explanation', 'error_cause'],
  properties: {
    patched_code: { type: 'string', minLength: 10 },
    explanation: { type: 'string' },
    error_cause: { type: 'string' },
  },
  additionalProperties: false,
}

export const critiqueSchema = {
  type: 'object',
  required: ['feedback', 'suggestions', 'overall_score'],
  properties: {
    feedback: { type: 'string', minLength: 1 },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'description', 'prompt'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          prompt: { type: 'string' },
        },
        additionalProperties: false,
      },
      minItems: 1,
      maxItems: 4,
    },
    overall_score: { type: 'number', minimum: 0, maximum: 10 },
  },
  additionalProperties: false,
}

export const schemaMap = {
  elicitation: elicitationSchema,
  concept_extraction: conceptExtractionSchema,
  code_generation: codeGenerationSchema,
  debug: debugSchema,
  critique: critiqueSchema,
} as const
