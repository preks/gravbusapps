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
 * Build top-level draft entity arrays from draft association rows. The backend infers the
 * association for bulk create requests, so only the lifted entity payload is returned.
 */
export const buildTopLevelDraftEntities = (
  draftEntries: any[],
  kind: 'account' | 'contact',
  builder: EntityBuilder
): Record<string, unknown>[] => {
  return draftEntries
    .map(entry => {
      const entity = entry?.[kind]
      if (!entity) return null

      return unwrap(builder(entity), kind)
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
  const contacts = buildTopLevelDraftEntities(draftContactEntries, 'contact', contactBuilder)

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
  const accounts = buildTopLevelDraftEntities(draftAccountEntries, 'account', accountBuilder)

  return {
    [contactCollectionName]: [contact],
    ...(accounts.length ? { [accountCollectionName]: accounts } : {}),
    changeMode: data.id ? 'UPDATE' : 'INSERT'
  }
}
