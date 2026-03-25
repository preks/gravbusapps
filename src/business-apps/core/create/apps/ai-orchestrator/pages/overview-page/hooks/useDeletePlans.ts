/**
 * Hook for managing plan deletion operations
 * Handles both single and bulk deletion with error handling
 */

import { useState } from 'react'
import { createOrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'

export interface UseDeletePlansParams {
  accessToken: string
  refetch: () => void | Promise<void>
  onDeleteComplete?: () => void
}

export interface UseDeletePlansReturn {
  isDeleting: boolean
  deleteError: string | null
  deleteSelectedPlans: (jobIds: string[]) => Promise<void>
  deleteSinglePlan: (jobId: string) => Promise<void>
  clearError: () => void
}

export function useDeletePlans({ accessToken, refetch, onDeleteComplete }: UseDeletePlansParams): UseDeletePlansReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteSelectedPlans = async (jobIds: string[]) => {
    if (jobIds.length === 0) return

    if (!confirm(`Delete ${jobIds.length} selected plan(s)? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)
    try {
      const client = createOrchestratorClient(accessToken)
      await Promise.all(jobIds.map(jobId => client.cancelBuild(jobId)))

      onDeleteComplete?.()
      refetch()

      alert(`Successfully deleted ${jobIds.length} plan(s).`)
    } catch (error: any) {
      console.error('Failed to delete selected plans:', error)
      const errorMsg = error?.message || 'Failed to delete selected plans. Please try again.'

      if (errorMsg.includes('not published yet') || errorMsg.includes('Resource IDs')) {
        setDeleteError(errorMsg)
      } else {
        alert(errorMsg)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const deleteSinglePlan = async (jobId: string) => {
    if (!confirm('Delete this plan? This action cannot be undone.')) {
      return
    }

    setDeleteError(null)
    try {
      const client = createOrchestratorClient(accessToken)
      await client.cancelBuild(jobId)
      refetch()
    } catch (error: any) {
      console.error('Failed to delete plan:', error)
      const errorMsg = error?.message || 'Failed to delete plan. Please try again.'

      if (errorMsg.includes('not published yet') || errorMsg.includes('Resource IDs')) {
        setDeleteError(errorMsg)
      } else {
        alert(errorMsg)
      }
    }
  }

  const clearError = () => {
    setDeleteError(null)
  }

  return {
    isDeleting,
    deleteError,
    deleteSelectedPlans,
    deleteSinglePlan,
    clearError
  }
}
