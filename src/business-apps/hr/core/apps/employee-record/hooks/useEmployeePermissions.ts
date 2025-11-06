import usePermissionCheck, { ResourcePermissionMap } from '../../../../../../common/hooks/usePermissionCheck'

// Tab key constants for the employee record app
export const TAB_KEYS = {
  summary: 'summary',
  details: 'details',
  timeTracking: 'timeTracking',
  employment: 'employment',
  documents: 'documents',
  performance: 'performance',
  feedback: 'feedback',
  absences: 'absences',
  skills: 'skills',
  compensation: 'compensation',
  serviceRequests: 'serviceRequests',
  changeLog: 'changeLog',
  hrNotes: 'hrNotes'
}

// Section key constants for the employee record app
export const SECTION_KEYS = {
  details: {
    personalInfoPrivate: 'personalInfoPrivate',
    contactInfoPublic: 'contactInfoPublic',
    contactInfoPrivate: 'contactInfoPrivate',
    addressPublic: 'addressPublic',
    addressPrivate: 'addressPrivate',
    relationships: 'relationships',
    bankAccount: 'bankAccount',
    taxDetails: 'taxDetails'
  },
  employment: {
    workingHours: 'workingHours',
    jobHistory: 'jobHistory'
  },
  compensation: {
    bonuses: 'bonuses',
    benefits: 'benefits',
    payslips: 'payslips'
  },
  documents: {
    personalDocuments: 'personalDocuments',
    salaryDocuments: 'salaryDocuments',
    developmentDocuments: 'developmentDocuments'
  },
  skills: {
    education: 'education',
    certificates: 'certificates',
    hobbies: 'hobbies'
  }
}

// Map tabs to their required SpiceDB resources and permissions
const employeeTabPermissionMap: Record<string, ResourcePermissionMap> = {
  [TAB_KEYS.summary]: {
    domain: 'employee',
    resource: 'employee',
    permission: 'read'
  },
  [TAB_KEYS.details]: {
    domain: 'employee',
    resource: 'personal_information_public',
    permission: 'read',
    sections: {
      [SECTION_KEYS.details.personalInfoPrivate]: {
        domain: 'employee',
        resource: 'personal_information_private',
        permission: 'read'
      },
      [SECTION_KEYS.details.contactInfoPublic]: {
        domain: 'employee',
        resource: 'employee_communication_public',
        permission: 'read'
      },
      [SECTION_KEYS.details.contactInfoPrivate]: {
        domain: 'employee',
        resource: 'employee_communication_private',
        permission: 'read'
      },
      [SECTION_KEYS.details.addressPublic]: {
        domain: 'employee',
        resource: 'employee_address_public',
        permission: 'read'
      },
      [SECTION_KEYS.details.addressPrivate]: {
        domain: 'employee',
        resource: 'employee_address_private',
        permission: 'read'
      },
      [SECTION_KEYS.details.relationships]: {
        domain: 'employee',
        resource: 'employee_relationship',
        permission: 'read'
      },
      [SECTION_KEYS.details.bankAccount]: {
        domain: 'employee',
        resource: 'employee_bank_account',
        permission: 'read'
      },
      [SECTION_KEYS.details.taxDetails]: {
        domain: 'employee',
        resource: 'employee_tax_details',
        permission: 'read'
      }
    }
  },
  [TAB_KEYS.employment]: {
    domain: 'employee',
    resource: 'working_conditions',
    permission: 'read',
    sections: {
      [SECTION_KEYS.employment.workingHours]: {
        domain: 'employee',
        resource: 'working_hours',
        permission: 'read'
      },
      [SECTION_KEYS.employment.jobHistory]: {
        domain: 'employee',
        resource: 'job_history',
        permission: 'read'
      }
    }
  },
  [TAB_KEYS.compensation]: {
    domain: 'employee',
    resource: 'working_conditions', // ✅ Using existing working_conditions resource since it contains salary data
    permission: 'read',
    sections: {
      bonuses: {
        domain: 'employee',
        resource: 'employee_bonus',
        permission: 'read'
      },
      benefits: {
        domain: 'employee',
        resource: 'employee_benefit',
        permission: 'read'
      },
      payslips: {
        domain: 'employee',
        resource: 'employee_payslip',
        permission: 'read'
      }
    }
  },
  [TAB_KEYS.documents]: {
    domain: 'employee',
    resource: 'employee_document_general',
    permission: 'read',
    sections: {
      [SECTION_KEYS.documents.personalDocuments]: {
        domain: 'employee',
        resource: 'employee_document_personal',
        permission: 'read'
      },
      [SECTION_KEYS.documents.salaryDocuments]: {
        domain: 'employee',
        resource: 'employee_document_salary',
        permission: 'read'
      },
      [SECTION_KEYS.documents.developmentDocuments]: {
        domain: 'employee',
        resource: 'employee_document_development',
        permission: 'read'
      }
    }
  },
  [TAB_KEYS.performance]: {
    domain: 'employee',
    resource: 'employee_document_development',
    permission: 'read'
  },
  [TAB_KEYS.feedback]: {
    domain: 'employee',
    resource: 'employee_document_development',
    permission: 'read'
  },
  [TAB_KEYS.timeTracking]: {
    domain: 'employee',
    resource: 'employee_time',
    permission: 'read'
  },
  [TAB_KEYS.absences]: {
    domain: 'employee',
    resource: 'employee_absence',
    permission: 'read'
  },
  [TAB_KEYS.skills]: {
    domain: 'employee',
    resource: 'employee_skill',
    permission: 'read',
    sections: {
      [SECTION_KEYS.skills.education]: {
        domain: 'employee',
        resource: 'employee_education',
        permission: 'read'
      },
      [SECTION_KEYS.skills.certificates]: {
        domain: 'employee',
        resource: 'employee_certificate',
        permission: 'read'
      },
      [SECTION_KEYS.skills.hobbies]: {
        domain: 'employee',
        resource: 'employee_hobby',
        permission: 'read'
      }
    }
  },
  [TAB_KEYS.serviceRequests]: {
    domain: 'employee',
    resource: 'employee',
    permission: 'read'
  },
  [TAB_KEYS.changeLog]: {
    domain: 'employee',
    resource: 'employee',
    permission: 'read'
  },
  [TAB_KEYS.hrNotes]: {
    domain: 'employee',
    resource: 'employee',
    permission: 'read'
  }
}

/**
 * Hook for checking permissions for the employee record app tabs and sections
 * @param employeeId - ID of the employee record being viewed
 * @param accessToken - Access token for API calls
 */
export const useEmployeePermissions = (employeeId: string, accessToken: string) => {
  const { loading, error, permissions, isResourceAccessible, isSectionAccessible } = usePermissionCheck(
    employeeId,
    employeeTabPermissionMap,
    accessToken
  )

  return {
    loading,
    error,
    tabPermissions: permissions,
    isTabVisible: (tabKey: string) => isResourceAccessible(tabKey as keyof typeof employeeTabPermissionMap),
    isSectionVisible: (tabKey: string, sectionKey: string) => {
      // Make sure the section exists in the permission mapping
      if (!employeeTabPermissionMap[tabKey]?.sections?.[sectionKey]) {
        return false
      }
      return isSectionAccessible(tabKey as keyof typeof employeeTabPermissionMap, sectionKey)
    }
  }
}

export default useEmployeePermissions
