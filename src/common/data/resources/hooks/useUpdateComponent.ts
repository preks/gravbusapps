import { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { Component } from '../types/component.types'

interface UseUpdateComponentResult {
  updateComponent: (id: string, data: Partial<Component>) => Promise<Component>
  isUpdating: boolean
  error: string | null
}

export const useUpdateComponent = (context: BusinessAppContextProps): UseUpdateComponentResult => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const updateComponent = useCallback(
    async (id: string, data: Partial<Component>) => {
      setIsUpdating(true)
      setError(null)

      try {
        const result = await resourceClient.component.updateComponent(id, data)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update component'
        setError(errorMessage)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [resourceClient]
  )

  return {
    updateComponent,
    isUpdating,
    error
  }
}
