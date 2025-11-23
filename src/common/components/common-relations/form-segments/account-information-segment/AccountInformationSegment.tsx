import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  useTranslation,
  AvatarUpload
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { ContactSelect } from '@/common/components/common-relations/selects/contact-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import { LEGAL_FORM, INDUSTRY_CLASS } from '@/common/data/relations/constants/catalogConstants'
import { useMemo, useCallback } from 'react'
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
}

const AccountInformationSegment: React.FC<AccountInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  useContacts,
  customFields,
  avatarFileRef
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
      const email = emailChannel?.value || (contact as any).email || undefined

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

  // Get avatar image from form values (pictureThumbnail or picture)
  const pictureThumbnail = form.watch('pictureThumbnail')
  const picture = form.watch('picture')
  const avatarImage = pictureThumbnail
    ? `data:image/jpeg;base64,${pictureThumbnail}`
    : picture
      ? typeof picture === 'string'
        ? (() => {
            try {
              const pictureData = JSON.parse(picture)
              return pictureData?.url || pictureData?.fileUrl || undefined
            } catch {
              return picture
            }
          })()
        : picture
      : undefined

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
                businessAppContext={businessAppContext!}
                initialEmployee={ownerEmployee}
                autoSelect={!entityId ? 'current-user' : undefined}
                placeholder={t('please-select')}
                data-testid="account-information-segment-owner"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
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
            // accountContacts: Array<{ id, version, accountId, contactId, contactType }>
            // ContactSelect expects: Array<{ id, name, contactType }>
            const contactSelectValue = React.useMemo(() => {
              const accountContacts = field.value || []
              return accountContacts.map((ac: any) => {
                // If accountContact has contact object with full data, use it
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
                // Otherwise, use minimal data from accountContact
                return {
                  id: ac.contactId || '',
                  name: ac.contact?.name || 'Unknown Contact',
                  contactType: ac.contactType || undefined
                }
              })
            }, [field.value])

            // Handle onChange - transform back to accountContacts format
            const handleChange = (
              contactIds:
                | Array<string | { id: string; name: string; contactType?: string }>
                | string
                | { id: string; name: string; contactType?: string }
                | null
            ) => {
              // Normalize to array: handle null, single values, and arrays
              const normalizedValue: Array<string | { id: string; name: string; contactType?: string }> =
                contactIds === null ? [] : Array.isArray(contactIds) ? contactIds : [contactIds]

              const accountId = form.getValues('id')
              const accountContacts = normalizedValue.map((contactValue: any) => {
                const contactId = typeof contactValue === 'object' ? contactValue.id : contactValue
                const contactType = typeof contactValue === 'object' ? contactValue.contactType : undefined

                // Find existing accountContact to preserve id and version
                const existingAc = (field.value || []).find((ac: any) => (ac.contactId || ac.contact?.id) === contactId)

                return {
                  ...(existingAc?.id && { id: existingAc.id }),
                  ...(existingAc?.version !== undefined && { version: existingAc.version }),
                  accountId: accountId || undefined,
                  contactId: contactId,
                  contactType: contactType || null
                }
              })
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
