import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import { LEARNING_STATUS } from '../constants/learningStatus'
import type {
  EditableLearningQuestion,
  EditableLearningQuiz,
  LearningCourseVersionPayload,
  LearningMaterialPayload,
  LearningQuestionPayload,
  LearningQuestionsBatchPayload,
  LearningQuestionsBatchQuestionPayload,
  LearningQuestionsBatchResult,
  LearningScoringGridPayload
} from '../types'

const CREATE_COURSE_VERSION_PATH = '/processes/employee/createLearningCourseVersion'
const CREATE_MATERIAL_PATH = '/processes/employee/createLearningMaterial'
const CREATE_QUESTION_PATH = '/processes/employee/createLearningQuestion'
const BATCH_SAVE_QUESTIONS_PATH = '/processes/employee/batchSaveLearningQuestions'
const CREATE_SCORING_GRID_PATH = '/processes/employee/createLearningScoringGrid'
const UPDATE_COURSE_PATH = '/processes/employee/updateLearningCourse'

interface ProcessResponse {
  id?: string
  [key: string]: unknown
}

export interface PublishLearningQuizParams {
  courseId: string
  courseVersion?: number
  versionNo?: number
  sourceDocumentId: string
  ownerEmployeeId: string
  publishedBy?: string
  quiz: EditableLearningQuiz
}

const createEmployeeProcessClient = (accessToken: string) => {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  return new RestClient(baseUrl, {
    Authorization: setAccessTokenToAuthorizationHeader(accessToken)
  })
}

function resolveProcessId<T extends string>(response: ProcessResponse, key: T): string {
  const nested = response[key]
  if (typeof nested === 'object' && nested && 'id' in nested && typeof nested.id === 'string' && nested.id)
    return nested.id
  if (typeof response.id === 'string' && response.id) return response.id
  throw new Error(`Employee service did not return ${key} id`)
}

function buildBatchQuestionOptions(question: EditableLearningQuestion): Record<string, string> {
  return Object.fromEntries(question.options.map(option => [option.key, option.text]))
}

function buildQuestionCorrectKeys(question: EditableLearningQuiz['questions'][number]): Record<string, unknown> {
  return {
    keys: question.correctOptionKeys
  }
}

function normalizeQuizQuestions(questions: EditableLearningQuestion[]): EditableLearningQuestion[] {
  return questions.map((question, index) => ({ ...question, orderNo: index + 1 }))
}

function buildSnapshotQuestions(questions: EditableLearningQuestion[]) {
  return questions.map(question => ({
    orderNo: question.orderNo,
    prompt: question.prompt,
    questionType: question.questionType,
    options: question.options,
    correctOptionKeys: question.correctOptionKeys,
    points: question.points,
    explanation: question.explanation,
    sourcePassage: question.sourcePassage,
    pageReference: question.pageReference,
    topic: question.topic
  }))
}

function buildBatchQuestionPayload(question: EditableLearningQuestion): LearningQuestionsBatchQuestionPayload {
  return {
    orderNo: question.orderNo,
    prompt: question.prompt,
    questionType: question.questionType,
    options: buildBatchQuestionOptions(question),
    correctKeys: buildQuestionCorrectKeys(question),
    points: question.points,
    explanation: question.explanation || undefined,
    sourcePassage: question.sourcePassage || undefined,
    pageReference: question.pageReference,
    topic: question.topic || undefined
  }
}

function buildPerQuestion(questions: EditableLearningQuestion[]): Record<string, unknown> {
  return Object.fromEntries(
    questions.map(question => [
      String(question.orderNo),
      {
        points: question.points,
        correctKeys: question.correctOptionKeys
      }
    ])
  )
}

