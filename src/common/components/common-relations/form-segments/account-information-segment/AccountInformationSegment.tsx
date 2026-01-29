import React, { useMemo, useCallback } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Switch,
  Badge,
  useTranslation,
  AvatarUpload
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { ContactSelect } from '@/common/components/common-relations/selects/contact-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import { LEGAL_FORM, INDUSTRY_CLASS } from '@/common/constants/commonCatalogs'
import translations from './_i18n'

interface AccountInformationSegmentProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps

  // Owner employee from account data (to display immediately)
  ownerEmployee?: any
  // Entity ID (account ID for edit mode)
  entityId?: string

  // Contact selection hook result (optional - if not provided, contacts section won't render)
  // Raw entities and refetch function - generic types for context-agnostic component
  useContacts?: {
    contacts: any[]
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }

  // Custom fields (context-specific, e.g., CRM Sales Campaign)
  customFields?: React.ReactNode

  // Ref to store current file and thumbnail (for handlePreSubmit in form component)
  avatarFileRef?: React.MutableRefObject<{ file: File; thumbnail: string } | null>

  // Catalog identifier for account priority (context-specific)
  accountPriorityCatalogIdentifier?: string

  // Context for prospective field label (determines non-prospective label)
  accountContext?: 'crm' | 'irm'
}

