import React from 'react'
import { FormControl, FormItem, FormLabel, Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ActivityAssociationVariant } from './types'

/**
 * Read-only display of the entities linked to an activity.
 *
 * Used by the activity form in update mode where associations are intentionally
 * locked: the user cannot re-anchor an existing activity to a different
 * account/contact/opportunity/lead/investment/owner. The original ids are
 * round-tripped on save by the parent form.
 */
export interface ActivityAssociationsReadOnlyProps {
  variant: ActivityAssociationVariant
  /** The activity entity loaded from the backend (with populated relations). */
  activity:
    | (Record<string, any> & {
        account?: { id?: string; name?: string } | null
        contact?: { id?: string; firstName?: string; lastName?: string; displayName?: string } | null
        lead?: { id?: string; firstName?: string; lastName?: string; displayName?: string } | null
        opportunity?: { id?: string; name?: string } | null
        investment?: { id?: string; name?: string; code?: string } | null
        ownerEmployee?: { id?: string; displayName?: string; firstName?: string; lastName?: string } | null
      })
    | null
    | undefined
  ['data-testid']?: string
}

const fullName = (entity?: { firstName?: string; lastName?: string; displayName?: string } | null): string | null => {
  if (!entity) return null
  if (entity.displayName) return entity.displayName
  const composed = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim()
  return composed || null
}

const ReadOnlyEntityField: React.FC<{ label: React.ReactNode; value: string; dataTestId: string }> = ({
  label,
  value,
  dataTestId
}) => (
  <FormItem>
    <FormLabel>{label}</FormLabel>
    <FormControl>
      <Input value={value} disabled readOnly data-testid={dataTestId} />
    </FormControl>
  </FormItem>
)

export const ActivityAssociationsReadOnly: React.FC<ActivityAssociationsReadOnlyProps> = ({
  variant,
  activity,
  'data-testid': dataTestId = 'activity-associations-readonly'
}) => {
  if (!activity) return null

  const accountName = activity.account?.name ?? null
  const contactName = fullName(activity.contact)
  const leadName = fullName(activity.lead)
  const opportunityName = activity.opportunity?.name ?? null
  const investmentName = activity.investment?.name ?? activity.investment?.code ?? null

  const entries: Array<{ key: string; label: React.ReactNode; value: string }> = []

  if (accountName) {
    entries.push({
      key: 'account',
      label: getTranslationFromI18nKeyAndLabel('crm:salesActivity.relatedAccount', 'Related account'),
      value: accountName
    })
  }
  if (contactName) {
    entries.push({
      key: 'contact',
      label: getTranslationFromI18nKeyAndLabel('crm:salesActivity.relatedContact', 'Related contact'),
      value: contactName
    })
  }
  if (opportunityName) {
    entries.push({
      key: 'opportunity',
      label: getTranslationFromI18nKeyAndLabel('crm:salesActivity.relatedOpportunity', 'Related opportunity'),
      value: opportunityName
    })
  }
  if (leadName) {
    entries.push({
      key: 'lead',
      label: getTranslationFromI18nKeyAndLabel('crm:salesActivity.relatedLead', 'Related lead'),
      value: leadName
    })
  }
  if (variant === 'irm' && investmentName) {
    entries.push({
      key: 'investment',
      label: getTranslationFromI18nKeyAndLabel('crm:salesActivity.relatedInvestment', 'Related investment'),
      value: investmentName
    })
  }

  if (entries.length === 0) return null

  return (
    <div className="gba:space-y-4" data-testid={dataTestId}>
      {entries.map(entry => (
        <ReadOnlyEntityField
          key={entry.key}
          label={entry.label}
          value={entry.value}
          dataTestId={`${dataTestId}-${entry.key}`}
        />
      ))}
    </div>
  )
}

export default ActivityAssociationsReadOnly
