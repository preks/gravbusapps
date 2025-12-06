import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Investment } from './investmentTypes.new'

/**
 * Equity Investment Type
 */
export interface EquityInvestment extends BaseEntity {
  id?: string
  foundationDate?: string
  marketValue?: number
  turnoverAmount?: number
  ebitdaAmount?: number
  investment?: Investment
  investmentId?: string
}

/**
 * Equity Investment Fields
 */
export const EquityInvestmentFields = {
  foundationDate: 'foundationDate',
  marketValue: 'marketValue',
  turnoverAmount: 'turnoverAmount',
  ebitdaAmount: 'ebitdaAmount',
  investment: 'investment',
  investmentId: 'investmentId'
} as const

/**
 * Equity Investment Form Fields
 */
export const EquityInvestmentFormFields = {
  // Base Entity Fields
  id: 'id',
  version: 'version',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  recordState: 'recordState',
  activeFrom: 'activeFrom',
  activeTo: 'activeTo',
  additionalProperties: 'additionalProperties',

  // Equity Investment Fields
  foundationDate: 'foundationDate',
  marketValue: 'marketValue',
  turnoverAmount: 'turnoverAmount',
  ebitdaAmount: 'ebitdaAmount',
  investmentId: 'investment'
} as const

/**
 * Create Equity Investment Descriptors
 */
export const createEquityInvestmentDescriptors = (
  fields: Record<keyof typeof EquityInvestmentFields, string> = EquityInvestmentFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'foundationDate', searchPaths: [fields.foundationDate], sortPath: fields.foundationDate, type: 'date' },
  { key: 'marketValue', searchPaths: [fields.marketValue], sortPath: fields.marketValue, type: 'number' },
  { key: 'turnoverAmount', searchPaths: [fields.turnoverAmount], sortPath: fields.turnoverAmount, type: 'number' },
  { key: 'ebitdaAmount', searchPaths: [fields.ebitdaAmount], sortPath: fields.ebitdaAmount, type: 'number' },
  { key: 'investmentId', path: fields.investmentId, kind: 'inIds' }
]

/**
 * Default Equity Investment Descriptors
 */
export const EQUITY_INVESTMENT_DESCRIPTORS = createEquityInvestmentDescriptors()
