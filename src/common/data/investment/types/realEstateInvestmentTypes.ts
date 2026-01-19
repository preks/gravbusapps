import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Investment } from './investmentTypes.new'

/**
 * Real Estate Investment Type
 */
export interface RealEstateInvestment extends BaseEntity {
  id?: string
  buildingYear?: string
  numberOfUnits?: number
  annualNetColdRent?: number
  actualAnnualExpenses?: number
  targetAnnualExpenses?: number
  funding?: number
  occupancyPercent?: number
  size?: number
  locality?: string
  postalCode?: string
  addressLine?: any
  liquidityForecast?: any
  sizeMeasurementUnit?: CatalogEntry
  sizeMeasurementUnitRef?: string
  country?: CatalogEntry
  countryRef?: string
  region?: CatalogEntry
  regionRef?: string
  investment?: Investment
  investmentId?: string
}

/**
 * Real Estate Investment Fields
 */
export const RealEstateInvestmentFields = {
  buildingYear: 'buildingYear',
  numberOfUnits: 'numberOfUnits',
  annualNetColdRent: 'annualNetColdRent',
  actualAnnualExpenses: 'actualAnnualExpenses',
  targetAnnualExpenses: 'targetAnnualExpenses',
  funding: 'funding',
  occupancyPercent: 'occupancyPercent',
  size: 'size',
  locality: 'locality',
  postalCode: 'postalCode',
  addressLine: 'addressLine',
  liquidityForecast: 'liquidityForecast',
  sizeMeasurementUnit: 'sizeMeasurementUnit',
  sizeMeasurementUnitRef: 'sizeMeasurementUnitRef',
  country: 'country',
  countryRef: 'countryRef',
  region: 'region',
  regionRef: 'regionRef',
  investment: 'investment',
  investmentId: 'investmentId'
} as const

/**
 * Real Estate Investment Form Fields
 */
export const RealEstateInvestmentFormFields = {
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

  // Real Estate Investment Fields
  buildingYear: 'buildingYear',
  numberOfUnits: 'numberOfUnits',
  annualNetColdRent: 'annualNetColdRent',
  actualAnnualExpenses: 'actualAnnualExpenses',
  targetAnnualExpenses: 'targetAnnualExpenses',
  funding: 'funding',
  occupancyPercent: 'occupancyPercent',
  size: 'size',
  locality: 'locality',
  postalCode: 'postalCode',
  addressLine: 'addressLine',
  liquidityForecast: 'liquidityForecast',
  sizeMeasurementUnitRef: 'sizeMeasurementUnitRef',
  countryRef: 'countryRef',
  regionRef: 'regionRef',
  investmentId: 'investment'
} as const

/**
 * Create Real Estate Investment Descriptors
 */
export const createRealEstateInvestmentDescriptors = (
  fields: Record<keyof typeof RealEstateInvestmentFields, string> = RealEstateInvestmentFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'buildingYear', searchPaths: [fields.buildingYear], sortPath: fields.buildingYear, type: 'text' },
  { key: 'numberOfUnits', searchPaths: [fields.numberOfUnits], sortPath: fields.numberOfUnits, type: 'number' },
  {
    key: 'annualNetColdRent',
    searchPaths: [fields.annualNetColdRent],
    sortPath: fields.annualNetColdRent,
    type: 'number'
  },
  {
    key: 'actualAnnualExpenses',
    searchPaths: [fields.actualAnnualExpenses],
    sortPath: fields.actualAnnualExpenses,
    type: 'number'
  },
  {
    key: 'targetAnnualExpenses',
    searchPaths: [fields.targetAnnualExpenses],
    sortPath: fields.targetAnnualExpenses,
    type: 'number'
  },
  { key: 'funding', searchPaths: [fields.funding], sortPath: fields.funding, type: 'number' },
  {
    key: 'occupancyPercent',
    searchPaths: [fields.occupancyPercent],
    sortPath: fields.occupancyPercent,
    type: 'number'
  },
  { key: 'size', searchPaths: [fields.size], sortPath: fields.size, type: 'number' },
  { key: 'locality', searchPaths: [fields.locality], sortPath: fields.locality, type: 'text' },
  { key: 'postalCode', searchPaths: [fields.postalCode], sortPath: fields.postalCode, type: 'text' },
  {
    key: 'sizeMeasurementUnit',
    searchPaths: [`${fields.sizeMeasurementUnit}.value`, `${fields.sizeMeasurementUnit}.code`],
    sortPath: `${fields.sizeMeasurementUnit}.value`,
    type: 'text'
  },
  {
    key: 'country',
    searchPaths: [`${fields.country}.value`, `${fields.country}.code`],
    sortPath: `${fields.country}.value`,
    type: 'text'
  },
  {
    key: 'region',
    searchPaths: [`${fields.region}.value`, `${fields.region}.code`],
    sortPath: `${fields.region}.value`,
    type: 'text'
  },
  {
    key: 'sizeMeasurementUnitIds',
    path: fields.sizeMeasurementUnitRef,
    filterLabel: 'Size Measurement Unit',
    optionSelectPaths: [`${fields.sizeMeasurementUnit}.id`, `${fields.sizeMeasurementUnit}.value`],
    optionSearchPaths: [`${fields.sizeMeasurementUnit}.value`, `${fields.sizeMeasurementUnit}.code`],
    optionDistinctOn: [fields.sizeMeasurementUnitRef],
    kind: 'inIds'
  },
  {
    key: 'countryIds',
    path: fields.countryRef,
    filterLabel: 'Country',
    optionSelectPaths: [`${fields.country}.id`, `${fields.country}.value`],
    optionSearchPaths: [`${fields.country}.value`, `${fields.country}.code`],
    optionDistinctOn: [fields.countryRef],
    kind: 'inIds'
  },
  {
    key: 'regionIds',
    path: fields.regionRef,
    filterLabel: 'Region',
    optionSelectPaths: [`${fields.region}.id`, `${fields.region}.value`],
    optionSearchPaths: [`${fields.region}.value`, `${fields.region}.code`],
    optionDistinctOn: [fields.regionRef],
    kind: 'inIds'
  },
  { key: 'investmentId', path: fields.investmentId, kind: 'inIds' }
]

/**
 * Default Real Estate Investment Descriptors
 */
export const REAL_ESTATE_INVESTMENT_DESCRIPTORS = createRealEstateInvestmentDescriptors()
