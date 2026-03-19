import { useEffect, useState } from 'react'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'

interface TemplateOption {
  id: string
  name: string
}

export const useFlowTemplateOptions = (accessToken: string) => {
  const templateClient = useFlowTemplateClient(accessToken)
  const [data, setData] = useState<TemplateOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!accessToken) {
      setData([])
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    templateClient
      .getTemplatesList({ limit: 200, offset: 0, onlyLatest: true })
      .then(result => {
        if (cancelled) return
        setData(
          result.templates.map(template => ({
            id: template.id,
            name: template.name
          }))
        )
      })
      .catch(nextError => {
        if (cancelled) return
        setData([])
        setError(nextError instanceof Error ? nextError : new Error('Failed to load templates'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, templateClient])

  return {
    data,
    isLoading,
    error
  }
}
