import {
  type FileEntity,
  FILE_ENTITY as BASE_ENTITY,
  FILE_CONTEXT as BASE_CONTEXT
} from '@/common/data/relations/constants/relationConstants'
import type { InvestmentReferenceEntityType } from '../utils/referenceEntityUtils'
import { TASK_TYPE } from './investmentCatalogs'

/** Approval task type ref derived from task type catalog (TASK_TYPE + ":APPROVAL"). */
export const APPROVAL_TASK_TYPE_REF = `${TASK_TYPE}:APPROVAL`

export const APP_NAME = 'investmentRelations'
export const FILE_ENTITY = {
  ...BASE_ENTITY,
  INVESTMENT: 'investments' as FileEntity
} as const

export const FILE_CONTEXT = {
  ...BASE_CONTEXT
} as const

/**
 * Investment Group Codes
 */
export enum InvestmentGroupCode {
  EQUITY = 'EQUITY',
  REAL_ESTATE = 'REAL_ESTATE',
  LIQUID_FUND = 'LIQUID_FUND'
}

/**
 * Maps reference entity type to FILE_ENTITY constant
 */
export const getFileEntityFromType = (
  referenceEntityType: InvestmentReferenceEntityType
): (typeof FILE_ENTITY)[keyof typeof FILE_ENTITY] => {
  switch (referenceEntityType) {
    case 'investment':
      return FILE_ENTITY.INVESTMENT
    case 'account':
      return FILE_ENTITY.ACCOUNT
    case 'contact':
      return FILE_ENTITY.CONTACT
    case 'lead':
      return FILE_ENTITY.LEAD
    case 'opportunity':
      return FILE_ENTITY.OPPORTUNITY
    default:
      return FILE_ENTITY.UNKNOWN
  }
}
