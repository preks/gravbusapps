/**
 * Primary entity anchor for optional secondary account/contact activity pickers.
 * CRM uses account | contact | opportunity; IRM adds investment.
 */
export type ActivityAssociationAnchor =
  | { type: 'account'; id: string }
  | { type: 'contact'; id: string }
  | { type: 'opportunity'; id: string }
  | { type: 'investment'; id: string }

/** Subset used by customer (CRM) data hooks — no investment anchor. */
export type CrmActivityAssociationAnchor = Extract<
  ActivityAssociationAnchor,
  { type: 'account' | 'contact' | 'opportunity' }
>

export type ActivityAssociationFormValues = {
  relatedEntityId?: string | null
  accountId?: string | null
  contactId?: string | null
  opportunityId?: string | null
  leadId?: string | null
  investmentId?: string | null
}

export type ActivityAssociationVariant = 'crm' | 'irm'

/** Options for optional “related investment” combobox (IRM activity association). */
export type InvestmentAssociationSelectOption = {
  id: string
  value: string
  label: string
  name: string
}
