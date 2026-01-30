import { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

interface UseDeleteComponentResult {
  deleteComponent: (id: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export const useDeleteComponent = (context: BusinessAppContextProps): UseDeleteComponentResult => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  const deleteComponent = useCallback(
    async (id: string) => {
      setIsDeleting(true)
      setError(null)

      try {
        await resourceClient.component.deleteComponent(id)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete component'
        setError(errorMessage)
        throw err
      } finally {
        setIsDeleting(false)
      }
    },
    [resourceClient]
  )

  return {
    deleteComponent,
    isDeleting,
    error
  }
}
