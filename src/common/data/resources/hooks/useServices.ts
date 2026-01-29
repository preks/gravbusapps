import { useState, useCallback } from 'react'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ServiceOption {
  id: string
  name: string
}

export interface UseServicesResult {
  services: ServiceOption[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  search: (searchTerm: string) => Promise<void>
}

export const useServices = (context: BusinessAppContextProps): UseServicesResult => {
  const resourceClient = useResourceClient(context.accessToken)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const fetchServices = useCallback(async () => {
    if (!context.accessToken) {
      setError('No access token available')
      setIsLoading(false)
      return
    }

    // Skip if already loaded
    if (hasLoaded && services.length > 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await resourceClient.action.getServices()
      setServices(result)
      setHasLoaded(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient, hasLoaded, services.length])

  const search = useCallback(
    async (searchTerm: string) => {
      if (!context.accessToken) return

      // Load data if not loaded yet
      if (!hasLoaded) {
        await fetchServices()
      }

      setIsLoading(true)
      setError(null)

      try {
        const allServices = await resourceClient.action.getServices()
        const filtered = allServices.filter(service => service.name.toLowerCase().includes(searchTerm.toLowerCase()))
        setServices(filtered)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, resourceClient, hasLoaded, fetchServices]
  )

  return {
    services,
    isLoading,
    error,
    refetch: fetchServices,
    search
  }
}
