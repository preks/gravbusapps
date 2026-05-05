import { useState, useEffect } from 'react'
import { fetchInternalEntityOptions } from '@/common/utils/entityDiscovery'

interface InternalEntityType {
  name: string
  displayName: string
}

export function useInternalEntityTypes(accessToken: string) {
  const [internalEntityTypes, setInternalEntityTypes] = useState<InternalEntityType[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    setIsLoading(true)
    fetchInternalEntityOptions({ accessToken, includeFields: false })
      .then(entities => {
        setInternalEntityTypes(
          entities.map(entity => ({
            name: entity.type,
            displayName: entity.name
          }))
        )
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false))
  }, [accessToken])

  return { internalEntityTypes, isLoading }
}
