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
import { OwnerSelect } from '@/common/components/common-relations/selects/owner-select'
import { AccountSelect } from '@/common/components/common-relations/selects/account-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import translations from './_i18n'

interface ContactInformationSegmentProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps
  // Owner employee from contact data (to display immediately)
  ownerEmployee?: any
  // Entity ID (contact ID for edit mode)
  entityId?: string

  // Account selection hook result (optional - if not provided, accounts section won't render)
  // When mapToSelectOptions: true is used, options will always be SelectOption[]
  accountsHook?: {
    options: AccountSelectOption[]
    loading: boolean
    error: string | null
    search: (searchTerm: string) => void
  }

  // Custom fields (context-specific, e.g., CRM Sales Campaign)
  customFields?: React.ReactNode

  // Ref to store current file and thumbnail (for handlePreSubmit in form component)
  avatarFileRef?: React.MutableRefObject<{ file: File; thumbnail: string } | null>
}

const ContactInformationSegment: React.FC<ContactInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  accountsHook,
  customFields,
  avatarFileRef
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

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
            <FormLabel>{t('contact-owner-label')}</FormLabel>
            <FormControl>
              <OwnerSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext!}
                ownerEmployee={ownerEmployee}
                isNewEntity={!entityId}
                placeholder={t('please-select')}
                data-testid="contact-information-segment-owner"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* First Name and Last Name - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-first-name-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('contact-first-name-placeholder')}
                  data-testid="contact-information-segment-first-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-last-name-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('contact-last-name-placeholder')}
                  data-testid="contact-information-segment-last-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Job Position and Department - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="jobPosition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-job-position-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('contact-job-position-placeholder')}
                  data-testid="contact-information-segment-job-position"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-department-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('contact-department-placeholder')}
                  data-testid="contact-information-segment-department"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Avatar Upload */}
      <FormField
        control={form.control}
        name="pictureThumbnail"
        render={() => (
          <FormItem>
            <FormLabel>{t('contact-picture-label')}</FormLabel>
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
                data-testid="contact-information-segment-avatar"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields slot */}
      {customFields}

      {/* Account Selection using AccountSelect */}
      {accountsHook && (
        <FormField
          control={form.control}
          name="accountContacts"
          render={({ field, fieldState }) => {
            // Transform accountContacts to AccountSelect format
            // accountContacts: Array<{ id, version, accountId, contactId, contactType }>
            // AccountSelect expects: Array<{ id, name, contactType }>
            const accountSelectValue = React.useMemo(() => {
              const accountContacts = field.value || []
              return accountContacts.map((ac: any) => {
                // If accountContact has account object with full data, use it
                if (ac.account) {
                  const account = ac.account
                  const displayName = account.displayName || account.name || 'Unknown Account'
                  return {
                    id: ac.accountId || ac.account?.id || '',
                    name: displayName,
                    contactType: ac.contactType || undefined,
                    pictureThumbnail: account.pictureThumbnail
                  }
                }
                // Otherwise, use minimal data from accountContact
                return {
                  id: ac.accountId || '',
                  name: ac.account?.name || 'Unknown Account',
                  contactType: ac.contactType || undefined
                }
              })
            }, [field.value])

            // Handle onChange - transform back to accountContacts format
            const handleChange = (
              accountIds:
                | string
                | Array<string | { id: string; name: string; contactType?: string }>
                | { id: string; name: string; contactType?: string }
                | { id: string; name: string }
                | null
            ) => {
              // Normalize to array
              const normalizedValue: Array<string | { id: string; name: string; contactType?: string }> = Array.isArray(
                accountIds
              )
                ? accountIds
                : accountIds === null || accountIds === ''
                  ? []
                  : [accountIds]

              const contactId = form.getValues('id')
              const accountContacts = normalizedValue.map((accountValue: any) => {
                const accountId = typeof accountValue === 'object' ? accountValue.id : accountValue
                const contactType = typeof accountValue === 'object' ? accountValue.contactType : undefined

                // Find existing accountContact to preserve id and version
                const existingAc = (field.value || []).find((ac: any) => {
                  const acAccountId = ac.accountId || (ac.account?.id ? ac.account.id : '')
                  return acAccountId === accountId
                })

                return {
                  ...(existingAc?.id && { id: existingAc.id }),
                  ...(existingAc?.version !== undefined && { version: existingAc.version }),
                  accountId: accountId,
                  contactId: contactId || undefined,
                  contactType: contactType || null
                }
              })
              field.onChange(accountContacts)
            }

            return (
              <FormItem>
                <FormLabel>{t('contact-accounts-label')}</FormLabel>
                <FormControl>
                  <AccountSelect
                    value={accountSelectValue}
                    onChange={handleChange}
                    accounts={accountsHook.options}
                    accountsLoading={accountsHook.loading}
                    accountsError={accountsHook.error}
                    searchAccounts={accountsHook.search}
                    accountContacts={field.value || []}
                    multiple={true}
                    dataTestId="contact-information-segment-accounts"
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

export default ContactInformationSegment
