import {
  type FileEntity,
  FILE_ENTITY as BASE_ENTITY,
  FILE_CONTEXT as BASE_CONTEXT
} from '@/common/data/relations/constants/relationConstants'

export const APP_NAME = 'customerRelations'
export const FILE_ENTITY = {
  ...BASE_ENTITY,
  CAMPAIGN: 'campaigns' as FileEntity
} as const

export const FILE_CONTEXT = {
  ...BASE_CONTEXT
} as const
