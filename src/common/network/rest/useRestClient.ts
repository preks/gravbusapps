import { useMemo } from 'react'
import { RestClient } from './RestClient'

export const useRestClient = (url?: string) => {
  const restClient = useMemo(() => new RestClient(url), [url])
  return restClient
}
