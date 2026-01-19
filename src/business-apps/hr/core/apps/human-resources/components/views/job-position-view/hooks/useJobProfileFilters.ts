'use client'

import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface JobProfileFilterOption {
  id: string
  name: string
}

const GET_JOB_PROFILES_QUERY = `
  query GetJobProfiles($search: String, $limit: Int, $offset: Int) {
    JobProfile(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { name: { _ilike: $search } }
        ]
      },
      limit: $limit,
      offset: $offset,
      orderBy: { name: ASC }
    ) {
      id
      name
    }
  }
`

/**
 * Custom hook to fetch job profiles for filter options
 * @param accessToken User access token
 * @param search Search string for filtering
 * @param offset Pagination offset
 */
export function useJobProfileFilters(
  accessToken: string,
  search: string = '',
  offset: number = 0,
  enabled: boolean = true
) {
  const [profiles, setProfiles] = useState<JobProfileFilterOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useGraphqlClient(accessToken)

  useEffect(() => {
    if (!enabled || !client) return

    setLoading(true)
    setError(null)

    const searchQuery = search ? `%${search}%` : '%'

    client
      .request(GET_JOB_PROFILES_QUERY, {
        search: searchQuery,
        limit: 5,
        offset
      })
      .then((response: any) => {
        const profilesData = response?.JobProfile || []
        const profileOptions = profilesData.map((profile: any) => ({
          id: profile.id,
          name: profile.name || ''
        }))

        setProfiles(profileOptions)
      })
      .catch((err: any) => {
        console.error('Error fetching job profiles:', err)
        setError(err)
        setProfiles([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [enabled, search, offset, client])

  return { profiles, loading, error }
}
