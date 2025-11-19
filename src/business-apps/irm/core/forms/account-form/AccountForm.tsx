import React, { useEffect, useCallback, useState, useRef } from 'react'
import {
  type InvestmentAccount,
  buildInvestmentAccountPayload
} from '@/common/data/investment/types/investmentAccountTypes'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { InvestmentFilePaths } from '@/common/data/investment/constants/investmentFilePaths'
import { AccountLayout, accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import { useFileClient } from '@/common/network/files/useFileClient'

const prefixDataTestId = 'investment-account-form'

interface AccountFormProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentAccount>
  onSubmit?: (account: Partial<InvestmentAccount>) => Promise<void>
  onCancel?: () => Promise<void>
}

const AccountForm: React.FC<AccountFormProps> = ({
  initialValues,
  onCancel = async () => {},
  accessToken,
  userInfo,
  additionalData
}) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly authenticated.
        </div>
      </div>
    )
  }

  // Extract accountId from additionalData
  const accountId = additionalData?.accountId || additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  // Fetch account data using declarative hook
  const {
    account: fetchedAccount,
    loading: accountLoading,
    error: accountError
  } = useInvestmentAccount(accessToken, accountId)

  // Local state for account
  const [account, setAccount] = useState<InvestmentAccount | null>(null)

  // Sync fetched account with local state
  useEffect(() => {
    if (fetchedAccount) {
      setAccount(fetchedAccount)
    } else if (!accountId && initialValues && Object.keys(initialValues).length > 0) {
      setAccount(initialValues as InvestmentAccount)
    }
  }, [fetchedAccount, accountId, initialValues])

  // Contact selection hook
  const contactsHookResult = useGetInvestmentContacts(
    { accessToken, userInfo, additionalData },
    {
      withState: true,
      autoFetch: true,
      pageSize: 20,
      mapToSelectOptions: true
    }
  )

  // Extract hook result for contactsHook prop (mapToSelectOptions ensures options are SelectOption[])
  const contactsHook = {
    options: contactsHookResult.options as any[],
    loading: contactsHookResult.loading,
    error: contactsHookResult.error,
    search: contactsHookResult.search
  }

  // File client for avatar upload
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Ref to store current file and thumbnail from AvatarUpload (no re-renders)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Map InvestmentAccount to form values - using mapToFormValues
  const mapInvestmentAccountToFormValues = useCallback(
    (acc: InvestmentAccount | null): Partial<z.infer<typeof accountSchema>> => {
      if (!acc) {
        return {} // Empty object - form will handle defaults via schema
      }

      // ✅ Use mapToFormValues for automatic mapping - schema handles all defaults
      // Date transformations (foundationDate) are now automatic
      return mapToFormValues(acc, accountSchema)
    },
    []
  )

  // Initialize React Hook Form with common schema
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: mapInvestmentAccountToFormValues(account) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when account changes
  const accountRef = React.useRef(account)
  useEffect(() => {
    if (accountRef.current?.id !== account?.id) {
      form.reset(mapInvestmentAccountToFormValues(account) as any)
      accountRef.current = account
    }
  }, [account?.id, account, form, mapInvestmentAccountToFormValues])

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = async (data: any) => {
    // Build InvestmentAccount object - data already matches interface structure exactly
    const investmentAccount: Partial<InvestmentAccount> = {
      ...data
    }

    // ✅ Use centralized payload builder
    const { investmentAccount: accountPayload } = buildInvestmentAccountPayload(investmentAccount)

    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    // Return payload for AppActionForm to handle process event
    return {
      investmentAccount: accountPayload,
      changeMode: changeMode
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    await onCancel()
  }

  // Handle pre-submit: Upload avatar file if present
  const handlePreSubmit = async (formData: any) => {
    const avatarData = avatarFileRef.current

    if (!avatarData?.file || !avatarData?.thumbnail) {
      return formData
    }

    try {
      const accountId = formData.id || account?.id || 'new'
      const pathParams = { accessScope: InvestmentFilePaths.ACCESS_SCOPE } as const
      const queryParams = {
        appName: InvestmentFilePaths.APP_NAME,
        folderPath: InvestmentFilePaths.getAccountPicturePath(accountId),
        mimeType: avatarData.file.type || 'image/jpeg'
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

  // Determine process type based on whether account exists
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
        data-testid={formatDataTestId(prefixDataTestId, 'Form')}
        submitButtonText={account?.id ? 'Update Account' : 'Create Account'}
        isSubmitDisabled={accountLoading}
      >
        {/* Account Segment */}
        <AccountLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={account?.ownerEmployee}
          entityId={account?.id}
          annualRevenueCatalogIdentifier="AccountAnnualRevenueBand:v1"
          companySizeCatalogIdentifier="CompanySize:v1"
          contactsHook={contactsHook}
          avatarFileRef={avatarFileRef}
          loading={accountLoading && !!accountId}
        />
        {/* Error Display */}
        {accountError && (
          <Alert variant="destructive">
            <AlertDescription>{accountError}</AlertDescription>
          </Alert>
        )}
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default AccountForm
