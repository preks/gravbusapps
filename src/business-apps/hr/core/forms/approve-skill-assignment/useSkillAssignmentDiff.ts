import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_SKILLS, GET_SKILLS_BY_IDS } from './approveSkillAssignment.queries'

export type SkillChangeType = 'new' | 'modified' | 'deleted' | 'new-to-create'

export interface SkillChange {
  type: SkillChangeType
  skillId?: string
  skillName: string
  oldLevel?: number
  newLevel?: number
}

interface SkillPayloadItem {
  id?: string | null
  version?: number | null
  skill: string
  level: number
}

interface UseSkillAssignmentDiffParams {
  employeeId?: string
  payloadSkills: SkillPayloadItem[]
  payloadNewSkills: { name: string }[]
  accessToken?: string
}

interface UseSkillAssignmentDiffResult {
  changes: SkillChange[]
  isLoading: boolean
}

export function useSkillAssignmentDiff({
  employeeId,
  payloadSkills,
  payloadNewSkills,
  accessToken
}: UseSkillAssignmentDiffParams): UseSkillAssignmentDiffResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [changes, setChanges] = useState<SkillChange[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const payloadKey = JSON.stringify({ payloadSkills, payloadNewSkills, employeeId })

  useEffect(() => {
    if (!graphqlClient || !employeeId) return

    let cancelled = false
    setIsLoading(true)

    const compute = async () => {
      try {
        // Fetch current employee skills (before state)
        const empRes = await graphqlClient.request<{
          employee: { skills: { id: string; level: number; skill: { id: string; name: string } }[] } | null
        }>(GET_EMPLOYEE_SKILLS, { id: employeeId })

        if (cancelled) return

        const currentSkills = empRes?.employee?.skills ?? []
        const currentMap = new Map(currentSkills.map(s => [s.skill.id, { name: s.skill.name, level: s.level }]))

        // Fetch names for new catalog assignments (id: null in payload)
        const newAssignmentIds = payloadSkills.filter(s => s.id == null).map(s => s.skill)
        const nameMap = new Map<string, string>()

        if (newAssignmentIds.length > 0) {
          const skillsRes = await graphqlClient.request<{ Skill: { id: string; name: string }[] }>(GET_SKILLS_BY_IDS, {
            ids: newAssignmentIds
          })
          if (cancelled) return
          for (const s of skillsRes?.Skill ?? []) {
            nameMap.set(s.id, s.name)
          }
        }

        const result: SkillChange[] = []

        // Payload skill IDs present (existing assignments kept or modified)
        const payloadExistingSkillIds = new Set(payloadSkills.filter(s => s.id != null).map(s => s.skill))

        // Deleted: in current employee but NOT in payload existing skills
        for (const current of currentSkills) {
          if (!payloadExistingSkillIds.has(current.skill.id)) {
            result.push({
              type: 'deleted',
              skillId: current.skill.id,
              skillName: current.skill.name,
              oldLevel: current.level
            })
          }
        }

        // Existing assignments in payload: check for level changes
        for (const item of payloadSkills.filter(s => s.id != null)) {
          const current = currentMap.get(item.skill)
          if (!current) continue
          if (current.level !== item.level) {
            result.push({
              type: 'modified',
              skillId: item.skill,
              skillName: current.name,
              oldLevel: current.level,
              newLevel: item.level
            })
          }
          // Unchanged → not included
        }

        // New assignments from catalog (id: null)
        for (const item of payloadSkills.filter(s => s.id == null)) {
          result.push({
            type: 'new',
            skillId: item.skill,
            skillName: nameMap.get(item.skill) ?? item.skill,
            newLevel: item.level
          })
        }

        // New skills to create (by name)
        for (const item of payloadNewSkills) {
          result.push({
            type: 'new-to-create',
            skillName: item.name
          })
        }

        if (!cancelled) setChanges(result)
      } catch {
        if (!cancelled) setChanges([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    compute()
    return () => {
      cancelled = true
    }
  }, [payloadKey, graphqlClient, employeeId])

  return { changes, isLoading }
}
