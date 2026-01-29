import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface JobCandidateByUserIdData {
  id: string
  firstName: string
  lastName: string
  displayName: string | null
  userId: string | null
  version: number
}

export interface JobCandidateByUserIdResponse {
  JobCandidate: JobCandidateByUserIdData[]
}

export interface UseJobCandidateByUserIdProps {
  accessToken: string
  userId?: string
}

export interface UseJobCandidateByUserIdReturn {
  jobCandidate: JobCandidateByUserIdData | null
  jobCandidateId: string | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const GET_JOB_CANDIDATE_BY_USER_ID = (userId: string): string => {
  return `
    query GetJobCandidateByUserId {
      JobCandidate(
        where: { 
          userId: { _eq: "${userId}" }
          isDeleted: { _eq: false }
        }
        limit: 1
      ) {
        id
        firstName
        lastName
        displayName
        userId
        version
      }
    }
  `
}

/**
 * Custom hook for fetching a JobCandidate by userId
 */
export const useJobCandidateByUserId = ({
  accessToken,
  userId
}: UseJobCandidateByUserIdProps): UseJobCandidateByUserIdReturn => {
  const [jobCandidate, setJobCandidate] = useState<JobCandidateByUserIdData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchJobCandidateByUserId = useCallback(
    async (targetUserId: string) => {
      if (!accessToken || !targetUserId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const query = GET_JOB_CANDIDATE_BY_USER_ID(targetUserId)
        const result = await graphqlClient.request<JobCandidateByUserIdResponse>(query)

        if (result.JobCandidate && result.JobCandidate.length > 0) {
          setJobCandidate(result.JobCandidate[0])
        } else {
          setJobCandidate(null)
        }
      } catch (err) {
        console.error('Error fetching job candidate by userId:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch job candidate')
        setJobCandidate(null)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (userId) {
      fetchJobCandidateByUserId(userId)
    }
  }, [userId, fetchJobCandidateByUserId])

  return {
    jobCandidate,
    jobCandidateId: jobCandidate?.id || null,
    loading,
    error,
    refetch: () => fetchJobCandidateByUserId(userId || '')
  }
}
