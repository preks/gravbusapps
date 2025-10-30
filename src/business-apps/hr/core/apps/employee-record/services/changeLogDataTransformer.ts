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
        if (index > 0) {
          // Only show changes, not the first record
          entries.push({
            id: `address-${address.id}`,
            fieldName: 'Address',
            fieldCategory: 'address',
            previousValue: this.formatAddressValue(employee.addresses[index - 1]),
            newValue: this.formatAddressValue(address),
            timestamp: address.updatedAt || address.createdAt,
            changedBy: {
              userId: address.createdBy || 'system',
              userName: address.createdBy || 'System',
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
        const timestamp = comm.updatedAt || comm.createdAt
        if (!timestamp) return
        entries.push({
          id: `communication-${comm.id}`,
          fieldName: 'Communication',
          fieldCategory: 'address',
          fieldDetail: comm?.channel?.value ? `Channel: ${comm.channel.value}` : undefined,
          channelName: comm?.channel?.value || undefined,
          previousValue: index > 0 ? this.formatCommunicationValue(employee.communication[index - 1]) : null,
          newValue: this.formatCommunicationValue(comm),
          timestamp,
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
      })
    }

    // Transform relationship (array). Push an entry for each change (index > 0)
    if (Array.isArray(employee.relationship) && employee.relationship.length > 0) {
      employee.relationship.forEach((rel: any, index: number) => {
        if (index > 0) {
          const timestamp = rel?.updatedAt || rel?.createdAt
          if (!timestamp) return
          entries.push({
            id: `relationship-${rel.id || index}`,
            fieldName: 'Relationship',
            fieldCategory: 'personal',
            previousValue: this.formatRelationshipValue(employee.relationship[index - 1]),
            newValue: this.formatRelationshipValue(rel),
            timestamp,
            changedBy: {
              userId: rel.updatedBy || rel.createdBy || 'system',
              userName: rel.updatedBy || rel.createdBy || 'System',
              userRole: 'System'
            },
            changeOrigin: {
              flowId: `relationship-${rel.id || index}`,
              flowName: 'Employee Relationship Update',
              isSystemGenerated: true,
              isAIGenerated: false
            },
            isVisible: true,
            isMasked: false
          })
        }
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

    // Transform working conditions (array of snapshots)
    if (Array.isArray(employee.workingCondition) && employee.workingCondition.length > 0) {
      employee.workingCondition.forEach((wc: any, index: number) => {
        const timestamp = wc?.updatedAt || wc?.createdAt
        if (!timestamp) return
        entries.push({
          id: `working-condition-${wc.id || index}`,
          fieldName: 'Working Conditions',
          fieldCategory: 'working',
          previousValue: index > 0 ? this.formatWorkingConditionValue(employee.workingCondition[index - 1]) : null,
          newValue: this.formatWorkingConditionValue(wc),
          timestamp,
          changedBy: {
            userId: wc.updatedBy || wc.createdBy || 'system',
            userName: wc.updatedBy || wc.createdBy || 'System',
            userRole: 'System'
          },
          changeOrigin: {
            flowId: `working-condition-${wc.id || index}`,
            flowName: 'Employee Working Conditions Update',
            isSystemGenerated: true,
            isAIGenerated: false
          },
          isVisible: true,
          isMasked: false
        })
      })
    }

    // Transform working hours (array of snapshots)
    if (Array.isArray(employee.workingHours) && employee.workingHours.length > 0) {
      console.log(employee.workingHours, 'employee.workingHours')
      employee.workingHours.forEach((wh: any, index: number) => {
        const timestamp =
          wh?.updatedAt ||
          wh?.createdAt ||
          // Fallback: try to align with first workingCondition hireDate if present
          (Array.isArray(employee.workingCondition) && employee.workingCondition[0]?.hireDate
            ? employee.workingCondition[0]?.hireDate
            : null)
        if (!timestamp) return
        entries.push({
          id: `working-hours-${wh.id || index}`,
          fieldName: 'Working Hours',
          fieldCategory: 'working',
          previousValue: index > 0 ? this.formatWorkingHoursValue(employee.workingHours[index - 1]) : null,
          newValue: this.formatWorkingHoursValue(wh),
          timestamp,
          changedBy: {
            userId: wh.updatedBy || wh.createdBy || 'system',
            userName: wh.updatedBy || wh.createdBy || 'System',
            userRole: 'System'
          },
          changeOrigin: {
            flowId: `working-hours-${wh.id || index}`,
            flowName: 'Employee Working Hours Update',
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

  private static formatWorkingConditionValue(wc: any): string {
    if (!wc) return 'N/A'
    const parts: string[] = []
    if (wc.contractType?.value) parts.push(`Contract: ${wc.contractType.value}`)
    if (wc.employmentType?.value) parts.push(`Employment: ${wc.employmentType.value}`)
    if (wc.hireDate) parts.push(`Hire: ${wc.hireDate}`)
    if (wc.exitDate) parts.push(`Exit: ${wc.exitDate}`)
    if (wc.vacationDays != null) parts.push(`Vacation: ${wc.vacationDays}`)
    if (wc.remote?.value) parts.push(`Remote: ${wc.remote.value}`)
    if (wc.region?.value) parts.push(`Region: ${wc.region.value}`)
    return parts.join(' | ') || 'N/A'
  }

  private static formatWorkingHoursValue(wh: any): string {
    if (!wh) return 'N/A'
    const parts: string[] = []
    if (wh.weeklyHours != null) parts.push(`Weekly: ${wh.weeklyHours}h`)
    if (wh.fullTimeEquivalent != null) parts.push(`FTE: ${wh.fullTimeEquivalent}`)
    const dayParts: string[] = []
    const days = [
      ['Mon', wh.mondayHours],
      ['Tue', wh.tuesdayHours],
      ['Wed', wh.wednesdayHours],
      ['Thu', wh.thursdayHours],
      ['Fri', wh.fridayHours],
      ['Sat', wh.saturdayHours],
      ['Sun', wh.sundayHours]
    ]
    days.forEach(([d, h]: any) => {
      if (h != null) dayParts.push(`${d}:${h}`)
    })
    if (dayParts.length) parts.push(dayParts.join(' '))
    if (wh.weeklyDays != null) parts.push(`Days/Week: ${wh.weeklyDays}`)
    if (wh.remote?.value) parts.push(`Remote: ${wh.remote.value}`)
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
