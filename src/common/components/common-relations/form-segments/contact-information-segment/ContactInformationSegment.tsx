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
  // Avatar image for preview (from existing contact data) - CRM only
  avatarImage?: string

  // Account selection props
  accounts?: AccountSelectOption[]
  accountsLoading?: boolean
  accountsError?: string | null
  searchAccounts?: (search: string) => void

  // Custom fields (context-specific, e.g., CRM Sales Campaign)
  customFields?: React.ReactNode
}

const ContactInformationSegment: React.FC<ContactInformationSegmentProps> = ({
  businessAppContext,
  ownerEmployee,
  entityId,
  avatarImage,
  accounts = [],
  accountsLoading = false,
  accountsError = null,
  searchAccounts,
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6 gba:w-full gba:max-w-full gba:overflow-hidden">
      {/* Owner */}
      <FormField
        control={form.control}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('contact-owner-label')} <span>*</span>
            </FormLabel>
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
              <FormLabel>
                {t('contact-first-name-label')} <span>*</span>
              </FormLabel>
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
              <FormLabel>
                {t('contact-last-name-label')} <span>*</span>
              </FormLabel>
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
                  if (value?.file) {
                    // Store file temporarily (not in schema, will be handled in handlePreSubmit)
                    ;(form as any)._avatarFile = value.file
                    // Extract plain base64 from thumbnail (remove data URL prefix if present)
                    const thumbnailBase64 = value.thumbnail
                      ? value.thumbnail.includes(',')
                        ? value.thumbnail.split(',').pop() || ''
                        : value.thumbnail
                      : ''
                    form.setValue('pictureThumbnail', thumbnailBase64)
                  } else {
                    ;(form as any)._avatarFile = undefined
                    form.setValue('pictureThumbnail', null)
                    form.setValue('picture', null)
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
      {searchAccounts && (
        <FormField
          control={form.control}
          name="accounts"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('contact-accounts-label')}</FormLabel>
              <FormControl>
                <AccountSelect
                  value={field.value || []}
                  onChange={field.onChange}
                  accounts={accounts}
                  accountsLoading={accountsLoading}
                  accountsError={accountsError}
                  searchAccounts={searchAccounts}
                  multiple={true}
                  dataTestId="contact-information-segment-accounts"
                  error={fieldState.error?.message || null}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}

export default ContactInformationSegment
