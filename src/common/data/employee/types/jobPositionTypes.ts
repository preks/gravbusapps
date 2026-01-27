import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface JobFunction {
  id: string
  name: string
  jobFamily?: {
    id: string
    code: string
    value: string
    catalogId: string
  }
}

export interface JobLevel {
  id: string
  name: string
}

export interface JobProfile {
  id: string
  name: string
}

export interface ContractType {
  id: string
  code: string
  value: string
  catalogId: string
}

export interface EmploymentType {
  id: string
  code: string
  value: string
  catalogId: string
}

export interface OrganizationalUnit {
  id: string
  name: string
}

export interface EmployeePosition {
  employeeId: string
  firstName: string
  lastName: string
  employee?: {
    pictureThumbnail?: string
  }
}

export interface OrganizationalUnitEmployee {
  organizationalUnit: OrganizationalUnit
  organizationalUnitId?: string
}

export interface JobPosition extends BaseEntity {
  id: string
  name: string
  activeTo?: string | null
  jobFunction?: JobFunction | null
  jobLevel?: JobLevel | null
  jobProfile?: JobProfile | null
  contractType?: ContractType | null
  employmentType?: EmploymentType | null
  employeePositions?: EmployeePosition[]
  organizationalUnitEmployees?: OrganizationalUnitEmployee[]
}

export const JobPositionFields = {
  id: 'id',
  name: 'name',
  activeTo: 'activeTo',
  jobFunction: 'jobFunction',
  jobLevel: 'jobLevel',
  jobProfile: 'jobProfile',
  contractType: 'contractType',
  employmentType: 'employmentType',
  employeePositions: 'employeePositions',
  organizationalUnitEmployees: 'organizationalUnitEmployees'
} as const

export const JOB_POSITION_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'name',
    searchPaths: ['name'],
    sortPath: 'name',
    type: 'text'
  },
  {
    key: 'jobFunction',
    searchPaths: ['jobFunction.name'],
    sortPath: 'jobFunction.name',
    type: 'text'
  },
  {
    key: 'jobProfile',
    searchPaths: ['jobProfile.name'],
    sortPath: 'jobProfile.name',
    type: 'text'
  },
  {
    key: 'jobLevel',
    searchPaths: ['jobLevel.name'],
    sortPath: 'jobLevel.name',
    type: 'text'
  }
]
