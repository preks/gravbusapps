/**
 * Hook for managing AI thinking steps during analysis
 * Handles the animated thinking visualization
 */

import { useState, useEffect } from 'react'
import type { ThinkingStep } from '../components/widgets/ThinkingSteps'

const INITIAL_STEPS: ThinkingStep[] = [
  { id: '1', title: 'Understanding intent', detail: 'Analyzing your request...', status: 'active' },
  { id: '2', title: 'Identifying components', detail: 'Planning architecture...', status: 'pending' },
  { id: '3', title: 'Checking dependencies', detail: 'Analyzing requirements...', status: 'pending' },
  { id: '4', title: 'Generating plan', detail: 'Creating build strategy...', status: 'pending' }
]

export interface UseThinkingStepsResult {
  steps: ThinkingStep[]
  progress: number
  completeAllSteps: () => void
}

/**
 * Manages thinking steps animation during analysis phase
 */
export function useThinkingSteps(isAnalyzing: boolean): UseThinkingStepsResult {
  const [steps, setSteps] = useState<ThinkingStep[]>(INITIAL_STEPS)
  const [progress, setProgress] = useState(0)

  // Initialize and animate thinking steps
  useEffect(() => {
    if (!isAnalyzing) return

    setSteps(INITIAL_STEPS)
    setProgress(25)

    // Simulate progress (replace with real progress if available from backend)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return Math.min(prev + 10, 90)
      })

      setSteps(prev => {
        const nextPending = prev.findIndex(s => s.status === 'pending')
        if (nextPending === -1) return prev

        const updated = [...prev]
        const currentActive = prev.findIndex(s => s.status === 'active')
        if (currentActive !== -1) {
          updated[currentActive] = {
            ...updated[currentActive],
            status: 'complete',
            duration: Math.floor(Math.random() * 500 + 200)
          }
        }
        updated[nextPending] = { ...updated[nextPending], status: 'active' }
        return updated
      })
    }, 1500)

    return () => clearInterval(progressInterval)
  }, [isAnalyzing])

  const completeAllSteps = () => {
    setProgress(100)
    setSteps(prev =>
      prev.map(s => ({ ...s, status: 'complete' as const, duration: Math.floor(Math.random() * 500 + 200) }))
    )
  }

  return {
    steps,
    progress,
    completeAllSteps
  }
}
