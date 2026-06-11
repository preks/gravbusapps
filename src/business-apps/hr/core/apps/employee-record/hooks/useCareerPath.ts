import { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface CareerLadderStep {
  jobLevelId: string
  jobLevelName: string
  jobLevelCode: string
  hierarchyOrder: number
  hasProfile: boolean
  jobProfileId?: string
  jobProfileName?: string
  jobProfileSkills: Array<{
    requiredLevel: number | null
    skill: { id: string; name: string }
  }>
  promotionCriteria: string[]
}

export interface CareerPathData {
  ladder: CareerLadderStep[]
  currentStepIndex: number
  currentStep: CareerLadderStep | null
  nextStep: CareerLadderStep | null
  isDataAvailable: boolean
}

interface UseCareerPathParams {
  accessToken: string
  jobFunctionId: string | undefined
  currentJobLevelId: string | undefined
}

const GET_CAREER_LADDER = `
  query GetCareerLadder($jobFunctionId: uuid!) {
    JobLevel(
      where: { isDeleted: { _eq: false } }
      orderBy: { hierarchyOrder: ASC }
    ) {
      id
      name
      code
      hierarchyOrder
    }
    JobProfile(
      where: { jobFunctionId: { _eq: $jobFunctionId }, isDeleted: { _eq: false } }
      orderBy: { jobLevel: { hierarchyOrder: ASC } }
    ) {
      id
      name
      additionalProperties
      jobLevel {
        id
        name
        code
        hierarchyOrder
      }
      jobProfileSkills(where: { isDeleted: { _eq: false } }) {
        requiredLevel
        skill {
          id
          name
        }
      }
    }
  }
`

interface CareerLadderResponse {
  JobLevel: Array<{
    id: string
    name: string
    code: string
    hierarchyOrder: number
  }>
  JobProfile: Array<{
    id: string
    name: string
    additionalProperties?: { promotionCriteria?: string[] } | null
    jobLevel: { id: string; name: string; code: string; hierarchyOrder: number } | null
    jobProfileSkills: Array<{
      requiredLevel: number | null
      skill: { id: string; name: string }
    }>
  }>
}

export function useCareerPath({ accessToken, jobFunctionId, currentJobLevelId }: UseCareerPathParams) {
  const client = useGraphQLClient(accessToken)
  const clientRef = useRef(client)
  clientRef.current = client

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [careerPath, setCareerPath] = useState<CareerPathData>({
    ladder: [],
    currentStepIndex: -1,
    currentStep: null,
    nextStep: null,
    isDataAvailable: false
  })

  const fetchCareerLadder = useCallback(async () => {
    if (!jobFunctionId || !currentJobLevelId) {
      setCareerPath({
        ladder: [],
        currentStepIndex: -1,
        currentStep: null,
        nextStep: null,
        isDataAvailable: false
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await clientRef.current.request<CareerLadderResponse>(GET_CAREER_LADDER, { jobFunctionId })

      const profileByLevelId = new Map<string, CareerLadderResponse['JobProfile'][number]>()
      for (const profile of result.JobProfile) {
        if (profile.jobLevel && !profileByLevelId.has(profile.jobLevel.id)) {
          profileByLevelId.set(profile.jobLevel.id, profile)
        }
      }

      const ladder: CareerLadderStep[] = result.JobLevel.map(level => {
        const profile = profileByLevelId.get(level.id)
        return {
          jobLevelId: level.id,
          jobLevelName: level.name,
          jobLevelCode: level.code,
          hierarchyOrder: level.hierarchyOrder,
          hasProfile: !!profile,
          jobProfileId: profile?.id,
          jobProfileName: profile?.name,
          jobProfileSkills: profile?.jobProfileSkills.filter(s => s.skill !== null) ?? [],
          promotionCriteria: profile?.additionalProperties?.promotionCriteria ?? []
        }
      })

      const currentStepIndex = ladder.findIndex(step => step.jobLevelId === currentJobLevelId)
      const currentStep = currentStepIndex >= 0 ? ladder[currentStepIndex] : null

      let nextStep: CareerLadderStep | null = null
      if (currentStepIndex >= 0) {
        for (let i = currentStepIndex + 1; i < ladder.length; i++) {
          if (ladder[i].hasProfile) {
            nextStep = ladder[i]
            break
          }
        }
      }

      setCareerPath({
        ladder,
        currentStepIndex,
        currentStep,
        nextStep,
        isDataAvailable: ladder.length > 1
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch career ladder'))
      setCareerPath({
        ladder: [],
        currentStepIndex: -1,
        currentStep: null,
        nextStep: null,
        isDataAvailable: false
      })
    } finally {
      setLoading(false)
    }
  }, [jobFunctionId, currentJobLevelId])

  useEffect(() => {
    fetchCareerLadder()
  }, [fetchCareerLadder])

  return { ...careerPath, loading, error }
}
