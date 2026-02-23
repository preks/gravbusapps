/**
 * State management hook for OrchestratorViewConversational
 */

import { useState, useRef } from 'react'
import type { OrchestratorViewState } from '../types'
import type { ThinkingStep } from '../components/widgets/ThinkingSteps'
import type { BuildLogEntry } from '../components/widgets/BuildConsoleLog'

export interface OrchestratorState {
  // View state
  viewState: OrchestratorViewState
  setViewState: (state: OrchestratorViewState) => void

  // User prompt
  userPrompt: string
  setUserPrompt: (prompt: string) => void

  // Build timing
  buildStartTime: number
  setBuildStartTime: (time: number) => void
  buildDuration: number
  setBuildDuration: (duration: number) => void

  // Build logs
  buildLogs: BuildLogEntry[]
  setBuildLogs: React.Dispatch<React.SetStateAction<BuildLogEntry[]>>

  // Thinking steps
  thinkingSteps: ThinkingStep[]
  setThinkingSteps: React.Dispatch<React.SetStateAction<ThinkingStep[]>>
  analysisProgress: number
  setAnalysisProgress: React.Dispatch<React.SetStateAction<number>>

  // Edit modal state
  isEditModalOpen: boolean
  setIsEditModalOpen: (open: boolean) => void
  isSavingPlan: boolean
  setIsSavingPlan: (saving: boolean) => void
  editError: string | null
  setEditError: (error: string | null) => void

  // Build error capture
  capturedBuildError: string | null
  setCapturedBuildError: (error: string | null) => void

  // Skipped components count
  skippedCount: number
  setSkippedCount: (count: number) => void

  // Chat active (switches from full-screen idle to chat+canvas layout)
  chatActive: boolean
  setChatActive: (active: boolean) => void

  // Refs for tracking
  hasTriggeredInitialAnalysis: React.MutableRefObject<boolean>
  loggedPhasesRef: React.MutableRefObject<Set<string>>
  lastCompletedCountRef: React.MutableRefObject<number>
}

export interface UseOrchestratorStateOptions {
  initialPrompt?: string
}

/**
 * Hook for managing orchestrator state
 */
export function useOrchestratorState({ initialPrompt = '' }: UseOrchestratorStateOptions = {}): OrchestratorState {
  const [viewState, setViewState] = useState<OrchestratorViewState>(initialPrompt ? 'analyzing' : 'idle')
  const [userPrompt, setUserPrompt] = useState(initialPrompt)
  const [buildStartTime, setBuildStartTime] = useState<number>(0)
  const [buildDuration, setBuildDuration] = useState<number>(0)
  const [buildLogs, setBuildLogs] = useState<BuildLogEntry[]>([])
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [capturedBuildError, setCapturedBuildError] = useState<string | null>(null)
  const [skippedCount, setSkippedCount] = useState(0)
  const [chatActive, setChatActive] = useState(!!initialPrompt)

  const hasTriggeredInitialAnalysis = useRef(false)
  const loggedPhasesRef = useRef(new Set<string>())
  const lastCompletedCountRef = useRef(0)

  return {
    viewState,
    setViewState,
    userPrompt,
    setUserPrompt,
    buildStartTime,
    setBuildStartTime,
    buildDuration,
    setBuildDuration,
    buildLogs,
    setBuildLogs,
    thinkingSteps,
    setThinkingSteps,
    analysisProgress,
    setAnalysisProgress,
    isEditModalOpen,
    setIsEditModalOpen,
    isSavingPlan,
    setIsSavingPlan,
    editError,
    setEditError,
    capturedBuildError,
    setCapturedBuildError,
    skippedCount,
    setSkippedCount,
    chatActive,
    setChatActive,
    hasTriggeredInitialAnalysis,
    loggedPhasesRef,
    lastCompletedCountRef
  }
}
