import React, { useMemo, useCallback } from 'react'
import { Form, FormItem, FormLabel, FormControl, FormMessage, useTranslation } from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { ErrorAlert } from '@/components/error-alert'
import translations from '../../_i18n'
import { AccountSegment } from '@/common/components/common-relations/form-segments/account-segment'
import { toAccountSegmentOptions } from '@/business-apps/crm/campaigns/_shared/accountSegmentOptions'
import { useAccountSelectorOptions } from '@/common/data/customer/hooks/useAccountSelectorOptions'
import { useCustomerCampaignEventLinkedAccountIds } from '@/common/data/customer/hooks/useCustomerCampaignEventAccount'

const eventAccountRowSchema = z.object({
  customerAccountId: z.string().min(1)
})

const schema = z.object({
  customerCampaignEventAccounts: z.array(eventAccountRowSchema).min(1, 'Account is required')
})

type FormValues = z.infer<typeof schema>

export type CampaignEventAccountCreatePopupProps = BusinessAppContextProps

export const CampaignEventAccountCreatePopup: React.FC<CampaignEventAccountCreatePopupProps> = ({
  accessToken,
  additionalData,
  ...rest
}) => {
  const { t } = useTranslation(translations)
  const initialParameters = useMemo(
    () =>
      (additionalData as Record<string, unknown>)?.psi_taskPayload?.psi_initialParameters as
        | Record<string, unknown>
        | undefined,
    [additionalData]
  )
  const eventId =
    ((additionalData as Record<string, unknown>)?.eventId as string | undefined) ||
    (initialParameters?.eventId as string | undefined)

  const ctx = { accessToken, additionalData, ...rest } as BusinessAppContextProps
  // Accounts already linked to this event are excluded server-side so users cannot pick one that
  // would cause a duplicate-junction failure.
  const { linkedAccountIds, loading: linkedLoading } = useCustomerCampaignEventLinkedAccountIds(ctx, eventId)
  const useAccounts = useAccountSelectorOptions(ctx, linkedAccountIds, linkedLoading)

  const searchAccounts = useCallback(
    (search: string) => {
      useAccounts.search?.(search)
    },
    [useAccounts.search]
  )

  const accountOptions = useMemo(() => toAccountSegmentOptions(useAccounts.accounts), [useAccounts.accounts])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerCampaignEventAccounts: [] }
  })

  const selectedAccounts = form.watch('customerCampaignEventAccounts') ?? []

  const accountContacts = useMemo(
    () =>
      selectedAccounts.map(row => {
        const fromSearch = accountOptions.find(account => account.id === row.customerAccountId)
        return {
          accountId: row.customerAccountId,
          account: {
            id: row.customerAccountId,
            name: fromSearch?.name ?? row.customerAccountId,
            ...(fromSearch?.pictureThumbnail && { pictureThumbnail: fromSearch.pictureThumbnail }),
            ...(fromSearch?.extraInfo?.website && { website: fromSearch.extraInfo.website })
          }
        }
      }),
    [selectedAccounts, accountOptions]
  )

  const handleSubmit = async (data: FormValues) => {
    // The createCustomerCampaignEventAccount process accepts a single object (not a batch array),
    // so only the first selected account is submitted.
    const accountId = data.customerCampaignEventAccounts[0]?.customerAccountId
    return {
      customerCampaignEventAccount: {
        customerCampaignEventId: eventId,
        customerAccountId: accountId,
        version: 0
      }
    }
  }

  if (!accessToken) {
    return (
      <ErrorAlert errors={[{ type: 'accessToken' as const }]} prefixDataTestId="campaign-event-account-create-popup" />
    )
  }

  return (
    <AppActionForm
      processType="create"
      onSubmit={handleSubmit}
      formData={form.getValues()}
      form={form}
      schema={schema}
      submitButtonText={t('common-save')}
      cancelButtonText={t('common-cancel')}
      data-testid="campaign-event-account-create-popup"
      isSubmitDisabled={selectedAccounts.length < 1}
    >
      <div className="gba:space-y-4" data-testid="campaign-event-account-create-popup-fields">
        <h2 className="gba:text-xl gba:font-semibold">{t('campaign-eventAccount-addTitle')}</h2>
        <Form {...form}>
          <FormItem>
            <FormLabel>
              {t('campaign-targets-accountName')} <span className="gba:text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <AccountSegment
                fieldArrayName="customerCampaignEventAccounts"
                accountIdFieldName="customerAccountId"
                typeMode="accountOnly"
                accountContacts={accountContacts}
                accounts={accountOptions}
                accountsLoading={useAccounts.loading}
                accountsError={useAccounts.error}
                searchAccounts={searchAccounts}
                hasMore={useAccounts.hasMore}
                onLoadMore={useAccounts.loadMore}
                hideAddCombobox={selectedAccounts.length >= 1}
                dataTestId="campaign-event-account-create"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </Form>
      </div>
    </AppActionForm>
  )
}

export default CampaignEventAccountCreatePopup
