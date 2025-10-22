export class ChangeLogVisibilityRules {
  /**
   * Apply visibility rules based on user role and field category
   */
  static applyVisibilityRules(fieldChange: any, userRole: string): boolean {
    const fieldCategory = fieldChange.fieldCategory

    switch (fieldCategory) {
      case 'financial':
        // Financial data only visible to HR managers and admins
        return userRole === 'admin' || userRole === 'hr_manager'

      case 'org':
        // Organizational data visible to HR and managers
        return ['admin', 'hr_manager', 'manager'].includes(userRole)

      case 'working':
        // Working conditions visible to HR and managers
        return ['admin', 'hr_manager', 'manager'].includes(userRole)

      case 'personal':
      case 'address':
      case 'skills':
      case 'performance':
      case 'absence':
      case 'emergency':
        // These are generally visible to the employee
        return true

      default:
        // Default to visible for unknown categories
        return true
    }
  }

  /**
   * Apply masking rules for sensitive data
   */
  static applyMaskingRules(fieldChange: any, userRole: string): boolean {
    const isVisible = this.applyVisibilityRules(fieldChange, userRole)

    // If not visible, mask the data
    if (!isVisible) return true

    // Additional masking rules for sensitive fields
    const sensitiveFields = ['iban', 'taxNumber', 'socialSecurityNumber', 'bankName']
    const fieldName = fieldChange.fieldName.toLowerCase()

    return sensitiveFields.some(sensitive => fieldName.includes(sensitive))
  }

  /**
   * Get field categories available for the current user
   */
  static getAvailableFieldCategories(userRole: string): string[] {
    const allCategories = [
      'personal',
      'address',
      'org',
      'working',
      'financial',
      'skills',
      'performance',
      'absence',
      'emergency'
    ]

    // Filter based on user role
    switch (userRole) {
      case 'admin':
      case 'hr_manager':
        return allCategories
      case 'manager':
        return allCategories.filter(cat => cat !== 'financial')
      case 'employee':
      default:
        return allCategories.filter(cat => !['financial', 'org', 'working'].includes(cat))
    }
  }

  /**
   * Get change actors available for the current user
   */
  static getAvailableChangeActors(): string[] {
    const allActors = ['user', 'ai', 'system']

    // All users can see all actor types
    return allActors
  }
}

export default ChangeLogVisibilityRules
