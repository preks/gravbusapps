import React, { useEffect, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@newwork/nw-design-system'
import { ContactSelect } from '@/common/components/common-relations/selects/contact-select'
import { AccountSelect } from '@/common/components/common-relations/selects/account-select'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { EntityOption } from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'
import { useCrmActivityAssociationOptions } from '@/common/data/customer/hooks/useCrmActivityAssociationOptions'
import { useIrmActivityAssociationOptions } from '@/common/data/investment/hooks/useIrmActivityAssociationOptions'
import type { ActivityAssociationVariant, CrmActivityAssociationAnchor } from './types'
import { primaryIdFieldForEntityType, resolveActivityAssociationAnchor } from './resolveActivityAssociationAnchor'
import { ActivityAssociationInvestmentSelect } from './ActivityAssociationInvestmentSelect'
import { selectOnChangeToId } from './activityAssociationSelectUtils'
import { useActivityAssociationComboLists } from './useActivityAssociationComboLists'

export interface ActivityAssociationFieldsProps {
  variant: ActivityAssociationVariant
  accessToken: string | null | undefined
  entitySearchOptions?: EntityOption[]
  ['data-testid']?: string
}

/**
 * Optional secondary account/contact/investment pickers for activities (CRM + IRM).
 */
export const ActivityAssociationFields: React.FC<ActivityAssociationFieldsProps> = ({
  variant,
  accessToken,
  entitySearchOptions,
  'data-testid': dataTestId = 'activity-association-fields'
}) => {
  const supportsInvestment = variant === 'irm'
  const form = useFormContext()
  const relatedEntityId = useWatch({ control: form.control, name: 'relatedEntityId' })
  const accountId = useWatch({ control: form.control, name: 'accountId' })
  const contactId = useWatch({ control: form.control, name: 'contactId' })
  const opportunityId = useWatch({ control: form.control, name: 'opportunityId' })
  const leadId = useWatch({ control: form.control, name: 'leadId' })
  const investmentId = useWatch({ control: form.control, name: 'investmentId' })

  const anchor = useMemo(
    () =>
      resolveActivityAssociationAnchor(
        {
          relatedEntityId,
          accountId,
          contactId,
          opportunityId,
          leadId,
          investmentId
        },
        entitySearchOptions,
        supportsInvestment
      ),
    [
      relatedEntityId,
      accountId,
      contactId,
      opportunityId,
      leadId,
      investmentId,
      entitySearchOptions,
      supportsInvestment
    ]
  )

  const crmAnchor: CrmActivityAssociationAnchor | null =
    variant === 'crm' && anchor && anchor.type !== 'investment' ? anchor : null
  const irmAnchor = variant === 'irm' ? anchor : null

  const crmBundle = useCrmActivityAssociationOptions(accessToken, crmAnchor)
  const irmBundle = useIrmActivityAssociationOptions(accessToken, irmAnchor)

  const {
    contactSelectOptions,
    contactJunctionRows,
    accountSelectOptions,
    accountJunctionRows,
    investmentSelectOptions,
    loading
  } = variant === 'crm' ? crmBundle : irmBundle

  const {
    contactComboList,
    accountComboList,
    investmentComboList,
    searchLinkedContacts,
    searchLinkedAccounts,
    searchLinkedInvestments
  } = useActivityAssociationComboLists(contactSelectOptions, accountSelectOptions, investmentSelectOptions)

  useEffect(() => {
    const rid = relatedEntityId
    if (!rid || !entitySearchOptions?.length) {
      return
    }
    const match = entitySearchOptions.find(e => e.id === rid)
    const fieldName = match ? primaryIdFieldForEntityType(match.type) : null
    if (!match || !fieldName) {
      return
    }
    const current = form.getValues(fieldName)
    if (current) {
      return
    }
    form.setValue(fieldName, rid, { shouldDirty: false, shouldValidate: false })
  }, [relatedEntityId, entitySearchOptions, form])

  useEffect(() => {
    if (loading || !anchor) {
      return
    }

    const clearIfInvalid = (field: 'contactId' | 'accountId' | 'investmentId', options: { id: string }[]) => {
      const current = form.getValues(field)
      if (!current || typeof current !== 'string') {
        return
      }
      if (options.length === 0) {
        form.setValue(field, null, { shouldDirty: true })
        return
      }
      if (!options.some(o => o.id === current)) {
        form.setValue(field, null, { shouldDirty: true })
      }
    }

    if (anchor.type === 'account') {
      clearIfInvalid('contactId', contactSelectOptions)
      if (supportsInvestment) {
        clearIfInvalid('investmentId', investmentSelectOptions)
      }
      return
    }
    if (anchor.type === 'contact') {
      clearIfInvalid('accountId', accountSelectOptions)
      if (supportsInvestment) {
        clearIfInvalid('investmentId', investmentSelectOptions)
      }
      return
    }
    if (anchor.type === 'investment') {
      clearIfInvalid('accountId', accountSelectOptions)
      clearIfInvalid('contactId', contactSelectOptions)
      return
    }
    clearIfInvalid('contactId', contactSelectOptions)
    clearIfInvalid('accountId', accountSelectOptions)
  }, [loading, anchor, contactSelectOptions, accountSelectOptions, investmentSelectOptions, form, supportsInvestment])

  if (!anchor) {
    return null
  }

  const contactLabel = getTranslationFromI18nKeyAndLabel(
    'crm:salesActivity.relatedContact',
    'Related contact (optional)'
  )
  const accountLabel = getTranslationFromI18nKeyAndLabel(
    'crm:salesActivity.relatedAccount',
    'Related account (optional)'
  )
  const investmentLabel = getTranslationFromI18nKeyAndLabel(
    'crm:salesActivity.relatedInvestment',
    'Related investment (optional)'
  )

  const renderContactSelect = () => (
    <FormField
      control={form.control}
      name="contactId"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{contactLabel}</FormLabel>
          <FormControl>
            <ContactSelect
              value={field.value || null}
              onChange={v => {
                if (v === null || v === '') {
                  field.onChange(null)
                  return
                }
                field.onChange(selectOnChangeToId(v))
              }}
              contacts={contactComboList}
              contactsLoading={loading}
              contactsError={null}
              searchContacts={searchLinkedContacts}
              accountContacts={contactJunctionRows as any[]}
              showContactType={false}
              disabled={contactSelectOptions.length === 0}
              dataTestId={`${dataTestId}-contact`}
              error={fieldState.error?.message ?? null}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const renderInvestmentSelect = () => (
    <FormField
      control={form.control}
      name="investmentId"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{investmentLabel}</FormLabel>
          <FormControl>
            <ActivityAssociationInvestmentSelect
              value={field.value || null}
              onChange={field.onChange}
              investments={investmentComboList}
              investmentsLoading={loading}
              investmentsError={null}
              searchInvestments={searchLinkedInvestments}
              disabled={investmentSelectOptions.length === 0}
              data-testid={`${dataTestId}-investment`}
              error={fieldState.error?.message ?? null}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const renderAccountSelect = () => (
    <FormField
      control={form.control}
      name="accountId"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{accountLabel}</FormLabel>
          <FormControl>
            <AccountSelect
              value={field.value || null}
              onChange={v => {
                if (v === null || v === '') {
                  field.onChange(null)
                  return
                }
                field.onChange(selectOnChangeToId(v))
              }}
              accounts={accountComboList}
              accountsLoading={loading}
              accountsError={null}
              searchAccounts={searchLinkedAccounts}
              accountContacts={accountJunctionRows as any[]}
              showAccountType={false}
              disabled={accountSelectOptions.length === 0}
              dataTestId={`${dataTestId}-account`}
              error={fieldState.error?.message ?? null}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  if (anchor.type === 'account') {
    return (
      <div className="gba:space-y-4">
        {renderContactSelect()}
        {supportsInvestment ? renderInvestmentSelect() : null}
      </div>
    )
  }

  if (anchor.type === 'contact') {
    return (
      <div className="gba:space-y-4">
        {renderAccountSelect()}
        {supportsInvestment ? renderInvestmentSelect() : null}
      </div>
    )
  }

  if (anchor.type === 'investment') {
    return (
      <div className="gba:space-y-4">
        {renderContactSelect()}
        {renderAccountSelect()}
      </div>
    )
  }

  return (
    <div className="gba:space-y-4">
      {renderContactSelect()}
      {renderAccountSelect()}
    </div>
  )
}
