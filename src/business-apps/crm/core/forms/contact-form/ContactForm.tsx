import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import { ContactLayout, contactSchema } from '@/common/components/common-relations/form-layouts/contact-layout'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { buildCustomerContactPayload } from '@/common/data/customer/types/customerContactTypes'
import { CampaignSelect } from '@/common/components/customer/selects/campaign-select'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useFileClient } from '@/common/network/files/useFileClient'
import { CustomerFilePaths } from '@/common/data/customer/constants/customerFilePaths'

const prefixDataTestId = 'ContactForm'

// CRM-specific schema extension (adds salesCampaignId)
export const customerContactSchema = contactSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

interface ContactFormProps extends BusinessAppContextProps {
  initialValues?: Partial<CustomerContact>
  onSubmit?: (values: Partial<CustomerContact>) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map CustomerContact to form values - automatic mapping
const mapCustomerContactToFormValues = (
  contact: CustomerContact | null
): Partial<z.infer<typeof customerContactSchema>> => {
  if (!contact) {
    return {}
  }

  // ✅ Automatic mapping - schema matches interface exactly
  // Note: account objects are kept for display purposes (like contact objects in AccountForm)
  // They are automatically ignored by payloadBuilder since they're not in the schema
  return mapToFormValues(contact, customerContactSchema)
}

const ContactForm: React.FC<ContactFormProps> = ({
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

  // Extract contactId from additionalData
  const contactId = additionalData?.contactId || additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

  // Load contact data when editing - using new declarative hook
  const { contact: contactData, loading: contactLoading } = useCustomerContact(accessToken, contactId)

  // File client for avatar upload
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Account search - using central hook
  const { fetchCustomerAccounts } = useCustomerAccounts({ accessToken, userInfo, additionalData })
  const [accountOptions, setAccountOptions] = useState<
    Array<{ id: string; value: string; label: string; name: string }>
  >([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  const searchAccounts = useCallback(
    async (search: string) => {
      setAccountsLoading(true)
      setAccountsError(null)
      try {
        const result = await fetchCustomerAccounts({ search, limit: 20, offset: 0 })
        const mappedAccounts = (result.accounts || []).map((acc: any) => ({
          id: acc.id,
          value: acc.id,
          label: acc.name,
          name: acc.name
        }))
        setAccountOptions(mappedAccounts)
        setAccountsLoading(false)
        return mappedAccounts
      } catch (error) {
        setAccountsLoading(false)
        setAccountsError(error instanceof Error ? error.message : 'Failed to fetch accounts')
        return []
      }
    },
    [fetchCustomerAccounts]
  )

  useEffect(() => {
    if (accessToken) {
      searchAccounts('')
    }
  }, [accessToken, searchAccounts])

  // Extract hook result for accountsHook prop
  const accountsHook = {
    options: accountOptions,
    loading: accountsLoading,
    error: accountsError,
    search: searchAccounts
  }

  // Map contact data to form values - automatic mapping
  const mapContactToFormValues = useCallback(
    (contact: CustomerContact | null): Partial<z.infer<typeof customerContactSchema>> => {
      if (!contact) {
        return {}
      }
      return mapCustomerContactToFormValues(contact)
    },
    []
  )

  // Initialize React Hook Form
  const form = useForm<z.infer<typeof customerContactSchema>>({
    resolver: zodResolver(customerContactSchema),
    defaultValues: {
      ...mapContactToFormValues(contactData),
      ...initialValues
    } as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when contact changes
  useEffect(() => {
    if (contactData) {
      const formValues = mapContactToFormValues(contactData)
      form.reset({
        ...formValues,
        ...initialValues
      } as any)
    }
  }, [contactData?.id, contactData, form, mapContactToFormValues, initialValues])

  // NOTE: Auto-selection of current user is now handled by OwnerSelect component
  // No need for manual auto-selection logic here

  // Ref to store current file and thumbnail from AvatarUpload (no re-renders)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Handle pre-submit: Upload avatar file if present
  const handlePreSubmit = async (formData: any) => {
    const avatarData = avatarFileRef.current

    if (!avatarData?.file || !avatarData?.thumbnail) {
      return formData
    }

    try {
      const contactId = formData.id || contactData?.id || 'new'
      const pathParams = { accessScope: CustomerFilePaths.ACCESS_SCOPE } as const
      const queryParams = {
        appName: CustomerFilePaths.APP_NAME,
        folderPath: CustomerFilePaths.getContactPicturePath(contactId),
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

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = async (data: any) => {
    // Build CustomerContact object - data already matches interface structure exactly
    const customerContact: Partial<CustomerContact> = {
      ...data
    }

    // Use centralized payload builder
    const payload = buildCustomerContactPayload(customerContact)

    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    // Return payload for AppActionForm to handle process event
    return {
      ...payload,
      changeMode: changeMode
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    await onCancel()
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
                contactData?.salesCampaignId
                  ? {
                      id: contactData.salesCampaignId || '',
                      name: (contactData as any).salesCampaign?.name || '',
                      type: undefined,
                      typeRef: undefined
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

  // Determine process type based on whether contact exists
  const processType = contactData?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        handlePreSubmit={handlePreSubmit}
        formData={form.getValues()}
        form={form}
        schema={customerContactSchema}
        data-testid={prefixDataTestId}
        submitButtonText={contactData?.id ? 'Update Contact' : 'Create Contact'}
      >
        <ContactLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={contactData?.ownerEmployee}
          entityId={contactData?.id}
          accountsHook={accountsHook}
          contactInformationCustomFields={salesCampaignSelector}
          avatarFileRef={avatarFileRef}
          loading={contactLoading && !!contactId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ContactForm
