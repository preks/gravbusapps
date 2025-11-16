import React, { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentContactData, mapInvestmentContactToFormValues } from '../hooks/useContactData'
import { ContactLayout } from '@/common/components/common-relations/form-layouts/contact-layout'
import { createContactSegmentResolver } from '@/common/components/common-relations/schemas/contactSchema'
import { buildInvestmentContactPayload } from '@/common/data/investment/types/investmentContactTypes'
import { AddressType } from '@/common/data/relations/types/relationEnums'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'

const prefixDataTestId = 'ContactForm'

interface ContactFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
}

const ContactFormComponent: React.FC<ContactFormComponentProps> = ({
  businessAppContext,
  initialValues,
  onCancel = async () => {}
}) => {
  // Extract contactId from businessAppContext
  const contactId =
    businessAppContext.additionalData?.contactId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

  // Load contact data when editing
  const { contactData } = useInvestmentContactData(businessAppContext)

  // Account search hook
  const {
    options: accountOptions,
    loading: accountsLoading,
    error: accountsError,
    search: searchAccounts
  } = useGetInvestmentAccounts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: true
  })

  // Transform contact data to form values
  const contactToFormValues = useMemo(() => {
    const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

    if (!contactData?.InvestmentContact?.[0]) {
      // Auto-set current user as owner for new contacts
      const defaultOwnerEmployeeId =
        !contactId && currentUserEmployeeId ? currentUserEmployeeId : initialValues?.ownerEmployeeId || ''

      return {
        ownerEmployeeId: defaultOwnerEmployeeId,
        firstName: '',
        lastName: '',
        jobPosition: '',
        department: '',
        type: '',
        academicTitleRef: '',
        birthDate: '',
        languageRef: '',
        notesSummary: '',
        communicationChannels: [],
        addresses: [],
        accountIds: [],
        ...initialValues
      }
    }

    const mapped = mapInvestmentContactToFormValues(contactData)
    const contact = contactData.InvestmentContact[0]

    return {
      ownerEmployeeId: mapped.ownerEmployeeId || '',
      firstName: mapped.firstName || '',
      lastName: mapped.lastName || '',
      jobPosition: mapped.jobPosition || '',
      department: mapped.department || '',
      type: mapped.type || '',
      academicTitleRef: mapped.academicTitleRef || '',
      birthDate: mapped.birthDate || '',
      languageRef: mapped.languageRef || '',
      notesSummary: mapped.notesSummary || '',
      businessKey: mapped.businessKey || '',
      communicationChannels: (contact.communicationChannels || []).map((ch: any) => ({
        id: ch.id,
        version: ch.version,
        communicationChannelRef: ch.communicationChannelRef || '',
        value: ch.value || '',
        valueExtension: ch.valueExtension || null
      })),
      addresses: [],
      accountIds: (mapped.accountIds || []).map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        contactType: acc.contactType || null, // contactType is now on each account
        associationId: acc.associationId,
        associationVersion: acc.associationVersion
      })),
      id: mapped.id,
      version: mapped.version,
      ...initialValues
    }
  }, [contactData, initialValues])

  // Initialize React Hook Form
  const form = useForm({
    resolver: createContactSegmentResolver(),
    defaultValues: contactToFormValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when contact changes
  const contactRef = React.useRef(contactData)
  useEffect(() => {
    if (contactRef.current?.InvestmentContact?.[0]?.id !== contactData?.InvestmentContact?.[0]?.id) {
      form.reset(contactToFormValues)
      contactRef.current = contactData
    }
  }, [contactData?.InvestmentContact?.[0]?.id, contactData, form, contactToFormValues])

  // Auto-select current user as owner (only if not editing existing contact)
  const autoSelectionDone = useRef(false)
  useEffect(() => {
    const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

    // Wait for form to be ready and check if we should auto-select
    const formValues = form.getValues()
    const ownerEmployeeId = formValues.ownerEmployeeId

    // Only auto-select if:
    // 1. We have current user employee ID
    // 2. No owner is set yet
    // 3. We haven't already done auto-selection
    // 4. We're NOT editing an existing contact (no contactId)
    // 5. We don't have contact data loaded
    // 6. No form ID is set
    if (
      currentUserEmployeeId &&
      !ownerEmployeeId &&
      !autoSelectionDone.current &&
      !contactId &&
      !contactData?.InvestmentContact?.[0] &&
      !formValues.id
    ) {
      console.log('✅ Contact Form: Auto-selecting current user as owner:', currentUserEmployeeId)
      form.setValue('ownerEmployeeId', currentUserEmployeeId, { shouldValidate: false })
      autoSelectionDone.current = true
    }
  }, [
    contactData,
    form,
    businessAppContext.additionalData,
    businessAppContext.userInfo?.employeeDetails?.employeeId,
    form.watch('ownerEmployeeId')
  ])

  // Handle form submission - returns payload for AppActionForm
  const handleSubmit = async (data: any) => {
    // Transform addressLines (array) to addressLine (object for IRM)
    const addresses =
      data.addresses
        ?.filter(
          (addr: any) =>
            addr.addressLines?.some((line: string) => line.trim()) ||
            addr.postalCode?.trim() ||
            addr.locality?.trim() ||
            addr.regionRef?.trim() ||
            addr.countryRef?.trim()
        )
        .map((addr: any) => {
          const addressPayload: any = {
            addressType: addr.addressType || AddressType.PRIMARY_ADDRESS,
            // IRM: addressLine is an object with lines array
            addressLine: addr.addressLines?.some((line: string) => line.trim())
              ? {
                  lines: addr.addressLines.filter((line: string) => line.trim())
                }
              : null,
            postalCode: addr.postalCode?.trim() || null,
            locality: addr.locality?.trim() || null,
            regionRef: addr.regionRef?.trim() || null,
            countryRef: addr.countryRef?.trim() || null
          }

          if (data.id && addr.id) {
            addressPayload.id = addr.id
            if (addr.version !== undefined && addr.version !== null) {
              addressPayload.version = addr.version
            }
          }

          return addressPayload
        })
        .filter(Boolean) || []

    // Communication channels are already in data.communicationChannels from CommunicationSegment
    const communicationChannels = (data.communicationChannels || [])
      .filter((ch: any) => ch.communicationChannelRef && ch.value?.trim())
      .map((ch: any) => ({
        ...(ch.id && { id: ch.id }),
        ...(ch.version !== undefined && { version: ch.version }),
        communicationChannelRef: ch.communicationChannelRef,
        value: ch.value.trim(),
        valueExtension: ch.valueExtension || null,
        source: 'FORM_INPUT',
        activeFrom: new Date().toISOString(),
        activeTo: null
      }))

    // Build accountContacts array - contactType is now on each account
    const accountContacts = (data.accountIds || []).map((account: any) => {
      if (typeof account === 'object' && account.id) {
        const accountContact: any = {
          contactType: account.contactType || null, // contactType is now on each account
          account: account.id,
          contact: data.id
        }

        if (account.associationId) {
          accountContact.id = account.associationId
          if (account.associationVersion !== undefined) {
            accountContact.version = account.associationVersion
          }
        }

        return accountContact
      }

      return {
        contactType: null,
        account: account,
        contact: data.id
      }
    })

    // Build InvestmentContact object
    const investmentContact: Partial<
      import('@/common/data/investment/types/investmentContactTypes').InvestmentContact
    > = {
      ...data,
      communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      accountContacts: accountContacts.length > 0 ? accountContacts : undefined
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

  // Determine process type based on whether contact exists
  const processType = contactData?.InvestmentContact?.[0]?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider {...businessAppContext} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        businessAppContext={businessAppContext}
        showCancelButton={true}
        data-testid={prefixDataTestId}
        submitButtonText={contactData?.InvestmentContact?.[0]?.id ? 'Update Contact' : 'Create Contact'}
      >
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          <ContactLayout
            businessAppContext={businessAppContext}
            ownerEmployee={contactData?.InvestmentContact?.[0]?.ownerEmployee}
            entityId={contactId}
            accounts={accountOptions}
            accountsLoading={accountsLoading}
            accountsError={accountsError}
            searchAccounts={searchAccounts}
          />
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ContactFormComponent
