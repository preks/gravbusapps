import { useCallback, useRef, useState } from 'react'
import { useDocuSign } from '@/common/integrations/docusign/useDocuSign'

export interface EnvelopeStatusRecord {
  envelopeId: string
  status: string
  statusDateTime?: string
  completedDateTime?: string
  emailSubject?: string
}

export const useEnvelopeStatusCache = (accessToken?: string) => {
  const { getStatus } = useDocuSign(accessToken)
  const statusRef = useRef<Record<string, EnvelopeStatusRecord>>({})
  const pendingRef = useRef<Map<string, Promise<EnvelopeStatusRecord>>>(new Map())
  const [version, setVersion] = useState(0)

  const ensureStatus = useCallback(
    async (envelopeId: string) => {
      if (!envelopeId) {
        return undefined
      }

      const cached = statusRef.current[envelopeId]
      if (cached) {
        return cached
      }

      if (pendingRef.current.has(envelopeId)) {
        return pendingRef.current.get(envelopeId)
      }

      const promise = getStatus(envelopeId)
        .then(result => {
          statusRef.current = { ...statusRef.current, [envelopeId]: result }
          pendingRef.current.delete(envelopeId)
          setVersion(v => v + 1)
          return result
        })
        .catch(error => {
          pendingRef.current.delete(envelopeId)
          throw error
        })

      pendingRef.current.set(envelopeId, promise)
      return promise
    },
    [getStatus]
  )

  return {
    statusMap: statusRef.current,
    ensureStatus,
    statusVersion: version
  }
}


