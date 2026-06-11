import { promptManagerClient, type PromptExecuteResponse } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export const LEARNING_QUIZ_GENERATOR_PROMPT_NAME = 'learning_quiz_generator'

export interface GeneratedLearningQuizContent {
  success?: boolean
  quiz?: {
    title?: string
    description?: string
    language?: string
    estimated_minutes?: number
    questions?: unknown[]
  }
  scoring_grid?: {
    pass_threshold?: number
    per_question?: Record<string, unknown>
    band_definitions?: unknown[]
  }
  coverage_report?: {
    covered_topics?: string[]
    uncovered_topics?: string[]
  }
  error?: string
  debug?: Record<string, unknown>
}

export interface GenerateLearningQuizParams {
  courseId: string
  contentEntryId: string
  title: string
  numQuestions?: number
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  language?: string
  passThreshold?: number
  questionTypes?: Array<'MCQ_SINGLE' | 'MCQ_MULTI' | 'TRUE_FALSE'>
  focusTopics?: string[]
  customInstructions?: string
}

interface PromptManagerExecutionClient {
  setAccessToken: (accessToken: string) => void
  getPrompts: (params?: {
    promptName?: string | null
    limit?: number
  }) => Promise<{ data?: Array<{ _id?: string; id?: string }> }>
  getPromptParameters?: (id: string) => Promise<{ system_parameters?: string[]; user_parameters?: string[] }>
  executePromptWithOptions: (
    id: string,
    options: {
      userParams?: Record<string, unknown>
      systemParams?: Record<string, unknown>
      context?: Record<string, unknown>
    }
  ) => Promise<PromptExecuteResponse>
}

function pickDeclaredParams(
  params: Record<string, unknown>,
  declaredParams: string[] | undefined
): Record<string, unknown> | undefined {
  if (!declaredParams) return params
  const allowed = new Set(declaredParams)
  const entries = Object.entries(params).filter(([key]) => allowed.has(key))
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export async function generateLearningQuizFromDocument(
  accessToken: string,
  params: GenerateLearningQuizParams,
  client: PromptManagerExecutionClient = promptManagerClient
): Promise<PromptExecuteResponse> {
  client.setAccessToken(accessToken)

  const promptsPage = await client.getPrompts({ promptName: LEARNING_QUIZ_GENERATOR_PROMPT_NAME, limit: 1 })
  const promptId = promptsPage.data?.[0]?._id ?? promptsPage.data?.[0]?.id
  if (!promptId) {
    throw new Error(`Prompt not found: ${LEARNING_QUIZ_GENERATOR_PROMPT_NAME}`)
  }

  const promptParameters = await client.getPromptParameters?.(promptId)
  const articleParams = {
    content_entry_id: params.contentEntryId,
    content_document_id: params.contentEntryId
  }
  const systemParams = pickDeclaredParams(articleParams, promptParameters?.system_parameters)
  const userParams = pickDeclaredParams(
    {
      ...articleParams,
      num_questions: params.numQuestions ?? 10,
      difficulty: params.difficulty ?? 'INTERMEDIATE',
      language: params.language ?? 'en-US',
      pass_threshold: params.passThreshold ?? 70,
      question_types: params.questionTypes ?? ['MCQ_SINGLE'],
      focus_topics: params.focusTopics ?? [],
      custom_instructions: params.customInstructions ?? ''
    },
    promptParameters?.user_parameters
  )

  return client.executePromptWithOptions(promptId, {
    ...(systemParams ? { systemParams } : {}),
    ...(userParams ? { userParams } : {}),
    context: {
      learning_course_id: params.courseId,
      content_entry_id: params.contentEntryId,
      content_document_id: params.contentEntryId,
      source_document_id: params.contentEntryId,
      source_type: 'knowledge_article',
      title: params.title
    }
  })
}
