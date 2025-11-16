import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import { ContactFormValues } from '../types'
import {
  getEmailChannel,
  getPhoneChannel,
  getLinkedInChannel,
  getXingChannel
} from '@/common/data/common/utils/communicationChannelHelpers'
import { ContactLayout } from '@/common/components/common-relations/form-layouts/contact-layout'
import { createContactSegmentResolver } from '@/common/components/common-relations/schemas/contactSchema'
import { buildCustomerContactPayload } from '@/common/data/customer/types/customerContactTypes'
import { AddressType } from '@/common/data/relations/types/relationEnums'
import { CampaignSelect } from '@/common/components/customer/form-segments/campaign-select'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useAccountsGraphQL } from '../../opportunity-form/hooks/useAccountsGraphQL'
import { useFileClient } from '@/common/network/files/useFileClient'

const prefixDataTestId = 'ContactForm'

interface ContactFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
}

// Map CustomerContact to ContactFormValues
const mapCustomerContactToFormValues = (contact: CustomerContact): Partial<ContactFormValues> => {
  // Extract LinkedIn and Xing URLs from communication channels
  const linkedinChannel = getLinkedInChannel(contact.communicationChannels)
  const xingChannel = getXingChannel(contact.communicationChannels)

  return {
    // System fields
    id: contact.id,
    version: contact.version,

    // Personal Information
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    email: getEmailChannel(contact.communicationChannels)?.value || '',
    phone: getPhoneChannel(contact.communicationChannels)?.value || '',
    birthDate: contact.birthDate ? new Date(contact.birthDate).toISOString().split('T')[0] : '',
    bio: contact.description || '',
    pictureUrl: contact.picture || '',

    // Professional Information
    jobTitle: contact.jobPosition || '',
    department: contact.department || '',
    contactType: contact.type || '',

    // Owner Information
    ownerEmployeeId: contact.ownerEmployeeId || '',

    // Account Information
    accountIds:
      contact.accountContacts?.map(rel => ({
        id: rel.account?.id || '',
        name: rel.account?.name || '',
        contactType: rel.contactType || null,
        associationId: rel.id,
        associationVersion: rel.version
      })) || [],

    // Academic Title
    academicTitleRef: contact.academicTitleRef || contact.academicTitle?.id || '',

    // Language
    languageRef: contact.languageRef || contact.language?.id || '',

    // Social Media (extracted from communication channels)
    linkedinUrl: linkedinChannel?.value || '',
    xingUrl: xingChannel?.value || '',

    // Campaign Information
    salesCampaignId: contact.salesCampaignId || '',

    // Notes
    notesSummary: contact.notesSummary || ''
  }
}

