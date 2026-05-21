import React, { useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import { ContactLayout, contactSchema } from '@/common/components/common-relations/form-layouts/contact-layout'
import { accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { createInlineEntityPopupRenderer } from '@/common/components/common-relations/popups/inline-entity-create-popup'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { buildCustomerContactPayload } from '@/common/data/customer/types/customerContactTypes'
import { buildCustomerAccountPayload } from '@/common/data/customer/types/customerAccountTypes'
import { buildContactFormSubmissionPayload } from '@/common/data/common/utils/inlineDraftHelpers'
import { SalesCampaignField } from '@/common/components/customer/selects/campaign-select'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildAvatarPreSubmit } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/customer/constants/customerConstants'
import { COMPANY_SIZE, ANNUAL_REVENUE, ACCOUNT_PRIORITY } from '@/common/data/customer/constants/customerCatalogs'
import { ErrorAlert } from '@/components/error-alert'

export const customerContactSchema = contactSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

type ContactFormProps = BusinessAppContextProps

const ContactForm: React.FC<ContactFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const contactId = additionalData?.contactId || additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

  const { contact, loading, error } = useCustomerContact(accessToken || '', contactId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const useAccounts = useCustomerAccountsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  const form = useForm<z.infer<typeof customerContactSchema>>({
    resolver: zodResolver(customerContactSchema),
    defaultValues: mapToFormValues(contact || {}, customerContactSchema) as Partial<CustomerContact>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const contactRef = useRef(contact)
  useEffect(() => {
    if (contactRef.current?.id !== contact?.id) {
      form.reset(mapToFormValues(contact || {}, customerContactSchema) as Partial<CustomerContact>)
      contactRef.current = contact
    }
  }, [contact?.id, contact, form])

  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  const handleSubmit = useCallback(async (data: any) => {
    try {
      return buildContactFormSubmissionPayload({
        data,
        contactBuilder: buildCustomerContactPayload,
        accountBuilder: buildCustomerAccountPayload,
        contactCollectionName: 'contacts',
        accountCollectionName: 'accounts'
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
    return <ErrorAlert errors={errors} prefixDataTestId="customer-contact-form" />
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

  const salesCampaignSelect = (
    <SalesCampaignField
      businessAppContext={{ accessToken, userInfo, additionalData }}
      initialCampaign={
        contact?.salesCampaignId
          ? {
              id: contact.salesCampaignId || '',
              name: (contact as any).salesCampaign?.name || '',
              type: undefined,
              typeRef: undefined
            }
          : null
      }
      dataTestIdPrefix="customer-contact-form"
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
          accountContacts={contact?.accountContacts}
          ownerEmployee={contact?.ownerEmployee}
          entityId={contact?.id || contactId}
          useAccounts={useAccounts}
          contactInformationCustomFields={salesCampaignSelect}
          avatarFileRef={avatarFileRef}
          loading={loading && !!contactId}
          inlineAccountCreate={renderInlineAccountCreate}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ContactForm
