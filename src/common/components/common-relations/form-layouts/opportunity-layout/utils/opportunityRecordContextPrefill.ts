import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form'

export interface OpportunityFormContextIds {
  accountId: string | null
  contactId: string | null
}

export const getOpportunityFormContextIds = (
  additionalData?: Record<string, unknown> | null
): OpportunityFormContextIds => {
  const initialParameters = additionalData?.psi_taskPayload as
    | { psi_initialParameters?: Record<string, unknown> }
    | undefined
  const psiParams = initialParameters?.psi_initialParameters

  return {
    accountId: (additionalData?.accountId ?? psiParams?.accountId ?? null) as string | null,
    contactId: (additionalData?.contactId ?? psiParams?.contactId ?? null) as string | null
  }
}

export const buildContextOpportunityAccounts = (
  accountId: string | null | undefined,
  account?: { id: string; name?: string; displayName?: string; pictureThumbnail?: string; website?: string } | null
): Array<Record<string, unknown>> | undefined => {
  if (!accountId) return undefined
  if (account?.id) {
    return [{ accountId: account.id, account }]
  }
  return [{ accountId }]
}

export const buildContextOpportunityContacts = (
  contactId: string | null | undefined,
  contact?: { id: string; firstName?: string; lastName?: string; displayName?: string } | null
): Array<Record<string, unknown>> | undefined => {
  if (!contactId) return undefined
  if (contact?.id) {
    return [{ contactId: contact.id, contact }]
  }
  return [{ contactId }]
}

export const getCreateModeOpportunityAssociationDefaults = (
  contextIds: OpportunityFormContextIds
): Record<string, unknown> => ({
  ...(contextIds.accountId ? { opportunityAccounts: [{ accountId: contextIds.accountId }] } : {}),
  ...(contextIds.contactId ? { opportunityContacts: [{ contactId: contextIds.contactId }] } : {})
})

export const applyOpportunityAssociationDefaultsToForm = (
  form: {
    getValues: UseFormGetValues<Record<string, unknown>>
    setValue: UseFormSetValue<Record<string, unknown>>
  },
  contextIds: OpportunityFormContextIds
): void => {
  if (contextIds.accountId) {
    const rows = (form.getValues('opportunityAccounts') as Array<{ accountId?: string }>) || []
    if (!rows.some(row => row.accountId === contextIds.accountId)) {
      form.setValue('opportunityAccounts', [...rows, { accountId: contextIds.accountId }], { shouldDirty: false })
    }
  }

  if (contextIds.contactId) {
    const rows = (form.getValues('opportunityContacts') as Array<{ contactId?: string }>) || []
    if (!rows.some(row => row.contactId === contextIds.contactId)) {
      form.setValue('opportunityContacts', [...rows, { contactId: contextIds.contactId }], { shouldDirty: false })
    }
  }
}
