import { useCallback, useEffect, useState } from 'react'
import type { OrgchartClient } from '@/common/network/orgchart/OrgchartClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

interface ActiveStructureResponse {
  structure?: { structureId?: string }
}

interface OrgchartStructureCompaniesResponse {
  nodes: Array<{
    type: string
    data?: {
      companyData?: Record<string, unknown>
    }
  }>
}

function normalizeCurrencyRef(currencyRef?: string | null): string | null {
  const trimmed = currencyRef?.trim()
  return trimmed ? trimmed : null
}

export function getUniqueStructureCurrencyRefs(currencyRefs: Array<string | null | undefined>): string[] {
  const normalizedRefs = currencyRefs.map(normalizeCurrencyRef).filter((ref): ref is string => ref != null)

  return [...new Set(normalizedRefs)]
}

function normalizeCompaniesResponse(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) {
    return response.filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
  }

  if (response && typeof response === 'object' && Array.isArray((response as { data?: unknown }).data)) {
    return (response as { data: unknown[] }).data.filter(
      (item): item is Record<string, unknown> => item != null && typeof item === 'object'
    )
  }

  return []
}

function extractCompanyCurrencyRef(company: Record<string, unknown>): string | null {
  const directRef = company.currencyRef ?? company.currency_ref
  if (typeof directRef === 'string') {
    return normalizeCurrencyRef(directRef)
  }

  const companyData = company.companyData
  if (companyData && typeof companyData === 'object') {
    const nestedRef = (companyData as Record<string, unknown>).currencyRef
    if (typeof nestedRef === 'string') {
      return normalizeCurrencyRef(nestedRef)
    }
  }

  const currency = company.currency
  if (currency && typeof currency === 'object') {
    const currencyObject = currency as Record<string, unknown>
    if (typeof currencyObject.id === 'string') {
      return normalizeCurrencyRef(currencyObject.id)
    }
    if (typeof currencyObject.code === 'string') {
      return normalizeCurrencyRef(`Currency:v1:${currencyObject.code}`)
    }
  }

  return null
}

async function resolveActiveStructureId(orgchartClient: OrgchartClient, accessToken: string): Promise<string | null> {
  const fromWindow = getCurrentActiveStructureId()
  if (fromWindow) {
    return fromWindow
  }

  const response = await orgchartClient.getStructuresActive<ActiveStructureResponse>(
    { isPlanningMode: false },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const structureId = response.structure?.structureId?.trim()
  return structureId || null
}

async function fetchCompanyCurrencyRefs(
  orgchartClient: OrgchartClient,
  accessToken: string,
  structureId: string
): Promise<Array<string | null | undefined>> {
  const companiesResponse = await orgchartClient.getCompanies(
    { structureId },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const companies = normalizeCompaniesResponse(companiesResponse)
  const currencyRefsFromCompanies = companies.map(extractCompanyCurrencyRef)

  if (currencyRefsFromCompanies.some(ref => ref != null)) {
    return currencyRefsFromCompanies
  }

  const structureResponse = await orgchartClient.getStructure<OrgchartStructureCompaniesResponse>(
    structureId,
    { nodeType: 'company' },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  return (structureResponse.nodes ?? [])
    .filter(node => node.type === 'company')
    .map(node => extractCompanyCurrencyRef(node.data?.companyData ?? {}))
}

export function useActiveStructureCurrencies(accessToken: string | undefined) {
  const orgchartClient = useOrgchartClient(accessToken)
  const [structureCurrencyRefs, setStructureCurrencyRefs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(accessToken))
  const [error, setError] = useState<string | null>(null)

  const fetchStructureCurrencies = useCallback(async () => {
    if (!accessToken) {
      setStructureCurrencyRefs([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const structureId = await resolveActiveStructureId(orgchartClient, accessToken)

      if (!structureId) {
        setStructureCurrencyRefs([])
        return
      }

      const currencyRefs = await fetchCompanyCurrencyRefs(orgchartClient, accessToken, structureId)
      setStructureCurrencyRefs(getUniqueStructureCurrencyRefs(currencyRefs))
    } catch (err) {
      console.error('Failed to load currencies from active structure:', err)
      setStructureCurrencyRefs([])
      setError(err instanceof Error ? err.message : 'Failed to load structure currencies')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, orgchartClient])

  useEffect(() => {
    void fetchStructureCurrencies()
  }, [fetchStructureCurrencies])

  return {
    structureCurrencyRefs,
    isLoading,
    error,
    refetch: fetchStructureCurrencies
  }
}
