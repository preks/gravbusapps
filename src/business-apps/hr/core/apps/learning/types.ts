import type { LearningStatus } from './constants/learningStatus'

export interface LearningCourseApi {
  id: string
  version?: number | null
  title?: string | null
  description?: string | null
  status?: string | null
  sourceDocumentId?: string | null
  sourceDocumentHash?: string | null
  passThreshold?: number | string | null
  timeLimitMinutes?: number | null
  maxAttempts?: number | null
  allowRetake?: boolean | null
  anonymous?: boolean | null
  ownerEmployeeId?: string | null
  ownerEmployee?: LearningEmployeeApi | null
  createdAt?: string | null
  createdBy?: string | null
  updatedAt?: string | null
  updatedBy?: string | null
  isDeleted?: boolean | null
}

export interface GetLearningCoursesResponse {
  LearningCourse?: LearningCourseApi[]
}

export interface LearningMaterialApi {
  id: string
  version?: number | null
  contentDocumentId?: string | null
  role?: string | null
  orderNo?: number | null
}

export interface LearningQuestionApi {
  id: string
  version?: number | null
  orderNo?: number | null
  prompt?: string | null
  questionType?: string | null
  options?: Record<string, unknown> | null
  correctKeys?: Record<string, unknown> | null
  points?: number | string | null
  explanation?: string | null
  pageReference?: number | null
}

export interface GetLearningQuizQuestionsResponse {
  LearningCourseVersion?: Array<{
    id: string
    learningQuestions?: LearningQuestionApi[]
  }>
}

export interface LearningQuizQuestion {
  id: string
  orderNo: number
  prompt: string
  questionType: EditableLearningQuestionType
  options: EditableLearningOption[]
  points: number
}

export interface LearningAttemptAnswerPayload {
  questionId: string
  orderNo: number
  selectedKeys: string[]
}

export interface StartLearningAttemptPayload {
  assignmentId: string
  learningCourseVersionId: string
  attemptId?: string
}

export interface SubmitLearningAttemptPayload {
  attemptId: string
  learningCourseVersionId: string
  answers: LearningAttemptAnswerPayload[]
  timeTakenSeconds?: number
}

export interface LearningAttemptCommandResult {
  attemptId: string
  status: LearningAttemptStatus | string
  scoreRaw?: number
  scorePct?: number
  passed?: boolean
  bandLabel?: string
  attemptsUsed?: number
  attemptsAllowed?: number
  attemptsLeft?: number
  canRetake?: boolean
  message?: string
}

export interface LearningScoringGridApi {
  id: string
  version?: number | null
  passThreshold?: number | string | null
  perQuestion?: Record<string, unknown> | null
  bandDefinitions?: Record<string, unknown> | null
}

export interface LearningCourseVersionApi {
  id: string
  version?: number | null
  versionNo?: number | null
  generatorAgentId?: string | null
  generatorModelId?: string | null
  generatorPromptVersion?: number | null
  publishedAt?: string | null
  snapshot?: Record<string, unknown> | null
  learningQuestions?: LearningQuestionApi[]
  learningScoringGrids?: LearningScoringGridApi[]
}

export interface LearningCourseDetailsApi extends LearningCourseApi {
  learningCourseVersions?: LearningCourseVersionApi[]
  learningMaterials?: LearningMaterialApi[]
}

export interface GetLearningCourseDetailsResponse {
  LearningCourse?: LearningCourseDetailsApi[]
}

export interface LearningCourseListItem {
  id: string
  version: number
  title: string
  description: string
  status: LearningStatus | string
  sourceDocumentId?: string
  sourceDocumentHash?: string
  passThreshold?: number
  timeLimitMinutes?: number
  maxAttempts?: number
  allowRetake: boolean
  anonymous: boolean
  ownerEmployeeId?: string
  ownerEmployeeName?: string
  createdAt?: string
  updatedAt?: string
}

export interface LearningCourseDetails {
  course: LearningCourseListItem
  latestVersion?: LearningCourseVersionApi
  sourceDocumentId?: string
  quiz: EditableLearningQuiz
}

export type EditableLearningQuestionType =
  | 'MCQ_SINGLE_LEARNING_QUESTION'
  | 'MCQ_MULTI_LEARNING_QUESTION'
  | 'TRUE_FALSE_LEARNING_QUESTION'

export interface EditableLearningOption {
  key: string
  text: string
}

export interface EditableLearningQuestion {
  id: string
  orderNo: number
  prompt: string
  questionType: EditableLearningQuestionType
  options: EditableLearningOption[]
  correctOptionKeys: string[]
  points: number
  explanation: string
  sourcePassage?: string
  pageReference?: number
  topic: string
}

export interface EditableLearningQuiz {
  title: string
  description: string
  passThreshold: number
  maxAttempts: number
  questions: EditableLearningQuestion[]
  coveredTopics: string[]
  uncoveredTopics: string[]
  scoringGrid: {
    perQuestion: Record<string, unknown>
    bandDefinitions: Record<string, unknown>
  }
}

export interface LearningCourseVersionPayload {
  learningCourse: string
  versionNo: number
  generatorAgentId?: string
  generatorModelId?: string
  generatorPromptVersion?: number
  publishedAt: string
  publishedBy?: string
  snapshot: Record<string, unknown>
}

export interface LearningMaterialPayload {
  learningCourse: string
  contentDocumentId: string
  role: 'PRIMARY_LEARNING_MATERIAL' | 'SUPPLEMENTAL_LEARNING_MATERIAL' | 'REFERENCE_LEARNING_MATERIAL'
  orderNo: number
}

