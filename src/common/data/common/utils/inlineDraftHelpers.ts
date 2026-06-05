/**
 * Helpers for splitting inline-create draft entries inside accountContacts arrays.
 *
 * Forms that allow inline creation of nested entities (contacts inside an account form, or
 * accounts inside a contact form) store draft entries with `__isDraft: true`, an embedded
 * full entity payload (`account` or `contact`) and an opaque client-side `__draftId`. The
 * combined-create backend endpoint expects draft-created entities as top-level arrays
 * (`contacts` / `accounts`). Existing selected associations are the only rows that should
 * remain in the parent entity's `accountContacts`.
 */

import { v4 as uuidv4 } from 'uuid'

type EntityBuilder<T = any> = (entity: T) => Record<string, unknown>
type SubmissionPayload = Record<string, unknown> & { changeMode: 'INSERT' | 'UPDATE' }

interface AccountFormSubmissionOptions {
  data: any
  accountBuilder: EntityBuilder
  contactBuilder: EntityBuilder
  accountCollectionName: string
  contactCollectionName: string
}

interface ContactFormSubmissionOptions {
  data: any
  contactBuilder: EntityBuilder
  accountBuilder: EntityBuilder
  contactCollectionName: string
  accountCollectionName: string
}

/**
 * Strip the outer wrapper that the per-entity builders attach (e.g. `{ account: {...} }`,
 * `{ investmentAccount: {...} }`, `{ contact: {...} }`, `{ investmentContact: {...} }`).
 * Falls back to returning the value as-is when no recognized wrapper key is present.
 */
const unwrap = (built: any, kind: 'account' | 'contact'): Record<string, unknown> => {
  if (!built || typeof built !== 'object') return built
  if (kind === 'account') {
    return built.account ?? built.investmentAccount ?? built
  }
  return built.contact ?? built.investmentContact ?? built
}

export interface SplitAccountContactDraftsResult {
  /** Existing selected associations only. `undefined` means omit `accountContacts` from payload. */
  existingAccountContacts?: any[]
  /** Draft rows created from an account form's inline contact dialog. */
  draftContactEntries: any[]
  /** Draft rows created from a contact form's inline account dialog. */
  draftAccountEntries: any[]
}

/**
 * Sanitize an existing (non-draft) accountContact entry before it is sent to the backend.
 *
 * - Strips client-only draft markers (`__draft`, `__isDraft`, `__draftId`).
 * - Collapses the `contact` and `account` fields to their UUID when the form has loaded
 *   them as full objects from the API (the backend only accepts UUIDs, not embedded objects).
 */
const sanitizeExistingAccountContact = (entry: any): any => {
  const { contact, account, ...rest } = entry
  return {
    ...rest,
    ...(contact ? { contact: typeof contact === 'object' ? contact.id : contact } : {}),
    ...(account ? { account: typeof account === 'object' ? account.id : account } : {})
  }
}

/**
 * Split an `accountContacts` array into existing association rows and inline-created drafts.
 *
 * - Existing rows stay under the parent entity's `accountContacts`.
 * - Draft contact/account rows are lifted by form submit handlers to top-level arrays.
 * - Draft markers (`__isDraft`, `__draftId`) must never be shipped.
 */
export const splitAccountContactDrafts = (entries: any[] | undefined): SplitAccountContactDraftsResult => {
  const result: SplitAccountContactDraftsResult = {
    existingAccountContacts: undefined,
    draftContactEntries: [],
    draftAccountEntries: []
  }

  if (!entries?.length) {
    // Empty array means the user explicitly cleared all contacts — signal deletion with [].
    // undefined/null means the field was never part of the form — omit it from the payload.
    if (Array.isArray(entries)) {
      result.existingAccountContacts = []
    }
    return result
  }

  const existingAccountContacts: any[] = []

  entries.forEach(entry => {
    if (!entry?.__isDraft) {
      existingAccountContacts.push(sanitizeExistingAccountContact(entry))
      return
    }

    if (entry.contact) {
      result.draftContactEntries.push(entry)
    } else if (entry.account) {
      result.draftAccountEntries.push(entry)
    }
  })

  result.existingAccountContacts = existingAccountContacts.length ? existingAccountContacts : undefined

  return result
}

/**
 * Lift inline-created contact drafts to top-level entities while preserving their chosen
 * relationship type.
 *
 * Returns both the top-level contact payloads (each tagged with a `clientId`) and the matching
 * account-side association rows (`{ contactClientId, contactType }`). The backend correlates the
 * two via the shared client id, creating a single, correctly-typed association instead of an
 * untyped auto-link.
 */
const buildCorrelatedDraftContacts = (
  draftEntries: any[],
  contactBuilder: EntityBuilder
): { contacts: Record<string, unknown>[]; draftAssociations: Record<string, unknown>[] } => {
  const contacts: Record<string, unknown>[] = []
  const draftAssociations: Record<string, unknown>[] = []

  draftEntries.forEach(entry => {
    const builtContact = unwrap(contactBuilder(entry.contact), 'contact')
    if (!builtContact) return

    const clientId: string = entry.__draftId
    contacts.push({ ...builtContact, clientId })
    draftAssociations.push({ contactClientId: clientId, contactType: entry.contactType ?? null })
  })

  return { contacts, draftAssociations }
}

