/**
 * useCustomerRoot — resolves the polymorphic Customer360 subject.
 *
 * Reads `?type=account|contact` + `?id=<uuid>` and normalizes the matching
 * Account or Contact into a single `Customer360Subject`. Both underlying hooks
 * are always called (Rules of Hooks); the non-active one receives `undefined`
 * and therefore skips fetching.
 */
import { useMemo } from 'react'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import type { Customer360Subject, CustomerSubjectType } from './types'

export interface UseCustomerRootResult {
  subject: Customer360Subject | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function buildContactName(firstName?: string, lastName?: string, fullName?: string): string {
  if (fullName) return fullName
  const joined = [firstName, lastName].filter(Boolean).join(' ').trim()
  return joined || 'Unknown Contact'
}

export function useCustomerRoot(
  accessToken: string,
  type: CustomerSubjectType,
  id: string | undefined
): UseCustomerRootResult {
  const isAccount = type === 'account'

  const accountResult = useCustomerAccount(accessToken, isAccount ? id : undefined)
  const contactResult = useCustomerContact(accessToken, isAccount ? undefined : id)

  const subject = useMemo<Customer360Subject | null>(() => {
    if (isAccount) {
      const account = accountResult.account
      if (!account?.id) return null
      return {
        id: account.id,
        type: 'account',
        displayName: account.name || 'Unknown Account',
        status: account.prospective ? 'prospective' : 'active',
        ownerId: account.ownerEmployeeId,
        account
      }
    }

    const contact = contactResult.contact
    if (!contact?.id) return null
    return {
      id: contact.id,
      type: 'contact',
      displayName: buildContactName(contact.firstName, contact.lastName, contact.fullName),
      ownerId: contact.ownerEmployeeId,
      contact
    }
  }, [isAccount, accountResult.account, contactResult.contact])

  const loading = isAccount ? accountResult.loading : contactResult.loading
  const error = isAccount ? accountResult.error : contactResult.error
  const refetch = isAccount ? accountResult.refetch : contactResult.refetch

  return { subject, loading, error, refetch }
}
