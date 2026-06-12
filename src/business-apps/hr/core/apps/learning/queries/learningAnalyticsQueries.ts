export interface LearningAnswerAnalyticsRow {
  attemptId: string
  employeeId: string
  assignmentId: string
  learningCourseVersionId: string
  questionId: string
  orderNo: number
  selectedKeys: string[]
  correctKeys: string[]
  options: Record<string, unknown>
  questionType: string
  prompt: string
  topic?: string | null
  explanation?: string | null
  sourcePassage?: string | null
  pageReference?: string | number | null
  attemptScorePct?: number | null
  attemptStatus?: string | null
}

export const LEARNING_ANSWER_ANALYTICS_REQUIRED_FIELDS = [
  'attemptId',
  'employeeId',
  'assignmentId',
  'learningCourseVersionId',
  'questionId',
  'orderNo',
  'selectedKeys',
  'correctKeys',
  'options',
  'questionType',
  'prompt',
  'topic',
  'explanation',
  'sourcePassage',
  'pageReference',
  'attemptScorePct',
  'attemptStatus'
] as const
