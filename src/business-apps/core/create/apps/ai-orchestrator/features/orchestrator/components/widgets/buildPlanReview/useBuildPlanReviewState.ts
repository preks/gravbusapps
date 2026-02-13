/**
 * Custom hook for managing BuildPlanReview state and handlers
 */

import { useState, useCallback, useEffect } from 'react'
import type { BuildPlan } from '../../../types'

interface UseBuildPlanReviewStateProps {
  plan: BuildPlan
  onConfirm: (skipComponents?: string[]) => void
  onReanalyze?: (answers: Record<string, string>) => void
  onRefine?: (feedback: string) => void
  refinementSummary?: string | null
  onSkippedComponentsChange?: (skippedIds: string[]) => void
}

interface UseBuildPlanReviewStateReturn {
  answers: Record<string, string>
  skippedComponents: Set<string>
  feedback: string
  setFeedback: React.Dispatch<React.SetStateAction<string>>
  hasQuestions: boolean
  allQuestionsAnswered: boolean
  handleAnswerChange: (questionId: string, answer: string) => void
  toggleComponentSkip: (componentId: string) => void
  handleConfirm: () => void
  handleReanalyze: () => void
  handleRefine: () => void
}

export const useBuildPlanReviewState = ({
  plan,
  onConfirm,
  onReanalyze,
  onRefine,
  refinementSummary,
  onSkippedComponentsChange
}: UseBuildPlanReviewStateProps): UseBuildPlanReviewStateReturn => {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [skippedComponents, setSkippedComponents] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState('')

  const hasQuestions = !!(plan.questions && plan.questions.length > 0)
  const allQuestionsAnswered = !hasQuestions || plan.questions!.every(q => !q.required || answers[q.id])

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }, [])

  const toggleComponentSkip = useCallback(
    (componentId: string) => {
      setSkippedComponents(prev => {
        const newSet = new Set(prev)
        if (newSet.has(componentId)) {
          newSet.delete(componentId)
        } else {
          newSet.add(componentId)
        }
        onSkippedComponentsChange?.(Array.from(newSet))
        return newSet
      })
    },
    [onSkippedComponentsChange]
  )

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(skippedComponents))
  }, [onConfirm, skippedComponents])

  const handleReanalyze = useCallback(() => {
    onReanalyze?.(answers)
  }, [onReanalyze, answers])

  const handleRefine = useCallback(() => {
    if (feedback.trim().length >= 3) {
      onRefine?.(feedback.trim())
    }
  }, [onRefine, feedback])

  // Clear feedback on successful refinement
  useEffect(() => {
    if (refinementSummary) {
      setFeedback('')
      // Note: Scroll behavior removed as this component is rendered inside Canvas
      // which has its own scroll container (gba:overflow-y-auto).
      // The refinement summary appears at the top and is naturally visible.
    }
  }, [refinementSummary])

  return {
    answers,
    skippedComponents,
    feedback,
    setFeedback,
    hasQuestions,
    allQuestionsAnswered,
    handleAnswerChange,
    toggleComponentSkip,
    handleConfirm,
    handleReanalyze,
    handleRefine
  }
}
