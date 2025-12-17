export enum HrSettingsChangeMode {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export enum HrSettingsSections {
  GENERAL = 'general',
  EMPLOYEE_MANAGEMENT = 'employee-management',
  ORGANIZATIONAL_STRUCTURE = 'organizational-structure',
  COMPLIANCE_POLICIES = 'compliance-policies',
  REPORTING_ANALYTICS = 'reporting-analytics'
}

// Default export for wrapper compatibility
export default {
  HrSettingsChangeMode,
  HrSettingsSections
}
