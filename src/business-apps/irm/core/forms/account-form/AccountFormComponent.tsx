import React, { useEffect, useCallback, useState } from 'react'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildInvestmentAccountPayload } from '@/common/data/investment/types/investmentAccountTypes'
import { InvestmentFilePaths } from '@/common/data/investment/constants/investmentFilePaths'
import { AccountLayout } from '@/common/components/common-relations/form-layouts/account-layout'
import { createAccountSegmentResolver } from '@/common/components/common-relations/schemas/accountSchema'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import { AddressType, CommunicationChannelCode } from '@/common/data/relations/types/relationEnums'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'

const prefixDataTestId = 'AccountForm'

interface AccountFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<InvestmentAccount>
  onSubmit?: (account: Partial<InvestmentAccount>) => Promise<void>
  onCancel?: () => Promise<void>
}

const AccountFormComponent: React.FC<AccountFormComponentProps> = ({
  businessAppContext,
  initialValues,
  onCancel = async () => {}
}) => {
  // Extract accountId from businessAppContext
  const accountId =
    businessAppContext.additionalData?.accountId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  // Fetch account data using declarative hook
  const {
    account: fetchedAccount,
    loading: accountLoading,
    error: accountError
  } = useInvestmentAccount(businessAppContext, accountId)

  // Local state for account
  const [account, setAccount] = useState<InvestmentAccount | null>(null)

  // Sync fetched account with local state
  useEffect(() => {
    if (fetchedAccount) {
      setAccount(fetchedAccount)
    } else if (!accountId && initialValues && Object.keys(initialValues).length > 0) {
      setAccount(initialValues as InvestmentAccount)
    }
  }, [fetchedAccount, accountId, initialValues])

  // Contact selection hook
  const {
    options: contactsList,
    loading: contactsLoading,
    error: contactsError,
    search: searchContacts
  } = useGetInvestmentContacts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: true
  })

  // Avatar image for preview (from existing account data)
  const avatarImage = (() => {
    if (account?.pictureThumbnail) {
      return `data:image/jpeg;base64,${account.pictureThumbnail}`
    }
    if (account?.picture) {
      try {
        const pictureData = typeof account.picture === 'string' ? JSON.parse(account.picture) : account.picture
        return pictureData?.url || pictureData?.fileUrl || undefined
      } catch {
        return account.picture
      }
    }
    return undefined
  })()

  // Helper function to transform InvestmentAccount to form values
  const accountToFormValues = useCallback((acc: InvestmentAccount | null) => {
    if (!acc) {
      // New account - initialize with defaults (no IDs - backend will generate)
      return {
        ownerEmployeeId: '',
        name: '',
        legalFormRef: '',
        industryClassRef: '',
        website: '',
        addresses: [
          {
            addressType: AddressType.PRIMARY_ADDRESS,
            addressLines: [''],
            postalCode: '',
            locality: '',
            regionRef: '',
            countryRef: ''
          }
        ] as any,
        communicationChannels: [
          {
            communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.PHONE),
            value: '',
            valueExtension: null
          },
          {
            communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.EMAIL),
            value: '',
            valueExtension: null
          }
        ] as any,
        accountAnnualRevenueBandRef: '',
        companySizeRef: '',
        foundationDate: '',
        picture: undefined,
        pictureThumbnail: undefined,
        id: undefined,
        version: undefined,
        code: undefined,
        contacts: []
      }
    }

    // Transform addressLine (object) to addressLines (array) for UI
    const addresses = (acc.addresses || []).map((addr: any) => {
      const addressLines =
        addr.addressLine && typeof addr.addressLine === 'object' && addr.addressLine.lines
          ? addr.addressLine.lines
          : ['']
      return {
        ...(addr.id && { id: addr.id }),
        ...(addr.version !== undefined && { version: addr.version }),
        addressType: addr.addressType || AddressType.PRIMARY_ADDRESS,
        addressLines: addressLines.length > 0 ? addressLines : [''],
        postalCode: addr.postalCode || '',
        locality: addr.locality || '',
        regionRef: addr.regionRef || '',
        countryRef: addr.countryRef || ''
      }
    })

    if (addresses.length === 0) {
      addresses.push({
        addressType: AddressType.PRIMARY_ADDRESS,
        addressLines: [''],
        postalCode: '',
        locality: '',
        regionRef: '',
        countryRef: ''
      })
    }

    // Transform communication channels
    const communicationChannels =
      acc.communicationChannels?.map((ch: any) => ({
        ...(ch.id && { id: ch.id }),
        ...(ch.version !== undefined && { version: ch.version }),
        communicationChannelRef: ch.communicationChannelRef || '',
        value: ch.value || '',
        valueExtension: ch.valueExtension || null
      })) || []

    // For new accounts without channels, add default PHONE and EMAIL (no IDs - backend will generate)
    if (communicationChannels.length === 0 && !acc.id) {
      communicationChannels.push(
        {
          communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.PHONE),
          value: '',
          valueExtension: null
        },
        {
          communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.EMAIL),
          value: '',
          valueExtension: null
        }
      )
    }

    // Map accountContacts to form contacts array
    const contacts = (acc.accountContacts || []).map((ac: any) => {
      const contact = ac.contact
      const contactId = contact?.id || ac.contactId || ac.contact
      const contactName =
        contact?.displayName ||
        contact?.fullName ||
        `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() ||
        'Unknown Contact'

      return {
        id: contactId,
        name: contactName,
        contactType: ac.contactType || undefined,
        associationId: ac.id, // Store association ID for updates
        associationVersion: ac.version // Store association version for updates
      }
    })

    return {
      ownerEmployeeId: acc.ownerEmployeeId || '',
      name: acc.name || '',
      legalFormRef: acc.legalFormRef || '',
      industryClassRef: acc.industryClassRef || '',
      website: acc.website || '',
      addresses: addresses as any,
      communicationChannels: communicationChannels as any,
      accountAnnualRevenueBandRef: acc.accountAnnualRevenueBandRef || '',
      companySizeRef: acc.companySizeRef || '',
      foundationDate: acc.foundationDate ? acc.foundationDate.split('T')[0] : '',
      picture: acc.picture,
      pictureThumbnail: acc.pictureThumbnail,
      id: acc.id,
      version: acc.version,
      code: acc.code,
      contacts: contacts.length > 0 ? contacts : []
    }
  }, [])

  // Initialize React Hook Form
  const form = useForm({
    resolver: createAccountSegmentResolver(),
    defaultValues: accountToFormValues(account) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Sync form when account changes
  const accountRef = React.useRef(account)
  useEffect(() => {
    if (accountRef.current?.id !== account?.id) {
      form.reset(accountToFormValues(account) as any)
      accountRef.current = account
    }
  }, [account?.id, account, form, accountToFormValues])

  // Check if all mandatory fields are filled
  const formValues = form.getValues()
  const isFormValid = formValues.ownerEmployeeId && formValues.legalFormRef && formValues.name

  // Handle form submission - returns payload for AppActionForm
  const handleSubmit = async (data: any) => {
    // ✅ Build communication channels array from form data
    const communicationChannels =
      data.communicationChannels
        ?.filter((ch: any) => ch.communicationChannelRef?.trim() && ch.value?.trim())
        .map((ch: any) => {
          const channelPayload: any = {
            communicationChannelRef: ch.communicationChannelRef.trim(),
            value: ch.value.trim(),
            valueExtension: null
          }

          // Include ID and version when updating an existing channel
          // Both must be passed exactly as they come from the data
          if (ch.id) {
            channelPayload.id = ch.id
            channelPayload.version = ch.version
          }

          return channelPayload
        }) || []

    // ✅ Build addresses array (IRM-specific structure) - multiple addresses with types
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
            addressLine:
              addr.addressLines?.filter((line: string) => line.trim()).length > 0
                ? { lines: addr.addressLines.filter((line: string) => line.trim()) }
                : null,
            postalCode: addr.postalCode?.trim() || null,
            locality: addr.locality?.trim() || null,
            regionRef: addr.regionRef?.trim() || null,
            countryRef: addr.countryRef?.trim() || null
          }

          // Only include ID and version when updating an existing address (must have valid ID from backend)
          if (data.id && addr.id) {
            addressPayload.id = addr.id
            if (addr.version !== undefined && addr.version !== null) {
              addressPayload.version = addr.version
            }
          }

          return addressPayload
        }) || []

    // Build accountContacts from form data (contacts field)
    const accountContacts = ((data.contacts || []) as any[]).map((contact: any) => {
      const accountContactPayload: any = {
        contactType: contact.contactType || null,
        account: data.id,
        contact: typeof contact === 'object' ? contact.id : contact
      }

      // If this is an existing contact (has associationId), include id and version
      if (contact.associationId) {
        accountContactPayload.id = contact.associationId
        if (contact.associationVersion !== undefined) {
          accountContactPayload.version = contact.associationVersion
        }
      }

      return accountContactPayload
    })

    // Build InvestmentAccount object - data already has correct field names
    const investmentAccount: Partial<
      import('@/common/data/investment/types/investmentAccountTypes').InvestmentAccount
    > = {
      ...data,
      communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      accountContacts: accountContacts.length > 0 ? accountContacts : undefined
    }

    // ✅ Use centralized payload builder
    const { investmentAccount: accountPayload } = buildInvestmentAccountPayload(investmentAccount)

    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    // Return payload for AppActionForm to handle process event
    return {
      investmentAccount: accountPayload,
      changeMode: changeMode
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    await onCancel()
  }

  // Determine process type based on whether account exists
  const processType = account?.id ? 'update' : 'create'

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
        data-testid={formatDataTestId(prefixDataTestId, 'Form')}
        submitButtonText={formValues.id ? 'Update Account' : 'Create Account'}
        isSubmitDisabled={!isFormValid || accountLoading}
      >
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          {/* Account Segment */}
          <AccountLayout
            businessAppContext={businessAppContext}
            uploadConfig={{
              appName: InvestmentFilePaths.APP_NAME,
              accessScope: InvestmentFilePaths.ACCESS_SCOPE,
              getAvatarPath: InvestmentFilePaths.getAccountPicturePath
            }}
            ownerEmployee={account?.ownerEmployee}
            entityId={account?.id}
            addresses={account?.addresses?.map((addr: any) => ({
              country: addr.country
                ? {
                    id: addr.country.id || addr.countryRef,
                    value: addr.country.value || '',
                    displayValue: addr.country.displayValue || addr.country.value || '',
                    additionalValue3: addr.country.additionalValue3
                  }
                : undefined,
              region: addr.region
                ? {
                    id: addr.region.id || addr.regionRef,
                    value: addr.region.value || '',
                    displayValue: addr.region.displayValue || addr.region.value || '',
                    additionalValue3: addr.region.additionalValue3
                  }
                : undefined
            }))}
            annualRevenueCatalogIdentifier="AccountAnnualRevenueBand:v1"
            companySizeCatalogIdentifier="CompanySize:v1"
            avatarImage={avatarImage}
            contacts={contactsList as any}
            contactsLoading={contactsLoading}
            contactsError={contactsError}
            searchContacts={searchContacts}
          />

          {/* Error Display */}
          {accountError && (
            <Alert variant="destructive">
              <AlertDescription>{accountError}</AlertDescription>
            </Alert>
          )}
        </div>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default AccountFormComponent
