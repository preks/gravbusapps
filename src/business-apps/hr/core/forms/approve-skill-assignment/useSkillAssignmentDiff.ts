import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_DOCUMENTS_BY_IDS, GET_EMPLOYEE_SKILLS, GET_SKILLS_BY_IDS } from './approveSkillAssignment.queries'

export type SkillChangeType = 'new' | 'modified' | 'deleted' | 'new-to-create'

export interface SkillChange {
  type: SkillChangeType
  skillId?: string
  skillName: string
  oldLevel?: number
  newLevel?: number
  details?: SkillChangeDetail[]
}

export interface SkillChangeDetail {
  labelKey: string
  oldValue?: SkillChangeDetailValue
  newValue?: SkillChangeDetailValue
}

export type SkillChangeDetailValue = string | number | null | SkillChangeDocumentValue

export interface SkillChangeDocumentValue {
  type: 'document'
  id: string
  version?: number | null
  name: string
  file: string
  mimeType?: string | null
  documentType?: string | null
  fileSize?: number | null
  employeeId?: string | null
}

interface SkillPayloadItem {
  id?: string | null
  version?: number | null
  skill: string
  level: number
}

interface EmployeeSkillPayload {
  id?: string | null
  skill?: string | null
  level?: number | null
  validFrom?: string | null
  validTo?: string | null
  verificationDocument?: string | null
  additionalProperties?: {
    previousVerificationDocument?: string | null
  } | null
}

interface CurrentEmployeeSkill {
  id: string
  level: number | null
  validFrom?: string | null
  validTo?: string | null
  verificationDocumentId?: string | null
  skill: { id: string; name: string }
}

interface EmployeeDocumentRecord {
  id: string
  version?: number | null
  employeeId?: string | null
  type?: string | null
  name?: string | null
  file?: string | null
  mimeType?: string | null
  fileSize?: number | null
}

interface UseSkillAssignmentDiffParams {
  employeeId?: string
  payloadSkills: SkillPayloadItem[]
  payloadNewSkills: { name: string }[]
  payloadEmployeeSkill?: EmployeeSkillPayload
  payloadSkillsAreDelta?: boolean
  inferRemovedSkills?: boolean
  mode?: string
  accessToken?: string
}

interface UseSkillAssignmentDiffResult {
  changes: SkillChange[]
  isLoading: boolean
}

const toDateValue = (value?: string | null): string | null => {
  if (!value) return null
  return value.split('T')[0]
}

const buildEmployeeSkillDetails = (
  current: CurrentEmployeeSkill | undefined,
  payload: EmployeeSkillPayload,
  employeeDocumentMap: Map<string, SkillChangeDocumentValue>
): SkillChangeDetail[] => {
  const details: SkillChangeDetail[] = []

  if (payload.level != null && current?.level !== payload.level) {
    details.push({
      labelKey: 'approve-skill-assignment-level',
      oldValue: current?.level,
      newValue: payload.level
    })
  }

  const currentValidFrom = toDateValue(current?.validFrom)
  const payloadValidFrom = toDateValue(payload.validFrom)
  if (payloadValidFrom !== null && currentValidFrom !== payloadValidFrom) {
    details.push({
      labelKey: 'approve-skill-assignment-valid-from',
      oldValue: currentValidFrom,
      newValue: payloadValidFrom
    })
  }

  const currentValidTo = toDateValue(current?.validTo)
  const payloadValidTo = toDateValue(payload.validTo)
  if (currentValidTo !== payloadValidTo) {
    details.push({
      labelKey: 'approve-skill-assignment-valid-to',
      oldValue: currentValidTo,
      newValue: payloadValidTo
    })
  }

  const currentVerificationDocument =
    payload.additionalProperties?.previousVerificationDocument ?? current?.verificationDocumentId ?? null
  const payloadVerificationDocument = payload.verificationDocument ?? null
  if (currentVerificationDocument !== payloadVerificationDocument) {
    details.push({
      labelKey: 'approve-skill-assignment-verification-document',
      oldValue: currentVerificationDocument
        ? (employeeDocumentMap.get(currentVerificationDocument) ?? currentVerificationDocument)
        : null,
      newValue: payloadVerificationDocument
        ? (employeeDocumentMap.get(payloadVerificationDocument) ?? payloadVerificationDocument)
        : null
    })
  }

  return details
}

const toEmployeeDocumentMap = (records: EmployeeDocumentRecord[]): Map<string, SkillChangeDocumentValue> => {
  const employeeDocumentMap = new Map<string, SkillChangeDocumentValue>()

  records.forEach(record => {
    if (!record.id || !record.file) return

    employeeDocumentMap.set(record.id, {
      type: 'document',
      id: record.id,
      version: record.version,
      name: record.name || record.file,
      file: record.file,
      mimeType: record.mimeType,
      documentType: record.type,
      fileSize: record.fileSize,
      employeeId: record.employeeId
    })
  })

  return employeeDocumentMap
}

