import React, { useMemo, useEffect, useCallback } from 'react'
import { Form, FormItem, FormLabel, FormControl, Spinner, useTranslation } from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { ErrorAlert } from '@/components/error-alert'
import { useCustomerCampaignAccount } from '@/common/data/customer/hooks/useCustomerCampaignAccount'
import { useAccountSelectorOptions } from '@/common/data/customer/hooks/useAccountSelectorOptions'
import { useCustomerCampaignLinkedAccountIds } from '@/common/data/customer/hooks/useCustomerCampaignAccounts'
import { AccountSegment } from '@/common/components/common-relations/form-segments/account-segment'
import type { AccountSegmentOption } from '@/common/components/common-relations/form-segments/account-segment'
import translations from '../../_i18n'
import { CUSTOMER_ENGAGEMENT_LEVEL } from '@/common/data/customer/constants/customerCatalogs'
import { resolveCustomerCampaignAccountJunctionId } from '../_shared/resolveCustomerCampaignAccountJunctionId'

const campaignAccountRowSchema = z.object({
  id: z.string().optional(),
  version: z.number().optional(),
  customerCampaignId: z.string().optional(),
  customerAccountId: z.string().min(1),
  customerEngagementLevelRef: z.string().nullable().optional()
})

const formSchemaBase = z.object({
  customerCampaignAccounts: z.array(campaignAccountRowSchema)
})

type FormValues = z.infer<typeof formSchemaBase>

export type CampaignAccountCreatePopupProps = BusinessAppContextProps

