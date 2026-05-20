import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { SelectedSkill } from '../addSkill.types'

const DEFAULT_SKILL_LEVEL_SCALE = 10

export interface ExistingEmployeeSkillRecord {
  id?: string
  version?: number
  skill?: { id?: string }
  level?: string | number | null
  validFrom?: string | null
  validTo?: string | null
  verificationDocumentId?: string | null
}

const toSkillDate = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const dateValue = value.split('T')[0]
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : undefined
}

const getCurrentSkillDate = (): string => new Date().toISOString().split('T')[0]

const clampSkillLevel = (level: number | string | null | undefined): number => {
  if (level === null || level === undefined) return 1
  const parsed = typeof level === 'string' ? Number.parseInt(level, 10) : level
  return Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(DEFAULT_SKILL_LEVEL_SCALE, parsed))
}

const findExistingEmployeeSkill = (
  existingSkills: ExistingEmployeeSkillRecord[],
  employeeSkillId?: string,
  skillId?: string
) =>
  existingSkills.find(existingSkill => {
    if (employeeSkillId && existingSkill.id === employeeSkillId) return true
    return Boolean(skillId && existingSkill.skill?.id === skillId)
  })

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
  newSkills?: { name: string }[]
  event?: string
}) => {
  const {
    employeeId,
    selectedSkillIds,
    selectedSkillLevels,
    existingSkills,
    skillValidTo,
    skillVerificationDocumentId,
    newSkills,
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
    const isNewAssignment = !existing?.id || existing?.version === undefined
    let item: Record<string, unknown> =
      existing?.id && existing?.version !== undefined
        ? (() => {
            const rawVersion = (existing as any)?.version
            const versionToSend = rawVersion === null ? 0 : rawVersion
            return { id: existing.id, version: versionToSend, employeeId, skill: skillId, level }
          })()
        : { employeeId, skill: skillId, level }
    if (isNewAssignment) {
      item = { ...item, validFrom: new Date().toISOString() }
    }
    if (validToValue !== undefined) {
      item = { ...item, validTo: validToValue }
    }
    if (verificationDocId !== undefined) {
      item = {
        ...item,
        verificationDocumentId: verificationDocId,
        verificationDocument: verificationDocId
      }
    }
    return item
  })

  const employeeSkills: Record<string, unknown> = { employeeId, skills: skillsPayload }
  if (newSkills && newSkills.length > 0) {
    employeeSkills.newSkills = newSkills
  }

  return {
    employeeId,
    employeeSkills,
    event: event || 'pse_submit'
  } as any
}

export const buildCreateEmployeeSkillPayload = (args: { employeeId?: string; skillsToAssign: SelectedSkill[] }) => {
  const { employeeId, skillsToAssign } = args
  const validFrom = getCurrentSkillDate()
  const existingSkills = skillsToAssign
    .filter(skill => !skill.isNew)
    .map(skill => ({
      skill: skill.id,
      level: clampSkillLevel(skill.level),
      validFrom
    }))
  const newSkills = skillsToAssign
    .filter(skill => skill.isNew)
    .map(skill => ({
      name: skill.name,
      levelScale: DEFAULT_SKILL_LEVEL_SCALE,
      level: clampSkillLevel(skill.level),
      validFrom
    }))

  return {
    employeeSkillAssignmentRequest: {
      employeeId,
      skills: existingSkills,
      newSkills
    }
  }
}

export const buildUpdateEmployeeSkillPayload = (args: {
  employeeSkillId?: string
  skillId?: string
  level?: number
  validTo?: string | null
  verificationDocument?: string | null
  previousVerificationDocument?: string | null
  existingSkills: ExistingEmployeeSkillRecord[]
}) => {
  const {
    employeeSkillId,
    skillId,
    level,
    validTo,
    verificationDocument,
    previousVerificationDocument,
    existingSkills
  } = args
  const existingSkill = findExistingEmployeeSkill(existingSkills, employeeSkillId, skillId)
  const resolvedSkillId = skillId ?? existingSkill?.skill?.id
  const resolvedValidFrom = toSkillDate(existingSkill?.validFrom) ?? getCurrentSkillDate()
  const resolvedVerificationDocument =
    verificationDocument !== undefined ? verificationDocument : existingSkill?.verificationDocumentId
  const employeeSkill: Record<string, unknown> = {
    id: employeeSkillId ?? existingSkill?.id,
    skill: resolvedSkillId,
    level: clampSkillLevel(level ?? existingSkill?.level),
    validFrom: resolvedValidFrom,
    validTo: validTo === undefined ? (toSkillDate(existingSkill?.validTo) ?? null) : validTo
  }

  if (resolvedVerificationDocument !== undefined) {
    employeeSkill.verificationDocument = resolvedVerificationDocument
  }

  if (previousVerificationDocument !== undefined) {
    employeeSkill.additionalProperties = {
      previousVerificationDocument
    }
  }

  return { employeeSkill }
}

export const buildDeleteEmployeeSkillPayload = (employeeSkillId?: string, skillId?: string) => ({
  employeeSkill: {
    id: employeeSkillId,
    skill: skillId
  }
})
