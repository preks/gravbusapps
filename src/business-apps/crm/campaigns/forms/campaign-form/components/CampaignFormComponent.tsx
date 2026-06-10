import React, { useEffect, useCallback, useMemo, useState } from 'react'
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { createCampaignFormResolver } from '../campaignSchema'
import { useCampaignFormContext } from '../context/CampaignFormContext'
import type { CampaignFormValues } from '../types'
import dayjs from 'dayjs'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import translations from '../../../_i18n'
import { useCampaignEntityList } from '@/common/data/customer/hooks/useCampaignEntityData'
import { GET_CAMPAIGN_ACCOUNTS } from '@/common/data/customer/queries/customerCampaignAccountQueries'
import type { CustomerCampaignAccount } from '@/common/data/customer/types/customerCampaignAccountTypes'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import { CampaignFormBasicInfo } from './CampaignFormBasicInfo'
import { CampaignFormStrategic } from './CampaignFormStrategic'
import { CampaignFormFinancial } from './CampaignFormFinancial'
import { AccountSegment } from '@/common/components/common-relations/form-segments/account-segment'
import { toAccountSegmentOptions } from '@/business-apps/crm/campaigns/_shared/accountSegmentOptions'
import { CUSTOMER_ENGAGEMENT_LEVEL } from '@/common/data/customer/constants/customerCatalogs'

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === '' || value == null) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

