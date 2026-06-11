import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useLearningAttemptResult } from '../../hooks/useLearningAttemptResult'
import { useLearningQuizQuestions } from '../../hooks/useLearningQuizQuestions'
import { startLearningAttempt, submitLearningAttempt } from '../../services/learningAttemptApi'
import { completeLearningQuizTask } from '../../services/learningQuizTaskCompletionApi'
import type { LearningAttemptCommandResult, LearningQuizQuestion } from '../../types'
import { QuestionField } from './QuestionField'
import { ResultState } from './ResultState'

export interface LearningQuizTaskLink {
  name: string
  url: string
  type?: string
}

interface LearningQuizTaskPayload {
  courseId?: string
  courseVersionId?: string
  assignmentId?: string
}

interface LearningQuizTaskFormProps extends BusinessAppContextProps {
  sourceLink?: LearningQuizTaskLink
}

type AnswersByQuestionId = Record<string, string[]>

function readTaskPayload(additionalData: BusinessAppContextProps['additionalData']): LearningQuizTaskPayload {
  const payload = additionalData?.psi_taskPayload
  if (!payload || typeof payload !== 'object') return {}
  return payload as LearningQuizTaskPayload
}

function isSubmittedStatus(status: string): boolean {
  return status === 'GRADED_LEARNING_ATTEMPT' || status === 'SUBMITTED_LEARNING_ATTEMPT'
}

function createAnswerPayload(questions: LearningQuizQuestion[], answers: AnswersByQuestionId) {
  return questions.map(question => ({
    questionId: question.id,
    orderNo: question.orderNo,
    selectedKeys: answers[question.id] ?? []
  }))
}

function calculateTimeTakenSeconds(startedAt: number): number {
  return Math.max(1, Math.round((Date.now() - startedAt) / 1000))
}

