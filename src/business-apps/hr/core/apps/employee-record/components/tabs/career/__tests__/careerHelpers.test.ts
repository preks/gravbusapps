import { describe, it, expect } from 'vitest'
import {
  calculateMonthsSince,
  formatDuration,
  resolveNextLevel,
  computeSkillGap,
  generateRecommendationBanner
} from '../careerHelpers'
import type { CareerLadderStep } from '../../../../hooks/useCareerPath'

describe('calculateMonthsSince', () => {
  it('returns null for null/undefined input', () => {
    expect(calculateMonthsSince(null)).toBeNull()
    expect(calculateMonthsSince(undefined)).toBeNull()
  })

  it('returns null for invalid date string', () => {
    expect(calculateMonthsSince('not-a-date')).toBeNull()
  })

  it('returns 0 for a date in the current month', () => {
    const now = new Date()
    const result = calculateMonthsSince(now.toISOString())
    expect(result).toBe(0)
  })

  it('calculates months correctly for a past date', () => {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const result = calculateMonthsSince(twoYearsAgo.toISOString())
    expect(result).toBe(24)
  })

  it('returns 0 for future dates (clamped)', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const result = calculateMonthsSince(future.toISOString())
    expect(result).toBe(0)
  })
})

describe('formatDuration', () => {
  it('returns "—" for null', () => {
    expect(formatDuration(null)).toBe('—')
  })

  it('returns "< 1m" for 0 months', () => {
    expect(formatDuration(0)).toBe('< 1m')
  })

  it('formats months only', () => {
    expect(formatDuration(5)).toBe('5m')
  })

  it('formats years only', () => {
    expect(formatDuration(24)).toBe('2y')
  })

  it('formats years and months', () => {
    expect(formatDuration(14)).toBe('1y 2m')
  })
})

describe('resolveNextLevel', () => {
  const ladder: CareerLadderStep[] = [
    {
      jobLevelId: '1',
      jobLevelName: 'L1',
      jobLevelCode: 'L1',
      hierarchyOrder: 1,
      hasProfile: true,
      jobProfileSkills: [],
      promotionCriteria: []
    },
    {
      jobLevelId: '2',
      jobLevelName: 'L2',
      jobLevelCode: 'L2',
      hierarchyOrder: 2,
      hasProfile: true,
      jobProfileSkills: [],
      promotionCriteria: []
    },
    {
      jobLevelId: '3',
      jobLevelName: 'L3',
      jobLevelCode: 'L3',
      hierarchyOrder: 3,
      hasProfile: false,
      jobProfileSkills: [],
      promotionCriteria: []
    }
  ]

  it('returns next step from ladder', () => {
    expect(resolveNextLevel(ladder, 0)?.jobLevelId).toBe('2')
  })

  it('returns null if at last position', () => {
    expect(resolveNextLevel(ladder, 2)).toBeNull()
  })

  it('returns null for invalid index', () => {
    expect(resolveNextLevel(ladder, -1)).toBeNull()
  })
})

describe('computeSkillGap', () => {
  const requiredSkills = [
    { requiredLevel: 4, skill: { id: 's1', name: 'Leadership' } },
    { requiredLevel: 3, skill: { id: 's2', name: 'Communication' } },
    { requiredLevel: 5, skill: { id: 's3', name: 'Strategy' } }
  ]

  it('computes gaps correctly with employee skills', () => {
    const employeeSkills = [
      { id: 'e1', level: '3', isDeleted: false, skill: { id: 's1', name: 'Leadership' } },
      { id: 'e2', level: '3', isDeleted: false, skill: { id: 's2', name: 'Communication' } }
    ]

    const result = computeSkillGap(employeeSkills, requiredSkills)
    expect(result).toHaveLength(3)
    expect(result[0].skillName).toBe('Strategy')
    expect(result[0].gap).toBe(5)
    expect(result[0].isMissing).toBe(true)
    expect(result[1].skillName).toBe('Leadership')
    expect(result[1].gap).toBe(1)
    expect(result[2].skillName).toBe('Communication')
    expect(result[2].gap).toBe(0)
  })

  it('returns empty array for empty required skills', () => {
    expect(computeSkillGap([], [])).toHaveLength(0)
  })

  it('ignores deleted employee skills', () => {
    const employeeSkills = [{ id: 'e1', level: '5', isDeleted: true, skill: { id: 's1', name: 'Leadership' } }]
    const result = computeSkillGap(employeeSkills, requiredSkills)
    const leadershipItem = result.find(s => s.skillId === 's1')
    expect(leadershipItem?.isMissing).toBe(true)
  })
})

describe('generateRecommendationBanner', () => {
  it('returns null for no gaps', () => {
    expect(generateRecommendationBanner([])).toBeNull()
  })

  it('returns null if all gaps are zero', () => {
    const items = [{ skillId: '1', skillName: 'A', employeeLevel: 3, requiredLevel: 3, gap: 0, isMissing: false }]
    expect(generateRecommendationBanner(items)).toBeNull()
  })

  it('formats single gap correctly', () => {
    const items = [
      { skillId: '1', skillName: 'Strategy', employeeLevel: 1, requiredLevel: 5, gap: 4, isMissing: false }
    ]
    expect(generateRecommendationBanner(items)).toBe('Focus on Strategy to improve promotion readiness.')
  })

  it('formats multiple gaps correctly', () => {
    const items = [
      { skillId: '1', skillName: 'Strategy', employeeLevel: 0, requiredLevel: 5, gap: 5, isMissing: true },
      { skillId: '2', skillName: 'Leadership', employeeLevel: 1, requiredLevel: 4, gap: 3, isMissing: false },
      { skillId: '3', skillName: 'Communication', employeeLevel: 2, requiredLevel: 3, gap: 1, isMissing: false }
    ]
    expect(generateRecommendationBanner(items)).toBe(
      'Focus on Strategy, Leadership, and Communication to improve promotion readiness.'
    )
  })

  it('respects maxItems parameter', () => {
    const items = [
      { skillId: '1', skillName: 'A', employeeLevel: 0, requiredLevel: 5, gap: 5, isMissing: true },
      { skillId: '2', skillName: 'B', employeeLevel: 0, requiredLevel: 4, gap: 4, isMissing: true },
      { skillId: '3', skillName: 'C', employeeLevel: 0, requiredLevel: 3, gap: 3, isMissing: true },
      { skillId: '4', skillName: 'D', employeeLevel: 0, requiredLevel: 2, gap: 2, isMissing: true }
    ]
    const result = generateRecommendationBanner(items, 2)
    expect(result).toBe('Focus on A, and B to improve promotion readiness.')
  })
})