const CampaignFormComponent: React.FC = () => {
  const { t } = useTranslation(translations)
  const { formValues, onSubmit, onCancel, isLoading, isUpdateMode, businessAppContext, prefetchedOwnerEmployee } =
    useCampaignFormContext()
  const ctxProps = { ...businessAppContext, accessToken: businessAppContext.accessToken }
  const campaignIdForAccounts = isUpdateMode && formValues.id ? formValues.id : undefined
  const {
    items: campaignAccounts,
    loading: campaignAccountsLoading,
    error: campaignAccountsError
  } = useCampaignEntityList<CustomerCampaignAccount>({
    context: ctxProps,
    campaignId: campaignIdForAccounts,
    query: GET_CAMPAIGN_ACCOUNTS(),
    itemsKey: 'CustomerCampaignAccount',
    aggregateKey: 'CustomerCampaignAccountAggregate',
    errorMessage: 'Failed to load campaign accounts'
  })
  const useAccounts = useCustomerAccountsList(ctxProps, { limit: 20 })

  const formResolver = useMemo(
    () =>
      createCampaignFormResolver({
        nameRequired: t('campaign-validation-name-required'),
        typeRequired: t('campaign-validation-type-required')
      }),
    [t]
  )

  const form = useForm<CampaignFormValues>({
    resolver: formResolver,
    defaultValues: { ...formValues, customerCampaignAccounts: formValues.customerCampaignAccounts ?? [] },
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  })

  useEffect(() => {
    form.reset({
      ...formValues,
      customerCampaignAccounts: formValues.customerCampaignAccounts ?? form.getValues('customerCampaignAccounts') ?? []
    })
  }, [formValues, form])

  const [loadedAccountContacts, setLoadedAccountContacts] = useState<
    Array<{
      accountId: string
      account: { id: string; name: string; pictureThumbnail?: string; website?: string }
    }>
  >([])

  useEffect(() => {
    if (!campaignIdForAccounts) {
      setLoadedAccountContacts([])
      form.reset({ ...form.getValues(), customerCampaignAccounts: [] })
      return
    }
    if (campaignAccountsLoading) {
      return
    }
    if (campaignAccountsError) {
      setLoadedAccountContacts([])
      form.reset({ ...form.getValues(), customerCampaignAccounts: [] })
      return
    }

    const customerCampaignAccounts = campaignAccounts.map(a => ({
      id: a.id,
      version: a.version,
      customerAccountId: a.customerAccountId ?? a.customerAccount?.id ?? '',
      customerEngagementLevelRef: a.customerEngagementLevel?.id ?? undefined
    }))
    setLoadedAccountContacts(
      campaignAccounts.map(a => {
        const acct = a.customerAccount
        const accountId = a.customerAccountId ?? acct?.id ?? ''
        return {
          accountId,
          account: acct
            ? {
                id: acct.id,
                name: acct.name ?? '',
                pictureThumbnail: acct.pictureThumbnailUrl,
                website: acct.website
              }
            : { id: accountId, name: '' }
        }
      })
    )
    form.reset({ ...form.getValues(), customerCampaignAccounts })
  }, [campaignIdForAccounts, campaignAccounts, campaignAccountsLoading, campaignAccountsError, form])

  const searchAccounts = useCallback(
    (term: string) => {
      useAccounts.search(term.trim())
    },
    [useAccounts.search]
  )

  const accountOptions = useMemo(() => toAccountSegmentOptions(useAccounts.accounts), [useAccounts.accounts])

  const formAccountIds =
    form.watch('customerCampaignAccounts')?.map((ca: { customerAccountId: string }) => ca.customerAccountId) ?? []
  const accountContacts = useMemo(() => {
    const result = [...loadedAccountContacts]
    formAccountIds.forEach((accountId: string) => {
      if (result.some(r => r.accountId === accountId)) return
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
  }, [loadedAccountContacts, formAccountIds, accountOptions])

  const handleSubmit = async (values: CampaignFormValues) => {
    const normalized: CampaignFormValues = {
      ...values,
      startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : '',
      endDate: values.endDate ? dayjs(values.endDate).format('YYYY-MM-DD') : '',
      budgetAllocated: toOptionalNumber(values.budgetAllocated),
      pipelineTarget: toOptionalNumber(values.pipelineTarget),
      expectedWinRate: toOptionalNumber(values.expectedWinRate),
      expectedRevenueContribution: toOptionalNumber(values.expectedRevenueContribution),
      ownerEmployeeId: values.ownerEmployeeId?.trim() || undefined
    }
    await onSubmit(normalized)
    const salesCampaignPayload: Record<string, unknown> = {
      ...(isUpdateMode && formValues.id ? { id: formValues.id } : {}),
      ...(isUpdateMode && formValues.version !== undefined ? { version: formValues.version } : {}),
      name: normalized.name,
      typeRef: normalized.typeRef,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      description: normalized.description || '',
      customerCampaignSegmentRef: normalized.customerCampaignSegmentRef || null,
      customerPersonaRef: normalized.customerPersonaRef || null,
      customerValuePackFocusRef: normalized.customerValuePackFocusRef || null,
      customerIndustryFocusRef: normalized.customerIndustryFocusRef || null,
      countryRef: normalized.countryRef || null,
      budgetAllocated: normalized.budgetAllocated ?? null,
      pipelineTarget: normalized.pipelineTarget ?? null,
      expectedWinRate: normalized.expectedWinRate ?? null,
      expectedRevenueContribution: normalized.expectedRevenueContribution ?? null,
      customerCampaignStatusRef: normalized.customerCampaignStatusRef || null,
      // Same convention as lead/account payloads: form field ownerEmployeeId → ownerEmployee (uuid string)
      ownerEmployee: normalized.ownerEmployeeId?.trim() ? normalized.ownerEmployeeId.trim() : null
    }
    const campaignAccountsFromForm = values.customerCampaignAccounts ?? []
    const customerCampaignAccountsPayload = campaignAccountsFromForm.map(
      (ca: {
        customerAccountId: string
        customerEngagementLevelRef?: string | null
        id?: string
        version?: number
      }) => {
        const item: Record<string, unknown> = {
          customerAccountId: ca.customerAccountId,
          customerEngagementLevelRef: ca.customerEngagementLevelRef ?? null
        }
        if (ca.id != null) item.id = ca.id
        if (ca.version != null) item.version = ca.version
        return item
      }
    )
    salesCampaignPayload.customerCampaignAccounts = {
      changeMode: 'REPLACE',
      customerCampaignAccounts: customerCampaignAccountsPayload
    }
    const payload = {
      changeMode: isUpdateMode ? 'UPDATE' : 'INSERT',
      salesCampaign: salesCampaignPayload
    }
    dispatchProcessContinueEvent('pse_submit', payload)
  }

  const handleCancel = async () => {
    await onCancel()
    dispatchProcessContinueEvent('pse_pause', {})
  }

  return (
    <div className="gba:max-w-2xl gba:w-full gba:mx-auto gba:p-6">
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-semibold" data-testid="campaign-form-title">
          {isUpdateMode ? t('campaign-update') : t('campaign-create')}
        </h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-6">
          <CampaignFormBasicInfo
            form={form}
            t={t}
            businessAppContext={businessAppContext}
            prefetchedOwnerEmployee={prefetchedOwnerEmployee}
            isUpdateMode={isUpdateMode}
          />
          <CampaignFormStrategic form={form} t={t} />
          <CampaignFormFinancial form={form} t={t} />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('campaign-description')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    placeholder={t('campaign-description-placeholder')}
                    data-testid="campaign-form-description-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>{t('campaign-targets-title')}</FormLabel>
            <FormControl>
              <AccountSegment
                fieldArrayName="customerCampaignAccounts"
                accountIdFieldName="customerAccountId"
                accountTypeFieldName="customerEngagementLevelRef"
                typeMode="engagementLevel"
                accountTypeCatalogIdentifier={CUSTOMER_ENGAGEMENT_LEVEL}
                accountContacts={accountContacts}
                accounts={accountOptions}
                accountsLoading={useAccounts.loading}
                accountsError={useAccounts.error}
                searchAccounts={searchAccounts}
                hasMore={useAccounts.hasMore}
                onLoadMore={useAccounts.loadMore}
                dataTestId="campaign-form-target-accounts"
              />
            </FormControl>
          </FormItem>

          <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} data-testid="campaign-form-cancel-button">
              {t('common-cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="campaign-form-submit-button">
              {t('common-save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default CampaignFormComponent
