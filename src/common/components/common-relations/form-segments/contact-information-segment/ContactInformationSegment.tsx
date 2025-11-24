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
import { EmployeeSelect } from '@/components/employee-select'
import { AccountSelect } from '@/common/components/common-relations/selects/account-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import { useMemo, useCallback } from 'react'
import translations from './_i18n'

interface ContactInformationSegmentProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps
  // Owner employee from contact data (to display immediately)
  ownerEmployee?: any
  // Entity ID (contact ID for edit mode)
  entityId?: string

  // Account selection hook result (optional - if not provided, accounts section won't render)
  // Raw entities and refetch function - generic types for context-agnostic component
  useAccounts?: {
    accounts: any[]
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
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
  useAccounts,
  customFields,
  avatarFileRef
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // Transform accounts to SelectOption[] internally
  const accountOptions = useMemo<AccountSelectOption[]>(() => {
    if (!useAccounts?.accounts) return []
    return useAccounts.accounts.map((account: any) => {
      const emailChannel = account.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const phoneChannel = account.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'PHONE' || ch.communicationChannelRef?.includes(':PHONE')
      )

      return {
        id: account.id || '',
        value: account.id || '',
        label: account.displayName || account.name || 'Unknown Account',
        name: account.displayName || account.name || 'Unknown Account',
        pictureThumbnail: account.pictureThumbnail || undefined,
        extraInfo: {
          email: emailChannel?.value || undefined,
          phone: phoneChannel?.value || undefined,
          website: account.website || undefined,
          businessKey: account.businessKey || undefined,
          code: account.code || undefined,
          ownerEmployee: account.ownerEmployee
            ? {
                firstName: account.ownerEmployee.firstName,
                lastName: account.ownerEmployee.lastName
              }
            : undefined
        }
      } as AccountSelectOption
    })
  }, [useAccounts?.accounts])

  // Search function that calls refetch with search variables
  const searchAccounts = useCallback(
    (searchTerm: string) => {
      if (!useAccounts?.refetch) return
      useAccounts.refetch({ search: searchTerm.trim(), limit: 20, offset: 0 })
    },
    [useAccounts?.refetch]
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
            <FormLabel>{t('contact-owner-label')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext!}
                initialEmployee={ownerEmployee}
                autoSelect={!entityId ? 'current-user' : undefined}
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
      {useAccounts && (
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

            /**
             * Transforms an account value to accountContact format
             */
            const transformAccountValueToAccountContact = useCallback(
              (accountValue: any, contactId: string | undefined, existingAccountContacts: any[]) => {
                const accountId = typeof accountValue === 'object' ? accountValue.id : accountValue
                const contactType = typeof accountValue === 'object' ? accountValue.contactType : undefined

                // Find existing accountContact to preserve id and version
                const existingAc = existingAccountContacts.find((ac: any) => {
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
              },
              []
            )

            // Handle onChange - transform back to accountContacts format
            const handleChange = useCallback(
              (
                accountIds:
                  | string
                  | Array<string | { id: string; name: string; contactType?: string }>
                  | { id: string; name: string; contactType?: string }
                  | { id: string; name: string }
                  | null
              ) => {
                // Normalize to array
                let normalizedValue: Array<string | { id: string; name: string; contactType?: string }>
                if (Array.isArray(accountIds)) {
                  normalizedValue = accountIds
                } else if (accountIds === null || accountIds === '') {
                  normalizedValue = []
                } else {
                  normalizedValue = [accountIds]
                }

                const contactId = form.getValues('id')
                const accountContacts = normalizedValue.map((accountValue: any) =>
                  transformAccountValueToAccountContact(accountValue, contactId, field.value || [])
                )
                field.onChange(accountContacts)
              },
              [form, field, transformAccountValueToAccountContact]
            )

            return (
              <FormItem>
                <FormLabel>{t('contact-accounts-label')}</FormLabel>
                <FormControl>
                  <AccountSelect
                    value={accountSelectValue}
                    onChange={handleChange}
                    accounts={accountOptions}
                    accountsLoading={useAccounts.loading}
                    accountsError={useAccounts.error}
                    searchAccounts={searchAccounts}
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
