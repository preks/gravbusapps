import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ActionAssignmentDTO } from '../types/assignment.types'

interface UseCreateActionAssignmentResult {
  createActionAssignment: (data: Omit<ActionAssignmentDTO, 'id'>) => Promise<ActionAssignmentDTO | null>
  isLoading: boolean
  error: string | null
}

export const useCreateActionAssignment = (context: BusinessAppContextProps): UseCreateActionAssignmentResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

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

  return {
    createActionAssignment,
    isLoading,
    error
  }
}
