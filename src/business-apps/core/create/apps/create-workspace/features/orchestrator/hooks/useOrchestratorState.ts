import { useState, useRef } from 'react'
import type { OrchestratorViewState, BuildPhase } from '../types'
import type { ThinkingStep } from '../components/widgets/ThinkingSteps'
import type { BuildLogEntry } from '../components/widgets/BuildConsoleLog'

export interface OrchestratorState {
  viewState: OrchestratorViewState
  setViewState: (state: OrchestratorViewState) => void
  userPrompt: string
  setUserPrompt: (prompt: string) => void
  buildStartTime: number
  setBuildStartTime: (time: number) => void
  buildDuration: number
  setBuildDuration: (duration: number) => void
  buildLogs: BuildLogEntry[]
  setBuildLogs: React.Dispatch<React.SetStateAction<BuildLogEntry[]>>
  thinkingSteps: ThinkingStep[]
  setThinkingSteps: React.Dispatch<React.SetStateAction<ThinkingStep[]>>
  analysisProgress: number
  setAnalysisProgress: React.Dispatch<React.SetStateAction<number>>
  skippedCount: number
  setSkippedCount: (count: number) => void
  capturedBuildError: string | null
  setCapturedBuildError: (error: string | null) => void
  isEditModalOpen: boolean
  setIsEditModalOpen: (open: boolean) => void
  isSavingPlan: boolean
  setIsSavingPlan: (saving: boolean) => void
  editError: string | null
  setEditError: (error: string | null) => void
  hasTriggeredInitialAnalysis: React.MutableRefObject<boolean>
  loggedPhasesRef: React.MutableRefObject<Set<BuildPhase>>
  lastCompletedCountRef: React.MutableRefObject<number>
}

export const useOrchestratorState = (initialPrompt: string = ''): OrchestratorState => {
  const [viewState, setViewState] = useState<OrchestratorViewState>(initialPrompt ? 'analyzing' : 'idle')
  const [userPrompt, setUserPrompt] = useState(initialPrompt)
  const [buildStartTime, setBuildStartTime] = useState<number>(0)
  const [buildDuration, setBuildDuration] = useState<number>(0)
  const [buildLogs, setBuildLogs] = useState<BuildLogEntry[]>([])
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [capturedBuildError, setCapturedBuildError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const hasTriggeredInitialAnalysis = useRef(false)
  const loggedPhasesRef = useRef<Set<BuildPhase>>(new Set())
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
    skippedCount,
    setSkippedCount,
    capturedBuildError,
    setCapturedBuildError,
    isEditModalOpen,
    setIsEditModalOpen,
    isSavingPlan,
    setIsSavingPlan,
    editError,
    setEditError,
    hasTriggeredInitialAnalysis,
    loggedPhasesRef,
    lastCompletedCountRef
  }
}
