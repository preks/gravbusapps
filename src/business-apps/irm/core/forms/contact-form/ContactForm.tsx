import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentContact } from '@/common/data/investment/hooks/useInvestmentContact'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import { ContactLayout, contactSchema } from '@/common/components/common-relations/form-layouts/contact-layout'
import { accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { createInlineEntityPopupRenderer } from '@/common/components/common-relations/popups/inline-entity-create-popup'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { buildInvestmentContactPayload } from '@/common/data/investment/types/investmentContactTypes'
import { buildInvestmentAccountPayload } from '@/common/data/investment/types/investmentAccountTypes'
import { buildContactFormSubmissionPayload } from '@/common/data/common/utils/inlineDraftHelpers'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildAvatarPreSubmit } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/investment/constants/investmentConstants'
import { COMPANY_SIZE, ANNUAL_REVENUE, ACCOUNT_PRIORITY } from '@/common/data/investment/constants/investmentCatalogs'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ContactAiEnrichButton } from '@/common/components/common-relations/form-segments/contact-ai-enrich'
import { PlatformUserField } from './components'

export const investmentContactSchema = contactSchema.extend({
  userId: z.string().nullable().optional()
})

type ContactFormProps = BusinessAppContextProps

export const ContactForm: React.FC<ContactFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const contactId = additionalData?.contactId || additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

  const { contact, loading, error } = useInvestmentContact(accessToken || '', contactId)

  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  const useAccounts = useInvestmentAccountsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  const form = useForm<z.infer<typeof investmentContactSchema>>({
    resolver: zodResolver(investmentContactSchema),
    defaultValues: mapToFormValues(contact || {}, investmentContactSchema) as Partial<InvestmentContact>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const contactRef = useRef(contact)
  useEffect(() => {
    if (contactRef.current?.id !== contact?.id) {
      form.reset(mapToFormValues(contact || {}, investmentContactSchema) as Partial<InvestmentContact>)
      contactRef.current = contact
    }
  }, [contact?.id, contact, form])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      return buildContactFormSubmissionPayload({
        data,
        contactBuilder: buildInvestmentContactPayload,
        accountBuilder: buildInvestmentAccountPayload,
        contactCollectionName: 'investmentContacts',
        accountCollectionName: 'investmentAccounts'
      })
    } catch (error) {
      console.error('Error submitting contact:', error)
      throw error
    }
  }, [])

  const renderInlineAccountCreate = React.useMemo(
    () =>
      createInlineEntityPopupRenderer({
        entity: 'account',
        businessAppContext: { accessToken, userInfo, additionalData },
        formConfig: {
          schema: accountSchema,
          annualRevenueCatalogIdentifier: ANNUAL_REVENUE,
          companySizeCatalogIdentifier: COMPANY_SIZE,
          accountPriorityCatalogIdentifier: ACCOUNT_PRIORITY,
          fileConfig: {
            fileEntity: FILE_ENTITY.ACCOUNT,
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
    errors.push({ error, context: 'Failed to load contact data' })
  }
  if (useAccounts.error) {
    errors.push({ error: useAccounts.error, context: 'Failed to load accounts' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="investment-contact-form" />
  }

  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  const handlePreSubmit = buildAvatarPreSubmit(
    fileClient,
    avatarFileRef,
    FILE_ENTITY.CONTACT,
    FILE_CONTEXT.PICTURE,
    APP_NAME,
    formData => formData.id || contact?.id || null
  )

  const userAssignmentField = (
    <PlatformUserField
      accessToken={accessToken}
      initialUserId={contact?.userId || null}
      dataTestIdPrefix="investment-contact-form"
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
        schema={contactSchema}
        data-testid={formatDataTestId('investment-contact-form', 'Form')}
        submitButtonText={contact?.id ? 'Update Contact' : 'Create Contact'}
        isSubmitDisabled={loading}
      >
        <ContactAiEnrichButton accessToken={accessToken} entityKind="investment_contact" isEditMode={!!contact?.id} />
        <ContactLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          accountContacts={contact?.accountContacts}
          ownerEmployee={contact?.ownerEmployee}
          entityId={contact?.id || contactId}
          useAccounts={useAccounts}
          contactInformationCustomFields={userAssignmentField}
          avatarFileRef={avatarFileRef}
          loading={loading && !!contactId}
          inlineAccountCreate={renderInlineAccountCreate}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ContactForm
