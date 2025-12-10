import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Investment } from './investmentTypes.new'

/**
 * Liquid Fund Investment Type
 */
export interface LiquidFundInvestment extends BaseEntity {
  id?: string
  proprietorName?: string
  bankName?: string
  bankAccountNumber?: string
  earlyTerminationAllowed?: boolean
  interestRate?: number
  maturityDate?: string
  investmentLiquidFundType?: CatalogEntry
  investmentLiquidFundTypeRef?: string
  interestPaymentFrequency?: CatalogEntry
  interestPaymentFrequencyRef?: string
  investment?: Investment
  investmentId?: string
}

/**
 * Liquid Fund Investment Fields
 */
export const LiquidFundInvestmentFields = {
  id: 'id',
  version: 'version',
  additionalProperties: 'additionalProperties',
  proprietorName: 'proprietorName',
  bankName: 'bankName',
  bankAccountNumber: 'bankAccountNumber',
  earlyTerminationAllowed: 'earlyTerminationAllowed',
  interestRate: 'interestRate',
  maturityDate: 'maturityDate',
  investmentLiquidFundType: 'investmentLiquidFundType',
  investmentLiquidFundTypeRef: 'investmentLiquidFundTypeRef',
  interestPaymentFrequency: 'interestPaymentFrequency',
  interestPaymentFrequencyRef: 'interestPaymentFrequencyRef',
  investment: 'investment',
  investmentId: 'investmentId'
} as const

/**
 * Liquid Fund Investment Form Fields
 */
export const LiquidFundInvestmentFormFields = {
  // Base Entity Fields
  id: 'id',
  version: 'version',
  additionalProperties: 'additionalProperties',

  // Liquid Fund Investment Fields
  proprietorName: 'proprietorName',
  bankName: 'bankName',
  bankAccountNumber: 'bankAccountNumber',
  earlyTerminationAllowed: 'earlyTerminationAllowed',
  interestRate: 'interestRate',
  maturityDate: 'maturityDate',
  investmentLiquidFundTypeRef: 'investmentLiquidFundTypeRef',
  interestPaymentFrequencyRef: 'interestPaymentFrequencyRef',
  investmentId: 'investment'
} as const

/**
 * Create Liquid Fund Investment Descriptors
 */
export const createLiquidFundInvestmentDescriptors = (
  fields: Record<keyof typeof LiquidFundInvestmentFields, string> = LiquidFundInvestmentFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'proprietorName', searchPaths: [fields.proprietorName], sortPath: fields.proprietorName, type: 'text' },
  { key: 'bankName', searchPaths: [fields.bankName], sortPath: fields.bankName, type: 'text' },
  {
    key: 'bankAccountNumber',
    searchPaths: [fields.bankAccountNumber],
    sortPath: fields.bankAccountNumber,
    type: 'text'
  },
  {
    key: 'earlyTerminationAllowed',
    searchPaths: [fields.earlyTerminationAllowed],
    sortPath: fields.earlyTerminationAllowed,
    type: 'boolean'
  },
  { key: 'interestRate', searchPaths: [fields.interestRate], sortPath: fields.interestRate, type: 'number' },
  { key: 'maturityDate', searchPaths: [fields.maturityDate], sortPath: fields.maturityDate, type: 'date' },
  {
    key: 'investmentLiquidFundType',
    searchPaths: [`${fields.investmentLiquidFundType}.value`, `${fields.investmentLiquidFundType}.code`],
    sortPath: `${fields.investmentLiquidFundType}.value`,
    type: 'text'
  },
  {
    key: 'interestPaymentFrequency',
    searchPaths: [`${fields.interestPaymentFrequency}.value`, `${fields.interestPaymentFrequency}.code`],
    sortPath: `${fields.interestPaymentFrequency}.value`,
    type: 'text'
  },
  {
    key: 'investmentLiquidFundTypeIds',
    path: fields.investmentLiquidFundTypeRef,
    filterLabel: 'Liquid Fund Type',
    optionSelectPaths: [`${fields.investmentLiquidFundType}.id`, `${fields.investmentLiquidFundType}.value`],
    optionSearchPaths: [`${fields.investmentLiquidFundType}.value`, `${fields.investmentLiquidFundType}.code`],
    optionDistinctOn: [fields.investmentLiquidFundTypeRef],
    kind: 'inIds'
  },
  {
    key: 'interestPaymentFrequencyIds',
    path: fields.interestPaymentFrequencyRef,
    filterLabel: 'Interest Payment Frequency',
    optionSelectPaths: [`${fields.interestPaymentFrequency}.id`, `${fields.interestPaymentFrequency}.value`],
    optionSearchPaths: [`${fields.interestPaymentFrequency}.value`, `${fields.interestPaymentFrequency}.code`],
    optionDistinctOn: [fields.interestPaymentFrequencyRef],
    kind: 'inIds'
  },
  { key: 'investmentId', path: fields.investmentId, kind: 'inIds' }
]

/**
 * Default Liquid Fund Investment Descriptors
 */
export const LIQUID_FUND_INVESTMENT_DESCRIPTORS = createLiquidFundInvestmentDescriptors()
