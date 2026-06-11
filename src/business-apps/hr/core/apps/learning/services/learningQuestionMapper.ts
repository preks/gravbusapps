import type {
  EditableLearningOption,
  EditableLearningQuestionType,
  LearningQuestionApi,
  LearningQuizQuestion
} from '../types'

export function isLearningRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJsonLike(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export function normalizeLearningQuestionType(value: string | null | undefined): EditableLearningQuestionType {
  if (value === 'MCQ_MULTI_LEARNING_QUESTION') return 'MCQ_MULTI_LEARNING_QUESTION'
  if (value === 'TRUE_FALSE_LEARNING_QUESTION') return 'TRUE_FALSE_LEARNING_QUESTION'
  return 'MCQ_SINGLE_LEARNING_QUESTION'
}

function mapChoice(choice: unknown, index: number): EditableLearningOption | null {
  const parsedChoice = typeof choice === 'string' ? parseJsonLike(choice) : choice
  if (typeof parsedChoice === 'string') return { key: String(index + 1), text: parsedChoice }
  if (!isLearningRecord(parsedChoice)) return null
  const key = typeof parsedChoice.key === 'string' ? parsedChoice.key : String(index + 1)
  const text = typeof parsedChoice.text === 'string' ? parsedChoice.text : key
  return { key, text }
}

export function mapLearningQuestionOptions(
  value: Record<string, unknown> | null | undefined
): EditableLearningOption[] {
  const choices = value?.choices ?? value?.options
  if (Array.isArray(choices)) {
    return choices
      .map((choice, index) => mapChoice(choice, index))
      .filter((option): option is EditableLearningOption => Boolean(option))
  }

  if (typeof choices === 'string') {
    const parsedChoices = parseJsonLike(choices)
    if (Array.isArray(parsedChoices)) {
      return parsedChoices
        .map((choice, index) => mapChoice(choice, index))
        .filter((option): option is EditableLearningOption => Boolean(option))
    }
  }

  if (isLearningRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => key !== 'choices')
      .map(([key, text]) => ({
        key,
        text: typeof text === 'string' ? text : JSON.stringify(text)
      }))
  }

  return []
}

export function mapLearningQuizQuestion(question: LearningQuestionApi, index: number): LearningQuizQuestion {
  return {
    id: question.id,
    orderNo: question.orderNo ?? index + 1,
    prompt: question.prompt ?? '',
    questionType: normalizeLearningQuestionType(question.questionType),
    options: mapLearningQuestionOptions(question.options),
    points: Number(question.points ?? 1)
  }
}
