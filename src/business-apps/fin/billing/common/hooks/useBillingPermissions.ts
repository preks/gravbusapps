/**
 * Billing permission resolution.
 *
 * Roles are provided by the platform via context.additionalData.roles /
 * permissions. We map those to the billing action permissions. When nothing is
 * provided we fall back to a finance-user default that allows day-to-day work
 * but not settings editing.
 */
import { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BILLING_PERMISSIONS, type BillingPermission } from '../constants'

const FINANCE_USER_DEFAULTS: BillingPermission[] = [
  BILLING_PERMISSIONS.CREATE_DRAFT,
  BILLING_PERMISSIONS.ISSUE,
  BILLING_PERMISSIONS.CANCEL,
  BILLING_PERMISSIONS.CREATE_CREDIT_NOTE,
  BILLING_PERMISSIONS.MARK_PAID,
  BILLING_PERMISSIONS.EXPORT
]

function extractPermissions(context: BusinessAppContextProps): Set<string> {
  const raw = context.additionalData?.permissions ?? context.additionalData?.roles
  if (Array.isArray(raw)) {
    return new Set(raw.map(String))
  }
  return new Set(FINANCE_USER_DEFAULTS)
}

export interface BillingPermissions {
  has: (permission: BillingPermission) => boolean
  canCreateDraft: boolean
  canIssue: boolean
  canCancel: boolean
  canCreateCreditNote: boolean
  canMarkPaid: boolean
  canEditSettings: boolean
  canExport: boolean
}

export function useBillingPermissions(context: BusinessAppContextProps): BillingPermissions {
  return useMemo<BillingPermissions>(() => {
    const granted = extractPermissions(context)
    const has = (permission: BillingPermission) => granted.has(permission)
    return {
      has,
      canCreateDraft: has(BILLING_PERMISSIONS.CREATE_DRAFT),
      canIssue: has(BILLING_PERMISSIONS.ISSUE),
      canCancel: has(BILLING_PERMISSIONS.CANCEL),
      canCreateCreditNote: has(BILLING_PERMISSIONS.CREATE_CREDIT_NOTE),
      canMarkPaid: has(BILLING_PERMISSIONS.MARK_PAID),
      canEditSettings: has(BILLING_PERMISSIONS.EDIT_SETTINGS),
      canExport: has(BILLING_PERMISSIONS.EXPORT)
    }
  }, [context])
}