function isLearningQuestionsBatchResult(value: unknown): value is LearningQuestionsBatchResult {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function createLearningCourseVersion(
  accessToken: string,
  payload: LearningCourseVersionPayload
): Promise<ProcessResponse> {
  return createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    CREATE_COURSE_VERSION_PATH,
    { learningCourseVersion: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export async function createLearningMaterial(
  accessToken: string,
  payload: LearningMaterialPayload
): Promise<ProcessResponse> {
  return createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    CREATE_MATERIAL_PATH,
    { learningMaterial: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export async function createLearningQuestion(
  accessToken: string,
  payload: LearningQuestionPayload
): Promise<ProcessResponse> {
  return createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    CREATE_QUESTION_PATH,
    { learningQuestion: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export async function batchSaveLearningQuestions(
  accessToken: string,
  payload: LearningQuestionsBatchPayload
): Promise<LearningQuestionsBatchResult> {
  const response = await createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    BATCH_SAVE_QUESTIONS_PATH,
    { learningQuestionsBatch: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
  const result = response.learningQuestionsBatchResult
  if (isLearningQuestionsBatchResult(result)) return result
  return {}
}

export async function createLearningScoringGrid(
  accessToken: string,
  payload: LearningScoringGridPayload
): Promise<ProcessResponse> {
  return createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    CREATE_SCORING_GRID_PATH,
    { learningScoringGrid: payload },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export async function updateLearningCoursePublished(
  accessToken: string,
  params: Pick<
    PublishLearningQuizParams,
    'courseId' | 'courseVersion' | 'quiz' | 'sourceDocumentId' | 'ownerEmployeeId'
  >
): Promise<ProcessResponse> {
  return createEmployeeProcessClient(accessToken).post<ProcessResponse>(
    UPDATE_COURSE_PATH,
    {
      learningCourse: {
        id: params.courseId,
        ...(typeof params.courseVersion === 'number' ? { version: params.courseVersion } : {}),
        title: params.quiz.title,
        description: params.quiz.description,
        sourceDocumentId: params.sourceDocumentId,
        ownerEmployee: params.ownerEmployeeId,
        passThreshold: params.quiz.passThreshold,
        maxAttempts: params.quiz.maxAttempts,
        status: LEARNING_STATUS.PUBLISHED
      }
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export async function publishLearningQuiz(accessToken: string, params: PublishLearningQuizParams): Promise<string> {
  const publishedAt = new Date().toISOString()
  const normalizedQuestions = normalizeQuizQuestions(params.quiz.questions)
  const normalizedQuiz = { ...params.quiz, questions: normalizedQuestions }
  const versionResponse = await createLearningCourseVersion(accessToken, {
    learningCourse: params.courseId,
    versionNo: params.versionNo ?? 1,
    generatorAgentId: 'learning_quiz_generator',
    publishedAt,
    publishedBy: params.publishedBy,
    snapshot: {
      title: params.quiz.title,
      description: params.quiz.description,
      passThreshold: params.quiz.passThreshold,
      maxAttempts: params.quiz.maxAttempts,
      coveredTopics: params.quiz.coveredTopics,
      uncoveredTopics: params.quiz.uncoveredTopics,
      questions: buildSnapshotQuestions(normalizedQuestions)
    }
  })
  const learningCourseVersionId = resolveProcessId(versionResponse, 'learningCourseVersion')

  await createLearningMaterial(accessToken, {
    learningCourse: params.courseId,
    contentDocumentId: params.sourceDocumentId,
    role: 'PRIMARY_LEARNING_MATERIAL',
    orderNo: 1
  })

  const batchResult = await batchSaveLearningQuestions(accessToken, {
    learningCourseVersionId,
    questions: normalizedQuestions.map(buildBatchQuestionPayload)
  })
  if (typeof batchResult.savedCount === 'number' && batchResult.savedCount !== normalizedQuestions.length) {
    throw new Error('Employee service did not save all learning questions')
  }

  await createLearningScoringGrid(accessToken, {
    learningCourseVersion: learningCourseVersionId,
    passThreshold: params.quiz.passThreshold,
    perQuestion: buildPerQuestion(normalizedQuestions),
    bandDefinitions: params.quiz.scoringGrid.bandDefinitions
  })

  await updateLearningCoursePublished(accessToken, { ...params, quiz: normalizedQuiz })

  return learningCourseVersionId
}
