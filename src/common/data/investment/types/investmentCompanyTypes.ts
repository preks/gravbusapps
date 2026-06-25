import { BASE_ENTITY_DESCRIPTORS, type BaseEntity, type CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { filterAddressLines, filterAddresses } from '@/common/data/common/utils/entityPayloadHelpers'
import type {
  InvestmentCompanyExecutive,
  InvestmentCompanyGroupAssociation,
  InvestmentCompanyOwnership,
  InvestmentCompanyStakeholder
} from './investmentCompanyAssociationTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
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
  accountingArea?: string
  picture?: unknown
  pictureThumbnail?: string
  currencyRef?: string
  ownerEmployeeId?: string
  ownsProperty?: boolean

  currency?: CatalogEntry
  ownerEmployee?: EmployeeRef
  addresses?: InvestmentAddress[]
  documents?: InvestmentDocument[]
  executives?: InvestmentCompanyExecutive[]
  ownerships?: InvestmentCompanyOwnership[]
  groupAssociations?: InvestmentCompanyGroupAssociation[]
  stakeholders?: InvestmentCompanyStakeholder[]
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
  accountingArea: 'accountingArea',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  currencyRef: 'currencyRef',
  currency: 'currency',
  ownerEmployeeId: 'ownerEmployeeId',
  ownerEmployee: 'ownerEmployee',
  ownsProperty: 'ownsProperty',
  // Addresses/documents live on InvestmentAddress / InvestmentDocument (via investmentCompanyId), not on InvestmentCompany
  addresses: 'investmentAddress',
  documents: 'investmentDocument',
  executives: 'investmentCompanyExecutives',
  ownerships: 'investmentCompanyOwnership',
  groupAssociations: 'investmentCompanyGroupAssociation',
  stakeholders: 'investmentCompanyStakeholder'
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
  accountingArea: 'accountingArea',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  currencyRef: 'currencyRef',
  ownerEmployeeId: 'ownerEmployee',
  ownsProperty: 'ownsProperty',
  addresses: 'addresses'
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
    key: 'accountingArea',
    searchPaths: [InvestmentCompanyFields.accountingArea],
    sortPath: InvestmentCompanyFields.accountingArea,
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
    key: 'ownerEmployee',
    searchPaths: [
      `${InvestmentCompanyFields.ownerEmployee}.displayName`,
      `${InvestmentCompanyFields.ownerEmployee}.firstName`,
      `${InvestmentCompanyFields.ownerEmployee}.lastName`
    ],
    sortPath: `${InvestmentCompanyFields.ownerEmployee}.displayName`,
    type: 'text'
  },
  {
    key: 'ownerEmployeeIds',
    path: InvestmentCompanyFields.ownerEmployeeId,
    filterLabel: 'Owner',
    optionSelectPaths: [
      `${InvestmentCompanyFields.ownerEmployee}.id`,
      `${InvestmentCompanyFields.ownerEmployee}.displayName`
    ],
    optionSearchPaths: [
      `${InvestmentCompanyFields.ownerEmployee}.displayName`,
      `${InvestmentCompanyFields.ownerEmployee}.firstName`,
      `${InvestmentCompanyFields.ownerEmployee}.lastName`
    ],
    optionDistinctOn: [InvestmentCompanyFields.ownerEmployeeId],
    kind: 'inIds'
  },
  {
    key: 'ownsProperty',
    searchPaths: [InvestmentCompanyFields.ownsProperty],
    sortPath: InvestmentCompanyFields.ownsProperty,
    path: InvestmentCompanyFields.ownsProperty,
    filterLabel: 'Owns Property',
    type: 'boolean',
    kind: 'eqBool'
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
    key: 'stakeholderAccountIds',
    path: `${InvestmentCompanyFields.stakeholders}.investmentAccountId`,
    filterLabel: 'Stakeholder Investment Account',
    kind: 'inIds'
  },
  {
    key: 'stakeholderContactIds',
    path: `${InvestmentCompanyFields.stakeholders}.investmentContactId`,
    filterLabel: 'Stakeholder Investment Contact',
    kind: 'inIds'
  },
  {
    key: 'stakeholderTypeIds',
    path: `${InvestmentCompanyFields.stakeholders}.investmentCompanyStakeholderTypeRef`,
    filterLabel: 'Stakeholder Type',
    optionSelectPaths: [
      `${InvestmentCompanyFields.stakeholders}.investmentCompanyStakeholderType.id`,
      `${InvestmentCompanyFields.stakeholders}.investmentCompanyStakeholderType.value`
    ],
    optionSearchPaths: [
      `${InvestmentCompanyFields.stakeholders}.investmentCompanyStakeholderType.value`,
      `${InvestmentCompanyFields.stakeholders}.investmentCompanyStakeholderType.code`
    ],
    optionDistinctOn: [`${InvestmentCompanyFields.stakeholders}.investmentCompanyStakeholderTypeRef`],
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

export const buildInvestmentCompanyPayload = (
  company: Omit<Partial<InvestmentCompany>, 'addresses'> & { addresses?: any[] }
) => {
  const payload = buildPayload(company, investmentCompanyFormFields)
  const filteredAddresses = filterAddresses(payload.addresses, filterAddressLines)

  if (filteredAddresses) {
    payload.addresses = filteredAddresses
  } else {
    delete payload.addresses
  }

  return {
    investmentCompany: payload
  }
}

export function toInvestmentCompany(raw: any): InvestmentCompany {
  const {
    investmentAddress,
    investmentDocument,
    investmentCompanyExecutives,
    investmentCompanyOwnership,
    investmentCompanyGroupAssociation,
    investmentCompanyStakeholder,
    ...rest
  } = raw

  return {
    ...rest,
    addresses: raw.addresses ?? investmentAddress ?? [],
    documents: raw.documents ?? investmentDocument ?? [],
    executives: raw.executives ?? investmentCompanyExecutives ?? [],
    ownerships: raw.ownerships ?? investmentCompanyOwnership ?? [],
    groupAssociations: raw.groupAssociations ?? investmentCompanyGroupAssociation ?? [],
    stakeholders: raw.stakeholders ?? investmentCompanyStakeholder ?? []
  } as InvestmentCompany
}
