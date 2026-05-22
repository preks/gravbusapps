import { useState, useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver'
import { GET_EMPLOYEE_SKILLS_FOR_MERGE, GET_SKILL_VERSION } from '../services/SkillManagementQueries'
import type { MergeProposal } from './useSkillDeduplication'

interface EmployeeSkillForMerge {
  id: string
  version?: number | null
  level?: number | null
  employeeSkillStatus?: string | null
  employee: { id: string }
}

function resolveEmployeeSkillVersion(skill: EmployeeSkillForMerge): number {
  if (typeof skill.version === 'number') {
    return skill.version
  }
  return 0
}

function resolveSkillVersion(version?: number | null): number {
  if (typeof version === 'number') {
    return version
  }
  return 0
}

export interface MergeProgress {
  current: number
  total: number
  currentSkillName: string
  phase: 'fetching' | 'reassigning' | 'deleting' | 'done'
}

interface ApprovedProposalEntry {
  proposal: MergeProposal
  index: number
}

type ProposalUpdateFn = (index: number, status: MergeProposal['status'], error?: string) => void

function getApprovedProposals(proposals: MergeProposal[]): ApprovedProposalEntry[] {
  return proposals
    .map((proposal, index) => ({ proposal, index }))
    .filter(({ proposal }) => proposal.status === 'approved')
}

function splitConflicts(
  duplicateSkills: EmployeeSkillForMerge[],
  targetSkills: EmployeeSkillForMerge[]
): { conflicts: EmployeeSkillForMerge[]; nonConflicts: EmployeeSkillForMerge[] } {
  const targetEmployeeIds = new Set(targetSkills.map(employeeSkill => employeeSkill.employee.id))
  const conflicts = duplicateSkills.filter(employeeSkill => targetEmployeeIds.has(employeeSkill.employee.id))
  const nonConflicts = duplicateSkills.filter(employeeSkill => !targetEmployeeIds.has(employeeSkill.employee.id))
  return { conflicts, nonConflicts }
}

function buildMergeErrorMessage(duplicateName: string, targetName: string, error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  return `Failed to merge "${duplicateName}" -> "${targetName}": ${errorMessage}`
}

export function useSkillMerge(accessToken: string) {
  const restClient = useRestClient(EMPLOYEES_API_URL)
  const graphqlClient = useGraphqlClient(accessToken)
  const [isExecuting, setIsExecuting] = useState(false)
  const [progress, setProgress] = useState<MergeProgress | null>(null)
  const [mergeErrors, setMergeErrors] = useState<string[]>([])

  const getHeaders = useCallback(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])

  const executeMerge = useCallback(
    async (proposals: MergeProposal[], onProposalUpdate: ProposalUpdateFn) => {
      const approvedProposals = getApprovedProposals(proposals)
      if (approvedProposals.length === 0) return

      const headers = { headers: getHeaders() }
      const errors: string[] = []
      setIsExecuting(true)
      setMergeErrors([])

      try {
        for (let approvedIndex = 0; approvedIndex < approvedProposals.length; approvedIndex++) {
          const { proposal, index } = approvedProposals[approvedIndex]
          let proposalHasError = false
          let latestProposalError: string | undefined

          for (const duplicate of proposal.duplicates) {
            setProgress({
              current: approvedIndex + 1,
              total: approvedProposals.length,
              currentSkillName: duplicate.name,
              phase: 'fetching'
            })

            try {
              const [duplicateResult, targetResult] = await Promise.all([
                graphqlClient.request(GET_EMPLOYEE_SKILLS_FOR_MERGE, { skillId: duplicate.id }),
                graphqlClient.request(GET_EMPLOYEE_SKILLS_FOR_MERGE, { skillId: proposal.targetSkill.id })
              ])

              const duplicateSkills: EmployeeSkillForMerge[] = duplicateResult?.employeeSkills ?? []
              const targetSkills: EmployeeSkillForMerge[] = targetResult?.employeeSkills ?? []
              const { conflicts, nonConflicts } = splitConflicts(duplicateSkills, targetSkills)

              setProgress(previousProgress =>
                previousProgress ? { ...previousProgress, phase: 'reassigning' } : previousProgress
              )

              for (const employeeSkill of nonConflicts) {
                const employeeSkillVersion = resolveEmployeeSkillVersion(employeeSkill)
                await restClient.post(
                  '/saveEmployeeSkill',
                  {
                    changeMode: 'UPDATE',
                    employeeSkill: {
                      id: employeeSkill.id,
                      version: employeeSkillVersion,
                      skill: proposal.targetSkill.id,
                      employeeId: employeeSkill.employee.id,
                      level: employeeSkill.level,
                      employeeSkillStatus: employeeSkill.employeeSkillStatus
                    }
                  },
                  headers
                )
              }

              for (const employeeSkill of conflicts) {
                const employeeSkillVersion = resolveEmployeeSkillVersion(employeeSkill)
                await restClient.post(
                  '/saveEmployeeSkill',
                  {
                    changeMode: 'DELETE',
                    employeeSkill: {
                      id: employeeSkill.id,
                      version: employeeSkillVersion,
                      skill: duplicate.id,
                      employeeId: employeeSkill.employee.id,
                      level: employeeSkill.level,
                      employeeSkillStatus: employeeSkill.employeeSkillStatus
                    }
                  },
                  headers
                )
              }

              setProgress(previousProgress =>
                previousProgress ? { ...previousProgress, phase: 'deleting' } : previousProgress
              )

              const skillVersionResult = await graphqlClient.request(GET_SKILL_VERSION, { skillId: duplicate.id })
              const skillVersion = resolveSkillVersion(skillVersionResult?.skill?.version)

              await restClient.post(
                '/saveSkill',
                { changeMode: 'DELETE', skill: { id: duplicate.id, version: skillVersion } },
                headers
              )
            } catch (error) {
              proposalHasError = true
              latestProposalError = buildMergeErrorMessage(duplicate.name, proposal.targetSkill.name, error)
              errors.push(latestProposalError)
            }
          }

          onProposalUpdate(index, proposalHasError ? 'error' : 'merged', latestProposalError)
        }

        setProgress({
          current: approvedProposals.length,
          total: approvedProposals.length,
          currentSkillName: '',
          phase: 'done'
        })
        setMergeErrors(errors)
      } finally {
        setIsExecuting(false)
      }
    },
    [graphqlClient, restClient, getHeaders]
  )

  const reset = useCallback(() => {
    setProgress(null)
    setMergeErrors([])
    setIsExecuting(false)
  }, [])

  return {
    executeMerge,
    isExecuting,
    progress,
    mergeErrors,
    reset
  }
}
