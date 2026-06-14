import type { CustomerActivity } from '@/common/data/customer/types/customerActivityTypes'
import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'
import type { CustomerNote } from '@/common/data/customer/hooks/useCustomerNotes'

export type AccountJournalEntryType = 'activity' | 'note' | 'task' | 'approval'

export type AccountJournalSource = CustomerActivity | CustomerNote | CustomerTask

export interface AccountJournalEntry {
  id: string
  type: AccountJournalEntryType
  title: string
  description?: string
  createdAt?: string
  actorName?: string
  source: AccountJournalSource
}
