import { JobLevel, JobLevelGroup } from '../types'

/**
 * Calculates the correct level for a job level within its group based on pay grades.
 * Levels are sequential (1, 2, 3, 4...) regardless of gaps in pay grade numbers.
 *
 * @param jobLevel - The job level to calculate the level for
 * @param jobLevelGroup - The group containing all job levels for context
 * @returns The calculated level number (1-based) or undefined if no pay grade assigned
 */
export const calculateJobLevelInGroup = (jobLevel: JobLevel, jobLevelGroup: JobLevelGroup): number | undefined => {
  // If no pay grade assigned, return undefined
  if (jobLevel.compensationBand?.payGrade === undefined || jobLevel.compensationBand?.payGrade === null) {
    return undefined
  }

  // Get all job levels in the group that have pay grades assigned
  const jobLevelsWithPayGrades = jobLevelGroup.jobLevels
    .filter(level => level.compensationBand?.payGrade !== undefined && level.compensationBand?.payGrade !== null)
    .sort((a, b) => a.compensationBand!.payGrade! - b.compensationBand!.payGrade!)

  // Find the position of the current job level in the sorted array
  const position = jobLevelsWithPayGrades.findIndex(level => level.id === jobLevel.id)

  // Return 1-based position (level 1, 2, 3, etc.)
  return position !== -1 ? position + 1 : undefined
}

/**
 * Calculates levels for all job levels within a group based on their pay grades.
 * Returns a map of job level ID to calculated level.
 *
 * @param jobLevelGroup - The group containing job levels
 * @returns Map of job level ID to calculated level
 */
export const calculateAllLevelsInGroup = (jobLevelGroup: JobLevelGroup): Map<string, number> => {
  const levelMap = new Map<string, number>()

  // Get all job levels in the group that have pay grades assigned
  const jobLevelsWithPayGrades = jobLevelGroup.jobLevels
    .filter(
      (level: JobLevel) => level.compensationBand?.payGrade !== undefined && level.compensationBand?.payGrade !== null
    )
    .sort((a: JobLevel, b: JobLevel) => a.compensationBand!.payGrade! - b.compensationBand!.payGrade!)

  // Assign sequential levels (1, 2, 3, 4...)
  jobLevelsWithPayGrades.forEach((jobLevel: JobLevel, index: number) => {
    levelMap.set(jobLevel.id, index + 1)
  })

  return levelMap
}

/**
 * Enhances job level groups with calculated levels for all job levels.
 * This function modifies the job levels to include a calculated level property.
 *
 * @param jobLevelGroups - Array of job level groups to enhance
 * @returns Enhanced job level groups with calculated levels
 */
export const enhanceJobLevelGroupsWithCalculatedLevels = (jobLevelGroups: JobLevelGroup[]): JobLevelGroup[] => {
  return jobLevelGroups.map(group => {
    const levelMap = calculateAllLevelsInGroup(group)

    const enhancedJobLevels = group.jobLevels.map((jobLevel: JobLevel) => ({
      ...jobLevel,
      calculatedLevel: levelMap.get(jobLevel.id)
    }))

    return {
      ...group,
      jobLevels: enhancedJobLevels
    }
  })
}

/**
 * Gets the level progression summary for a job level group.
 * Useful for displaying level ranges and progression information.
 *
 * @param jobLevelGroup - The job level group to analyze
 * @returns Object with progression information
 */
export const getJobLevelGroupProgression = (
  jobLevelGroup: JobLevelGroup
): {
  totalLevels: number
  minPayGrade?: number
  maxPayGrade?: number
  hasGaps: boolean
  payGradeRange: number[]
} => {
  const jobLevelsWithPayGrades = jobLevelGroup.jobLevels
    .filter(level => level.compensationBand?.payGrade !== undefined && level.compensationBand?.payGrade !== null)
    .sort((a, b) => a.compensationBand!.payGrade! - b.compensationBand!.payGrade!)

  if (jobLevelsWithPayGrades.length === 0) {
    return {
      totalLevels: 0,
      hasGaps: false,
      payGradeRange: []
    }
  }

  const payGrades = jobLevelsWithPayGrades.map(level => level.compensationBand!.payGrade!)
  const minPayGrade = Math.min(...payGrades)
  const maxPayGrade = Math.max(...payGrades)

  // Check if there are gaps in pay grades
  const expectedRange = maxPayGrade - minPayGrade + 1
  const hasGaps = payGrades.length < expectedRange

  return {
    totalLevels: jobLevelsWithPayGrades.length,
    minPayGrade,
    maxPayGrade,
    hasGaps,
    payGradeRange: payGrades
  }
}

/**
 * Validates that job levels within a group have valid pay grade assignments.
 *
 * @param jobLevelGroup - The job level group to validate
 * @returns Validation result with any issues found
 */
export const validateJobLevelGroupPayGrades = (
  jobLevelGroup: JobLevelGroup
): {
  isValid: boolean
  issues: string[]
  warnings: string[]
} => {
  const issues: string[] = []
  const warnings: string[] = []

  const jobLevelsWithPayGrades = jobLevelGroup.jobLevels.filter(
    (level: JobLevel) => level.compensationBand?.payGrade !== undefined && level.compensationBand?.payGrade !== null
  )
  const jobLevelsWithoutPayGrades = jobLevelGroup.jobLevels.filter(
    (level: JobLevel) => level.compensationBand?.payGrade === undefined || level.compensationBand?.payGrade === null
  )

  // Check for job levels without pay grades
  if (jobLevelsWithoutPayGrades.length > 0) {
    warnings.push(
      `${jobLevelsWithoutPayGrades.length} job level(s) do not have pay grades assigned: ${jobLevelsWithoutPayGrades
        .map((level: JobLevel) => level.name)
        .join(', ')}`
    )
  }

  // Check for duplicate pay grades
  const payGrades = jobLevelsWithPayGrades.map((level: JobLevel) => level.compensationBand!.payGrade!)
  const duplicatePayGrades = payGrades.filter((grade: number, index: number) => payGrades.indexOf(grade) !== index)

  if (duplicatePayGrades.length > 0) {
    issues.push(`Duplicate pay grades found: ${[...new Set(duplicatePayGrades)].join(', ')}`)
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  }
}
