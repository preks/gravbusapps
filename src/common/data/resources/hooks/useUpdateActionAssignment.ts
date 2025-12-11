import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ActionAssignmentDTO } from '../types/assignment.types'

interface UseUpdateActionAssignmentResult {
  updateActionAssignment: (id: string, data: Partial<ActionAssignmentDTO>) => Promise<ActionAssignmentDTO | null>
  createActionAssignment: (data: Omit<ActionAssignmentDTO, 'id'>) => Promise<ActionAssignmentDTO | null>
  deleteActionAssignment: (id: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export const useUpdateActionAssignment = (context: BusinessAppContextProps): UseUpdateActionAssignmentResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const updateActionAssignment = useCallback(
    async (id: string, data: Partial<ActionAssignmentDTO>): Promise<ActionAssignmentDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.action.updateActionAssignment(id, data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update action assignment'
        setError(errorMessage)
        console.error('Error updating action assignment:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  const createActionAssignment = useCallback(
    async (data: Omit<ActionAssignmentDTO, 'id'>): Promise<ActionAssignmentDTO | null> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await resourceClient.action.createActionAssignment(data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create action assignment'
        setError(errorMessage)
        console.error('Error creating action assignment:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  const deleteActionAssignment = useCallback(
    async (id: string): Promise<boolean> => {
      if (!context.accessToken) {
        setError('Access token not available')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        await resourceClient.action.deleteActionAssignment(id)
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete action assignment'
        setError(errorMessage)
        console.error('Error deleting action assignment:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient]
  )

  return {
    updateActionAssignment,
    createActionAssignment,
    deleteActionAssignment,
    isLoading,
    error
  }
}