export function useSkillAssignmentDiff({
  employeeId,
  payloadSkills,
  payloadNewSkills,
  payloadEmployeeSkill,
  payloadSkillsAreDelta = false,
  inferRemovedSkills = false,
  mode,
  accessToken
}: UseSkillAssignmentDiffParams): UseSkillAssignmentDiffResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [changes, setChanges] = useState<SkillChange[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const payloadKey = JSON.stringify({
    payloadSkills,
    payloadNewSkills,
    payloadEmployeeSkill,
    payloadSkillsAreDelta,
    inferRemovedSkills,
    mode,
    employeeId
  })

  useEffect(() => {
    if (!graphqlClient || !employeeId) return

    let cancelled = false
    setIsLoading(true)

    const compute = async () => {
      try {
        // Fetch current employee skills (before state)
        const empRes = await graphqlClient.request<{
          employee: { skills: CurrentEmployeeSkill[] } | null
        }>(GET_EMPLOYEE_SKILLS, { id: employeeId })

        if (cancelled) return

        const currentSkills = empRes?.employee?.skills ?? []
        const currentMap = new Map(currentSkills.map(s => [s.skill.id, s]))

        // Fetch names for catalog assignments that may not be part of the current employee skill list.
        const payloadSkillIdsToResolve = payloadSkills.map(s => s.skill)
        const employeeSkillIdToResolve = payloadEmployeeSkill?.skill ? [payloadEmployeeSkill.skill] : []
        const skillIdsToResolve = [...new Set([...payloadSkillIdsToResolve, ...employeeSkillIdToResolve])]
        const nameMap = new Map<string, string>()

        if (skillIdsToResolve.length > 0) {
          const skillsRes = await graphqlClient.request<{ Skill: { id: string; name: string }[] }>(GET_SKILLS_BY_IDS, {
            ids: skillIdsToResolve
          })
          if (cancelled) return
          for (const s of skillsRes?.Skill ?? []) {
            nameMap.set(s.id, s.name)
          }
        }

        const result: SkillChange[] = []

        if (payloadEmployeeSkill?.skill) {
          const current = currentSkills.find(
            skill => skill.id === payloadEmployeeSkill.id || skill.skill.id === payloadEmployeeSkill.skill
          )
          const skillName = current?.skill.name ?? nameMap.get(payloadEmployeeSkill.skill) ?? payloadEmployeeSkill.skill
          const verificationDocumentIds = [
            current?.verificationDocumentId,
            payloadEmployeeSkill.verificationDocument
          ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          let employeeDocumentMap = new Map<string, SkillChangeDocumentValue>()

          if (verificationDocumentIds.length > 0) {
            const documentRes = await graphqlClient.request<{ EmployeeDocument?: EmployeeDocumentRecord[] }>(
              GET_EMPLOYEE_DOCUMENTS_BY_IDS,
              { ids: [...new Set(verificationDocumentIds)] }
            )

            if (cancelled) return
            employeeDocumentMap = toEmployeeDocumentMap(documentRes?.EmployeeDocument ?? [])
          }

          if (mode === 'remove') {
            result.push({
              type: 'deleted',
              skillId: payloadEmployeeSkill.skill,
              skillName,
              oldLevel: current?.level ?? undefined
            })
          } else {
            const details = buildEmployeeSkillDetails(current, payloadEmployeeSkill, employeeDocumentMap)
            result.push({
              type: 'modified',
              skillId: payloadEmployeeSkill.skill,
              skillName,
              details,
              oldLevel: current?.level ?? undefined,
              newLevel: payloadEmployeeSkill.level ?? undefined
            })
          }

          if (!cancelled) setChanges(result)
          return
        }

        if (payloadSkillsAreDelta) {
          for (const item of payloadSkills) {
            const current = currentMap.get(item.skill)
            result.push({
              type: 'new',
              skillId: item.skill,
              skillName: current?.skill.name ?? nameMap.get(item.skill) ?? item.skill,
              newLevel: item.level
            })
          }

          for (const item of payloadNewSkills) {
            result.push({
              type: 'new-to-create',
              skillName: item.name
            })
          }

          if (!cancelled) setChanges(result)
          return
        }

        // Payload skill IDs present (existing assignments kept or modified)
        const payloadExistingSkillIds = new Set(payloadSkills.filter(s => s.id != null).map(s => s.skill))

        if (inferRemovedSkills) {
          // Legacy full-list payloads represented removal by omitting current skills from the submitted list.
          for (const current of currentSkills) {
            if (!payloadExistingSkillIds.has(current.skill.id)) {
              result.push({
                type: 'deleted',
                skillId: current.skill.id,
                skillName: current.skill.name,
                oldLevel: current.level ?? undefined
              })
            }
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
              skillName: current.skill.name,
              oldLevel: current.level ?? undefined,
              newLevel: item.level,
              details: [
                {
                  labelKey: 'approve-skill-assignment-level',
                  oldValue: current.level,
                  newValue: item.level
                }
              ]
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
