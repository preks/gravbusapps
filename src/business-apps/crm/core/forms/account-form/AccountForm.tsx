import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { useForm, type UseFormReturn } from 'react-hook-form'
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

type AccountFormValues = z.infer<typeof customerAccountSchema>

// The rendered form subtree is isolated behind React.memo on purpose (mirrors CompanyForm). After a
// failed submit, the disabled address "region" CatalogSelect (requireSourceForEnable) calls
// form.trigger(), which toggles RHF's isValidating. Because the design-system FormFields subscribe to
// isValidating, the useForm host re-renders on every toggle. If that re-render reached the
// design-system <Form>, it would hand out a new FormProvider/context identity, the region
// CatalogSelect effect would re-fire trigger(), and the cycle would never settle (the screen freeze
// observed when pressing Create Account without the required fields). Keeping every prop below
// referentially stable lets React.memo skip re-rendering the <Form> subtree, so the provider identity
// stays constant and the trigger() effect runs once instead of looping.
type AccountFormViewProps = Readonly<{
  accessToken: AccountFormProps['accessToken']
  userInfo: AccountFormProps['userInfo']
  additionalData: AccountFormProps['additionalData']
  form: UseFormReturn<AccountFormValues>
  businessAppContext: BusinessAppContextProps
  processType: 'create' | 'update'
  submitButtonText: string
  isSubmitDisabled: boolean
  isEditMode: boolean
  entityId?: string
  accountContacts: CustomerAccount['accountContacts']
  ownerEmployee: CustomerAccount['ownerEmployee']
  useContacts: ReturnType<typeof useCustomerContactsList>
  avatarFileRef: React.MutableRefObject<{ file: File; thumbnail: string } | null>
  layoutLoading: boolean
  onSubmit: (data: AccountFormValues) => Promise<unknown>
  onCancel: () => Promise<void>
  handlePreSubmit: (formData: any) => Promise<any>
  inlineContactCreate: ReturnType<typeof createInlineEntityPopupRenderer>
  campaignSelect: React.ReactNode
}>

const AccountFormView = React.memo<AccountFormViewProps>(
  ({
    accessToken,
    userInfo,
    additionalData,
    form,
    businessAppContext,
    processType,
    submitButtonText,
    isSubmitDisabled,
    isEditMode,
    entityId,
    accountContacts,
    ownerEmployee,
    useContacts,
    avatarFileRef,
    layoutLoading,
    onSubmit,
    onCancel,
    handlePreSubmit,
    inlineContactCreate,
    campaignSelect
  }) => (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={onSubmit}
        onCancel={onCancel}
        handlePreSubmit={handlePreSubmit}
        formData={form.getValues()}
        form={form}
        schema={customerAccountSchema}
        data-testid={formatDataTestId('customer-account-form', 'Form')}
        submitButtonText={submitButtonText}
        isSubmitDisabled={isSubmitDisabled}
      >
        <AccountAiEnrichButton accessToken={accessToken} entityKind="account" isEditMode={isEditMode} />
        <AccountLayout
          businessAppContext={businessAppContext}
          accountContacts={accountContacts}
          ownerEmployee={ownerEmployee}
          entityId={entityId}
          accountInformationCustomFields={campaignSelect}
          annualRevenueCatalogIdentifier={ANNUAL_REVENUE}
          companySizeCatalogIdentifier={COMPANY_SIZE}
          accountPriorityCatalogIdentifier={ACCOUNT_PRIORITY}
          useContacts={useContacts}
          avatarFileRef={avatarFileRef}
          inlineContactCreate={inlineContactCreate}
          loading={layoutLoading}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
)
AccountFormView.displayName = 'AccountFormView'

const AccountFormContent: React.FC<AccountFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const accountId = additionalData?.accountId || additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  const { account, loading, error } = useCustomerAccount(accessToken || '', accountId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  const useContacts = useCustomerContactsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(customerAccountSchema),
    defaultValues: mapToFormValues(account || {}, customerAccountSchema) as Partial<CustomerAccount>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    // Do not auto-focus the first errored field on a failed submit. Focusing a disabled
    // `requireSourceForEnable` CatalogSelect re-enters the disabled-field revalidation path and can
    // re-drive the render loop that freezes the screen (mirrors CompanyForm).
    shouldFocusError: false
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

  const handleCancel = useCallback(async () => {
    // AppActionForm handles cancellation via process events
  }, [])

  const accountIdForUpload = account?.id

  const handlePreSubmit = useMemo(
    () =>
      buildAvatarPreSubmit(
        fileClient,
        avatarFileRef,
        FILE_ENTITY.ACCOUNT,
        FILE_CONTEXT.PICTURE,
        APP_NAME,
        formData => formData.id || accountIdForUpload || null
      ),
    [fileClient, accountIdForUpload]
  )

  const renderInlineContactCreate = useMemo(
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

  const businessAppContext = useMemo(
    () => ({ accessToken, userInfo, additionalData }),
    [accessToken, userInfo, additionalData]
  )

  const campaignSelect = useMemo(
    () => (
      <SalesCampaignField
        businessAppContext={businessAppContext}
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
    ),
    [businessAppContext, account?.salesCampaign, account?.salesCampaignId]
  )

  // Stable bundle for the contacts hook result. The hook returns a fresh object literal on every
  // render; re-bundling it keyed on the underlying primitives keeps AccountFormView memoizable so the
  // <Form> subtree is not re-created on RHF isValidating churn.
  const contactsBundle = useMemo(
    () => ({
      contacts: useContacts.contacts,
      total: useContacts.total,
      loading: useContacts.loading,
      error: useContacts.error,
      hasMore: useContacts.hasMore,
      search: useContacts.search,
      loadMore: useContacts.loadMore,
      refetch: useContacts.refetch,
      fetchCustomerContacts: useContacts.fetchCustomerContacts
    }),
    [
      useContacts.contacts,
      useContacts.total,
      useContacts.loading,
      useContacts.error,
      useContacts.hasMore,
      useContacts.search,
      useContacts.loadMore,
      useContacts.refetch,
      useContacts.fetchCustomerContacts
    ]
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

  const processType = account?.id ? 'update' : 'create'

  return (
    <AccountFormView
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
      form={form}
      businessAppContext={businessAppContext}
      processType={processType}
      submitButtonText={account?.id ? 'Update Account' : 'Create Account'}
      isSubmitDisabled={loading}
      isEditMode={!!account?.id}
      entityId={account?.id || accountId}
      accountContacts={account?.accountContacts}
      ownerEmployee={account?.ownerEmployee}
      useContacts={contactsBundle}
      avatarFileRef={avatarFileRef}
      layoutLoading={loading && !!accountId}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      handlePreSubmit={handlePreSubmit}
      inlineContactCreate={renderInlineContactCreate}
      campaignSelect={campaignSelect}
    />
  )
}

const AccountForm: React.FC<AccountFormProps> = props => (
  <FormLocalizationProvider>
    <AccountFormContent {...props} />
  </FormLocalizationProvider>
)

export default AccountForm
