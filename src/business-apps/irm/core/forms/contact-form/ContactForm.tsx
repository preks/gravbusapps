import React, { useEffect, useRef, useCallback } from 'react'
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
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useFileClient } from '@/common/network/files/useFileClient'
import { InvestmentFilePaths } from '@/common/data/investment/constants/investmentFilePaths'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/investment/constants/investmentConstants'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type ContactFormProps = BusinessAppContextProps

const ContactForm: React.FC<ContactFormProps> = ({ accessToken, userInfo, additionalData }) => {
  // Extract contactId from additionalData
  const contactId = additionalData?.contactId || additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

  // Load contact data when editing - using new declarative hook
  const { contact, loading, error } = useInvestmentContact(accessToken || '', contactId)

  // File client for avatar upload
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Account selection hook - using new declarative list hook
  const useAccounts = useInvestmentAccountsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  // Collect all errors for centralized early return
  const errors: Array<{ error?: string | unknown; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load contact data' })
  }
  if (useAccounts.error) {
    errors.push({ error: useAccounts.error, context: 'Failed to load accounts' })
  }

  // Early return if any errors exist
  if (errors.length > 0) {
    return (
      <>
        {errors.map((err, index) => (
          <ErrorAlert
            key={index}
            error={err.error}
            type={err.type}
            context={err.context}
            dataTestId={formatDataTestId('investment-contact-form', `error-alert-${index}`)}
          />
        ))}
      </>
    )
  }

  // Ref to store current file and thumbnail from AvatarUpload (no re-renders)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Initialize React Hook Form
  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: mapToFormValues(contact || {}, contactSchema) as Partial<InvestmentContact>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when contact changes
  const contactRef = useRef(contact)
  useEffect(() => {
    if (contactRef.current?.id !== contact?.id) {
      form.reset(mapToFormValues(contact || {}, contactSchema) as Partial<InvestmentContact>)
      contactRef.current = contact
    }
  }, [contact?.id, contact, form])

  // Handle form submission - data already matches interface structure exactly
  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { investmentContact } = buildInvestmentContactPayload(data)
      return {
        investmentContact,
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    } catch (error) {
      console.error('Error submitting contact:', error)
      throw error
    }
  }, [])

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
      const pathParams = { accessScope: InvestmentFilePaths.ACCESS_SCOPE } as const
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
        schema={contactSchema}
        data-testid={formatDataTestId('investment-contact-form', 'Form')}
        submitButtonText={contact?.id ? 'Update Contact' : 'Create Contact'}
        isSubmitDisabled={loading}
      >
        <ContactLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={contact?.ownerEmployee}
          entityId={contact?.id || contactId}
          useAccounts={useAccounts}
          avatarFileRef={avatarFileRef}
          loading={loading && !!contactId}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ContactForm
