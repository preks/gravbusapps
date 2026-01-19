import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// GraphQL query to fetch the number of job profiles with the same job function name
const GET_JOB_FUNCTION_PROFILES_COUNT = /*sql*/ `
  query GetJobFunctionProfilesCount($jobFunctionName: String!) {
    JobProfileAggregate(
      where: {
        isDeleted: { _eq: false },
        jobFunction: { name: { _eq: $jobFunctionName }}
      }
    ) {
      aggregate {
        count
      }
    }
    JobProfile(
      where: {
        isDeleted: { _eq: false },
        jobFunction: { name: { _eq: $jobFunctionName }}
      },
      limit: 50
    ) {
      id
      name
      code
    }
  }
`

// Response type for the job profiles count query
interface JobFunctionProfilesCountResponse {
  JobProfileAggregate: {
    aggregate: {
      count: number
    }
  }
  JobProfile: Array<{
    id: string
    name: string
    code: string
  }>
}

interface UseJobFunctionProfilesCountResult {
  profilesCount: number | null
  profileExamples: Array<{ id: string; name: string; code: string }>
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch the count of job profiles associated with a specific job function name
 * @param accessToken The access token for authentication
 * @param jobFunctionName The name of the job function to count profiles for
 * @returns Object containing the count, loading state, error state, and refetch function
 */
export const useJobFunctionProfilesCount = (
  accessToken: string,
  jobFunctionName: string
): UseJobFunctionProfilesCountResult => {
  const [profilesCount, setProfilesCount] = useState<number | null>(null)
  const [profileExamples, setProfileExamples] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)

  // Function to fetch the job profiles count
  const fetchProfilesCount = async () => {
    if (!jobFunctionName) {
      setProfilesCount(0)
      setProfileExamples([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Execute the GraphQL query
      const response = await graphqlClient.request<JobFunctionProfilesCountResponse>(GET_JOB_FUNCTION_PROFILES_COUNT, {
        jobFunctionName
      })

      // Extract the profiles count and examples from the response
      const count = response.JobProfileAggregate?.aggregate?.count ?? 0
      const examples = response.JobProfile || []

      setProfilesCount(count)
      setProfileExamples(examples)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job function profiles count'))
      console.error('Error fetching job function profiles count:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch profiles count when dependencies change
  useEffect(() => {
    if (jobFunctionName) {
      fetchProfilesCount()
    } else {
      setProfilesCount(null)
      setProfileExamples([])
      setLoading(false)
      setError(null)
    }
  }, [accessToken, jobFunctionName])

  return {
    profilesCount,
    profileExamples,
    loading,
    error,
    refetch: fetchProfilesCount
  }
}
