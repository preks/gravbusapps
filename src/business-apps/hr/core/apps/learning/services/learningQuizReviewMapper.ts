import type {
  EditableLearningOption,
  EditableLearningQuestion,
  EditableLearningQuestionType,
  EditableLearningQuiz
} from '../types'
import type { GeneratedLearningQuizContent } from './learningQuizGeneratorApi'

const DEFAULT_PASS_THRESHOLD = 70
const DEFAULT_MAX_ATTEMPTS = 1
const OPTION_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(record: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

function readNumber(record: Record<string, unknown>, keys: string[], fallback?: number): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }
  return fallback
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

function normalizeQuestionType(value: unknown): EditableLearningQuestionType {
  if (value === 'MCQ_MULTI' || value === 'MCQ_MULTI_LEARNING_QUESTION') return 'MCQ_MULTI_LEARNING_QUESTION'
  if (value === 'TRUE_FALSE' || value === 'TRUE_FALSE_LEARNING_QUESTION') return 'TRUE_FALSE_LEARNING_QUESTION'
  return 'MCQ_SINGLE_LEARNING_QUESTION'
}

function normalizeOptions(
  question: Record<string, unknown>,
  questionType: EditableLearningQuestionType
): EditableLearningOption[] {
  const rawOptionsValue = question.options ?? question.choices ?? question.answers
  const rawOptions = typeof rawOptionsValue === 'string' ? parseJsonLike(rawOptionsValue) : rawOptionsValue
  if (Array.isArray(rawOptions)) {
    return rawOptions
      .flatMap((option, index): EditableLearningOption[] => {
        const fallbackKey = OPTION_KEYS[index] ?? String(index + 1)
        const parsedOption = typeof option === 'string' ? parseJsonLike(option) : option
        if (typeof parsedOption === 'string') return [{ key: fallbackKey, text: parsedOption }]
        if (Array.isArray(parsedOption)) {
          return parsedOption
            .map((nestedOption, nestedIndex): EditableLearningOption | null => {
              if (!isRecord(nestedOption)) return null
              const nestedFallbackKey = OPTION_KEYS[nestedIndex] ?? String(nestedIndex + 1)
              const key = readString(nestedOption, ['key', 'id', 'value', 'label'], nestedFallbackKey)
              const text = readString(nestedOption, ['text', 'label', 'value', 'answer', 'content'], key)
              return { key, text }
            })
            .filter((nestedOption): nestedOption is EditableLearningOption => Boolean(nestedOption?.text))
        }
        if (!isRecord(parsedOption)) return []

        const key = readString(parsedOption, ['key', 'id', 'value', 'label'], fallbackKey)
        const text = readString(parsedOption, ['text', 'label', 'value', 'answer', 'content'], key)
        return [{ key, text }]
      })
      .filter(option => Boolean(option.text))
  }

  if (isRecord(rawOptions)) {
    return Object.entries(rawOptions)
      .map(
        ([key, value]): EditableLearningOption => ({
          key,
          text: typeof value === 'string' ? value : JSON.stringify(value)
        })
      )
      .filter(option => option.text)
  }

  if (questionType === 'TRUE_FALSE_LEARNING_QUESTION') {
    return [
      { key: 'TRUE', text: 'True' },
      { key: 'FALSE', text: 'False' }
    ]
  }

  return []
}

function normalizeCorrectKeys(question: Record<string, unknown>, options: EditableLearningOption[]): string[] {
  const candidates = [
    question.correctOptionKeys,
    question.correct_keys,
    question.correctKeys,
    question.correct_answers,
    question.correctAnswers,
    question.correct_answer,
    question.correctAnswer,
    question.answer
  ]

  for (const candidate of candidates) {
    const values = normalizeCandidateValues(candidate)
    const keys = values
      .map(value => {
        if (typeof value === 'string') return value.trim()
        if (isRecord(value)) return readString(value, ['key', 'id', 'value', 'label', 'text'])
        return ''
      })
      .filter(Boolean)
      .map(value => options.find(option => option.key === value || option.text === value)?.key ?? value)

    if (keys.length > 0) return Array.from(new Set(keys))
  }

  return []
}

function normalizeCandidateValues(candidate: unknown): unknown[] {
  if (Array.isArray(candidate)) return candidate
  if (candidate) return [candidate]
  return []
}

function normalizeBandDefinitions(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value
  if (Array.isArray(value)) return { bands: value }
  return { bands: [] }
}

export function normalizeGeneratedLearningQuiz(content: GeneratedLearningQuizContent | null): EditableLearningQuiz {
  const quiz = content?.quiz
  const quizRecord = isRecord(quiz) ? quiz : {}
  const rawQuestions = Array.isArray(quiz?.questions) ? quiz.questions : []
  const passThreshold = content?.scoring_grid?.pass_threshold ?? DEFAULT_PASS_THRESHOLD

  const questions = rawQuestions
    .map((rawQuestion, index): EditableLearningQuestion | null => {
      if (!isRecord(rawQuestion)) return null
      const questionType = normalizeQuestionType(
        rawQuestion.questionType ?? rawQuestion.question_type ?? rawQuestion.type
      )
      const options = normalizeOptions(rawQuestion, questionType)
      const prompt = readString(rawQuestion, ['prompt', 'question', 'text', 'title'])
      if (!prompt) return null

      return {
        id: readString(rawQuestion, ['id'], `question-${index + 1}`),
        orderNo: readNumber(rawQuestion, ['orderNo', 'order_no'], index + 1) ?? index + 1,
        prompt,
        questionType,
        options,
        correctOptionKeys: normalizeCorrectKeys(rawQuestion, options),
        points: readNumber(rawQuestion, ['points', 'score', 'weight'], 1) ?? 1,
        explanation: readString(rawQuestion, ['explanation', 'rationale', 'feedback']),
        sourcePassage: readString(rawQuestion, ['sourcePassage', 'source_passage', 'source']),
        pageReference: readNumber(rawQuestion, ['pageReference', 'page_reference', 'page']),
        topic: readString(rawQuestion, ['topic', 'covered_topic', 'category'])
      }
    })
    .filter((question): question is EditableLearningQuestion => Boolean(question))
    .map((question, index) => ({ ...question, orderNo: index + 1 }))

  return {
    title: readString(quizRecord, ['title'], 'Untitled quiz'),
    description: readString(quizRecord, ['description', 'summary']),
    passThreshold,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    questions,
    coveredTopics: content?.coverage_report?.covered_topics ?? [],
    uncoveredTopics: content?.coverage_report?.uncovered_topics ?? [],
    scoringGrid: {
      perQuestion: content?.scoring_grid?.per_question ?? {},
      bandDefinitions: normalizeBandDefinitions(content?.scoring_grid?.band_definitions)
    }
  }
}
