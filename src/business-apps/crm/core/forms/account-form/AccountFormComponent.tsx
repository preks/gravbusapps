import React, { useEffect, useCallback } from 'react'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { useForm } from 'react-hook-form'
import { useAccountFormContext } from './AccountFormContext'
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

const AccountFormComponent: React.FC = () => {
  const {
    account,
    accountId,
    accountLoading,
    accountError,
    onCancel: contextOnCancel,
    hideActions,
    contacts,
    contactsLoading,
    contactsError,
    searchContacts,
    businessAppContext
  } = useAccountFormContext()

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

  // Helper function to transform CustomerAccount to form values
  const accountToFormValues = useCallback((acc: CustomerAccount | null) => {
    if (!acc) {
      // New account - initialize with defaults (no IDs - backend will generate)
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
        code: undefined
      }
    }

    // Transform addressLine (string) to addressLines (array) for UI
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
      code: acc.code
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
            // CRM: addressLine is a String (join array into single line)
            addressLine: addr.addressLines?.some((line: string) => line.trim())
              ? addr.addressLines.filter((line: string) => line.trim()).join(', ')
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
        })
        .filter(Boolean) || []

    // Filter empty communication channels and ensure version is included
    const communicationChannels =
      data.communicationChannels
        ?.filter((ch: any) => ch.communicationChannelRef?.trim() && ch.value?.trim())
        .map((ch: any) => {
          const channelPayload: any = {
            communicationChannelRef: ch.communicationChannelRef.trim(),
            value: ch.value.trim(),
            valueExtension: ch.valueExtension || null
          }

          // Include ID and version when updating an existing channel
          if (ch.id) {
            channelPayload.id = ch.id
            if (ch.version !== undefined && ch.version !== null) {
              channelPayload.version = ch.version
            }
          }

          return channelPayload
        })
        .filter(Boolean) || []

    // Build accountContacts array
    const accountContacts = ((account?.accountContacts || []) as any[]).map((accountContact: any) => {
      const accountContactPayload: any = {
        contactType: accountContact.contactType || null,
        account: data.id,
        contact: accountContact.contact?.id || accountContact.contactId || accountContact.contact
      }

      if (accountContact.id) {
        accountContactPayload.id = accountContact.id
        if (accountContact.version !== undefined) {
          accountContactPayload.version = accountContact.version
        }
      }

      return accountContactPayload
    })

    // Build CustomerAccount object - data already has correct field names
    // Note: salesCampaignId is managed separately via SearchableSelect, get it from form values
    const formValues = form.getValues()
    const customerAccount: Partial<import('@/common/data/customer/types/customerAccountTypes').CustomerAccount> = {
      ...data,
      salesCampaignId: formValues.salesCampaignId || undefined,
      communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      accountContacts: accountContacts.length > 0 ? accountContacts : undefined,
      // Remove form-specific fields
      avatarFile: undefined,
      avatarThumbnail: undefined
    }

    // ✅ Use centralized payload builder
    const { account: accountPayload } = buildCustomerAccountPayload(customerAccount)

    const changeMode = data.id ? 'UPDATE' : 'INSERT'

    // Return payload for AppActionForm to handle process event
    return {
      account: accountPayload,
      changeMode: changeMode
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    await contextOnCancel()
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
        showCancelButton={!hideActions}
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
            contacts={contacts}
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