/**
 * Lift inline-created account drafts to top-level entities while preserving their chosen
 * relationship type — the mirror of `buildCorrelatedDraftContacts` for the contact form.
 *
 * Unlike the contact drafts (where the typed junction lives on the parent account and references
 * the contact via `contactClientId`), the backend's `accountContact` junction only understands a
 * `contactClientId` correlation key — there is no `accountClientId`. So we keep the typed junction
 * on the account side and reference the parent contact instead: a new contact via `contactClientId`
 * (correlated to the parent contact's `clientId`), or an existing contact via its `contact` id.
 *
 * This produces the same payload contract that already works for the account form, just initiated
 * from the contact form. Without it the combined-create endpoint auto-links a bare top-level
 * account and the chosen type is lost (always `contactType: null`).
 */
const buildCorrelatedDraftAccounts = (
  draftEntries: any[],
  accountBuilder: EntityBuilder,
  contactReference: Record<string, unknown>
): Record<string, unknown>[] => {
  return draftEntries
    .map(entry => {
      const builtAccount = unwrap(accountBuilder(entry.account), 'account')
      if (!builtAccount) return null

      const accountRecord = builtAccount as { accountContacts?: unknown[] }
      const currentAssociations = Array.isArray(accountRecord.accountContacts) ? accountRecord.accountContacts : []
      accountRecord.accountContacts = [
        ...currentAssociations,
        { ...contactReference, contactType: entry.contactType ?? null }
      ]
      return builtAccount
    })
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
}

export const buildAccountFormSubmissionPayload = ({
  data,
  accountBuilder,
  contactBuilder,
  accountCollectionName,
  contactCollectionName
}: AccountFormSubmissionOptions): SubmissionPayload => {
  const { existingAccountContacts, draftContactEntries } = splitAccountContactDrafts(data.accountContacts)
  const account = unwrap(
    accountBuilder({
      ...data,
      accountContacts: existingAccountContacts
    }),
    'account'
  )

  // Lift each inline-created contact to the top-level array, tagging it with a stable `clientId`.
  // For every lifted contact we also add an account-side association row that references it via
  // `contactClientId` plus the chosen `contactType`. This is what lets a brand-new contact keep
  // its relationship type: the combined-create backend only honors a `contactType` on an
  // account-side row correlated by `contactClientId`. Letting the backend auto-link a bare
  // top-level contact instead always yields a `contactType: null` association.
  //
  // The association rows are appended AFTER `accountBuilder` runs on purpose: `buildPayload`
  // recursively strips any `*Id` suffix (so `contactClientId` would be mangled to `contactClient`).
  const { contacts, draftAssociations } = buildCorrelatedDraftContacts(draftContactEntries, contactBuilder)
  if (draftAssociations.length) {
    const accountRecord = account as { accountContacts?: unknown[] }
    const currentAssociations = Array.isArray(accountRecord.accountContacts) ? accountRecord.accountContacts : []
    accountRecord.accountContacts = [...currentAssociations, ...draftAssociations]
  }

  return {
    [accountCollectionName]: [account],
    ...(contacts.length ? { [contactCollectionName]: contacts } : {}),
    changeMode: data.id ? 'UPDATE' : 'INSERT'
  }
}

export const buildContactFormSubmissionPayload = ({
  data,
  contactBuilder,
  accountBuilder,
  contactCollectionName,
  accountCollectionName
}: ContactFormSubmissionOptions): SubmissionPayload => {
  const { existingAccountContacts, draftAccountEntries } = splitAccountContactDrafts(data.accountContacts)
  const contact = unwrap(
    contactBuilder({
      ...data,
      accountContacts: existingAccountContacts
    }),
    'contact'
  )

  // Each inline-created account is lifted to the top-level array. To keep its chosen relationship
  // type, the typed junction is placed on the ACCOUNT side (`account.accountContacts`) referencing
  // the parent contact — mirroring the working account-form contract. The backend's junction only
  // supports a `contactClientId` correlation key (there is no `accountClientId`), so:
  //   - new contact (INSERT): tag the parent contact with a `clientId` and reference it via
  //     `contactClientId`;
  //   - existing contact (UPDATE): reference it directly via its `contact` id.
  // The junction is attached AFTER the builders run because `buildPayload` strips any `*Id` suffix.
  const contactReference: Record<string, unknown> = data.id ? { contact: data.id } : { contactClientId: uuidv4() }

  if (!data.id && draftAccountEntries.length > 0) {
    const contactRecord = contact as Record<string, unknown>
    contactRecord.clientId = contactReference.contactClientId
  }

  const accounts = buildCorrelatedDraftAccounts(draftAccountEntries, accountBuilder, contactReference)

  return {
    [contactCollectionName]: [contact],
    ...(accounts.length ? { [accountCollectionName]: accounts } : {}),
    changeMode: data.id ? 'UPDATE' : 'INSERT'
  }
}
