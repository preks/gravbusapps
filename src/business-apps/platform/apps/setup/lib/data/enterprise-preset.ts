import { v4 as uuidv4 } from 'uuid'
import {
  SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID,
  SETUP_ROOT_ORGANIZATIONAL_UNIT_DISPLAY_NAME
} from '../setupConstants'

export type EnterpriseDepartmentPreset = {
  name: string
  capabilities: string[]
}

export const enterprisePresetDepartments: EnterpriseDepartmentPreset[] = [
  {
    name: 'Finance',
    capabilities: [
      'Budgeting',
      'Forecasting',
      'Accounting Operations',
      'Accounts Payable and Receivable',
      'Treasury',
      'Controlling'
    ]
  },
  {
    name: 'Human Resources',
    capabilities: [
      'Recruiting',
      'Onboarding',
      'Performance Management',
      'Learning and Development',
      'Compensation and Benefits',
      'Employee Relations'
    ]
  },
  {
    name: 'IT',
    capabilities: [
      'Workplace IT',
      'Infrastructure',
      'Identity and Access Management',
      'Service Desk',
      'Enterprise Applications',
      'Cybersecurity'
    ]
  },
  {
    name: 'Operations',
    capabilities: [
      'Process Management',
      'Supply and Service Operations',
      'Quality Management',
      'Resource Planning',
      'Vendor Coordination',
      'Continuous Improvement'
    ]
  },
  {
    name: 'Sales',
    capabilities: [
      'Pipeline Management',
      'Account Management',
      'Business Development',
      'Deal Desk',
      'Sales Operations',
      'Partner and Channel Sales'
    ]
  },
  {
    name: 'Marketing',
    capabilities: [
      'Brand Management',
      'Campaign Execution',
      'Content Marketing',
      'Demand Generation',
      'Events',
      'Market Research'
    ]
  },
  {
    name: 'Legal',
    capabilities: [
      'Contract Management',
      'Legal Advisory',
      'Corporate Governance',
      'Policy Management',
      'Data and Privacy Coordination',
      'Dispute Support'
    ]
  }
]

export const enterprisePresetCapabilitiesByDepartment = Object.fromEntries(
  enterprisePresetDepartments.map(department => [department.name, department.capabilities])
) as Record<string, string[]>

export const enterprisePresetCapabilities = Array.from(
  new Set(enterprisePresetDepartments.flatMap(department => department.capabilities))
)

export type EnterprisePresetState = {
  departments: Array<{ id: string; name: string }>
  capabilities: Array<{ id: string; name: string }>
  departmentCapabilities: Record<string, string[]>
  selectedDepartments: string[]
  selectedCapabilities: string[]
}

export const createEnterprisePresetState = (generateId: () => string = uuidv4): EnterprisePresetState => {
  const departments = enterprisePresetDepartments.map(department => ({
    id: generateId(),
    name: department.name
  }))

  const capabilityIdByName = new Map<string, string>()
  const capabilities: Array<{ id: string; name: string }> = []
  const departmentCapabilities = departments.reduce<Record<string, string[]>>((accumulator, department) => {
    const departmentPreset = enterprisePresetDepartments.find(entry => entry.name === department.name)
    const capabilityIds =
      departmentPreset?.capabilities.map(capabilityName => {
        let capabilityId = capabilityIdByName.get(capabilityName)

        if (!capabilityId) {
          capabilityId = generateId()
          capabilityIdByName.set(capabilityName, capabilityId)
          capabilities.push({
            id: capabilityId,
            name: capabilityName
          })
        }

        return capabilityId
      }) ?? []

    accumulator[department.id] = capabilityIds
    return accumulator
  }, {})

  const enterpriseManagementDepartment = {
    id: SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID,
    name: SETUP_ROOT_ORGANIZATIONAL_UNIT_DISPLAY_NAME
  }

  return {
    departments: [...departments, enterpriseManagementDepartment],
    capabilities,
    departmentCapabilities: {
      ...departmentCapabilities,
      [SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID]: []
    },
    selectedDepartments: [...departments.map(department => department.id), SETUP_ENTERPRISE_MANAGEMENT_DEPARTMENT_ID],
    selectedCapabilities: Object.values(departmentCapabilities).flat()
  }
}
