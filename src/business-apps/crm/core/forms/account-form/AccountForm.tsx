import React, { useEffect, useRef, useCallback } from 'react'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useCustomerContactsList } from '@/common/data/customer/hooks/useCustomerContacts'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildCustomerAccountPayload } from '@/common/data/customer/types/customerAccountTypes'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/customer/constants/customerConstants'
import { COMPANY_SIZE, ANNUAL_REVENUE, ACCOUNT_PRIORITY } from '@/common/data/customer/constants/customerCatalogs'
import { AccountLayout, accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { CampaignSelect } from '@/common/components/customer/selects/campaign-select'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import { useFileClient } from '@/common/network/files/useFileClient'

// CRM-specific schema extension (adds salesCampaignId)
export const customerAccountSchema = accountSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

type AccountFormProps = BusinessAppContextProps

const AccountForm: React.FC<AccountFormProps> = ({ accessToken, userInfo, additionalData }) => {
  // Extract accountId from additionalData
  const accountId = additionalData?.accountId || additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  // Fetch account data using declarative hook
  const { account, loading, error } = useCustomerAccount(accessToken || '', accountId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Contact selection hook - using new declarative list hook
  const useContacts = useCustomerContactsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  // File client for avatar upload
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Ref to store current file and thumbnail from AvatarUpload (no re-renders)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Initialize React Hook Form with CRM-specific schema
  const form = useForm<z.infer<typeof customerAccountSchema>>({
    resolver: zodResolver(customerAccountSchema),
    defaultValues: mapToFormValues(account || {}, customerAccountSchema) as Partial<CustomerAccount>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when account changes
  const accountRef = useRef(account)
  useEffect(() => {
    if (accountRef.current?.id !== account?.id) {
      form.reset(mapToFormValues(account || {}, customerAccountSchema) as Partial<CustomerAccount>)
      accountRef.current = account
    }
  }, [account?.id, account, form])

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { account } = buildCustomerAccountPayload(data)
      return {
        account,
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
    return <ErrorAlert errors={errors} prefixDataTestId="customer-account-form" />
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

  // Sales Campaign selector component
  const campaignSelect = (
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
              data-testid={formatDataTestId('customer-account-form', 'campaign-select')}
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
        data-testid={formatDataTestId('customer-account-form', 'Form')}
        submitButtonText={account?.id ? 'Update Account' : 'Create Account'}
        isSubmitDisabled={loading}
      >
        {/* Account Layout */}
        <AccountLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={account?.ownerEmployee}
          entityId={account?.id || accountId}
          accountInformationCustomFields={campaignSelect}
          annualRevenueCatalogIdentifier={ANNUAL_REVENUE}
          companySizeCatalogIdentifier={COMPANY_SIZE}
          accountPriorityCatalogIdentifier={ACCOUNT_PRIORITY}
          useContacts={useContacts}
          avatarFileRef={avatarFileRef}
          loading={loading && !!accountId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default AccountForm
