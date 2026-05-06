import React, { useEffect, useRef, useCallback } from 'react'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildInvestmentAccountPayload } from '@/common/data/investment/types/investmentAccountTypes'
import { buildInvestmentContactPayload } from '@/common/data/investment/types/investmentContactTypes'
import { buildAccountFormSubmissionPayload } from '@/common/data/common/utils/inlineDraftHelpers'
import { buildAvatarPreSubmit } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/investment/constants/investmentConstants'
import { COMPANY_SIZE, ANNUAL_REVENUE, ACCOUNT_PRIORITY } from '@/common/data/investment/constants/investmentCatalogs'
import { AccountLayout, accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { contactSchema } from '@/common/components/common-relations/form-layouts/contact-layout'
import { createInlineEntityPopupRenderer } from '@/common/components/common-relations/popups/inline-entity-create-popup'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { AccountAiEnrichButton } from '@/common/components/common-relations/form-segments/account-ai-enrich'

export { accountSchema as investmentAccountSchema } from '@/common/components/common-relations/form-layouts/account-layout'

type AccountFormProps = BusinessAppContextProps

export const AccountForm: React.FC<AccountFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const accountId = additionalData?.accountId || additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  const { account, loading, error } = useInvestmentAccount(accessToken || '', accountId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  const useContacts = useInvestmentContactsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: mapToFormValues(account || {}, accountSchema) as Partial<InvestmentAccount>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const accountRef = useRef(account)
  useEffect(() => {
    if (accountRef.current?.id !== account?.id) {
      form.reset(mapToFormValues(account || {}, accountSchema) as Partial<InvestmentAccount>)
      accountRef.current = account
    }
  }, [account?.id, account, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      return buildAccountFormSubmissionPayload({
        data,
        accountBuilder: buildInvestmentAccountPayload,
        contactBuilder: buildInvestmentContactPayload,
        accountCollectionName: 'investmentAccounts',
        contactCollectionName: 'investmentContacts'
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
    return <ErrorAlert errors={errors} prefixDataTestId="investment-account-form" />
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
        schema={accountSchema}
        data-testid={formatDataTestId('investment-account-form', 'Form')}
        submitButtonText={account?.id ? 'Update Account' : 'Create Account'}
        isSubmitDisabled={loading}
      >
        <AccountAiEnrichButton accessToken={accessToken} entityKind="investment_account" isEditMode={!!account?.id} />
        <AccountLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          accountContacts={account?.accountContacts}
          ownerEmployee={account?.ownerEmployee}
          entityId={account?.id || accountId}
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

export default AccountForm
