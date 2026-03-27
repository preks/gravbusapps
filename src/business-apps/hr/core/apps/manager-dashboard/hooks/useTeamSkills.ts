import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface SkillGap {
  skillId: string
  skillName: string
  employeeName: string
  employeeId: string
  requiredLevel: number
  currentLevel: number | null
}

export interface SkillChange {
  skillName: string
  level: number
  changeType: 'added' | 'updated' | 'removed'
  changedAt: string
}

export interface SkillGrowthEntry {
  employeeId: string
  firstName: string
  lastName: string
  newSkillsCount: number
  updatedSkillsCount: number
  removedSkillsCount: number
  netChange: number
  recentChanges: SkillChange[]
}

export interface TeamMemberSkills {
  employeeId: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobPositionName?: string
  skillCount: number
  avgLevel: number
  missingRequired: Array<{ id: string; name: string }>
  belowLevel: Array<{ skillName: string; employeeLevel: number; profileLevel: number }>
  topSkills: Array<{ name: string; level: number }>
}

export interface TeamSkillsResult {
  members: TeamMemberSkills[]
  skillGrowth: SkillGrowthEntry[]
  teamSkillCoverage: number
  topSkillGaps: SkillGap[]
  topTeamStrengths: string[]
  loading: boolean
  error: Error | null
}

interface UseTeamSkillsProps {
  accessToken: string
  managerId: string
  /** When provided, scope skill growth to this period instead of the default 6-month window */
  periodStart?: string
  periodEnd?: string
}

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000

