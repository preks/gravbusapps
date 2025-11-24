import {
  type FileEntity,
  FILE_ENTITY as BASE_ENTITY,
  FILE_CONTEXT as BASE_CONTEXT
} from '@/common/data/relations/constants/relationConstants'
import type { CustomerReferenceEntityType } from '../utils/referenceEntityUtils'

export const APP_NAME = 'customerRelations'
export const FILE_ENTITY = {
  ...BASE_ENTITY,
  CAMPAIGN: 'campaigns' as FileEntity
} as const

export const FILE_CONTEXT = {
  ...BASE_CONTEXT
} as const

/**
 * Maps reference entity type to FILE_ENTITY constant
 */
export const getFileEntityFromType = (
  referenceEntityType: CustomerReferenceEntityType
): (typeof FILE_ENTITY)[keyof typeof FILE_ENTITY] => {
  switch (referenceEntityType) {
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
