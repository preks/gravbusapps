import type { AccountSegmentOption } from '@/common/components/common-relations/form-segments/account-segment'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'

/**
 * Maps customer accounts returned by an account selector hook into the option shape consumed by
 * `AccountSegment`. Accounts without an id are dropped so downstream field-array rows always have a
 * stable key. Shared by the campaign form, event form and add-account popups to avoid duplicating
 * this mapping in every consumer.
 */
export function toAccountSegmentOptions(accounts: CustomerAccount[] | undefined): AccountSegmentOption[] {
  if (!accounts) return []
  return accounts
    .filter(account => account.id)
    .map(account => ({
      id: account.id!,
      value: account.id!,
      label: account.name || 'Unknown Account',
      name: account.name || 'Unknown Account',
      pictureThumbnail: account.pictureThumbnail,
      extraInfo: { website: account.website }
    }))
}
