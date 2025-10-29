import { useCallback } from 'react'
import { ChangeLogEntry } from '../components/tabs/ChangeLogTab'

export const useChangeLogDataTransformer = () => {
  // Transform FLOW audit data to ChangeLogEntry format
  const transformAuditData = useCallback((auditData: any[]): ChangeLogEntry[] => {
    return auditData.flatMap(audit => {
      if (!audit.fieldChanges || audit.fieldChanges.length === 0) {
        return []
      }

      return audit.fieldChanges.map((fieldChange: any) => ({
        id: `${audit.id}-${fieldChange.fieldName}`,
        fieldName: fieldChange.fieldName,
        fieldCategory: fieldChange.fieldCategory,
        previousValue: fieldChange.previousValue,
        newValue: fieldChange.newValue,
        timestamp: audit.timestamp,
        changedBy: {
          userId: audit.userId,
          userName: audit.userName || 'Unknown User',
          userRole: audit.department || 'User'
        },
        changeOrigin: {
          flowId: audit.flowId,
          flowName: audit.flowName,
          templateId: audit.templateId,
          isSystemGenerated: audit.details?.isSystemGenerated || false,
          isAIGenerated: audit.details?.isAIGenerated || false
        },
        isVisible: fieldChange.isVisible,
        isMasked: fieldChange.isMasked
      }))
    })
  }, [])

  // Generate change log from version comparison
  const generateChangeLogFromVersions = useCallback(
    (
      employee: any,
      userRole: string,
      applyVisibilityRules: (entries: ChangeLogEntry[]) => ChangeLogEntry[]
    ): ChangeLogEntry[] => {
      const entries: ChangeLogEntry[] = []

      // Compare personal data versions
      if (employee.personalDataVersions?.length > 1) {
        for (let i = 0; i < employee.personalDataVersions.length - 1; i++) {
          const current = employee.personalDataVersions[i]
          const previous = employee.personalDataVersions[i + 1]

          // Compare each field
          const fieldsToCompare = [
            'firstName',
            'lastName',
            'displayName',
            'preferredName',
            'birthDate',
            'salutation',
            'maritalStatus',
            'gender'
          ]

          fieldsToCompare.forEach(field => {
            if (current[field] !== previous[field]) {
              entries.push({
                id: `personal-${field}-${current.version}`,
                fieldName: formatFieldName(field),
                fieldCategory: 'personal',
                previousValue: previous[field],
                newValue: current[field],
                timestamp: current.updatedAt,
                changedBy: {
                  userId: current.updatedBy || 'system',
                  userName: current.updatedBy || 'System',
                  userRole: 'System'
                },
                changeOrigin: {
                  flowId: `version-${current.version}`,
                  flowName: 'Employee Data Update',
                  isSystemGenerated: true,
                  isAIGenerated: false
                },
                isVisible: true,
                isMasked: false
              })
            }
          })
        }
      }

      // Apply visibility rules
      return applyVisibilityRules(entries)
    },
    []
  )

  // Format field names for display
  const formatFieldName = useCallback((fieldName: string): string => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }, [])

  return {
    transformAuditData,
    generateChangeLogFromVersions,
    formatFieldName
  }
}

export default useChangeLogDataTransformer