const CampaignAccountCreatePopupInner: React.FC<CampaignAccountCreatePopupProps> = props => {
  const { accessToken, additionalData } = props
  const { t } = useTranslation(translations)
  const catalogContext = CatalogSelect.useContext()

  const initialParameters = useMemo(
    () =>
      (additionalData as Record<string, unknown>)?.psi_taskPayload?.psi_initialParameters as
        | Record<string, unknown>
        | undefined,
    [additionalData]
  )

  const additionalDataRecord = additionalData as Record<string, unknown> | undefined

  const junctionId = resolveCustomerCampaignAccountJunctionId(additionalDataRecord)

  const isUpdateMode = Boolean(junctionId)

  const campaignId =
    (additionalDataRecord?.campaignId as string | undefined) || (initialParameters?.campaignId as string | undefined)

  const customerAccountIdForFallback =
    (additionalDataRecord?.customerAccountId as string | undefined) ||
    (initialParameters?.customerAccountId as string | undefined) ||
    junctionId

  const {
    account: campaignAccount,
    loading: junctionLoading,
    error: junctionError
  } = useCustomerCampaignAccount(accessToken || '', junctionId, {
    campaignId,
    customerAccountId: customerAccountIdForFallback
  })

  const schema = useMemo(
    () =>
      formSchemaBase.superRefine((data, ctx) => {
        if (data.customerCampaignAccounts.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('campaign-targets-at-least-one'),
            path: ['customerCampaignAccounts']
          })
        }
        if (isUpdateMode) {
          const row = data.customerCampaignAccounts[0]
          if (!row?.id || row.version == null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('campaign-targets-not-found'),
              path: ['customerCampaignAccounts']
            })
          }
        }
      }),
    [t, isUpdateMode]
  )

  // Accounts already linked to this campaign are excluded server-side inside this
  // campaign-scoped hook, so users cannot pick one that would cause a duplicate-junction failure.
  const { linkedAccountIds, loading: linkedLoading } = useCustomerCampaignLinkedAccountIds(
    props,
    isUpdateMode ? undefined : campaignId
  )
  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    hasMore,
    search,
    loadMore
  } = useAccountSelectorOptions(props, linkedAccountIds, linkedLoading)

  const searchAccounts = useCallback(
    (term: string) => {
      search(term.trim())
    },
    [search]
  )

  const accountOptions = useMemo<AccountSegmentOption[]>(() => {
    if (!accounts?.length) return []
    return accounts
      .filter(account => account.id)
      .map(account => ({
        id: account.id!,
        value: account.id!,
        label: account.name || 'Unknown Account',
        name: account.name || 'Unknown Account',
        pictureThumbnail: account.pictureThumbnail,
        extraInfo: { website: account.website }
      }))
  }, [accounts])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerCampaignAccounts: [] }
  })

  const customerCampaignAccounts = form.watch('customerCampaignAccounts')
  const hasAccounts = (customerCampaignAccounts?.length ?? 0) > 0

  useEffect(() => {
    if (catalogContext?.registerForm) {
      catalogContext.registerForm(form)
    }
  }, [catalogContext, form])

  useEffect(() => {
    if (!isUpdateMode || !campaignAccount) return

    const ca = campaignAccount.customerAccount
    const customerAccountId = campaignAccount.customerAccountId ?? ca?.id ?? ''

    form.reset({
      customerCampaignAccounts: [
        {
          id: campaignAccount.id,
          version: campaignAccount.version,
          customerCampaignId: campaignAccount.customerCampaignId,
          customerAccountId,
          customerEngagementLevelRef: campaignAccount.customerEngagementLevel?.id ?? null
        }
      ]
    })
  }, [isUpdateMode, campaignAccount, form])

  const formAccountIds =
    form
      .watch('customerCampaignAccounts')
      ?.map(ca => ca.customerAccountId)
      .filter(Boolean) ?? []

  const accountContacts = useMemo(() => {
    if (isUpdateMode && campaignAccount?.customerAccount) {
      const ca = campaignAccount.customerAccount
      return [
        {
          accountId: ca.id,
          account: {
            id: ca.id,
            name: ca.name,
            ...(ca.pictureThumbnailUrl && { pictureThumbnail: ca.pictureThumbnailUrl }),
            ...(ca.website && { website: ca.website })
          }
        }
      ]
    }

    const result: Array<{
      accountId: string
      account: { id: string; name: string; pictureThumbnail?: string; website?: string }
    }> = []
    formAccountIds.forEach(accountId => {
      const fromSearch = accountOptions.find(a => a.id === accountId)
      if (fromSearch) {
        result.push({
          accountId,
          account: {
            id: fromSearch.id,
            name: fromSearch.name,
            ...(fromSearch.pictureThumbnail && { pictureThumbnail: fromSearch.pictureThumbnail }),
            ...(fromSearch.extraInfo?.website && { website: fromSearch.extraInfo.website })
          }
        })
      }
    })
    return result
  }, [isUpdateMode, campaignAccount, formAccountIds, accountOptions])

  const handleSubmit = async (data: FormValues) => {
    const rows = data.customerCampaignAccounts ?? []

    if (isUpdateMode) {
      const row = rows[0]
      return {
        customerCampaignAccount: {
          id: row.id,
          version: row.version,
          customerAccountId: row.customerAccountId,
          customerCampaignId: row.customerCampaignId,
          customerEngagementLevelRef: row.customerEngagementLevelRef || undefined
        }
      }
    }

    const baseRows = rows.map(r => ({
      customerCampaignId: campaignId,
      customerAccountId: r.customerAccountId,
      customerEngagementLevelRef: r.customerEngagementLevelRef || undefined,
      version: 0 as const
    }))

    if (baseRows.length === 1) {
      const [single] = baseRows
      return {
        customerCampaignAccount: {
          customerCampaignId: single.customerCampaignId,
          customerAccountId: single.customerAccountId,
          customerEngagementLevelRef: single.customerEngagementLevelRef,
          version: single.version
        }
      }
    }

    return {
      customerCampaignAccounts: baseRows
    }
  }

  const popupPrefix = isUpdateMode ? 'campaign-account-update-popup' : 'campaign-account-create-popup'
  const dataTestId = popupPrefix

  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' as const }]} prefixDataTestId={popupPrefix} />
  }

  if (isUpdateMode && junctionError) {
    return (
      <ErrorAlert
        errors={[{ error: junctionError, type: 'graphqlError', context: 'Failed to load campaign account' }]}
        prefixDataTestId={popupPrefix}
      />
    )
  }

  if (isUpdateMode && junctionLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8">
        <Spinner size="sm" />
      </div>
    )
  }

  if (isUpdateMode && !campaignAccount) {
    return (
      <ErrorAlert
        errors={[
          {
            error: t('campaign-targets-not-found'),
            type: 'notFound',
            context: 'Failed to load campaign account'
          }
        ]}
        prefixDataTestId={popupPrefix}
      />
    )
  }

  const submitDisabled = !hasAccounts || (isUpdateMode && (junctionLoading || !campaignAccount))

  return (
    <AppActionForm
      processType={isUpdateMode ? 'update' : 'create'}
      onSubmit={handleSubmit}
      formData={form.getValues()}
      form={form}
      schema={schema}
      submitButtonText={t('common-save')}
      cancelButtonText={t('common-cancel')}
      data-testid={dataTestId}
      isSubmitDisabled={submitDisabled}
    >
      <div className="gba:space-y-4" data-testid={`${dataTestId}-fields`}>
        <h2 className="gba:text-xl gba:font-semibold">
          {isUpdateMode ? t('campaign-targets-editTitle') : t('campaign-targets-addTitle')}
        </h2>
        <Form {...form}>
          <div className="gba:space-y-4">
            <FormItem>
              <FormLabel>
                {t('campaign-targets-title')} <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <AccountSegment
                  fieldArrayName="customerCampaignAccounts"
                  accountIdFieldName="customerAccountId"
                  accountTypeFieldName="customerEngagementLevelRef"
                  typeMode="engagementLevel"
                  accountTypeCatalogIdentifier={CUSTOMER_ENGAGEMENT_LEVEL}
                  hideAddCombobox={isUpdateMode}
                  hideRemoveButton={isUpdateMode}
                  accountContacts={accountContacts}
                  accounts={accountOptions}
                  accountsLoading={accountsLoading}
                  accountsError={accountsError}
                  searchAccounts={searchAccounts}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  dataTestId="campaign-account-create-target-accounts"
                />
              </FormControl>
              {typeof form.formState.errors.customerCampaignAccounts?.message === 'string' && (
                <p className="gba:text-sm gba:text-destructive" data-testid="campaign-account-create-validation">
                  {form.formState.errors.customerCampaignAccounts.message}
                </p>
              )}
            </FormItem>
          </div>
        </Form>
      </div>
    </AppActionForm>
  )
}

export const CampaignAccountCreatePopup: React.FC<CampaignAccountCreatePopupProps> = props => {
  const junctionIdForKey = resolveCustomerCampaignAccountJunctionId(
    props.additionalData as Record<string, unknown> | undefined
  )

  return (
    <CatalogSelect.Provider<FormValues> {...props}>
      <CampaignAccountCreatePopupInner key={junctionIdForKey ?? 'create'} {...props} />
    </CatalogSelect.Provider>
  )
}

export default CampaignAccountCreatePopup
