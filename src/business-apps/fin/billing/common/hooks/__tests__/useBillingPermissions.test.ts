/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react'
import { useBillingPermissions } from '../useBillingPermissions'
import { BILLING_PERMISSIONS } from '../../constants'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

function context(additionalData?: Record<string, unknown>): BusinessAppContextProps {
  return { accessToken: 'token', additionalData }
}

describe('useBillingPermissions', () => {
  it('grants exactly the permissions present in additionalData.permissions', () => {
    const { result } = renderHook(() =>
      useBillingPermissions(context({ permissions: [BILLING_PERMISSIONS.ISSUE, BILLING_PERMISSIONS.EDIT_SETTINGS] }))
    )
    expect(result.current.canIssue).toBe(true)
    expect(result.current.canEditSettings).toBe(true)
    expect(result.current.canCancel).toBe(false)
    expect(result.current.canExport).toBe(false)
  })

  it('falls back to finance-user defaults (no settings editing) when none provided', () => {
    const { result } = renderHook(() => useBillingPermissions(context()))
    expect(result.current.canCreateDraft).toBe(true)
    expect(result.current.canIssue).toBe(true)
    expect(result.current.canMarkPaid).toBe(true)
    expect(result.current.canExport).toBe(true)
    expect(result.current.canEditSettings).toBe(false)
  })

  it('reads from roles when permissions are absent', () => {
    const { result } = renderHook(() => useBillingPermissions(context({ roles: [BILLING_PERMISSIONS.CANCEL] })))
    expect(result.current.canCancel).toBe(true)
    expect(result.current.canIssue).toBe(false)
  })

  it('exposes a has() helper', () => {
    const { result } = renderHook(() => useBillingPermissions(context({ permissions: [BILLING_PERMISSIONS.EXPORT] })))
    expect(result.current.has(BILLING_PERMISSIONS.EXPORT)).toBe(true)
    expect(result.current.has(BILLING_PERMISSIONS.ISSUE)).toBe(false)
  })
})
