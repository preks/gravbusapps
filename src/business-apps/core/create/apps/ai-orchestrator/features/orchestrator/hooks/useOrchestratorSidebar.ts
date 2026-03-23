/**
 * useOrchestratorSidebar - Session history sidebar state and handlers.
 */

import { useState, useCallback } from 'react'
import type { BuildPlan } from '../types'
import { useCachedPlans } from './useCachedPlans'

export interface UseOrchestratorSidebarOptions {
  accessToken: string
  state: { chatActive: boolean; setChatActive: (active: boolean) => void }
  refreshPlan: (jobId: string) => Promise<BuildPlan | null>
  applyRestoredPlan: (plan: BuildPlan) => Promise<void>
  chat: { resetMessages: () => void; messages: unknown[] }
  isRestoringSessionRef: React.MutableRefObject<boolean>
  setIsRestoringSession: (v: boolean) => void
  setRestoreComplete: (v: boolean) => void
}

export function useOrchestratorSidebar(options: UseOrchestratorSidebarOptions) {
  const {
    accessToken,
    state,
    refreshPlan,
    applyRestoredPlan,
    chat,
    isRestoringSessionRef,
    setIsRestoringSession,
    setRestoreComplete
  } = options

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    data: plans,
    loading: plansLoading,
    refetch: refetchPlans
  } = useCachedPlans({
    accessToken,
    enabled: sidebarOpen
  })

  const handleOpenHistory = useCallback(() => {
    if (!state.chatActive) state.setChatActive(true)
    setSidebarOpen(true)
    refetchPlans()
  }, [refetchPlans, state])

  const handleSelectSession = useCallback(
    async (jobId: string) => {
      setSidebarOpen(false)
      isRestoringSessionRef.current = true
      setIsRestoringSession(true)
      chat.resetMessages()
      let appliedPlan = false
      try {
        const plan = await refreshPlan(jobId)
        if (!plan) return
        await applyRestoredPlan(plan)
        appliedPlan = true
        setRestoreComplete(true)
      } finally {
        if (!appliedPlan) {
          isRestoringSessionRef.current = false
          setIsRestoringSession(false)
        }
      }
    },
    [chat, refreshPlan, applyRestoredPlan, setIsRestoringSession, setRestoreComplete]
  )

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
    if (chat.messages.length === 0) state.setChatActive(false)
  }, [chat.messages.length, state])

  return {
    sidebarOpen,
    setSidebarOpen,
    plans,
    plansLoading,
    refetchPlans,
    handleOpenHistory,
    handleSelectSession,
    handleCloseSidebar
  }
}
