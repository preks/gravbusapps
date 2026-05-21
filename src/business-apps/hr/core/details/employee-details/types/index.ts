// Team item type
export interface MatrixUnitEmployee {
  matrixUnit: {
    id: string
    name: string
  } | null
}

// Capability item type
export interface EmployeeCapability {
  capability: {
    id: string
    name: string
  } | null
}

// Skill item type
export interface EmployeeSkill {
  skill: {
    id: string
    name: string
    updatedAt: string | null
    createdAt: string | null
  } | null
  level: string | null
  isDeleted: boolean
  synchronizedAt: string | null
}

// Communication channel
export interface Communication {
  channel: {
    translations: {
      value: string
      localeCode: string
    }[]
    id: string
    code: string
    value: string
  }
  purpose: string
  recordState: string | null
  isDeleted: boolean
  value: string
  type: {
    value: string
    translations: {
      value: string
      localeCode: string
    }[]
    id: string
  }
}

// Working condition
export interface WorkingCondition {
  id: string
  version: number
  regionRef: string
  activeFrom?: string | null
  activeTo?: string | null
  probationEnd: string
  contractType: {
    value: string
    id: string
  }
  employmentType: {
    value: string
    id: string
  }
  region: {
    value: string
    id: string
  }
  remote: {
    id: string
    value: string
  }
  hireDate: string
  vacationDays: number
  exitDate: string
  additionalProperties?: {
    fixedTermReason?: string
  }
}

// Employee position
export interface EmployeePosition {
  id: string
  organizationalUnitId: string
  organizationalUnit: {
    name: string
  }
  supervisor: {
    firstName: string
    lastName: string
    id: string
    displayName: string
    pictureThumbnail?: string
  }
  jobPosition: {
    name: string
  }
  jobPositionId: string
  siteLocation: {
    name: string
    id: string
  }
  companyId: string
  company: {
    name: string
  }
  siteLocationId: string
  costCenterId: string
  costCenter: {
    id: string
    name: string
  }
  matrixUnitEmployees: MatrixUnitEmployee[]
  employeeCapabilities: EmployeeCapability[]
}

// Full employee data structure
export interface EmployeeDetailsData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail: string
  additionalProperties: {
    email?: string
    phone?: string
    mobile?: string
    userId?: string
  }
  skills: EmployeeSkill[]
  communication: Communication[]
  workingCondition: WorkingCondition[]
  employeePosition: EmployeePosition
}

// API Response type
export interface EmployeeDetailsResponse {
  EmployeePosition: {
    id: string
    organizationalUnitId: string
    organizationalUnit: {
      name: string
    }
    supervisor: {
      firstName: string
      lastName: string
      id: string
      displayName: string
      pictureThumbnail?: string
    }
    jobPosition: {
      name: string
    }
    jobPositionId: string
    siteLocation: {
      name: string
      id: string
    }
    companyId: string
    company: {
      name: string
    }
    siteLocationId: string
    costCenterId: string
    costCenter: {
      id: string
      name: string
    }
    matrixUnitEmployees: MatrixUnitEmployee[]
    employeeCapabilities: EmployeeCapability[]
    employee: {
      id: string
      code: string
      fullName: string
      firstName: string
      lastName: string
      displayName: string
      workspace: string
      version: number
      pictureThumbnail: string
      additionalProperties: {
        email?: string
        phone?: string
        mobile?: string
        userId?: string
      }
      skills: EmployeeSkill[]
      communication: Communication[]
      workingCondition: WorkingCondition[]
    }
  }[]
}
