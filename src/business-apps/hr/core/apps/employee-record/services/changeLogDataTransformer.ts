import { ChangeLogEntry } from '../components/tabs/ChangeLogTab'

export class ChangeLogDataTransformer {
  /**
   * Transform employee data to ChangeLogEntry format
   */
  static transformEmployeeData(employee: any): ChangeLogEntry[] {
    const entries: ChangeLogEntry[] = []

    if (!employee) return entries

    // Transform addresses
    if (employee.addresses) {
      employee.addresses.forEach((address: any, index: number) => {
        if (index > 0) { // Only show changes, not the first record
          entries.push({
            id: `address-${address.id}`,
            fieldName: 'Address',
            fieldCategory: 'address',
            previousValue: this.formatAddressValue(employee.addresses[index - 1]),
            newValue: this.formatAddressValue(address),
            timestamp: address.updatedAt || address.createdAt,
            changedBy: {
              userId: address.updatedBy || address.createdBy || 'system',
              userName: address.updatedBy || address.createdBy || 'System',
              userRole: 'System'
            },
            changeOrigin: {
              flowId: `address-${address.id}`,
              flowName: 'Employee Address Update',
              isSystemGenerated: true,
              isAIGenerated: false
            },
            isVisible: true,
            isMasked: false
          })
        }
      })
    }

    // Transform communication
    if (employee.communication) {
      employee.communication.forEach((comm: any, index: number) => {
        if (index > 0) {
          entries.push({
            id: `communication-${comm.id}`,
            fieldName: 'Communication',
            fieldCategory: 'address',
            previousValue: this.formatCommunicationValue(employee.communication[index - 1]),
            newValue: this.formatCommunicationValue(comm),
            timestamp: comm.updatedAt || comm.createdAt,
            changedBy: {
              userId: comm.updatedBy || comm.createdBy || 'system',
              userName: comm.updatedBy || comm.createdBy || 'System',
              userRole: 'System'
            },
            changeOrigin: {
              flowId: `communication-${comm.id}`,
              flowName: 'Employee Communication Update',
              isSystemGenerated: true,
              isAIGenerated: false
            },
            isVisible: true,
            isMasked: false
          })
        }
      })
    }

    // Transform relationship
    if (employee.relationship) {
      const rel = employee.relationship
      entries.push({
        id: `relationship-${rel.id || 'current'}`,
        fieldName: 'Relationship',
        fieldCategory: 'personal',
        previousValue: null,
        newValue: this.formatRelationshipValue(rel),
        timestamp: rel.updatedAt || rel.createdAt || new Date().toISOString(),
        changedBy: {
          userId: rel.updatedBy || rel.createdBy || 'system',
          userName: rel.updatedBy || rel.createdBy || 'System',
          userRole: 'System'
        },
        changeOrigin: {
          flowId: `relationship-${rel.id || 'current'}`,
          flowName: 'Employee Relationship Update',
          isSystemGenerated: true,
          isAIGenerated: false
        },
        isVisible: true,
        isMasked: false
      })
    }

    // Transform skills
    if (employee.skills && Array.isArray(employee.skills)) {
      employee.skills.forEach((skillItem: any) => {
        const skillName = skillItem?.skill?.name || 'Skill'
        entries.push({
          id: `skill-${skillItem.id || skillName}`,
          fieldName: 'Skill',
          fieldCategory: 'skills',
          previousValue: null,
          newValue: `${skillName}${skillItem.level ? ` (Level ${skillItem.level})` : ''}`,
          timestamp: skillItem.synchronizedAt || new Date().toISOString(),
          changedBy: {
            userId: 'system',
            userName: 'System',
            userRole: 'System'
          },
          changeOrigin: {
            flowId: `skill-${skillItem.id || skillName}`,
            flowName: 'Employee Skill Update',
            isSystemGenerated: true,
            isAIGenerated: false
          },
          isVisible: true,
          isMasked: false
        })
      })
    }

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * Format address value for display
   */
  private static formatAddressValue(address: any): string {
    if (!address) return 'N/A'
    const parts = []
    if (address.addressLine) parts.push(address.addressLine)
    if (address.postalCode) parts.push(address.postalCode)
    if (address.locality) parts.push(address.locality)
    if (address.country?.value) parts.push(address.country.value)
    return parts.join(', ') || 'N/A'
  }

  /**
   * Format communication value for display
   */
  private static formatCommunicationValue(comm: any): string {
    if (!comm) return 'N/A'
    return comm.value || 'N/A'
  }

  private static formatRelationshipValue(rel: any): string {
    if (!rel) return 'N/A'
    const parts: string[] = []
    const fullName = [rel.firstName, rel.lastName].filter(Boolean).join(' ')
    if (fullName) parts.push(fullName)
    if (rel.typeRef) parts.push(`Type: ${rel.typeRef}`)
    if (rel.isEmergencyContact) parts.push('Emergency Contact')
    if (rel.phoneNumber) parts.push(`Phone: ${rel.phoneNumber}`)
    if (rel.email) parts.push(`Email: ${rel.email}`)
    if (rel.birthDate) parts.push(`Birth: ${rel.birthDate}`)
    return parts.join(' | ') || 'N/A'
  }

  /**
   * Transform audit data to ChangeLogEntry format
   */
  static transformAuditData(auditLogs: any[]): ChangeLogEntry[] {
    return auditLogs.flatMap(audit => {
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
  }
}

export default ChangeLogDataTransformer
