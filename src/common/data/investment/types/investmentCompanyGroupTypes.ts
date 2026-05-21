import { BASE_ENTITY_DESCRIPTORS, type BaseEntity } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { InvestmentCompanyGroupAssociation } from './investmentCompanyAssociationTypes'

export interface InvestmentCompanyGroup extends BaseEntity {
  id: string
  name?: string

  groupAssociations?: InvestmentCompanyGroupAssociation[]
}

export const InvestmentCompanyGroupFields = {
  id: 'id',
  name: 'name',
  groupAssociations: 'investmentCompanyGroupAssociation'
} as const

export const investmentCompanyGroupFormFields = {
  id: 'id',
  version: 'version',
  name: 'name'
} as const

export const INVESTMENT_COMPANY_GROUP_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'name',
    searchPaths: [InvestmentCompanyGroupFields.name],
    sortPath: InvestmentCompanyGroupFields.name,
    type: 'text'
  },
  {
    key: 'investmentCompanyIds',
    path: `${InvestmentCompanyGroupFields.groupAssociations}.investmentCompanyId`,
    filterLabel: 'Company',
    kind: 'inIds'
  }
]

export const buildInvestmentCompanyGroupPayload = (group: Partial<InvestmentCompanyGroup>) => ({
  investmentCompanyGroup: buildPayload(group, investmentCompanyGroupFormFields)
})

export function toInvestmentCompanyGroup(raw: any): InvestmentCompanyGroup {
  const { investmentCompanyGroupAssociation, ...rest } = raw

  return {
    ...rest,
    groupAssociations: raw.groupAssociations ?? investmentCompanyGroupAssociation ?? []
  } as InvestmentCompanyGroup
}
