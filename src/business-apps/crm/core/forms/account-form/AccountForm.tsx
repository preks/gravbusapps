import React, { useEffect, useRef, useCallback } from 'react'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useCustomerContactsList } from '@/common/data/customer/hooks/useCustomerContacts'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildCustomerAccountPayload } from '@/common/data/customer/types/customerAccountTypes'
import { buildCustomerContactPayload } from '@/common/data/customer/types/customerContactTypes'
import { buildAccountFormSubmissionPayload } from '@/common/data/common/utils/inlineDraftHelpers'
import { buildAvatarPreSubmit } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/customer/constants/customerConstants'
import { COMPANY_SIZE, ANNUAL_REVENUE, ACCOUNT_PRIORITY } from '@/common/data/customer/constants/customerCatalogs'
import { AccountLayout, accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { contactSchema } from '@/common/components/common-relations/form-layouts/contact-layout'
import { createInlineEntityPopupRenderer } from '@/common/components/common-relations/popups/inline-entity-create-popup'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { SalesCampaignField } from '@/common/components/customer/selects/campaign-select'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { AccountAiEnrichButton } from '@/common/components/common-relations/form-segments/account-ai-enrich'
import { FormLocalizationProvider } from '@/common/components/form-localization-provider'

export const customerAccountSchema = accountSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

type AccountFormProps = BusinessAppContextProps

const AccountFormContent: React.FC<AccountFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const accountId = additionalData?.accountId || additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  const { account, loading, error } = useCustomerAccount(accessToken || '', accountId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  const useContacts = useCustomerContactsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  const form = useForm<z.infer<typeof customerAccountSchema>>({
    resolver: zodResolver(customerAccountSchema),
    defaultValues: mapToFormValues(account || {}, customerAccountSchema) as Partial<CustomerAccount>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const accountRef = useRef(account)
  useEffect(() => {
    if (accountRef.current?.id !== account?.id) {
      form.reset(mapToFormValues(account || {}, customerAccountSchema) as Partial<CustomerAccount>)
      accountRef.current = account
    }
  }, [account?.id, account, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      return buildAccountFormSubmissionPayload({
        data,
        accountBuilder: buildCustomerAccountPayload,
        contactBuilder: buildCustomerContactPayload,
        accountCollectionName: 'accounts',
        contactCollectionName: 'contacts'
      })
    } catch (error) {
      console.error('Error submitting account:', error)
      throw error
    }
  }, [])

  const renderInlineContactCreate = React.useMemo(
    () =>
      createInlineEntityPopupRenderer({
        entity: 'contact',
        businessAppContext: { accessToken, userInfo, additionalData },
        formConfig: {
          schema: contactSchema,
          fileConfig: {
            fileEntity: FILE_ENTITY.CONTACT,
            fileContext: FILE_CONTEXT.PICTURE
          }
        }
      }),
    [accessToken, userInfo, additionalData]
  )

  // Collect all errors for centralized early return (AFTER all hooks)
  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load account data' })
  }
  if (useContacts.error) {
    errors.push({ error: useContacts.error, context: 'Failed to load contacts' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="customer-account-form" />
  }

  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  const handlePreSubmit = buildAvatarPreSubmit(
    fileClient,
    avatarFileRef,
    FILE_ENTITY.ACCOUNT,
    FILE_CONTEXT.PICTURE,
    APP_NAME,
    formData => formData.id || account?.id || null
  )

  const campaignSelect = (
    <SalesCampaignField
      businessAppContext={{ accessToken, userInfo, additionalData }}
      initialCampaign={
        account?.salesCampaign
          ? {
              id: account.salesCampaignId || '',
              name: account.salesCampaign?.name || '',
              type: account.salesCampaign?.type
                ? {
                    id: account.salesCampaign.type.id || account.salesCampaign.typeRef || '',
                    value: account.salesCampaign.type.value || '',
                    code: account.salesCampaign.type.code || '',
                    translations: account.salesCampaign.type.translations || []
                  }
                : undefined,
              typeRef: account.salesCampaign.typeRef
            }
          : null
      }
      dataTestIdPrefix="customer-account-form"
    />
  )

  const processType = account?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        handlePreSubmit={handlePreSubmit}
        formData={form.getValues()}
        form={form}
        schema={customerAccountSchema}
        data-testid={formatDataTestId('customer-account-form', 'Form')}
        submitButtonText={account?.id ? 'Update Account' : 'Create Account'}
        isSubmitDisabled={loading}
      >
        <AccountAiEnrichButton accessToken={accessToken} entityKind="account" isEditMode={!!account?.id} />
        <AccountLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          accountContacts={account?.accountContacts}
          ownerEmployee={account?.ownerEmployee}
          entityId={account?.id || accountId}
          accountInformationCustomFields={campaignSelect}
          annualRevenueCatalogIdentifier={ANNUAL_REVENUE}
          companySizeCatalogIdentifier={COMPANY_SIZE}
          accountPriorityCatalogIdentifier={ACCOUNT_PRIORITY}
          useContacts={useContacts}
          avatarFileRef={avatarFileRef}
          inlineContactCreate={renderInlineContactCreate}
          loading={loading && !!accountId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

const AccountForm: React.FC<AccountFormProps> = props => (
  <FormLocalizationProvider>
    <AccountFormContent {...props} />
  </FormLocalizationProvider>
)

export default AccountForm
