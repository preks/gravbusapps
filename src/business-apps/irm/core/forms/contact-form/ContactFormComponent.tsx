import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentContact } from '@/common/data/investment/hooks/useInvestmentContact'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import { ContactLayout } from '@/common/components/common-relations/form-layouts/contact-layout'
import { createContactSegmentResolver } from '@/common/components/common-relations/schemas/contactSchema'
import { buildInvestmentContactPayload } from '@/common/data/investment/types/investmentContactTypes'
import { AddressType } from '@/common/data/relations/types/relationEnums'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'

const prefixDataTestId = 'ContactForm'

interface ContactFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<InvestmentContact>
  onSubmit?: (values: Partial<InvestmentContact>) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map InvestmentContact to form values (using InvestmentContact structure directly)
const mapInvestmentContactToFormValues = (contact: InvestmentContact | null): Partial<InvestmentContact> => {
  if (!contact) {
    return {}
  }
  return {
    // System fields
    id: contact.id,
    version: contact.version,

    // Personal Information
    firstName: contact.firstName,
    lastName: contact.lastName,
    birthDate: contact.birthDate,
    description: contact.description,

    // Professional Information
    jobPosition: contact.jobPosition,
    department: contact.department,
    type: contact.type,

    // Owner Information
    ownerEmployeeId: contact.ownerEmployeeId,

    // Account Information
    accountContacts: contact.accountContacts,

    // Academic Title
    academicTitleRef: contact.academicTitleRef,

    // Language
    languageRef: contact.languageRef,

    // Communication Channels
    communicationChannels: contact.communicationChannels,

    // Addresses
    addresses: contact.addresses,

    // Notes
    notesSummary: contact.notesSummary,

    // Other fields
    code: contact.code
  }
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

  // Load contact data when editing - using new declarative hook
  const { contact: contactData } = useInvestmentContact(businessAppContext, contactId)

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
    if (!contactData) {
      // Don't auto-set owner here - OwnerSelect component handles this
      return {
        ownerEmployeeId: '', // Empty - OwnerSelect will auto-select current user
        firstName: '',
        lastName: '',
        jobPosition: '',
        department: '',
        academicTitleRef: '',
        birthDate: '',
        languageRef: '',
        notesSummary: '',
        communicationChannels: [],
        addresses: [],
        accountContacts: [],
        ...initialValues
      }
    }

    const mapped = mapInvestmentContactToFormValues(contactData)
    return {
      ...mapped,
      communicationChannels: (contactData?.communicationChannels || []).map((ch: any) => ({
        id: ch.id,
        version: ch.version,
        communicationChannelRef: ch.communicationChannelRef || '',
        value: ch.value || '',
        valueExtension: ch.valueExtension || null
      })),
      addresses: contactData?.addresses || [],
      ...initialValues
    }
  }, [
    contactData,
    initialValues,
    businessAppContext.userInfo?.employeeDetails?.employeeId,
    businessAppContext.additionalData?.contactId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId
  ])

  // Initialize React Hook Form (using Partial<InvestmentContact> as type)
  const form = useForm<Partial<InvestmentContact>>({
    resolver: createContactSegmentResolver() as any,
    defaultValues: contactToFormValues as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when contact changes
  useEffect(() => {
    if (contactData) {
      const formValues = mapInvestmentContactToFormValues(contactData)
      form.reset({
        ...formValues,
        communicationChannels: (contactData?.communicationChannels || []).map((ch: any) => ({
          id: ch.id,
          version: ch.version,
          communicationChannelRef: ch.communicationChannelRef || '',
          value: ch.value || '',
          valueExtension: ch.valueExtension || null
        })),
        addresses: contactData?.addresses || []
      } as any)
    }
  }, [contactData?.id, contactData, form])

  // NOTE: Auto-selection of current user is now handled by OwnerSelect component
  // No need for manual auto-selection logic here

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

    // accountContacts are already in the correct format from the form
    const accountContacts = (data.accountContacts || [])
      .filter((ac: any) => ac?.account || ac?.accountId)
      .map((ac: any) => ({
        ...(ac.id && { id: ac.id }),
        ...(ac.version !== undefined && { version: ac.version }),
        account: ac.account || ac.accountId,
        contact: data.id,
        contactType: ac.contactType || null
      }))

    // Build InvestmentContact object (using InvestmentContact structure directly)
    const investmentContact: Partial<InvestmentContact> = {
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
  const processType = contactData?.id ? 'update' : 'create'

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
        submitButtonText={contactData?.id ? 'Update Contact' : 'Create Contact'}
      >
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          <ContactLayout
            businessAppContext={businessAppContext}
            ownerEmployee={contactData?.ownerEmployee}
            entityId={contactData?.id}
            accounts={accountOptions as any}
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