export interface LearningQuestionPayload {
  learningCourseVersion: string
  orderNo: number
  prompt: string
  questionType: EditableLearningQuestionType
  options: Record<string, unknown>
  correctKeys: Record<string, unknown>
  points: number
  explanation?: string
  sourcePassage?: string
  pageReference?: number
  topic?: string
}

export interface LearningQuestionsBatchQuestionPayload {
  orderNo: number
  prompt: string
  questionType: EditableLearningQuestionType
  options: Record<string, string>
  correctKeys: Record<string, unknown>
  points?: number
  explanation?: string
  sourcePassage?: string
  pageReference?: number
  topic?: string
}

export interface LearningQuestionsBatchPayload {
  learningCourseVersionId: string
  questions: LearningQuestionsBatchQuestionPayload[]
}

export interface LearningQuestionsBatchResult {
  learningCourseVersionId?: string
  questions?: unknown[]
  savedCount?: number
}

export interface LearningScoringGridPayload {
  learningCourseVersion: string
  passThreshold: number
  perQuestion: Record<string, unknown>
  bandDefinitions: Record<string, unknown>
}

export type LearningAudienceMode = 'USERS_LEARNING_AUDIENCE' | 'TEAMS_LEARNING_AUDIENCE'

export type LearningAssignmentStatus =
  | 'SCHEDULED_LEARNING_ASSIGNMENT'
  | 'ACTIVE_LEARNING_ASSIGNMENT'
  | 'CLOSED_LEARNING_ASSIGNMENT'
  | 'CANCELLED_LEARNING_ASSIGNMENT'

export type LearningAttemptStatus =
  | 'IN_PROGRESS_LEARNING_ATTEMPT'
  | 'SUBMITTED_LEARNING_ATTEMPT'
  | 'GRADED_LEARNING_ATTEMPT'
  | 'EXPIRED_LEARNING_ATTEMPT'
  | 'INVALIDATED_LEARNING_ATTEMPT'

export interface LearningAssignmentApi {
  id: string
  version?: number | null
  title?: string | null
  audienceMode?: string | null
  audienceTargets?: Record<string, unknown> | null
  availableFrom?: string | null
  availableUntil?: string | null
  status?: string | null
  companyId?: string | null
  learningCourseId?: string | null
  learningCourseVersionId?: string | null
  learningCourse?: LearningCourseApi | null
  learningCourseVersion?: LearningCourseVersionApi | null
  learningAssignmentTargets?: LearningAssignmentTargetApi[]
  learningAttempts?: LearningAttemptApi[]
}

export interface LearningEmployeeApi {
  id: string
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  pictureThumbnail?: string | null
}

export interface LearningAssignmentTargetApi {
  id: string
  version?: number | null
  resolutionSource?: string | null
  learningAssignmentId?: string | null
  employeeId?: string | null
  employee?: LearningEmployeeApi | null
}

export interface LearningAttemptApi {
  id: string
  version?: number | null
  status?: string | null
  employeeId?: string | null
  learningAssignmentId?: string | null
  learningCourseVersionId?: string | null
  employee?: LearningEmployeeApi | null
  startedAt?: string | null
  submittedAt?: string | null
  gradedAt?: string | null
  timeTakenSeconds?: number | string | null
  scoreRaw?: number | string | null
  scorePct?: number | string | null
  bandLabel?: string | null
  passed?: boolean | null
}

export interface GetLearningAssignmentsResponse {
  LearningAssignment?: LearningAssignmentApi[]
}

export interface GetLearningAttemptResultResponse {
  LearningAttempt?: LearningAttemptApi[]
}

export interface ResolveLearningCompanyResponse {
  Employee?: Array<{ id: string; companyEmployees?: Array<{ companyId?: string | null }> }>
}

export interface LearningAssignmentPayload {
  title: string
  audienceMode: LearningAudienceMode
  audienceTargets: Record<string, unknown>
  availableFrom: string
  availableUntil: string
  status: LearningAssignmentStatus
  company: string
  learningCourse: string
  learningCourseVersion: string
}

export interface LearningAssignmentTargetPayload {
  resolutionSource:
    | 'DIRECT_LEARNING_TARGET'
    | 'TEAM_LEARNING_TARGET'
    | 'ORG_UNIT_LEARNING_TARGET'
    | 'CAPABILITY_LEARNING_TARGET'
    | 'EVERYONE_LEARNING_TARGET'
  learningAssignment: string
  employee: string
}

export interface LearningAttemptPayload {
  status: LearningAttemptStatus
  startedAt?: string
  learningAssignment: string
  learningCourseVersion: string
  employee: string
  passed?: boolean
  gradingMetadata?: Record<string, unknown>
}

export interface LearningAssignmentProgressRow {
  employeeId: string
  employeeName: string
  employeePictureThumbnail?: string
  assignmentTargetId?: string
  attemptId?: string
  assignmentStatus: string
  assignmentStatusLabel: string
  attemptStatus: string
  attemptStatusLabel: string
  startedAt?: string
  submittedAt?: string
  gradedAt?: string
  scorePct?: number
  passed?: boolean
  availableUntil?: string
}

export interface LearningAssignmentGroup {
  courseId: string
  courseTitle: string
  assignments: LearningAssignmentApi[]
  rows: LearningAssignmentProgressRow[]
  summary: {
    assigned: number
    inProgress: number
    submittedOrGraded: number
    passed: number
    overdue: number
  }
}
