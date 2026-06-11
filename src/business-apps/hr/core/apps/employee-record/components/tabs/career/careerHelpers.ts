import type { CareerLadderStep } from '../../../hooks/useCareerPath'

export interface SkillGapItem {
  skillId: string
  skillName: string
  employeeLevel: number
  requiredLevel: number
  gap: number
  isMissing: boolean
}

export interface EmployeeSkillInput {
  id: string
  level: string | number | null
  isDeleted: boolean
  skill: { id: string; name: string }
}

/**
 * Calculate months between a start date and now.
 * Returns null if the input is invalid.
 */
export function calculateMonthsSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const start = new Date(dateStr)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  return Math.max(0, months)
}

/**
 * Format months as a human-readable duration string.
 * e.g. 14 -> "1y 2m", 3 -> "3m", 0 -> "< 1m"
 */
export function formatDuration(months: number | null): string {
  if (months === null) return '—'
  if (months === 0) return '< 1m'
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${remainingMonths}m`
  if (remainingMonths === 0) return `${years}y`
  return `${years}y ${remainingMonths}m`
}

/**
 * Resolve the next career level from the ladder.
 * Does not assume currentLevel + 1; uses the configured ladder order.
 */
export function resolveNextLevel(ladder: CareerLadderStep[], currentStepIndex: number): CareerLadderStep | null {
  if (currentStepIndex < 0 || currentStepIndex >= ladder.length - 1) return null
  return ladder[currentStepIndex + 1] ?? null
}

function parseSkillLevel(level: string | number | null): number {
  if (level == null) return 0
  if (typeof level === 'number') return Number.isNaN(level) ? 0 : level
  const parsed = Number.parseInt(level, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Compute skill gap items between employee actual skills and required profile skills.
 * Returns items sorted descending by gap.
 */
export function computeSkillGap(
  employeeSkills: EmployeeSkillInput[],
  requiredSkills: CareerLadderStep['jobProfileSkills']
): SkillGapItem[] {
  const employeeSkillMap = new Map<string, number>()
  employeeSkills
    .filter(s => !s.isDeleted)
    .forEach(s => {
      const level = parseSkillLevel(s.level)
      employeeSkillMap.set(s.skill.id, level)
    })

  return requiredSkills
    .filter(ps => ps.skill != null && ps.requiredLevel != null)
    .map(ps => {
      const empLevel = employeeSkillMap.get(ps.skill.id) ?? 0
      const gap = (ps.requiredLevel ?? 0) - empLevel
      return {
        skillId: ps.skill.id,
        skillName: ps.skill.name,
        employeeLevel: empLevel,
        requiredLevel: ps.requiredLevel!,
        gap: Math.max(0, gap),
        isMissing: !employeeSkillMap.has(ps.skill.id)
      }
    })
    .sort((a, b) => b.gap - a.gap)
}

/**
 * Generate a recommendation message from the top N gaps.
 * Only uses real gap labels from the skill data.
 */
export function generateRecommendationBanner(skillGap: SkillGapItem[], maxItems = 3): string | null {
  const topGaps = skillGap.filter(s => s.gap > 0).slice(0, maxItems)
  if (topGaps.length === 0) return null
  const labels = topGaps.map(s => s.skillName)
  if (labels.length === 1) return `Focus on ${labels[0]} to improve promotion readiness.`
  const last = labels.pop()
  return `Focus on ${labels.join(', ')}, and ${last} to improve promotion readiness.`
}