const ContactFormComponent: React.FC<ContactFormComponentProps> = ({
  businessAppContext,
  initialValues,
  onCancel = async () => {}
}) => {
  // Load contact data when editing using central hook
  const [contactData, setContactData] = useState<CustomerContact | null>(null)
  const { fetchCustomerContactById } = useCustomerContacts(businessAppContext)

  // Extract contactId from businessAppContext
  const contactId =
    businessAppContext.additionalData?.contactId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

  // Load contact data when contactId is provided
  useEffect(() => {
    const loadContactData = async () => {
      if (!contactId || !businessAppContext.accessToken) {
        return
      }

      try {
        const result = await fetchCustomerContactById(contactId)
        if (result) {
          setContactData(result)
        }
      } catch (err) {
        console.error('Failed to load contact data:', err)
      }
    }

    loadContactData()
  }, [contactId, businessAppContext.accessToken, fetchCustomerContactById])

  // File client for avatar upload
  const fileClient = useFileClient(businessAppContext)

  // Account search hook
  const {
    options: accountOptions,
    loading: accountsLoading,
    search: searchAccounts
  } = useAccountsGraphQL({ accessToken: businessAppContext.accessToken })

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
      // Auto-set current user as owner for new contacts
      const defaultOwnerEmployeeId =
        !contactId && currentUserEmployeeId ? currentUserEmployeeId : initialValues?.ownerEmployeeId || ''

      console.log('✅ ContactFormComponent: Setting default ownerEmployeeId for new contact', {
        defaultOwnerEmployeeId,
        reason: !contactId && currentUserEmployeeId ? 'new contact, using current user' : 'using initialValues or empty'
      })

      return {
        ownerEmployeeId: defaultOwnerEmployeeId,
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
        accountIds: [],
        ...initialValues
      }
    }

    const mapped = mapCustomerContactToFormValues(contactData)
    return {
      ownerEmployeeId: mapped.ownerEmployeeId || '',
      firstName: mapped.firstName || '',
      lastName: mapped.lastName || '',
      jobPosition: mapped.jobTitle || '',
      department: mapped.department || '',
      academicTitleRef: mapped.academicTitleRef || '',
      birthDate: mapped.birthDate || '',
      languageRef: mapped.languageRef || '',
      notesSummary: mapped.notesSummary || '',
      salesCampaignId: mapped.salesCampaignId || '',
      picture: contactData.picture ? JSON.stringify({ url: contactData.picture }) : null,
      pictureThumbnail: contactData.pictureThumbnail || null,
      communicationChannels: (contactData.communicationChannels || []).map((ch: any) => ({
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
        contactType: acc.contactType || null,
        associationId: acc.associationId,
        associationVersion: acc.associationVersion
      })),
      id: mapped.id,
      version: mapped.version,
      ...initialValues
    }
  }, [
    contactData,
    initialValues,
    businessAppContext.userInfo?.employeeDetails?.employeeId,
    businessAppContext.additionalData?.contactId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId
  ])

  // Initialize React Hook Form
  const form = useForm({
    resolver: createContactSegmentResolver(),
    defaultValues: contactToFormValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  console.log('🔍 ContactFormComponent: Form initialized with defaultValues', {
    ownerEmployeeId: contactToFormValues.ownerEmployeeId,
    formOwnerEmployeeId: form.getValues('ownerEmployeeId')
  })

  // Sync form when contact changes
  const contactRef = React.useRef(contactData)
  useEffect(() => {
    if (contactRef.current?.id !== contactData?.id) {
      form.reset(contactToFormValues)
      contactRef.current = contactData
    }
  }, [contactData?.id, contactData, form, contactToFormValues])

  // Auto-select current user as owner (only if not editing existing contact)
  const autoSelectionDone = useRef(false)
  useEffect(() => {
    const contactId =
      businessAppContext.additionalData?.contactId ||
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId
    const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

    // Wait for form to be ready and check if we should auto-select
    const formValues = form.getValues()
    const ownerEmployeeId = formValues.ownerEmployeeId

    console.log('🔍 ContactFormComponent: Auto-selection useEffect triggered', {
      currentUserEmployeeId,
      ownerEmployeeId,
      autoSelectionDone: autoSelectionDone.current,
      contactId,
      hasContactData: !!contactData,
      formValuesId: formValues.id,
      shouldAutoSelect:
        currentUserEmployeeId &&
        !ownerEmployeeId &&
        !autoSelectionDone.current &&
        !contactId &&
        !contactData &&
        !formValues.id
    })

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
      !contactData &&
      !formValues.id
    ) {
      console.log('✅ ContactFormComponent: Auto-selecting current user as owner:', currentUserEmployeeId)
      form.setValue('ownerEmployeeId', currentUserEmployeeId, { shouldValidate: false })
      autoSelectionDone.current = true
      console.log('✅ ContactFormComponent: Owner set, new value:', form.getValues('ownerEmployeeId'))
    } else {
      console.log('❌ ContactFormComponent: Auto-selection skipped', {
        reason: !currentUserEmployeeId
          ? 'no currentUserEmployeeId'
          : ownerEmployeeId
            ? 'owner already set'
            : autoSelectionDone.current
              ? 'already done'
              : contactId
                ? 'editing existing contact'
                : contactData
                  ? 'has contact data'
                  : formValues.id
                    ? 'has form id'
                    : 'unknown'
      })
    }
  }, [
    contactData,
    form,
    businessAppContext.additionalData,
    businessAppContext.userInfo?.employeeDetails?.employeeId,
    form.watch('ownerEmployeeId')
  ])

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

    // Build CustomerContact object
    const formValues = form.getValues()
    const customerContact: Partial<import('@/common/data/customer/types/customerContactTypes').CustomerContact> = {
      ...data,
      jobTitle: data.jobPosition,
      salesCampaignId: formValues.salesCampaignId || undefined,
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
            entityId={contactId}
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