export const useTeamSkills = ({
  accessToken,
  managerId,
  periodStart,
  periodEnd
}: UseTeamSkillsProps): TeamSkillsResult => {
  const [members, setMembers] = useState<TeamMemberSkills[]>([])
  const [skillGrowth, setSkillGrowth] = useState<SkillGrowthEntry[]>([])
  const [teamSkillCoverage, setTeamSkillCoverage] = useState(0)
  const [topSkillGaps, setTopSkillGaps] = useState<SkillGap[]>([])
  const [topTeamStrengths, setTopTeamStrengths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchTeamSkills = useCallback(async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const directReportsQuery = `
        query GetDirectReportsWithSkills($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
          ) {
            id
            firstName
            lastName
            pictureThumbnail
            employeePosition {
              jobPosition {
                name
                jobProfile {
                  name
                  jobProfileSkills {
                    skill {
                      id
                      name
                    }
                    requiredLevel
                  }
                }
              }
            }
            skills(where: { isDeleted: { _eq: false } }) {
              id
              level
              skill {
                id
                name
              }
            }
            allSkills: skills {
              id
              level
              createdAt
              updatedAt
              isDeleted
              skill {
                id
                name
              }
            }
          }
        }
      `

      const response = await graphQLClient.request(directReportsQuery, { managerId })
      const employees = response?.Employee || []

      if (employees.length === 0) {
        setMembers([])
        setSkillGrowth([])
        setTeamSkillCoverage(0)
        setTopSkillGaps([])
        setTopTeamStrengths([])
        setLoading(false)
        return
      }

      let totalRequiredSkills = 0
      let totalCoveredSkills = 0
      const allGaps: SkillGap[] = []
      const skillFrequency = new Map<string, { name: string; totalLevel: number; count: number }>()

      const memberData: TeamMemberSkills[] = employees.map((emp: any) => {
        const skills = emp.skills || []
        const position = emp.employeePosition?.[0]
        const jobProfile = position?.jobPosition?.jobProfile
        const profileSkills = jobProfile?.jobProfileSkills || []
        const jobPositionName = position?.jobPosition?.name || ''

        const employeeSkillMap = new Map<string, number>()
        skills.forEach((s: any) => {
          const level = s.level != null ? Number(s.level) : 0
          employeeSkillMap.set(s.skill?.id ?? '', level)
        })

        const missingRequired: Array<{ id: string; name: string }> = []
        const belowLevel: Array<{ skillName: string; employeeLevel: number; profileLevel: number }> = []

        profileSkills.forEach((ps: any) => {
          const skillId = ps.skill?.id
          const skillName = ps.skill?.name ?? ''
          if (!skillId) return

          totalRequiredSkills++
          const empLevel = employeeSkillMap.get(skillId)

          if (empLevel == null) {
            missingRequired.push({ id: skillId, name: skillName })
            allGaps.push({
              skillId,
              skillName,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              employeeId: emp.id,
              requiredLevel: ps.requiredLevel ?? 0,
              currentLevel: null
            })
          } else {
            totalCoveredSkills++
            const required = ps.requiredLevel != null ? Number(ps.requiredLevel) : null
            if (required != null && empLevel < required) {
              belowLevel.push({
                skillName,
                employeeLevel: empLevel,
                profileLevel: required
              })
              allGaps.push({
                skillId,
                skillName,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                employeeId: emp.id,
                requiredLevel: required,
                currentLevel: empLevel
              })
            }
          }
        })

        skills.forEach((s: any) => {
          const level = s.level != null ? Number(s.level) : 0
          const name = s.skill?.name ?? ''
          if (!name) return
          const existing = skillFrequency.get(name)
          if (existing) {
            existing.totalLevel += level
            existing.count++
          } else {
            skillFrequency.set(name, { name, totalLevel: level, count: 1 })
          }
        })

        const leveledSkills = skills.filter((s: any) => s.level != null && Number(s.level) > 0)
        const avgLevel =
          leveledSkills.length > 0
            ? Math.round(
                (leveledSkills.reduce((sum: number, s: any) => sum + Number(s.level), 0) / leveledSkills.length) * 10
              ) / 10
            : 0

        const topSkills = [...leveledSkills]
          .sort((a: any, b: any) => Number(b.level) - Number(a.level))
          .slice(0, 3)
          .map((s: any) => ({ name: s.skill?.name ?? '', level: Number(s.level) }))

        return {
          employeeId: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          pictureThumbnail: emp.pictureThumbnail,
          jobPositionName,
          skillCount: skills.length,
          avgLevel,
          missingRequired,
          belowLevel,
          topSkills
        }
      })

      const coverage = totalRequiredSkills > 0 ? Math.round((totalCoveredSkills / totalRequiredSkills) * 100) : 100

      const sortedGaps = allGaps
        .sort((a, b) => {
          if (a.currentLevel === null && b.currentLevel !== null) return -1
          if (a.currentLevel !== null && b.currentLevel === null) return 1
          return b.requiredLevel - (b.currentLevel ?? 0) - (a.requiredLevel - (a.currentLevel ?? 0))
        })
        .slice(0, 10)

      const strengths = [...skillFrequency.values()]
        .filter(s => s.count >= 2)
        .sort((a, b) => {
          const avgA = a.totalLevel / a.count
          const avgB = b.totalLevel / b.count
          return avgB - avgA
        })
        .slice(0, 5)
        .map(s => s.name)

      const cutoff = periodStart ? new Date(periodStart) : new Date(Date.now() - SIX_MONTHS_MS)
      const periodEndDate = periodEnd ? new Date(periodEnd) : null
      const growthData: SkillGrowthEntry[] = employees
        .map((emp: any) => {
          const allSkills: any[] = emp.allSkills || []
          let newCount = 0
          let updatedCount = 0
          let removedCount = 0
          const recentChanges: SkillChange[] = []

          for (const s of allSkills) {
            const name = s.skill?.name ?? 'Unknown'
            const level = s.level != null ? Number(s.level) : 0
            const created = s.createdAt ? new Date(s.createdAt) : null
            const updated = s.updatedAt ? new Date(s.updatedAt) : null
            const deleted = s.isDeleted === true

            const isInRange = (d: Date) => d >= cutoff && (!periodEndDate || d <= periodEndDate)

            if (deleted && updated && isInRange(updated)) {
              removedCount++
              recentChanges.push({ skillName: name, level, changeType: 'removed', changedAt: s.updatedAt })
            } else if (!deleted && created && isInRange(created)) {
              newCount++
              recentChanges.push({ skillName: name, level, changeType: 'added', changedAt: s.createdAt })
            } else if (
              !deleted &&
              updated &&
              created &&
              updated.getTime() - created.getTime() > 60_000 &&
              isInRange(updated)
            ) {
              updatedCount++
              recentChanges.push({ skillName: name, level, changeType: 'updated', changedAt: s.updatedAt })
            }
          }

          recentChanges.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())

          return {
            employeeId: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            newSkillsCount: newCount,
            updatedSkillsCount: updatedCount,
            removedSkillsCount: removedCount,
            netChange: newCount - removedCount,
            recentChanges
          }
        })
        .filter((e: SkillGrowthEntry) => e.recentChanges.length > 0)
        .sort((a: SkillGrowthEntry, b: SkillGrowthEntry) => b.recentChanges.length - a.recentChanges.length)

      setMembers(memberData)
      setSkillGrowth(growthData)
      setTeamSkillCoverage(coverage)
      setTopSkillGaps(sortedGaps)
      setTopTeamStrengths(strengths)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team skills'))
      console.error('Error fetching team skills:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, graphQLClient, periodStart, periodEnd])

  useEffect(() => {
    fetchTeamSkills()
  }, [fetchTeamSkills])

  return {
    members,
    skillGrowth,
    teamSkillCoverage,
    topSkillGaps,
    topTeamStrengths,
    loading,
    error
  }
}
