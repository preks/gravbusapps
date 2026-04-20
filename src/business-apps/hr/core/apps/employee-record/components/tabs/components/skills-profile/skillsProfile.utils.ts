import { Employee } from '../../../../hooks/useEmployeeData'

/**
 * Status and pending approval are derived from the employee_skill fields returned
 * by GET_EMPLOYEE_DATA (useEmployeeData.ts). The GraphQL selection must request:
 * recordState, processInstanceId, verificationDocumentId, verificationDocument{id}, validFrom, validTo.
 * Visibility (acl) is optional; when present it is shown in the UI.
 */
export const AGING_SKILL_DAYS_THRESHOLD = 180

export type EmployeeSkillItem = Employee['skills'][number]

export type SkillStatusFilter = 'all' | 'verified' | 'unverified' | 'pending' | 'inactive'
export type SkillLevelFilter = 'all' | '1-3' | '4-6' | '7-10' | 'unset'
export type SkillSortOption = 'level-desc' | 'updated-desc' | 'verified-first'

export interface SkillDistribution {
  label: string
  key: string
  count: number
}

export interface SkillSnapshotData {
  strengthScore: number
  leveledSkillCount: number
  topSkills: EmployeeSkillItem[]
  verifiedCount: number
  activeCount: number
}

export const parseSkillLevel = (level: string | number | null | undefined): number | null => {
  if (level === null || level === undefined || level === '') return null
  const numeric = typeof level === 'number' ? level : Number.parseInt(level, 10)
  return Number.isNaN(numeric) ? null : numeric
}

export const isSkillVerified = (skill: EmployeeSkillItem): boolean => {
  const relationId = skill.verificationDocument?.id
  if (typeof relationId === 'string') {
    return relationId.trim().length > 0
  }

  if (skill.verificationDocument === null) {
    return false
  }

  return Boolean(skill.verificationDocumentId)
}

export const isSkillActive = (skill: EmployeeSkillItem, now = new Date()): boolean => {
  if (!skill.validTo) return true
  const validToDate = new Date(skill.validTo)
  if (Number.isNaN(validToDate.getTime())) return true
  return validToDate > now
}

const APPROVED_RECORD_STATES = new Set(['APPROVED', 'ACTIVE', 'COMPLETED'])

export const isSkillPending = (skill: EmployeeSkillItem): boolean => {
  if (!skill.processInstanceId) return false
  const state = String(skill.recordState || '').toUpperCase()
  return !APPROVED_RECORD_STATES.has(state)
}

export const getVisibilityLabel = (acl: unknown): string => {
  if (!acl) return 'Private'
  if (typeof acl === 'string') return acl
  if (typeof acl === 'object') {
    const typedAcl = acl as { scope?: string; visibility?: string; accessScope?: string }
    return typedAcl.scope || typedAcl.visibility || typedAcl.accessScope || 'Private'
  }
  return 'Private'
}

export const getSkillsSnapshotData = (skills: EmployeeSkillItem[]): SkillSnapshotData => {
  const validSkills = skills.filter(skill => !skill.isDeleted)
  const leveledSkills = validSkills.filter(skill => parseSkillLevel(skill.level) !== null)
  const averageLevel =
    leveledSkills.length === 0
      ? 0
      : leveledSkills.reduce((sum, skill) => sum + (parseSkillLevel(skill.level) || 0), 0) / leveledSkills.length

  // Skill levels in this experience are 1-10; convert average to 0-100.
  const strengthScore = Math.max(0, Math.min(100, Math.round((averageLevel / 10) * 100)))

  const topSkills = [...leveledSkills]
    .sort((a, b) => (parseSkillLevel(b.level) || 0) - (parseSkillLevel(a.level) || 0))
    .slice(0, 3)

  const verifiedCount = validSkills.filter(isSkillVerified).length
  const activeCount = validSkills.filter(skill => isSkillActive(skill)).length

  return {
    strengthScore,
    leveledSkillCount: leveledSkills.length,
    topSkills,
    verifiedCount,
    activeCount
  }
}

export const getSkillDistribution = (skills: EmployeeSkillItem[]): SkillDistribution[] => {
  const distribution: SkillDistribution[] = [
    ...Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), key: String(i + 1), count: 0 })),
    { label: 'No level', key: 'unset', count: 0 }
  ]

  skills
    .filter(skill => !skill.isDeleted)
    .forEach(skill => {
      const level = parseSkillLevel(skill.level)
      if (level === null || level < 1 || level > 10) {
        distribution[10].count += 1
        return
      }
      distribution[level - 1].count += 1
    })

  return distribution
}

