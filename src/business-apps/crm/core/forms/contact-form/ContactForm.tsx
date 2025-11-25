import React, { useEffect, useRef, useCallback } from 'react'
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
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/customer/constants/customerConstants'
import { ErrorAlert } from '@/components/error-alert'

// CRM-specific schema extension (adds salesCampaignId)
export const customerContactSchema = contactSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

type ContactFormProps = BusinessAppContextProps

const ContactForm: React.FC<ContactFormProps> = ({ accessToken, userInfo, additionalData }) => {
  // Extract contactId from additionalData
  const contactId = additionalData?.contactId || additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

  // Load contact data when editing - using new declarative hook
  const { contact, loading, error } = useCustomerContact(accessToken || '', contactId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // File client for avatar upload
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Account selection hook - using new declarative list hook
  const useAccounts = useCustomerAccountsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  // Initialize React Hook Form
  const form = useForm<z.infer<typeof customerContactSchema>>({
    resolver: zodResolver(customerContactSchema),
    defaultValues: mapToFormValues(contact || {}, customerContactSchema) as Partial<CustomerContact>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when contact changes
  const contactRef = useRef(contact)
  useEffect(() => {
    if (contactRef.current?.id !== contact?.id) {
      form.reset(mapToFormValues(contact || {}, customerContactSchema) as Partial<CustomerContact>)
      contactRef.current = contact
    }
  }, [contact?.id, contact, form])

  // Ref to store current file and thumbnail from AvatarUpload (no re-renders)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { contact } = buildCustomerContactPayload(data)
      return {
        contact,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting contact:', error)
      throw error
    }
  }, [])

  // Collect all errors for centralized early return (AFTER all hooks)
  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load contact data' })
  }
  if (useAccounts.error) {
    errors.push({ error: useAccounts.error, context: 'Failed to load accounts' })
  }

  // Early return if any errors exist (now safe - all hooks called above)
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="customer-contact-form" />
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
      const contactId = formData.id || contact?.id || null
      const folderPath = buildFilePath(FILE_ENTITY.CONTACT, contactId, FILE_CONTEXT.PICTURE)
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
  const salesCampaignSelect = (
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
                contact?.salesCampaignId
                  ? {
                      id: contact.salesCampaignId || '',
                      name: (contact as any).salesCampaign?.name || '',
                      type: undefined,
                      typeRef: undefined
                    }
                  : null
              }
              placeholder="Search Campaign..."
              data-testid={formatDataTestId('customer-contact-form', 'campaign-select')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const processType = contact?.id ? 'update' : 'create'

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
        data-testid={formatDataTestId('customer-contact-form', 'Form')}
        submitButtonText={contact?.id ? 'Update Contact' : 'Create Contact'}
        isSubmitDisabled={loading}
      >
        <ContactLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={contact?.ownerEmployee}
          entityId={contact?.id || contactId}
          useAccounts={useAccounts}
          contactInformationCustomFields={salesCampaignSelect}
          avatarFileRef={avatarFileRef}
          loading={loading && !!contactId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ContactForm
