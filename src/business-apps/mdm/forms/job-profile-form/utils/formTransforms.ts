import { JobProfile, JobProfileSkill } from '@/business-apps/mdm/apps/job-structure-data/utils/JobProfile.types'
import { JobProfileFormValues } from '@/business-apps/mdm/apps/job-structure-data/validation/JobProfile.validation'

/**
 * Transform JobProfile domain model to form values
 */
export const transformJobProfileToFormValues = (
  jobProfile: JobProfile | null,
  suggestedCode: string
): JobProfileFormValues => {
  if (!jobProfile) {
    return {
      name: '',
      code: suggestedCode,
      description: '',
      jobFunction: null,
      jobLevel: null,
      skills: [],
      promotionCriteria: ''
    }
  }

  const criteriaArray = jobProfile.additionalProperties?.promotionCriteria ?? []
  const promotionCriteria = criteriaArray.join('\n')

  return {
    name: jobProfile.name || '',
    code: jobProfile.code || suggestedCode,
    description: jobProfile.description || '',
    jobFunction: jobProfile.jobFunction || null,
    jobLevel: jobProfile.jobLevel || null,
    skills: transformJobProfileSkillsToFormSkills(jobProfile.jobProfileSkills || []),
    promotionCriteria
  }
}

/**
 * Transform JobProfileSkill array to form skills array
 */
export const transformJobProfileSkillsToFormSkills = (
  jobProfileSkills: JobProfileSkill[]
): Array<{ skillId: string; skillName: string; level: number | null }> => {
  return jobProfileSkills.map(profileSkill => ({
    skillId: profileSkill.skill?.id || '',
    skillName: profileSkill.skill?.name || '',
    level: profileSkill.requiredLevel ?? null
  }))
}