const AccountInformationSegment: React.FC<AccountInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  useContacts,
  customFields,
  avatarFileRef,
  accountPriorityCatalogIdentifier,
  accountContext = 'crm'
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Transform contacts to SelectOption[] internally
  const contactOptions = useMemo<ContactSelectOption[]>(() => {
    if (!useContacts?.contacts) return []
    return useContacts.contacts.map((contact: any) => {
      const emailChannel = contact.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const email = emailChannel?.value || contact.email || undefined

      return {
        id: contact.id || '',
        value: contact.id || '',
        label: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
        name: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
        pictureThumbnail: contact.pictureThumbnail || undefined,
        extraInfo: {
          email,
          jobPosition: contact.jobPosition,
          department: contact.department,
          organizationalUnit: contact.ownerEmployee?.displayName || 'Unknown'
        }
      } as ContactSelectOption
    })
  }, [useContacts?.contacts])

  // Search function that calls refetch with search variables
  const searchContacts = useCallback(
    (searchTerm: string) => {
      if (!useContacts?.refetch) return
      useContacts.refetch({ search: searchTerm.trim(), limit: 20, offset: 0 })
    },
    [useContacts?.refetch]
  )

  // Helper function to parse picture string
  const parsePictureString = (pictureStr: string): string | undefined => {
    try {
      const pictureData = JSON.parse(pictureStr)
      return pictureData?.url || pictureData?.fileUrl || undefined
    } catch {
      return pictureStr
    }
  }

  // Helper function to transform accountContact to ContactSelect format
  const transformAccountContactToContactSelect = (
    ac: any
  ): {
    id: string
    name: string
    contactType?: string
    pictureThumbnail?: string
    jobPosition?: string
    department?: string
  } => {
    if (ac.contact) {
      const contact = ac.contact
      const displayName =
        contact.displayName ||
        contact.fullName ||
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
        'Unknown Contact'
      return {
        id: ac.contactId || ac.contact?.id || '',
        name: displayName,
        contactType: ac.contactType || undefined,
        pictureThumbnail: contact.pictureThumbnail,
        jobPosition: contact.jobPosition,
        department: contact.department
      }
    }
    return {
      id: ac.contactId || '',
      name: ac.contact?.name || 'Unknown Contact',
      contactType: ac.contactType || undefined
    }
  }

  // Helper function to transform contact value to accountContact format
  const transformContactValueToAccountContact = useCallback(
    (contactValue: any, accountId: string | undefined, existingAccountContacts: any[]) => {
      const contactId = typeof contactValue === 'object' ? contactValue.id : contactValue
      const contactType = typeof contactValue === 'object' ? contactValue.contactType : undefined

      // Find existing accountContact to preserve id and version
      const existingAc = existingAccountContacts.find((ac: any) => (ac.contactId || ac.contact?.id) === contactId)

      return {
        ...(existingAc?.id && { id: existingAc.id }),
        ...(existingAc?.version !== undefined && { version: existingAc.version }),
        accountId: accountId || undefined,
        contactId: contactId,
        contactType: contactType || null
      }
    },
    []
  )

  // Get avatar image from form values (pictureThumbnail or picture)
  const pictureThumbnail = form.watch('pictureThumbnail')
  const picture = form.watch('picture')
  const avatarImage = (() => {
    if (pictureThumbnail) {
      return `data:image/jpeg;base64,${pictureThumbnail}`
    }
    if (picture) {
      if (typeof picture === 'string') {
        return parsePictureString(picture)
      }
      return picture
    }
    return undefined
  })()

  return (
    <div className="gba:space-y-6 gba:w-full gba:max-w-full gba:overflow-hidden">
      {/* Owner */}
      <FormField
        control={form.control}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('account-owner-label')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext}
                initialEmployee={ownerEmployee}
                autoSelect={entityId ? undefined : 'current-user'}
                placeholder={t('please-select')}
                data-testid="account-information-segment-owner"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Prospective Toggle - Enhanced with Card-like Container */}
      <FormField
        control={form.control}
        name="prospective"
        render={({ field }) => {
          // Calculate label and description based on current field value
          const prospectiveLabel = field.value
            ? t('prospect-label')
            : accountContext === 'irm'
              ? t('portfolio-company-label')
              : t('customer-label')

          const prospectiveDescription = field.value
            ? accountContext === 'irm'
              ? t('prospect-description-irm')
              : t('prospect-description-crm')
            : accountContext === 'irm'
              ? t('portfolio-description')
              : t('customer-description')

          return (
            <FormItem>
              <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-4">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                  <div className="gba:flex-1 gba:space-y-1">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <FormLabel className="gba:text-base gba:font-semibold gba:m-0">
                        {t('account-type-label')}
                      </FormLabel>
                      <Badge variant={field.value ? 'info' : 'success'} className="gba:text-xs">
                        {prospectiveLabel}
                      </Badge>
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground gba:m-0">{prospectiveDescription}</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={checked => {
                        field.onChange(checked)
                      }}
                      data-testid="account-information-prospective-switch"
                    />
                  </FormControl>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      {/* Account Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('account-name-label')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('account-name-placeholder')}
                data-testid="account-information-segment-name"
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Avatar Upload */}
      <FormField
        control={form.control}
        name="pictureThumbnail"
        render={() => (
          <FormItem>
            <FormLabel>{t('account-picture-label')}</FormLabel>
            <FormControl>
              <AvatarUpload
                image={avatarImage}
                variant="compact"
                onChange={value => {
                  // Store file and thumbnail in ref (no re-renders, no form state changes)
                  if (avatarFileRef) {
                    if (value?.file && value?.thumbnail) {
                      const thumbnailBase64 = value.thumbnail.includes(',')
                        ? value.thumbnail.split(',').pop() || ''
                        : value.thumbnail
                      avatarFileRef.current = {
                        file: value.file,
                        thumbnail: thumbnailBase64
                      }
                    } else {
                      avatarFileRef.current = null
                    }
                  }
                }}
                data-testid="account-information-segment-avatar"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Priority - Above Legal Form and Industry */}
      {accountPriorityCatalogIdentifier && (
        <FormField
          control={form.control}
          name="accountPriorityRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('priority-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={accountPriorityCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="account-information-segment-priority"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Legal Form and Industry - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2 gba:w-full gba:max-w-full gba:overflow-hidden">
        <FormField
          control={form.control}
          name="legalFormRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('legal-form-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={LEGAL_FORM}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="account-information-segment-legal-form"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industryClassRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('industry-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={INDUSTRY_CLASS}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="account-information-segment-industry"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Website */}
      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('website-label')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('website-placeholder')}
                data-testid="account-information-segment-website"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields (context-specific, e.g., CRM Sales Campaign) */}
      {customFields}

      {/* Contacts Selection using ContactSelect */}
      {useContacts && (
        <FormField
          control={form.control}
          name="accountContacts"
          render={({ field, fieldState }) => {
            // Transform accountContacts to ContactSelect format
            const accountContacts = field.value || []
            const contactSelectValue = accountContacts.map(transformAccountContactToContactSelect)

            // Handle onChange - transform back to accountContacts format
            const handleChange = (
              contactIds:
                | Array<string | { id: string; name: string; contactType?: string }>
                | string
                | { id: string; name: string; contactType?: string }
                | null
            ) => {
              // Normalize to array: handle null, single values, and arrays
              let normalizedValue: Array<string | { id: string; name: string; contactType?: string }>
              if (contactIds === null) {
                normalizedValue = []
              } else if (Array.isArray(contactIds)) {
                normalizedValue = contactIds
              } else {
                normalizedValue = [contactIds]
              }

              const accountId = form.getValues('id')
              const existingAccountContacts = field.value || []
              const accountContacts = normalizedValue.map((contactValue: any) =>
                transformContactValueToAccountContact(contactValue, accountId, existingAccountContacts)
              )
              field.onChange(accountContacts)
            }

            return (
              <FormItem>
                <FormLabel>{t('contacts-label')}</FormLabel>
                <FormControl>
                  <ContactSelect
                    value={contactSelectValue}
                    onChange={handleChange}
                    contacts={contactOptions}
                    contactsLoading={useContacts.loading}
                    contactsError={useContacts.error}
                    searchContacts={searchContacts}
                    accountContacts={field.value || []}
                    dataTestId="account-information-segment-contacts"
                    error={fieldState.error?.message || null}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )}
    </div>
  )
}

export default AccountInformationSegment