export const LearningQuizTaskForm: React.FC<LearningQuizTaskFormProps> = ({
  accessToken,
  additionalData,
  sourceLink
}) => {
  const { t } = useTranslation(translations)
  const taskPayload = useMemo(() => readTaskPayload(additionalData), [additionalData])
  const {
    questions,
    loading,
    error: questionsError
  } = useLearningQuizQuestions(taskPayload.courseVersionId, accessToken)
  const {
    result: persistedResult,
    loading: persistedResultLoading,
    error: persistedResultError
  } = useLearningAttemptResult(taskPayload.assignmentId, taskPayload.courseVersionId, accessToken)
  const [answers, setAnswers] = useState<AnswersByQuestionId>({})
  const [commandResult, setCommandResult] = useState<LearningAttemptCommandResult | null>(null)
  const [commandError, setCommandError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [taskCompleted, setTaskCompleted] = useState(false)
  const startedAtRef = useRef(Date.now())
  const resolvedAttemptKeyRef = useRef('')
  const taskId = typeof additionalData?.psi_taskId === 'string' ? additionalData.psi_taskId : undefined
  const attemptResolutionKey = `${taskPayload.assignmentId ?? ''}|${taskPayload.courseVersionId ?? ''}`

  useEffect(() => {
    if (!persistedResult) return
    setCommandResult(persistedResult)
  }, [persistedResult])

  const startAttempt = useCallback(
    async (reuseAttemptId?: string) => {
      if (!accessToken || !taskPayload.assignmentId || !taskPayload.courseVersionId) return null
      const result = await startLearningAttempt(accessToken, {
        assignmentId: taskPayload.assignmentId,
        learningCourseVersionId: taskPayload.courseVersionId,
        attemptId: reuseAttemptId
      })
      if (isSubmittedStatus(result.status)) {
        setCommandResult(result)
      }
      return result
    },
    [accessToken, taskPayload.assignmentId, taskPayload.courseVersionId]
  )

  const resolveAttempt = useCallback(async () => {
    return startAttempt()
  }, [startAttempt])

  useEffect(() => {
    if (persistedResultLoading || persistedResult) return
    if (resolvedAttemptKeyRef.current === attemptResolutionKey) return
    resolvedAttemptKeyRef.current = attemptResolutionKey
    resolveAttempt().catch(err => {
      setCommandError(err instanceof Error ? err.message : t('learning-quiz-start-error'))
    })
  }, [attemptResolutionKey, persistedResult, persistedResultLoading, resolveAttempt, t])

  const completeTask = useCallback(
    async (result: LearningAttemptCommandResult) => {
      if (!accessToken || !taskId || taskCompleted) return
      await completeLearningQuizTask(accessToken, taskId, {
        attemptId: result.attemptId,
        status: result.status,
        scorePct: result.scorePct,
        passed: result.passed
      })
      setTaskCompleted(true)
    },
    [accessToken, taskCompleted, taskId]
  )

  useEffect(() => {
    if (commandResult && isSubmittedStatus(commandResult.status)) {
      completeTask(commandResult).catch(err => {
        console.warn(err instanceof Error ? err.message : t('learning-quiz-complete-error'))
      })
    }
  }, [commandResult, completeTask, t])

  const updateSingleAnswer = (questionId: string, selectedKey: string) => {
    setAnswers(current => ({ ...current, [questionId]: [selectedKey] }))
  }

  const updateMultiAnswer = (questionId: string, selectedKey: string, checked: boolean) => {
    setAnswers(current => {
      const existing = current[questionId] ?? []
      const next = checked ? [...existing, selectedKey] : existing.filter(key => key !== selectedKey)
      return { ...current, [questionId]: next }
    })
  }

  const handleSubmit = async () => {
    setCommandError(null)
    const unanswered = questions.some(question => (answers[question.id] ?? []).length === 0)
    if (unanswered) {
      setCommandError(t('learning-quiz-validation-all-questions'))
      return
    }
    if (!accessToken || !taskPayload.assignmentId || !taskPayload.courseVersionId) {
      setCommandError(t('learning-quiz-missing-context'))
      return
    }

    try {
      setSubmitting(true)
      const startedAttempt = await resolveAttempt()
      const resolvedAttemptId = startedAttempt?.attemptId
      if (!resolvedAttemptId) throw new Error(t('learning-quiz-start-error'))
      const result = await submitLearningAttempt(accessToken, {
        attemptId: resolvedAttemptId,
        learningCourseVersionId: taskPayload.courseVersionId,
        answers: createAnswerPayload(questions, answers),
        timeTakenSeconds: calculateTimeTakenSeconds(startedAtRef.current)
      })
      setCommandResult(result)
    } catch (err) {
      setCommandError(err instanceof Error ? err.message : t('learning-quiz-submit-error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetake = async () => {
    try {
      setSubmitting(true)
      setAnswers({})
      setCommandError(null)
      const result = await startAttempt()
      setCommandResult(result && isSubmittedStatus(result.status) ? result : null)
      startedAtRef.current = Date.now()
    } catch (err) {
      setCommandError(err instanceof Error ? err.message : t('learning-quiz-start-error'))
    } finally {
      setSubmitting(false)
    }
  }

  const resultVisible = commandResult && isSubmittedStatus(commandResult.status)

  return (
    <div className="gba:flex gba:h-full gba:flex-col" data-testid="learning-quiz-task-form">
      <Card className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
        <CardHeader>
          <CardTitle>{t('learning-quiz-task-title')}</CardTitle>
          {sourceLink && (
            <a
              href={sourceLink.url}
              target="_blank"
              rel="noreferrer"
              className="gba:text-sm gba:font-medium gba:text-primary hover:gba:underline"
              data-testid="learning-quiz-source-link"
            >
              {t('learning-quiz-source-link', { name: sourceLink.name })}
            </a>
          )}
        </CardHeader>
        <CardContent className="gba:flex-1 gba:space-y-5 gba:overflow-y-auto">
          {loading && <Spinner className="gba:h-5 gba:w-5" data-testid="learning-quiz-loading" />}
          {(persistedResultError || questionsError || commandError) && !resultVisible && (
            <div className="gba:rounded-md gba:bg-destructive/10 gba:p-3 gba:text-sm gba:text-destructive">
              {persistedResultError ?? questionsError ?? commandError}
            </div>
          )}
          {resultVisible ? (
            <ResultState result={commandResult} onRetake={handleRetake} t={t} submitting={submitting} />
          ) : (
            <>
              <p className="gba:text-sm gba:text-muted-foreground">{t('learning-quiz-task-description')}</p>
              {questions.map(question => (
                <QuestionField
                  key={question.id}
                  question={question}
                  selectedKeys={answers[question.id] ?? []}
                  onSingleAnswer={updateSingleAnswer}
                  onMultiAnswer={updateMultiAnswer}
                  disabled={submitting}
                />
              ))}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || submitting || questions.length === 0}
                data-testid="learning-quiz-submit-button"
              >
                {submitting && <Spinner className="gba:mr-2 gba:h-4 gba:w-4" />}
                {submitting ? t('learning-quiz-submitting') : t('learning-quiz-submit')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LearningQuizTaskForm
