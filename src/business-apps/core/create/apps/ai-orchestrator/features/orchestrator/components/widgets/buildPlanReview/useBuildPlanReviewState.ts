/**
 * Custom hook for managing BuildPlanReview state and handlers.
 * Refinement state has been removed (now handled by the agent chat panel).
 */

import { useState, useCallback } from 'react'
import type { BuildPlan } from '../../../types'

interface UseBuildPlanReviewStateProps {
  plan: BuildPlan
  onConfirm: (skipComponents?: string[]) => void
  onReanalyze?: (answers: Record<string, string>) => void
  onSkippedComponentsChange?: (skippedIds: string[]) => void
}

interface UseBuildPlanReviewStateReturn {
  answers: Record<string, string>
  skippedComponents: Set<string>
  hasQuestions: boolean
  allQuestionsAnswered: boolean
  handleAnswerChange: (questionId: string, answer: string) => void
  toggleComponentSkip: (componentId: string) => void
  handleConfirm: () => void
  handleReanalyze: () => void
}

export const useBuildPlanReviewState = ({
  plan,
  onConfirm,
  onReanalyze,
  onSkippedComponentsChange
}: UseBuildPlanReviewStateProps): UseBuildPlanReviewStateReturn => {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [skippedComponents, setSkippedComponents] = useState<Set<string>>(new Set())

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

  return {
    answers,
    skippedComponents,
    hasQuestions,
    allQuestionsAnswered,
    handleAnswerChange,
    toggleComponentSkip,
    handleConfirm,
    handleReanalyze
  }
}