export const getAgingSkillCount = (skills: EmployeeSkillItem[], thresholdDays = AGING_SKILL_DAYS_THRESHOLD): number => {
  const now = Date.now()
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000

  return skills
    .filter(skill => !skill.isDeleted)
    .filter(skill => {
      const sourceDate = skill.updatedAt || skill.skill.updatedAt
      if (!sourceDate) return false
      const timestamp = new Date(sourceDate).getTime()
      if (Number.isNaN(timestamp)) return false
      return now - timestamp > thresholdMs
    }).length
}

/** Job profile gap: missing skills from profile and optionally skills where employee level is below profile level. */
export interface JobProfileGap {
  jobProfileName: string
  missingSkills: Array<{ id: string; name: string }>
  belowLevelSkills: Array<{ skillName: string; employeeLevel: number; profileLevel: number }>
}

export const getJobProfileGap = (args: {
  employeeSkills: EmployeeSkillItem[]
  jobProfile?: {
    name: string
    jobProfileSkills?: Array<{ skill: { id: string; name: string }; requiredLevel?: number | null }>
  } | null
}): JobProfileGap | null => {
  const { employeeSkills, jobProfile } = args
  if (!jobProfile?.name) return null
  const profileSkills = jobProfile.jobProfileSkills ?? []
  if (profileSkills.length === 0) return null

  const employeeSkillMap = new Map<string, { level: number }>()
  employeeSkills
    .filter(s => !s.isDeleted)
    .forEach(s => {
      const level = parseSkillLevel(s.level)
      employeeSkillMap.set(s.skill?.id ?? '', { level: level ?? 0 })
    })

  const missingSkills: Array<{ id: string; name: string }> = []
  const belowLevelSkills: Array<{ skillName: string; employeeLevel: number; profileLevel: number }> = []

  profileSkills.forEach(ps => {
    const skillId = ps.skill?.id
    const skillName = ps.skill?.name ?? ''
    if (skillId != null) {
      const emp = employeeSkillMap.get(skillId)
      if (emp == null) {
        missingSkills.push({ id: skillId, name: skillName })
      } else {
        const requiredLevel = ps.requiredLevel != null ? Number(ps.requiredLevel) : null
        if (requiredLevel != null && emp.level < requiredLevel) {
          belowLevelSkills.push({
            skillName,
            employeeLevel: emp.level,
            profileLevel: requiredLevel
          })
        }
      }
    }
  })

  return {
    jobProfileName: jobProfile.name,
    missingSkills,
    belowLevelSkills
  }
}

export const applySkillsFiltersAndSort = (args: {
  skills: EmployeeSkillItem[]
  searchTerm: string
  categoryFilter: string
  statusFilter: SkillStatusFilter
  levelFilter: SkillLevelFilter
  sortBy: SkillSortOption
  getCategory: (additionalProperties: unknown) => string
}): EmployeeSkillItem[] => {
  const { skills, searchTerm, categoryFilter, statusFilter, levelFilter, sortBy, getCategory } = args
  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filtered = skills
    .filter(skill => !skill.isDeleted)
    .filter(skill => {
      if (!normalizedSearch) return true
      return skill.skill.name.toLowerCase().includes(normalizedSearch)
    })
    .filter(skill => {
      if (categoryFilter === 'all') return true
      const category = getCategory(skill.skill.additionalProperties)
      return category === categoryFilter
    })
    .filter(skill => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'verified') return isSkillVerified(skill)
      if (statusFilter === 'unverified') return !isSkillVerified(skill)
      if (statusFilter === 'pending') return isSkillPending(skill)
      if (statusFilter === 'inactive') return !isSkillActive(skill)
      return true
    })
    .filter(skill => {
      if (levelFilter === 'all') return true
      const level = parseSkillLevel(skill.level)
      if (levelFilter === 'unset') return level === null
      if (level === null) return false
      if (levelFilter === '1-3') return level >= 1 && level <= 3
      if (levelFilter === '4-6') return level >= 4 && level <= 6
      if (levelFilter === '7-10') return level >= 7 && level <= 10
      return true
    })

  return filtered.sort((a, b) => {
    if (sortBy === 'verified-first') {
      const verifiedDiff = Number(isSkillVerified(b)) - Number(isSkillVerified(a))
      if (verifiedDiff !== 0) return verifiedDiff
      return (parseSkillLevel(b.level) || 0) - (parseSkillLevel(a.level) || 0)
    }

    if (sortBy === 'updated-desc') {
      const aDate = new Date(a.updatedAt || a.skill.updatedAt || 0).getTime()
      const bDate = new Date(b.updatedAt || b.skill.updatedAt || 0).getTime()
      return bDate - aDate
    }

    return (parseSkillLevel(b.level) || 0) - (parseSkillLevel(a.level) || 0)
  })
}
