export type { FileEntity, FileContext } from '@/common/utils/fileUtils'

export const FILE_ENTITY = {
  UNKNOWN: 'unknown' as FileEntity,
  ACCOUNT: 'accounts' as FileEntity,
  CONTACT: 'contacts' as FileEntity,
  LEAD: 'leads' as FileEntity,
  OPPORTUNITY: 'opportunities' as FileEntity,
  INVESTMENT: 'investments' as FileEntity
} as const

export const FILE_CONTEXT = {
  UNKNOWN: 'unknown' as FileContext,
  PICTURE: 'pictures' as FileContext,
  ACTIVITY: 'activities' as FileContext,
  NOTE: 'notes' as FileContext,
  TASK: 'tasks' as FileContext,
  DOCUMENT: 'documents' as FileContext
} as const
