import { useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetCrmDocuments, type CrmDocument } from '@/business-apps/crm/common/utils/documentUtils'
import type { Customer360Subject, CustomerContract, DomainHookResult } from '../types'

const CONTRACT_KEYWORDS = ['contract', 'vertrag', 'contract', 'agreement', 'contracte']

/** A CrmDocument is a contract when its document type code/value matches a contract keyword. */
function isContractDocument(doc: CrmDocument): boolean {
  const code = doc.documentType?.code?.toLowerCase() ?? ''
  const value = doc.documentType?.value?.toLowerCase() ?? ''
  return CONTRACT_KEYWORDS.some(keyword => code.includes(keyword) || value.includes(keyword))
}

function toContract(doc: CrmDocument): CustomerContract {
  const fileInfo = doc.fileInfo && typeof doc.fileInfo === 'object' && 'path' in doc.fileInfo ? doc.fileInfo : null
  return {
    id: doc.id,
    name: doc.name,
    documentId: doc.id,
    documentType: doc.documentType?.value || doc.documentType?.code,
    endDate: doc.expirationDate,
    createdAt: doc.createdAt,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    fileInfo
  }
}

/**
 * Fetches CrmDocument records typed as contracts (SalesDocumentType) for the
 * subject via the CRM GraphQL document API. Binaries are served by the file
 * service; the view downloads them with `handleDocumentClick` using `fileInfo`.
 *
 * NOTE: requires a contract `SalesDocumentType` to be configured for the tenant;
 * otherwise the list is correctly empty until backend types are seeded.
 */
export function useCustomerContracts(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerContract[]> {
  const context = useMemo<BusinessAppContextProps>(() => ({ accessToken }), [accessToken])
  const entityType = subject?.type ?? 'account'
  const { fetchDocuments } = useGetCrmDocuments(entityType, context)

  const [data, setData] = useState<CustomerContract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id

  useEffect(() => {
    if (!subjectId || !accessToken) {
      setData([])
      return
    }

    let cancelled = false
    const loadContracts = async () => {
      setLoading(true)
      setError(null)
      try {
        const documents = await fetchDocuments(subjectId)
        if (cancelled) return
        setData(documents.filter(isContractDocument).map(toContract))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load contracts')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContracts()
    return () => {
      cancelled = true
    }
  }, [accessToken, subjectId, fetchDocuments])

  return { data, loading, error }
}
