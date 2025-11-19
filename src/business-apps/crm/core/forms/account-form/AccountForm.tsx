import React, { useEffect, useCallback, useState, useRef } from 'react'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerCampaigns } from '@/common/data/customer/hooks/useCustomerCampaigns'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useGetCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import {
  Alert,
  AlertDescription,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildCustomerAccountPayload } from '@/common/data/customer/types/customerAccountTypes'
import { CustomerFilePaths } from '@/common/data/customer/constants/customerFilePaths'
import { AccountLayout, accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { CampaignSelect } from '@/common/components/customer/selects/campaign-select'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import { useFileClient } from '@/common/network/files/useFileClient'

const prefixDataTestId = 'customer-account-form'

// CRM-specific schema extension (adds salesCampaignId)
export const customerAccountSchema = accountSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

interface AccountFormProps extends BusinessAppContextProps {
  initialValues?: Partial<CustomerAccount>
  onSubmit?: (account: Partial<CustomerAccount>) => Promise<void>
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
  } = useCustomerAccount(accessToken, accountId)

  // Local state for account
  const [account, setAccount] = useState<CustomerAccount | null>(null)

  // Sync fetched account with local state
  useEffect(() => {
    if (fetchedAccount) {
      setAccount(fetchedAccount)
    } else if (!accountId && initialValues && Object.keys(initialValues).length > 0) {
      setAccount(initialValues as CustomerAccount)
    }
  }, [fetchedAccount, accountId, initialValues])

  // Sales Campaigns hook (defer fetching until select opens)
  // Note: CampaignSelect handles its own data fetching internally
  useCustomerCampaigns(accessToken, 20, false)

  // Contact selection hook
  const contactsHookResult = useGetCustomerContacts(
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
    options: contactsHookResult.options as ContactSelectOption[],
    loading: contactsHookResult.loading,
    error: contactsHookResult.error,
    search: contactsHookResult.search
  }

  // File client for avatar upload
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Ref to store current file and thumbnail from AvatarUpload (no re-renders)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Map CustomerAccount to form values - using mapToFormValues
  const mapCustomerAccountToFormValues = useCallback(
    (acc: CustomerAccount | null): Partial<z.infer<typeof customerAccountSchema>> => {
      if (!acc) {
        return {} // Empty object - form will handle defaults via schema
      }

      // ✅ Use mapToFormValues for automatic mapping - schema handles all defaults
      // Date transformations (foundationDate) are now automatic
      return mapToFormValues(acc, customerAccountSchema)
    },
    []
  )

  // Initialize React Hook Form with CRM-specific schema
  const form = useForm<z.infer<typeof customerAccountSchema>>({
    resolver: zodResolver(customerAccountSchema),
    defaultValues: mapCustomerAccountToFormValues(account) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when account changes
  const accountRef = React.useRef(account)
  useEffect(() => {
    if (accountRef.current?.id !== account?.id) {
      form.reset(mapCustomerAccountToFormValues(account) as any)
      accountRef.current = account
    }
  }, [account?.id, account, form, mapCustomerAccountToFormValues])

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = async (data: any) => {
    const customerAccount: Partial<CustomerAccount> = {
      ...data
    }

    const { account: accountPayload } = buildCustomerAccountPayload(customerAccount)
    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    return {
      account: accountPayload,
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
      const pathParams = { accessScope: CustomerFilePaths.ACCESS_SCOPE } as const
      const queryParams = {
        appName: CustomerFilePaths.APP_NAME,
        folderPath: CustomerFilePaths.getAccountPicturePath(accountId),
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

  // Sales Campaign selector component
  const salesCampaignSelector = (
    <FormField
      control={form.control}
      name="salesCampaignId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Sales Campaign</FormLabel>
          <FormControl>
            <CampaignSelect
              value={field.value || null}
              onValueChange={(v: string | null) => field.onChange(v || '')}
              businessAppContext={{ accessToken, userInfo, additionalData }}
              selectedCampaign={
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
              placeholder="Search Campaign..."
              data-testid={formatDataTestId(prefixDataTestId, 'campaign-select')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
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
        data-testid={formatDataTestId(prefixDataTestId, 'Form')}
        submitButtonText={account?.id ? 'Update Account' : 'Create Account'}
        isSubmitDisabled={accountLoading}
      >
        {/* Account Layout */}
        <AccountLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={account?.ownerEmployee}
          entityId={accountId}
          accountInformationCustomFields={salesCampaignSelector}
          annualRevenueCatalogIdentifier="RevenueSize:v1"
          companySizeCatalogIdentifier="EmployeeSize:v1"
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
