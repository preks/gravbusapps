import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface JobPositionData {
  id: string
  name: string
  version: number
  jobProfile?: {
    id: string
    name: string
  }
  jobFunction?: {
    id: string
    name: string
    jobFamily?: {
      id: string
      value: string
    }
  }
  jobLevel?: {
    id: string
    name: string
    jobLevelGroup?: {
      id: string
      value: string
    }
  }
  contractType?: {
    id: string
    value: string
  }
  employmentType?: {
    id: string
    value: string
  }
  organizationalUnitEmployees?: Array<{
    organizationalUnit: {
      id: string
      name: string
    }
  }>
}

export interface JobPositionQueryVariables {
  jobPositionId: string
}

export const GET_JOB_POSITION_BY_ID = `
  query GetJobPositionById($jobPositionId: uuid!) {
    JobPosition(where: { id: { _eq: $jobPositionId }, isDeleted: { _eq: false } }, limit: 1) {
      id
      name
      version
      jobProfile {
        id
        name
      }
      jobFunction {
        id
        name
        jobFamily {
          id
          value
        }
      }
      jobLevel {
        id
        name
        jobLevelGroup {
          id
          value
        }
      }
      contractType {
        id
        value
      }
      employmentType {
        id
        value
      }
      organizationalUnitEmployees {
        organizationalUnit {
          id
          name
        }
      }
    }
  }
`

export const useGetJobPositionById = (accessToken: string) => {
  const graphqlClient = useGraphqlClient(accessToken)

  const fetchJobPosition = async (jobPositionId: string): Promise<JobPositionData | null> => {
    try {
      const result = await graphqlClient.request<{ JobPosition: JobPositionData[] }>(GET_JOB_POSITION_BY_ID, {
        jobPositionId
      })
      return result.JobPosition?.[0] || null
    } catch (error) {
      console.error('Error fetching job position:', error)
      throw error
    }
  }

  return { fetchJobPosition }
}
