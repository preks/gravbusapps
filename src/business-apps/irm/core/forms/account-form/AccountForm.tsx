import React, { useEffect, useRef, useCallback } from 'react'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildInvestmentAccountPayload } from '@/common/data/investment/types/investmentAccountTypes'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/investment/constants/investmentConstants'
import { COMPANY_SIZE, ANNUAL_REVENUE, ACCOUNT_PRIORITY } from '@/common/data/investment/constants/investmentCatalogs'
import { AccountLayout, accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import { useFileClient } from '@/common/network/files/useFileClient'

export const investmentAccountSchema = accountSchema.extend({})

type AccountFormProps = BusinessAppContextProps

export const AccountForm: React.FC<AccountFormProps> = ({ accessToken, userInfo, additionalData }) => {
  // Extract accountId from additionalData
  const accountId = additionalData?.accountId || additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  // Fetch account data using declarative hook
  const { account, loading, error } = useInvestmentAccount(accessToken || '', accountId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Contact selection with infinite scroll
  const useContacts = useInvestmentContactsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  // File client for avatar upload
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Ref to store current file and thumbnail from AvatarUpload (no re-renders)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  const form = useForm<z.infer<typeof investmentAccountSchema>>({
    resolver: zodResolver(investmentAccountSchema),
    defaultValues: mapToFormValues(account || {}, investmentAccountSchema) as Partial<InvestmentAccount>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const accountRef = useRef(account)
  useEffect(() => {
    if (accountRef.current?.id !== account?.id) {
      form.reset(mapToFormValues(account || {}, investmentAccountSchema) as Partial<InvestmentAccount>)
      accountRef.current = account
    }
  }, [account?.id, account, form])

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { investmentAccount } = buildInvestmentAccountPayload(data)
      return {
        investmentAccount,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting account:', error)
      throw error
    }
  }, [])

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

  // Early return if any errors exist (now safe - all hooks called above)
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="investment-account-form" />
  }

  // Handle form cancellation
  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  // Handle pre-submit: Upload avatar file if present
  const handlePreSubmit = async (formData: any) => {
    const avatarData = avatarFileRef.current

    if (!avatarData?.file || !avatarData?.thumbnail) {
      return formData
    }

    try {
      const accountId = formData.id || account?.id || null
      const folderPath = buildFilePath(FILE_ENTITY.ACCOUNT, accountId, FILE_CONTEXT.PICTURE)
      const pathParams = { accessScope: 'tenant' } as const
      const queryParams = {
        appName: APP_NAME,
        folderPath: folderPath,
        mimeType: avatarData.file.type
      }

      const uploadResponse = await fileClient.uploadFile(avatarData.file, pathParams, queryParams)

      return {
        ...formData,
        picture: JSON.stringify(uploadResponse.fileInfo),
        pictureThumbnail: avatarData.thumbnail
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      throw error
    }
  }

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
        schema={investmentAccountSchema}
        data-testid={formatDataTestId('investment-account-form', 'Form')}
        submitButtonText={account?.id ? 'Update Account' : 'Create Account'}
        isSubmitDisabled={loading}
      >
        {/* Account Layout */}
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
          accountContext="irm"
          loading={loading && !!accountId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default AccountForm
