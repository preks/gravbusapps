import { useEffect, useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

const USED_TYPE_REFS_QUERY = `
  query GetUsedAbsenceTypeRefs {
    EmployeeAbsence(distinctOn: typeRef, where: { isDeleted: { _eq: false } }) {
      typeRef
    }
  }
`

/**
 * Returns the set of AbsenceType catalog IDs (e.g. "AbsenceType:v1:A001")
 * that are referenced by at least one non-deleted employee absence request.
 */
export const useAbsenceTypeUsage = (accessToken: string) => {
  const graphqlClient = useGraphqlClient(accessToken)
  const [usedTypeRefs, setUsedTypeRefs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const fetchUsedTypeRefs = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    try {
      const data = await graphqlClient.request(USED_TYPE_REFS_QUERY)
      const refs = (data?.EmployeeAbsence || []).map((item: { typeRef: string }) => item.typeRef)
      setUsedTypeRefs(new Set(refs))
    } catch (err) {
      console.error('Error fetching used absence type refs:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchUsedTypeRefs()
  }, [fetchUsedTypeRefs])

  return { usedTypeRefs, loading }
}
