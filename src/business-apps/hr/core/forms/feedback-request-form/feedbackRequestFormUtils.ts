import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export const resolveSubjectUserId = (
  additionalData: BusinessAppContextProps['additionalData'],
  currentUserId?: string,
  currentUserEmployeeId?: string
) =>
  additionalData?.subjectUserId ||
  additionalData?.flowContext?.subjectUserId ||
  additionalData?.contextData?.subjectUserId ||
  additionalData?.psi_taskPayload?.psi_initialParameters?.subjectUserId ||
  additionalData?.receiverUserId ||
  additionalData?.flowContext?.receiverUserId ||
  additionalData?.contextData?.receiverUserId ||
  additionalData?.psi_taskPayload?.psi_initialParameters?.receiverUserId ||
  currentUserId ||
  currentUserEmployeeId

export const resolveRequestedFromUserIds = ({
  selectedIds,
  employeeIdUserIdMap,
  resolveUserIdByEmployeeId
}: {
  selectedIds: string[]
  employeeIdUserIdMap?: Record<string, string>
  resolveUserIdByEmployeeId: (employeeId: string) => string | undefined
}) => {
  const unresolvedSelectedIds: string[] = []
  const idUserIdMap = employeeIdUserIdMap || {}

  const requestedFromList = selectedIds
    .map(id => {
      const mappedUserId = idUserIdMap[id]
      if (mappedUserId) return mappedUserId
      const resolvedUserId = resolveUserIdByEmployeeId(id)
      if (resolvedUserId) return resolvedUserId
      unresolvedSelectedIds.push(id)
      return null
    })
    .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index)

  return {
    requestedFromList,
    unresolvedSelectedIds
  }
}
