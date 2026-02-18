import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ExistingEmployeeSkillRecord {
  id?: string
  version?: number
  skill?: { id?: string }
  level?: string | number | null
  validTo?: string | null
}

export const getSkillValidationError = (name: string): string | null => {
  const trimmed = (name || '').trim()
  if (!trimmed)
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.add_skill_form.error_at_least_one_letter',
      'The skill must have at least one letter'
    )
  if (!/[A-Za-z]/.test(trimmed)) {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.add_skill_form.error_at_least_one_letter',
      'The skill must have at least one letter'
    )
  }
  if (trimmed.length > 64) {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.add_skill_form.error_max_64',
      'The skill must have 64 characters or less'
    )
  }
  return null
}

export const buildEmployeeSkillsPayload = (args: {
  employeeId?: string
  selectedSkillIds: string[]
  selectedSkillLevels: Map<string, number>
  existingSkills: ExistingEmployeeSkillRecord[]
  /** Optional: per-skill validTo (ISO string = deactivate at that time, null = activate / clear end date) */
  skillValidTo?: Record<string, string | null>
  /** Optional: per-skill verification document id (e.g. for attach verification) */
  skillVerificationDocumentId?: Record<string, string | null>
  event?: string
}) => {
  const {
    employeeId,
    selectedSkillIds,
    selectedSkillLevels,
    existingSkills,
    skillValidTo,
    skillVerificationDocumentId,
    event
  } = args

  const existingBySkillId: Record<string, { id?: string; version?: number }> = {}
  ;(existingSkills || []).forEach(es => {
    const sid = es?.skill?.id
    if (sid) existingBySkillId[sid] = { id: es?.id, version: es?.version }
  })

  const skillsPayload = (selectedSkillIds || []).map(skillId => {
    const existing = existingBySkillId[skillId]
    const level = selectedSkillLevels.get(skillId) || 1
    const validToValue = skillValidTo?.[skillId]
    const verificationDocId = skillVerificationDocumentId?.[skillId]
    const isNewSkill = !existing?.id || existing?.version === undefined
    let item: Record<string, unknown> =
      existing?.id && existing?.version !== undefined
        ? (() => {
            const rawVersion = (existing as any)?.version
            const versionToSend = rawVersion === null ? 0 : rawVersion
            return { id: existing.id, version: versionToSend, employeeId, skill: skillId, level }
          })()
        : { employeeId, skill: skillId, level }
    if (isNewSkill) {
      item = { ...item, validFrom: new Date().toISOString() }
    }
    if (validToValue !== undefined) {
      item = { ...item, validTo: validToValue }
    }
    if (verificationDocId !== undefined) {
      item = {
        ...item,
        verificationDocument: verificationDocId
      }
    }
    return item
  })
  return {
    employeeSkills: { employeeId, skills: skillsPayload },
    event: event || 'pse_submit'
  } as any
}
