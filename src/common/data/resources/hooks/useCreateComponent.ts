import { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { Component } from '../types/component.types'

interface UseCreateComponentResult {
  createComponent: (
    data: Omit<Component, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'>
  ) => Promise<Component>
  isCreating: boolean
  error: string | null
}

export const useCreateComponent = (context: BusinessAppContextProps): UseCreateComponentResult => {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const createComponent = useCallback(
    async (data: Omit<Component, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'>) => {
      setIsCreating(true)
      setError(null)

      try {
        const result = await resourceClient.component.createComponent(data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create component'
        setError(errorMessage)
        throw err
      } finally {
        setIsCreating(false)
      }
    },
    [resourceClient]
  )

  return {
    createComponent,
    isCreating,
    error
  }
}
