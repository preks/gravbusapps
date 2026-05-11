import { BASE_ENTITY_DESCRIPTORS, type BaseEntity, type CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type {
  InvestmentCompanyExecutive,
  InvestmentCompanyGroupAssociation,
  InvestmentCompanyOwnership
} from './investmentCompanyAssociationTypes'
import type { InvestmentAddress } from './investmentAddressTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'

export interface InvestmentCompany extends BaseEntity {
  id: string
  name?: string
  code?: string
  description?: string
  commercialRegistrationNumber?: string
  taxIdentificationNumber?: string
  taxNumber?: string
  valueAddedTaxNumber?: string
  picture?: unknown
  pictureThumbnail?: string
  currencyRef?: string

  currency?: CatalogEntry
  addresses?: InvestmentAddress[]
  documents?: InvestmentDocument[]
  executives?: InvestmentCompanyExecutive[]
  ownerships?: InvestmentCompanyOwnership[]
  groupAssociations?: InvestmentCompanyGroupAssociation[]
}

export const InvestmentCompanyFields = {
  id: 'id',
  name: 'name',
  code: 'code',
  description: 'description',
  commercialRegistrationNumber: 'commercialRegistrationNumber',
  taxIdentificationNumber: 'taxIdentificationNumber',
  taxNumber: 'taxNumber',
  valueAddedTaxNumber: 'valueAddedTaxNumber',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  currencyRef: 'currencyRef',
  currency: 'currency',
  addresses: 'investmentAddress',
  documents: 'investmentDocument',
  executives: 'investmentCompanyExecutives',
  ownerships: 'investmentCompanyOwnership',
  groupAssociations: 'investmentCompanyGroupAssociation'
} as const

export const investmentCompanyFormFields = {
  id: 'id',
  version: 'version',
  name: 'name',
  code: 'code',
  description: 'description',
  commercialRegistrationNumber: 'commercialRegistrationNumber',
  taxIdentificationNumber: 'taxIdentificationNumber',
  taxNumber: 'taxNumber',
  valueAddedTaxNumber: 'valueAddedTaxNumber',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  currencyRef: 'currencyRef'
} as const

export const INVESTMENT_COMPANY_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'name', searchPaths: [InvestmentCompanyFields.name], sortPath: InvestmentCompanyFields.name, type: 'text' },
  { key: 'code', searchPaths: [InvestmentCompanyFields.code], sortPath: InvestmentCompanyFields.code, type: 'text' },
  {
    key: 'description',
    searchPaths: [InvestmentCompanyFields.description],
    sortPath: InvestmentCompanyFields.description,
    type: 'text'
  },
  {
    key: 'commercialRegistrationNumber',
    searchPaths: [InvestmentCompanyFields.commercialRegistrationNumber],
    sortPath: InvestmentCompanyFields.commercialRegistrationNumber,
    type: 'text'
  },
  {
    key: 'taxIdentificationNumber',
    searchPaths: [InvestmentCompanyFields.taxIdentificationNumber],
    sortPath: InvestmentCompanyFields.taxIdentificationNumber,
    type: 'text'
  },
  {
    key: 'taxNumber',
    searchPaths: [InvestmentCompanyFields.taxNumber],
    sortPath: InvestmentCompanyFields.taxNumber,
    type: 'text'
  },
  {
    key: 'valueAddedTaxNumber',
    searchPaths: [InvestmentCompanyFields.valueAddedTaxNumber],
    sortPath: InvestmentCompanyFields.valueAddedTaxNumber,
    type: 'text'
  },
  {
    key: 'currency',
    searchPaths: [`${InvestmentCompanyFields.currency}.value`, `${InvestmentCompanyFields.currency}.code`],
    sortPath: `${InvestmentCompanyFields.currency}.code`,
    type: 'text'
  },
  {
    key: 'currencyIds',
    path: InvestmentCompanyFields.currencyRef,
    filterLabel: 'Currency',
    optionSelectPaths: [`${InvestmentCompanyFields.currency}.id`, `${InvestmentCompanyFields.currency}.code`],
    optionSearchPaths: [`${InvestmentCompanyFields.currency}.value`, `${InvestmentCompanyFields.currency}.code`],
    optionDistinctOn: [InvestmentCompanyFields.currencyRef],
    kind: 'inIds'
  },
  {
    key: 'executiveTypeIds',
    path: `${InvestmentCompanyFields.executives}.executiveTypeRef`,
    filterLabel: 'Legal Entity Executive Type',
    kind: 'inIds'
  },
  {
    key: 'employeeIds',
    path: `${InvestmentCompanyFields.executives}.employeeId`,
    filterLabel: 'Executive Employee',
    kind: 'inIds'
  },
  {
    key: 'investmentContactIds',
    path: `${InvestmentCompanyFields.executives}.investmentContactId`,
    filterLabel: 'Executive Investment Contact',
    kind: 'inIds'
  },
  {
    key: 'ownerInvestmentCompanyIds',
    path: `${InvestmentCompanyFields.ownerships}.ownerInvestmentCompanyId`,
    filterLabel: 'Owner Company',
    kind: 'inIds'
  },
  {
    key: 'groupIds',
    path: `${InvestmentCompanyFields.groupAssociations}.investmentCompanyGroupId`,
    filterLabel: 'Company Group',
    kind: 'inIds'
  },
  {
    key: 'documentIds',
    path: `${InvestmentCompanyFields.documents}.id`,
    filterLabel: 'Document',
    kind: 'inIds'
  }
]

export const buildInvestmentCompanyPayload = (company: Partial<InvestmentCompany>) => ({
  investmentCompany: buildPayload(company, investmentCompanyFormFields)
})

export function toInvestmentCompany(raw: any): InvestmentCompany {
  const {
    investmentAddress,
    investmentDocument,
    investmentCompanyExecutives,
    investmentCompanyOwnership,
    investmentCompanyGroupAssociation,
    ...rest
  } = raw

  return {
    ...rest,
    addresses: raw.addresses ?? investmentAddress ?? [],
    documents: raw.documents ?? investmentDocument ?? [],
    executives: raw.executives ?? investmentCompanyExecutives ?? [],
    ownerships: raw.ownerships ?? investmentCompanyOwnership ?? [],
    groupAssociations: raw.groupAssociations ?? investmentCompanyGroupAssociation ?? []
  } as InvestmentCompany
}
