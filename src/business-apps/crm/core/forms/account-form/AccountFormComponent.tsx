import React, { useEffect, useCallback, useState } from 'react'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerCampaigns } from '@/common/data/customer/hooks/useCustomerCampaigns'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useGetCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import {
  Alert,
  AlertDescription,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { buildCustomerAccountPayload } from '@/common/data/customer/types/customerAccountTypes'
import { CustomerFilePaths } from '@/common/data/customer/constants/customerFilePaths'
import { AccountLayout } from '@/common/components/common-relations/form-layouts/account-layout'
import { createAccountSegmentResolver } from '@/common/components/common-relations/schemas/accountSchema'
import { CampaignSelect } from '@/common/components/customer/form-segments/campaign-select'
import { CatalogSelect } from '@/components/catalog-select'
import { AppActionForm } from '@/components/app-action-form'
import { AddressType } from '@/common/data/relations/types/relationEnums'
import { CommunicationChannelCode } from '@/common/data/relations/types/relationEnums'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'

const prefixDataTestId = 'AccountForm'

interface AccountFormComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<CustomerAccount>
  onSubmit?: (account: Partial<CustomerAccount>) => Promise<void>
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
  } = useCustomerAccount(businessAppContext, accountId)

  // Local state for account
  const [account, setAccount] = useState<CustomerAccount | null>(null)

  // Sync fetched account with local state
  useEffect(() => {
    if (fetchedAccount) {
      setAccount(fetchedAccount)
    } else if (!accountId && initialValues && Object.keys(initialValues).length > 0) {
      setAccount(initialValues as CustomerAccount)
    }
  }, [fetchedAccount, accountId, initialValues])

  // Sales Campaigns hook (defer fetching until select opens)
  // Note: CampaignSelect handles its own data fetching internally
  useCustomerCampaigns(businessAppContext.accessToken, 20, false)

  // Contact selection hook
  const {
    options: contactsList,
    loading: contactsLoading,
    error: contactsError,
    search: searchContacts
  } = useGetCustomerContacts(businessAppContext, {
    withState: true,
    autoFetch: true,
    pageSize: 20,
    mapToSelectOptions: true
  })

  // Avatar image for preview
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

  // Transform CustomerAccount to form values
  const accountToFormValues = useCallback((acc: CustomerAccount | null) => {
    if (!acc) {
      return {
        ownerEmployeeId: '',
        name: '',
        legalFormRef: '',
        industryClassRef: '',
        website: '',
        salesCampaignId: '',
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

    const addresses = (acc.addresses || []).map((addr: any) => {
      const addressLines = addr.addressLine
        ? typeof addr.addressLine === 'string'
          ? addr.addressLine
              .split(',')
              .map((line: string) => line.trim())
              .filter(Boolean)
          : []
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

    const communicationChannels =
      acc.communicationChannels?.map((ch: any) => ({
        ...(ch.id && { id: ch.id }),
        ...(ch.version !== undefined && { version: ch.version }),
        communicationChannelRef: ch.communicationChannelRef || '',
        value: ch.value || '',
        valueExtension: ch.valueExtension || null
      })) || []

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
      salesCampaignId: acc.salesCampaignId || '',
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

  // Handle form submission
  const handleSubmit = async (data: any) => {
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

    const communicationChannels =
      data.communicationChannels
        ?.filter((ch: any) => ch.communicationChannelRef?.trim() && ch.value?.trim())
        .map((ch: any) => {
          const channelPayload: any = {
            communicationChannelRef: ch.communicationChannelRef.trim(),
            value: ch.value.trim(),
            valueExtension: ch.valueExtension || null
          }

          if (ch.id) {
            channelPayload.id = ch.id
            if (ch.version !== undefined && ch.version !== null) {
              channelPayload.version = ch.version
            }
          }

          return channelPayload
        })
        .filter(Boolean) || []

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

    const customerAccount: Partial<CustomerAccount> = {
      ...data,
      salesCampaignId: form.getValues().salesCampaignId || undefined,
      communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      accountContacts: accountContacts.length > 0 ? accountContacts : undefined,
      avatarFile: undefined,
      avatarThumbnail: undefined
    }

    const { account: accountPayload } = buildCustomerAccountPayload(customerAccount)
    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    return {
      account: accountPayload,
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
                account?.salesCampaign
                  ? {
                      id: account.salesCampaignId || '',
                      name: account.salesCampaign?.name || '',
                      type: account.salesCampaign?.type
                        ? {
                            id: account.salesCampaign.type.id || account.salesCampaign.typeRef || '',
                            value: account.salesCampaign.type.value || '',
                            code: account.salesCampaign.type.code || '',
                            translations: account.salesCampaign.type.translations || []
                          }
                        : undefined,
                      typeRef: account.salesCampaign.typeRef
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
          {/* Account Layout */}
          <AccountLayout
            businessAppContext={businessAppContext}
            uploadConfig={{
              appName: CustomerFilePaths.APP_NAME,
              accessScope: CustomerFilePaths.ACCESS_SCOPE,
              getAvatarPath: CustomerFilePaths.getAccountPicturePath
            }}
            ownerEmployee={account?.ownerEmployee}
            entityId={accountId}
            accountInformationCustomFields={salesCampaignSelector}
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
            annualRevenueCatalogIdentifier="RevenueSize:v1"
            companySizeCatalogIdentifier="EmployeeSize:v1"
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
