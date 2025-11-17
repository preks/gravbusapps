import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import { ContactLayout } from '@/common/components/common-relations/form-layouts/contact-layout'
import { createContactSegmentResolver } from '@/common/components/common-relations/schemas/contactSchema'
import { buildCustomerContactPayload } from '@/common/data/customer/types/customerContactTypes'
import { AddressType } from '@/common/data/relations/types/relationEnums'
import { CampaignSelect } from '@/common/components/customer/form-segments/campaign-select'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useFileClient } from '@/common/network/files/useFileClient'

const prefixDataTestId = 'ContactForm'

interface ContactFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<CustomerContact>
  onSubmit?: (values: Partial<CustomerContact>) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map CustomerContact to form values (using CustomerContact structure directly)
const mapCustomerContactToFormValues = (contact: CustomerContact | null): Partial<CustomerContact> => {
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
    picture: contact.picture,
    pictureThumbnail: contact.pictureThumbnail,

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

    // Campaign Information
    salesCampaignId: contact.salesCampaignId,

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
  const { contact: contactData } = useCustomerContact(businessAppContext, contactId)

  // File client for avatar upload
  const fileClient = useFileClient(businessAppContext)

  // Account search - using central hook
  const { fetchCustomerAccounts } = useCustomerAccounts(businessAppContext)
  const [accountOptions, setAccountOptions] = useState<
    Array<{ id: string; value: string; label: string; name: string }>
  >([])
  const [accountsLoading, setAccountsLoading] = useState(false)

  const searchAccounts = useCallback(
    async (search: string) => {
      setAccountsLoading(true)
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
      } catch {
        setAccountsLoading(false)
        return []
      }
    },
    [fetchCustomerAccounts]
  )

  // Transform contact data to form values
  const contactToFormValues = useMemo(() => {
    const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId
    const contactId =
      businessAppContext.additionalData?.contactId ||
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

    console.log('🔍 ContactFormComponent: contactToFormValues - Computing default values', {
      hasContactData: !!contactData,
      contactId,
      currentUserEmployeeId,
      initialValuesOwner: initialValues?.ownerEmployeeId
    })

    if (!contactData) {
      // Don't auto-set owner here - OwnerSelect component handles this
      console.log('✅ ContactFormComponent: New contact - OwnerSelect will handle auto-selection')

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

    const mapped = mapCustomerContactToFormValues(contactData)
    return {
      ...mapped,
      picture: contactData?.picture ? JSON.stringify({ url: contactData.picture }) : null,
      pictureThumbnail: contactData?.pictureThumbnail || null,
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

  // Initialize React Hook Form (using Partial<CustomerContact> as type)
  const form = useForm<Partial<CustomerContact>>({
    resolver: createContactSegmentResolver() as any,
    defaultValues: contactToFormValues as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  console.log('🔍 ContactFormComponent: Form initialized with defaultValues', {
    ownerEmployeeId: contactToFormValues.ownerEmployeeId,
    formOwnerEmployeeId: form.getValues('ownerEmployeeId')
  })

  // Sync form when contact changes
  useEffect(() => {
    if (contactData) {
      const formValues = mapCustomerContactToFormValues(contactData)
      form.reset({
        ...formValues,
        picture: contactData?.picture ? JSON.stringify({ url: contactData.picture }) : null,
        pictureThumbnail: contactData?.pictureThumbnail || null,
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

  // Handle pre-submit: Upload avatar file if present
  const handlePreSubmit = async (formData: any) => {
    const avatarFile = (form as any)._avatarFile as File | undefined
    if (!avatarFile) {
      return formData
    }

    try {
      const contactId = formData.id || contactData?.id || 'new'
      const pathParams = { accessScope: 'public' } as const
      const queryParams = {
        appName: 'crm',
        folderPath: `/contacts/${contactId}/pictures`,
        mimeType: avatarFile.type || 'image/jpeg'
      }

      const uploadResponse = await fileClient.uploadFile(avatarFile, pathParams, queryParams)

      return {
        ...formData,
        picture: JSON.stringify(uploadResponse.fileInfo),
        pictureThumbnail: formData.pictureThumbnail || ''
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      throw error
    }
  }

  // Handle form submission - returns payload for AppActionForm
  const handleSubmit = async (data: any) => {
    // Transform addressLines (array) to addressLine (string for CRM)
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
            addressLine: addr.addressLines?.some((line: string) => line.trim())
              ? addr.addressLines.filter((line: string) => line.trim()).join(', ')
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
        valueExtension: ch.valueExtension || null
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

    // Build CustomerContact object (using CustomerContact structure directly)
    const customerContact: Partial<CustomerContact> = {
      ...data,
      communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      accountContacts: accountContacts.length > 0 ? accountContacts : undefined
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
              businessAppContext={businessAppContext}
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
    <CatalogSelect.Provider {...businessAppContext} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        handlePreSubmit={handlePreSubmit}
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
            avatarImage={contactData?.picture || contactData?.pictureThumbnail}
            accounts={accountOptions}
            accountsLoading={accountsLoading}
            accountsError={null}
            searchAccounts={searchAccounts}
            contactInformationCustomFields={salesCampaignSelector}
          />
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default ContactFormComponent
