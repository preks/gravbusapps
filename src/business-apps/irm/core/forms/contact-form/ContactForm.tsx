import React, { useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentContact } from '@/common/data/investment/hooks/useInvestmentContact'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import { ContactLayout, contactSchema } from '@/common/components/common-relations/form-layouts/contact-layout'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { buildInvestmentContactPayload } from '@/common/data/investment/types/investmentContactTypes'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useFileClient } from '@/common/network/files/useFileClient'
import { InvestmentFilePaths } from '@/common/data/investment/constants/investmentFilePaths'

const prefixDataTestId = 'ContactForm'

interface ContactFormProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentContact>
  onSubmit?: (values: Partial<InvestmentContact>) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map InvestmentContact to form values - automatic mapping
const mapInvestmentContactToFormValues = (
  contact: InvestmentContact | null
): Partial<z.infer<typeof contactSchema>> => {
  if (!contact) {
    return {}
  }

  // ✅ Automatic mapping - schema matches interface exactly
  // Note: account objects are kept for display purposes (like contact objects in AccountForm)
  // They are automatically ignored by payloadBuilder since they're not in the schema
  return mapToFormValues(contact, contactSchema)
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
  const { contact: contactData, loading: contactLoading } = useInvestmentContact(accessToken, contactId)

  // Account search hook
  const accountsHookResult = useGetInvestmentAccounts(
    { accessToken, userInfo, additionalData },
    {
      withState: true,
      autoFetch: true,
      pageSize: 20,
      mapToSelectOptions: true
    }
  )

  // Extract hook result for accountsHook prop (mapToSelectOptions ensures options are SelectOption[])
  const accountsHook = {
    options: accountsHookResult.options as any[],
    loading: accountsHookResult.loading,
    error: accountsHookResult.error,
    search: accountsHookResult.search
  }

  // File client for avatar upload
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Ref to store current file and thumbnail from AvatarUpload (no re-renders)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Map contact data to form values - automatic mapping
  const mapContactToFormValues = useCallback(
    (contact: InvestmentContact | null): Partial<z.infer<typeof contactSchema>> => {
      if (!contact) {
        return {}
      }
      return mapInvestmentContactToFormValues(contact)
    },
    []
  )

  // Initialize React Hook Form (using Partial<InvestmentContact> as type)
  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
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

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = async (data: any) => {
    // Build InvestmentContact object - data already matches interface structure exactly
    const investmentContact: Partial<InvestmentContact> = {
      ...data
    }

    // Use centralized payload builder
    const payload = buildInvestmentContactPayload(investmentContact)

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

  // Handle pre-submit: Upload avatar file if present
  const handlePreSubmit = async (formData: any) => {
    const avatarData = avatarFileRef.current

    if (!avatarData?.file || !avatarData?.thumbnail) {
      return formData
    }

    try {
      const contactId = formData.id || contactData?.id || 'new'
      const pathParams = { accessScope: InvestmentFilePaths.ACCESS_SCOPE } as const
      const queryParams = {
        appName: InvestmentFilePaths.APP_NAME,
        folderPath: InvestmentFilePaths.getContactPicturePath(contactId),
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
        schema={contactSchema}
        data-testid={prefixDataTestId}
        submitButtonText={contactData?.id ? 'Update Contact' : 'Create Contact'}
      >
        <ContactLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={contactData?.ownerEmployee}
          entityId={contactData?.id}
          accountsHook={accountsHook}
          avatarFileRef={avatarFileRef}
          loading={contactLoading && !!contactId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ContactForm
