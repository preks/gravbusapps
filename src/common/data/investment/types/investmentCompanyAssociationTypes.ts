import { BASE_ENTITY_DESCRIPTORS, type BaseEntity, type CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentCompany } from './investmentCompanyTypes'
import type { InvestmentCompanyGroup } from './investmentCompanyGroupTypes'

export interface InvestmentCompanyExecutive extends BaseEntity {
  id: string
  investmentCompanyId: string
  employeeId?: string
  investmentContactId?: string
  executiveTypeRef?: string

  investmentCompany?: InvestmentCompany
  employee?: Employee
  investmentContact?: InvestmentContact
  executiveType?: CatalogEntry
}

export interface InvestmentCompanyOwnership extends BaseEntity {
  id: string
  investmentCompanyId?: string
  ownerInvestmentCompanyId?: string
  percentage?: number

  investmentCompany?: InvestmentCompany
  ownerInvestmentCompany?: InvestmentCompany
}

export interface InvestmentCompanyGroupAssociation extends BaseEntity {
  id: string
  investmentCompanyId?: string
  investmentCompanyGroupId?: string

  investmentCompany?: InvestmentCompany
  investmentCompanyGroup?: InvestmentCompanyGroup
}

export const InvestmentCompanyExecutiveFields = {
  id: 'id',
  investmentCompanyId: 'investmentCompanyId',
  employeeId: 'employeeId',
  investmentContactId: 'investmentContactId',
  executiveTypeRef: 'executiveTypeRef',
  investmentCompany: 'investmentCompany',
  employee: 'employee',
  investmentContact: 'investmentContact',
  executiveType: 'executiveType'
} as const

export const InvestmentCompanyOwnershipFields = {
  id: 'id',
  investmentCompanyId: 'investmentCompanyId',
  ownerInvestmentCompanyId: 'ownerInvestmentCompanyId',
  percentage: 'percentage',
  investmentCompany: 'investmentCompany',
  ownerInvestmentCompany: 'ownerInvestmentCompany'
} as const

export const InvestmentCompanyGroupAssociationFields = {
  id: 'id',
  investmentCompanyId: 'investmentCompanyId',
  investmentCompanyGroupId: 'investmentCompanyGroupId',
  investmentCompany: 'investmentCompany',
  investmentCompanyGroup: 'investmentCompanyGroup'
} as const

export const investmentCompanyExecutiveFormFields = {
  id: 'id',
  version: 'version',
  investmentCompanyId: 'investmentCompany',
  employeeId: 'employee',
  investmentContactId: 'investmentContact',
  executiveTypeRef: 'executiveTypeRef'
} as const

export const investmentCompanyOwnershipFormFields = {
  id: 'id',
  version: 'version',
  investmentCompanyId: 'investmentCompany',
  ownerInvestmentCompanyId: 'ownerInvestmentCompany',
  percentage: 'percentage'
} as const

export const investmentCompanyGroupAssociationFormFields = {
  id: 'id',
  version: 'version',
  investmentCompanyId: 'investmentCompany',
  investmentCompanyGroupId: 'investmentCompanyGroup'
} as const

export const INVESTMENT_COMPANY_EXECUTIVE_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'investmentCompanyIds',
    path: InvestmentCompanyExecutiveFields.investmentCompanyId,
    filterLabel: 'Company',
    kind: 'inIds'
  },
  { key: 'employeeIds', path: InvestmentCompanyExecutiveFields.employeeId, filterLabel: 'Employee', kind: 'inIds' },
  {
    key: 'investmentContactIds',
    path: InvestmentCompanyExecutiveFields.investmentContactId,
    filterLabel: 'Investment Contact',
    kind: 'inIds'
  },
  {
    key: 'executiveTypeIds',
    path: InvestmentCompanyExecutiveFields.executiveTypeRef,
    filterLabel: 'Legal Entity Executive Type',
    optionSelectPaths: [
      `${InvestmentCompanyExecutiveFields.executiveType}.id`,
      `${InvestmentCompanyExecutiveFields.executiveType}.value`
    ],
    optionSearchPaths: [
      `${InvestmentCompanyExecutiveFields.executiveType}.value`,
      `${InvestmentCompanyExecutiveFields.executiveType}.code`
    ],
    optionDistinctOn: [InvestmentCompanyExecutiveFields.executiveTypeRef],
    kind: 'inIds'
  }
]

export const INVESTMENT_COMPANY_OWNERSHIP_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'investmentCompanyIds',
    path: InvestmentCompanyOwnershipFields.investmentCompanyId,
    filterLabel: 'Company',
    kind: 'inIds'
  },
  {
    key: 'ownerInvestmentCompanyIds',
    path: InvestmentCompanyOwnershipFields.ownerInvestmentCompanyId,
    filterLabel: 'Owner Company',
    kind: 'inIds'
  },
  {
    key: 'percentage',
    searchPaths: [InvestmentCompanyOwnershipFields.percentage],
    sortPath: InvestmentCompanyOwnershipFields.percentage,
    type: 'number'
  }
]

export const INVESTMENT_COMPANY_GROUP_ASSOCIATION_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'investmentCompanyIds',
    path: InvestmentCompanyGroupAssociationFields.investmentCompanyId,
    filterLabel: 'Company',
    kind: 'inIds'
  },
  {
    key: 'groupIds',
    path: InvestmentCompanyGroupAssociationFields.investmentCompanyGroupId,
    filterLabel: 'Group',
    kind: 'inIds'
  }
]
